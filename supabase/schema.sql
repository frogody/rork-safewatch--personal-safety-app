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

-- Profiles policies
do $$ begin
  create policy "Profiles are viewable by self" on public.profiles for select using (auth.uid() = id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Profiles are updatable by self" on public.profiles for update using (auth.uid() = id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Profiles are insertable by self" on public.profiles for insert with check (auth.uid() = id);
exception when duplicate_object then null; end $$;

-- Alerts policies (owner-only, non-recursive)
do $$ begin
  create policy "alerts_owner_all" on public.alerts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- Alert responses policies
do $$ begin
  create policy "alert_responses_insert_self" on public.alert_responses for insert with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "alert_responses_select_owner_or_self" on public.alert_responses for select using (
    user_id = auth.uid() or exists (select 1 from public.alerts a where a.id = alert_id and a.user_id = auth.uid())
  );
exception when duplicate_object then null; end $$;

-- Realtime
alter publication supabase_realtime add table public.alerts;
alter publication supabase_realtime add table public.alert_responses;

-- Auto-create profile on auth signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, name, user_type, is_email_verified, profile_complete)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), coalesce(new.raw_user_meta_data->>'user_type','safety-seeker'), new.email_confirmed_at is not null, false)
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();


