-- Allow all authenticated users to select active alerts (for broadcast)
DO $$ BEGIN
  DROP POLICY IF EXISTS "alerts_owner_all" ON public.alerts;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

-- Owners can modify their own alerts; everyone can select active
CREATE POLICY "alerts_owner_modify"
  ON public.alerts
  FOR ALL
  TO authenticated
  USING (
    CASE
      WHEN current_setting('request.method', true) in ('POST','PATCH','PUT','DELETE') THEN auth.uid() = user_id
      ELSE true
    END
  )
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "alerts_select_active"
  ON public.alerts
  FOR SELECT
  TO authenticated
  USING (status = 'active');

-- Auto-acknowledge when someone responds
CREATE OR REPLACE FUNCTION public.auto_acknowledge_alert()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.action = 'respond' THEN
    UPDATE public.alerts SET status = 'acknowledged', updated_at = now() WHERE id = NEW.alert_id AND status = 'active';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_alert_response_auto_ack ON public.alert_responses;
CREATE TRIGGER on_alert_response_auto_ack
AFTER INSERT ON public.alert_responses
FOR EACH ROW EXECUTE FUNCTION public.auto_acknowledge_alert();
