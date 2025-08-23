-- SafeWatch Production Schema

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  name text not null,
  user_type text check (user_type in ('safety-seeker','responder')) not null,
  phone_number text,
  is_email_verified boolean default false not null,
  is_phone_verified boolean default false not null,
  is_verified boolean default false not null,
  profile_complete boolean default false not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists public.alerts (
  id text primary key,
  title text not null,
  description text not null,
  timestamp timestamp with time zone not null,
  latitude double precision not null,
  longitude double precision not null,
  address text,
  status text check (status in ('active','acknowledged','resolved')) not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  response_deadline timestamp with time zone,
  current_batch integer,
  max_batches integer,
  responders_per_batch integer,
  total_responders integer,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists public.alert_responses (
  id text primary key,
  alert_id text not null references public.alerts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  timestamp timestamp with time zone not null,
  action text check (action in ('acknowledge','respond')) not null,
  created_at timestamp with time zone default now() not null
);

-- Updated at triggers
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_alerts_updated_at on public.alerts;
create trigger set_alerts_updated_at
before update on public.alerts
for each row execute function public.set_updated_at();

-- RLS
alter table public.profiles enable row level security;
alter table public.alerts enable row level security;
alter table public.alert_responses enable row level security;

-- Profiles: users can select/update only their own profile, insert on sign-up via edge function or client with service role
create policy if not exists "Profiles are viewable by self" on public.profiles for select using (auth.uid() = id);
create policy if not exists "Profiles are updatable by self" on public.profiles for update using (auth.uid() = id);
create policy if not exists "Profiles are insertable by self" on public.profiles for insert with check (auth.uid() = id);

-- Alerts: owner can manage, responders can read if related by response, or broaden with geo policies later
create policy if not exists "Alert owner can crud" on public.alerts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy if not exists "Responders can read responded alerts" on public.alerts
  for select using (exists (
    select 1 from public.alert_responses ar
    where ar.alert_id = alerts.id and ar.user_id = auth.uid()
  ));

-- Alert responses: user can insert their own responses; readable by owner and responders
create policy if not exists "Users insert own responses" on public.alert_responses
  for insert with check (auth.uid() = user_id);

create policy if not exists "Owner and responders can read responses" on public.alert_responses
  for select using (
    exists (select 1 from public.alerts a where a.id = alert_id and a.user_id = auth.uid())
    or user_id = auth.uid()
  );

-- Realtime
alter publication supabase_realtime add table public.alerts;
alter publication supabase_realtime add table public.alert_responses;


