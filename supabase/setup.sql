create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  description text not null check (char_length(description) between 1 and 1000),
  severity text not null check (severity in ('Partially blocked', 'Fully blocked', 'Overflowing')),
  danger boolean not null default false,
  photo_path text,
  status text not null default 'Reported' check (status in ('Reported', 'Verified', 'In progress', 'Resolved')),
  seen integer not null default 1 check (seen >= 0),
  log jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

alter table public.reports enable row level security;
alter table public.admins enable row level security;

drop policy if exists "Anyone can view reports" on public.reports;
create policy "Anyone can view reports" on public.reports
  for select to anon, authenticated using (true);

drop policy if exists "Anyone can submit reported items" on public.reports;
create policy "Anyone can submit reported items" on public.reports
  for insert to anon, authenticated
  with check (
    status = 'Reported'
    and seen = 1
    and case
      when jsonb_typeof(log) = 'array'
        then jsonb_array_length(log) = 1 and log -> 0 ->> 0 = 'Reported'
      else false
    end
  );

drop policy if exists "Admins can update reports" on public.reports;
create policy "Admins can update reports" on public.reports
  for update to authenticated
  using (exists (select 1 from public.admins where user_id = auth.uid()))
  with check (exists (select 1 from public.admins where user_id = auth.uid()));

drop policy if exists "Admins can delete reports" on public.reports;
create policy "Admins can delete reports" on public.reports
  for delete to authenticated
  using (exists (select 1 from public.admins where user_id = auth.uid()));

drop policy if exists "Admins can view own admin record" on public.admins;
create policy "Admins can view own admin record" on public.admins
  for select to authenticated using (user_id = auth.uid());

grant select, insert on public.reports to anon, authenticated;
grant update, delete on public.reports to authenticated;
grant select on public.admins to authenticated;

create or replace function public.increment_report_seen(report_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_seen integer;
begin
  update public.reports set seen = seen + 1 where id = report_id returning seen into updated_seen;
  return updated_seen;
end;
$$;

revoke all on function public.increment_report_seen(uuid) from public;
grant execute on function public.increment_report_seen(uuid) to anon, authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'reports'
     ) then
    alter publication supabase_realtime add table public.reports;
  end if;
end;
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('report-photos', 'report-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Anyone can view report photos" on storage.objects;
create policy "Anyone can view report photos" on storage.objects
  for select to anon, authenticated using (bucket_id = 'report-photos');

drop policy if exists "Anyone can upload report photos" on storage.objects;
create policy "Anyone can upload report photos" on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'report-photos');

drop policy if exists "Admins can delete report photos" on storage.objects;
create policy "Admins can delete report photos" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'report-photos'
    and exists (select 1 from public.admins where user_id = auth.uid())
  );

insert into public.reports (id, lat, lng, description, severity, danger, status, seen, log, created_at)
values
  ('10000000-0000-4000-8000-000000000001', 14.4560, 120.9930, 'Grate covered in plastic and leaves. Water pools on the road after light rain.', 'Fully blocked', false, 'Reported', 6, '[["Reported","Oct 8"]]'::jsonb, now() - interval '4 days'),
  ('10000000-0000-4000-8000-000000000002', 14.4420, 121.0020, 'Open drain with a missing cover beside the sidewalk.', 'Overflowing', true, 'Verified', 14, '[["Reported","Oct 3"],["Verified","Oct 5"]]'::jsonb, now() - interval '9 days'),
  ('10000000-0000-4000-8000-000000000003', 14.4690, 120.9900, 'Silt buildup along the curb, drain barely draining.', 'Partially blocked', false, 'In progress', 3, '[["Reported","Sep 28"],["Verified","Sep 30"],["In progress","Oct 6"]]'::jsonb, now() - interval '14 days'),
  ('10000000-0000-4000-8000-000000000004', 14.4300, 120.9900, 'Cleared by the barangay crew.', 'Fully blocked', false, 'Resolved', 9, '[["Reported","Sep 20"],["Verified","Sep 21"],["In progress","Sep 24"],["Resolved","Sep 27"]]'::jsonb, now() - interval '22 days')
on conflict (id) do nothing;
