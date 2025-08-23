-- Fix recursive RLS policies on alerts

-- Drop existing alert policies to avoid recursion
do 33598 begin
  drop policy if exists "Alert owner can crud" on public.alerts;
  drop policy if exists "Responders can read responded alerts" on public.alerts;
exception when undefined_object then null; end 33598;

-- Replace with non-recursive policies
-- Owners: can select/insert/update/delete their own alerts
create policy "alerts_owner_all"
  on public.alerts
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Select scoped to owner only (avoid recursion via alert_responses)
create policy "alerts_select_owner_only"
  on public.alerts
  for select
  using (auth.uid() = user_id);

-- Recreate alert_responses policies safely

do 33598 begin
  drop policy if exists "Owner and responders can read responses" on public.alert_responses;
  drop policy if exists "Users insert own responses" on public.alert_responses;
exception when undefined_object then null; end 33598;

create policy "alert_responses_insert_self"
  on public.alert_responses
  for insert
  with check (auth.uid() = user_id);

create policy "alert_responses_select_owner_or_self"
  on public.alert_responses
  for select
  using (
    user_id = auth.uid() or exists (
      select 1 from public.alerts a where a.id = alert_id and a.user_id = auth.uid()
    )
  );
