create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  college text not null,
  branch text not null,
  year integer not null,
  semester integer not null,
  section text not null,
  roll_number text not null,
  created_at timestamptz not null default now()
);

create table attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  timetable_session_id text not null,
  subject text not null,
  class_type text not null check (class_type in ('lecture', 'lab')),
  status text not null check (status in ('present', 'absent')),
  source text not null default 'manual' check (source in ('manual', 'erp')),
  created_at timestamptz not null default now(),
  unique (user_id, date, timetable_session_id)
);

create index idx_attendance_user_id on attendance(user_id);
create index idx_attendance_date on attendance(date);
create index idx_attendance_subject on attendance(subject);

alter table profiles enable row level security;
alter table attendance enable row level security;

create policy "read own profile" on profiles
  for select using (auth.uid() = id);

create policy "insert own profile" on profiles
  for insert with check (auth.uid() = id);

create policy "update own profile" on profiles
  for update using (auth.uid() = id);

create policy "read own attendance" on attendance
  for select using (auth.uid() = user_id);

create policy "insert own attendance" on attendance
  for insert with check (auth.uid() = user_id);

create policy "update own attendance" on attendance
  for update using (auth.uid() = user_id);

create policy "delete own attendance" on attendance
  for delete using (auth.uid() = user_id);
