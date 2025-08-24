-- Optimize alerts queries and add housekeeping function

begin;

-- Indexes for frequent filters
create index if not exists idx_alerts_status on public.alerts(status);
create index if not exists idx_alerts_timestamp on public.alerts(timestamp);
create index if not exists idx_alerts_user_status_ts on public.alerts(user_id, status, timestamp);

-- Helper function to resolve old alerts for a user
create or replace function public.resolve_old_alerts(p_user_id uuid, p_older_than interval)
returns integer language sql security definer as $$
  with upd as (
    update public.alerts a
      set status = 'resolved', updated_at = now()
      where a.user_id = p_user_id
        and a.status = 'active'
        and a.timestamp < (now() - p_older_than)
      returning 1
  )
  select coalesce(count(*),0) from upd;
$$;

commit;


