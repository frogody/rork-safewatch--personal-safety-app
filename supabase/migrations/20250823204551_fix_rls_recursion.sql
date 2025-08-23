-- Fix recursive RLS policies on alerts

-- Drop existing alert policies to avoid recursion
DO $$ BEGIN
  DROP POLICY IF EXISTS "Alert owner can crud" ON public.alerts;
  DROP POLICY IF EXISTS "Responders can read responded alerts" ON public.alerts;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

-- Replace with non-recursive policies
-- Owners: can select/insert/update/delete their own alerts
CREATE POLICY "alerts_owner_all"
  ON public.alerts
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Recreate alert_responses policies safely
DO $$ BEGIN
  DROP POLICY IF EXISTS "Owner and responders can read responses" ON public.alert_responses;
  DROP POLICY IF EXISTS "Users insert own responses" ON public.alert_responses;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

CREATE POLICY "alert_responses_insert_self"
  ON public.alert_responses
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "alert_responses_select_owner_or_self"
  ON public.alert_responses
  FOR SELECT
  USING (
    user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.alerts a WHERE a.id = alert_id AND a.user_id = auth.uid()
    )
  );
