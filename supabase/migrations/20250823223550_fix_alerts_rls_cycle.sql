-- Replace alerts RLS with minimal, non-recursive policies
DO $$ BEGIN
  DROP POLICY IF EXISTS "alerts_owner_modify" ON public.alerts;
  DROP POLICY IF EXISTS "alerts_select_active" ON public.alerts;
  DROP POLICY IF EXISTS "alerts_owner_all" ON public.alerts;
  DROP POLICY IF EXISTS "alerts_select_related_responses" ON public.alerts;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

CREATE POLICY "alerts_owner_all_min"
  ON public.alerts
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "alerts_select_active_min"
  ON public.alerts
  FOR SELECT TO authenticated
  USING (status = 'active');
