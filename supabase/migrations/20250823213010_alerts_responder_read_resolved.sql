-- Allow responders who interacted to continue reading resolved/acknowledged alerts
do $$ begin
  create policy "alerts_select_related_responses" on public.alerts
    for select to authenticated
    using (
      exists (
        select 1 from public.alert_responses ar
        where ar.alert_id = alerts.id and ar.user_id = auth.uid()
      )
    );
exception when duplicate_object then null; end $$;

