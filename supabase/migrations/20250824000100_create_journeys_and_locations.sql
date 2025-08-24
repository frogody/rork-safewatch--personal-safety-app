-- Journeys and live location sharing
create table if not exists public.journeys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  destination_name text not null,
  dest_lat double precision not null,
  dest_lon double precision not null,
  transport text not null check (transport in ('walk','bike','car','public')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  is_active boolean not null default true,
  share_token text unique not null
);

alter table public.journeys enable row level security;

-- Only owner can insert/select/update their journeys
create policy if not exists journeys_owner_ins on public.journeys
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy if not exists journeys_owner_sel on public.journeys
  for select to authenticated
  using (auth.uid() = user_id);

create policy if not exists journeys_owner_upd on public.journeys
  for update to authenticated
  using (auth.uid() = user_id);

-- Locations
create table if not exists public.journey_locations (
  id bigserial primary key,
  journey_id uuid not null references public.journeys(id) on delete cascade,
  ts timestamptz not null default now(),
  lat double precision not null,
  lon double precision not null,
  speed double precision
);

create index if not exists idx_journey_locations_journey_ts on public.journey_locations(journey_id, ts desc);

alter table public.journey_locations enable row level security;

-- Owner can write/read
create policy if not exists jl_owner_ins on public.journey_locations
  for insert to authenticated
  with check (exists (select 1 from public.journeys j where j.id = journey_id and j.user_id = auth.uid()));

create policy if not exists jl_owner_sel on public.journey_locations
  for select to authenticated
  using (exists (select 1 from public.journeys j where j.id = journey_id and j.user_id = auth.uid()));

-- Public read via RPC (see function below). No blanket anon select policy.

-- RPC to fetch a journey and its latest locations by share token
create or replace function public.get_journey_feed(token text)
returns table (
  journey_id uuid,
  destination_name text,
  dest_lat double precision,
  dest_lon double precision,
  transport text,
  started_at timestamptz,
  ended_at timestamptz,
  is_active boolean,
  point_time timestamptz,
  lat double precision,
  lon double precision,
  speed double precision
) language sql stable security definer set search_path = public as $$
  select j.id as journey_id,
         j.destination_name,
         j.dest_lat,
         j.dest_lon,
         j.transport,
         j.started_at,
         j.ended_at,
         j.is_active,
         l.ts as point_time,
         l.lat,
         l.lon,
         l.speed
  from public.journeys j
  left join lateral (
    select * from public.journey_locations jl
    where jl.journey_id = j.id
    order by jl.ts desc
    limit 100
  ) l on true
  where j.share_token = token
  order by l.ts nulls last
$$;

revoke all on function public.get_journey_feed(text) from public;
grant execute on function public.get_journey_feed(text) to anon, authenticated;


