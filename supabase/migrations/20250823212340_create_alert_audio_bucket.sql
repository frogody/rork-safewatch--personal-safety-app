-- Create public storage bucket for alert audio and policies
insert into storage.buckets (id, name, public)
values ('alert-audio', 'alert-audio', true)
on conflict (id) do nothing;

-- Enable RLS is already set on storage.objects

do $$ begin
  create policy "alert-audio read" on storage.objects for select
    to authenticated
    using (bucket_id = 'alert-audio');
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "alert-audio public read" on storage.objects for select
    to anon
    using (bucket_id = 'alert-audio');
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "alert-audio insert by owner" on storage.objects for insert
    to authenticated
    with check (bucket_id = 'alert-audio' and owner = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "alert-audio update by owner" on storage.objects for update
    to authenticated
    using (bucket_id = 'alert-audio' and owner = auth.uid())
    with check (bucket_id = 'alert-audio' and owner = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "alert-audio delete by owner" on storage.objects for delete
    to authenticated
    using (bucket_id = 'alert-audio' and owner = auth.uid());
exception when duplicate_object then null; end $$;

