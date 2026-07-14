-- Screenshot import persistence and private Storage policies.
-- Run this file in the Supabase SQL editor before enabling persisted imports.

create table if not exists public.screenshot_import_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  selected_import_type text not null check (selected_import_type in (
    'laboratory', 'heroes', 'pets', 'equipment', 'builders', 'buildings',
    'walls', 'village', 'resources', 'profile', 'full'
  )),
  status text not null default 'draft' check (status in (
    'draft', 'uploaded', 'preprocessing', 'analyzing', 'validating',
    'review_required', 'ready', 'confirmed', 'failed', 'cancelled'
  )),
  game_version text,
  language text not null default 'de' check (language in ('de', 'en', 'unknown')),
  retain_originals boolean not null default false,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  confirmed_at timestamptz
);

create table if not exists public.screenshot_import_files (
  id uuid primary key default gen_random_uuid(),
  import_session_id uuid not null references public.screenshot_import_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null unique,
  original_filename text not null,
  content_hash text,
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  screen_type text not null default 'unknown' check (screen_type in (
    'laboratory', 'heroes', 'pets', 'equipment', 'builders', 'buildings',
    'walls', 'village', 'resources', 'profile', 'unknown'
  )),
  screen_type_confidence numeric(5,4) not null default 0 check (screen_type_confidence between 0 and 1),
  quality_score numeric(5,4) not null check (quality_score between 0 and 1),
  quality_issues jsonb not null default '[]'::jsonb,
  processing_status text not null default 'uploaded' check (processing_status in (
    'uploaded', 'preprocessing', 'analyzing', 'validating', 'review_required',
    'ready', 'failed', 'deleted'
  )),
  model_version text not null default 'local-tesseract-v1',
  layout_version text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.screenshot_import_detections (
  id uuid primary key default gen_random_uuid(),
  import_session_id uuid not null references public.screenshot_import_sessions(id) on delete cascade,
  screenshot_id uuid not null references public.screenshot_import_files(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  region_type text not null default 'row',
  bounding_box jsonb,
  entity_type text not null,
  recognized_entity_id text,
  recognized_text text,
  recognized_level integer check (recognized_level is null or recognized_level >= 0),
  recognized_status text,
  object_confidence numeric(5,4) not null check (object_confidence between 0 and 1),
  text_confidence numeric(5,4) not null check (text_confidence between 0 and 1),
  layout_confidence numeric(5,4) not null check (layout_confidence between 0 and 1),
  validation_confidence numeric(5,4) not null check (validation_confidence between 0 and 1),
  overall_confidence numeric(5,4) not null check (overall_confidence between 0 and 1),
  raw_result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.screenshot_import_changes (
  id uuid primary key default gen_random_uuid(),
  import_session_id uuid not null references public.screenshot_import_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null,
  entity_id text not null,
  change_type text not null check (change_type in (
    'level_increased', 'level_regression', 'unchanged', 'new_entity', 'conflict',
    'upgrade_started', 'upgrade_completed', 'remaining_time_changed', 'resource_changed'
  )),
  previous_value jsonb,
  proposed_value jsonb,
  confidence numeric(5,4) not null check (confidence between 0 and 1),
  status text not null default 'pending' check (status in (
    'pending', 'accepted', 'rejected', 'corrected', 'later'
  )),
  source_detection_ids uuid[] not null default '{}',
  reasons jsonb not null default '[]'::jsonb,
  user_corrected_value jsonb,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (import_session_id, entity_type, entity_id)
);

create table if not exists public.screenshot_import_events (
  id bigint generated always as identity primary key,
  import_session_id uuid not null references public.screenshot_import_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.screenshot_import_feedback (
  id uuid primary key default gen_random_uuid(),
  import_session_id uuid not null references public.screenshot_import_sessions(id) on delete cascade,
  detection_id uuid references public.screenshot_import_detections(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  previous_result jsonb not null,
  corrected_result jsonb not null,
  improvement_consent boolean not null default false,
  model_version text,
  game_version text,
  language text,
  device_type text,
  created_at timestamptz not null default now()
);

create index if not exists screenshot_import_sessions_user_idx
  on public.screenshot_import_sessions (user_id, created_at desc);
create index if not exists screenshot_import_sessions_account_idx
  on public.screenshot_import_sessions (account_id, created_at desc);
create index if not exists screenshot_import_files_session_idx
  on public.screenshot_import_files (import_session_id);
create index if not exists screenshot_import_files_user_hash_idx
  on public.screenshot_import_files (user_id, content_hash) where content_hash is not null;
create index if not exists screenshot_import_detections_session_idx
  on public.screenshot_import_detections (import_session_id);
create index if not exists screenshot_import_detections_screenshot_idx
  on public.screenshot_import_detections (screenshot_id);
create index if not exists screenshot_import_detections_user_idx
  on public.screenshot_import_detections (user_id);
create index if not exists screenshot_import_changes_session_status_idx
  on public.screenshot_import_changes (import_session_id, status);
create index if not exists screenshot_import_changes_user_idx
  on public.screenshot_import_changes (user_id);
create index if not exists screenshot_import_events_session_idx
  on public.screenshot_import_events (import_session_id, created_at);
create index if not exists screenshot_import_events_user_idx
  on public.screenshot_import_events (user_id);
create index if not exists screenshot_import_feedback_session_idx
  on public.screenshot_import_feedback (import_session_id);
create index if not exists screenshot_import_feedback_detection_idx
  on public.screenshot_import_feedback (detection_id) where detection_id is not null;
create index if not exists screenshot_import_feedback_user_idx
  on public.screenshot_import_feedback (user_id);

alter table public.screenshot_import_sessions enable row level security;
alter table public.screenshot_import_files enable row level security;
alter table public.screenshot_import_detections enable row level security;
alter table public.screenshot_import_changes enable row level security;
alter table public.screenshot_import_events enable row level security;
alter table public.screenshot_import_feedback enable row level security;

drop policy if exists "Users manage own screenshot import sessions" on public.screenshot_import_sessions;
create policy "Users manage own screenshot import sessions"
  on public.screenshot_import_sessions for all to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.accounts
      where accounts.id = account_id and accounts.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users manage own screenshot import files" on public.screenshot_import_files;
create policy "Users manage own screenshot import files"
  on public.screenshot_import_files for all to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.screenshot_import_sessions sessions
      where sessions.id = import_session_id and sessions.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users manage own screenshot detections" on public.screenshot_import_detections;
create policy "Users manage own screenshot detections"
  on public.screenshot_import_detections for all to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.screenshot_import_sessions sessions
      where sessions.id = import_session_id and sessions.user_id = (select auth.uid())
    )
    and exists (
      select 1 from public.screenshot_import_files files
      where files.id = screenshot_id
        and files.import_session_id = screenshot_import_detections.import_session_id
        and files.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users manage own screenshot changes" on public.screenshot_import_changes;
create policy "Users manage own screenshot changes"
  on public.screenshot_import_changes for all to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.screenshot_import_sessions sessions
      where sessions.id = import_session_id and sessions.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users read own screenshot events" on public.screenshot_import_events;
create policy "Users read own screenshot events"
  on public.screenshot_import_events for select to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists "Users append own screenshot events" on public.screenshot_import_events;
create policy "Users append own screenshot events"
  on public.screenshot_import_events for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.screenshot_import_sessions sessions
      where sessions.id = import_session_id and sessions.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users manage own screenshot feedback" on public.screenshot_import_feedback;
create policy "Users manage own screenshot feedback"
  on public.screenshot_import_feedback for all to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.screenshot_import_sessions sessions
      where sessions.id = import_session_id and sessions.user_id = (select auth.uid())
    )
    and (
      detection_id is null
      or exists (
        select 1 from public.screenshot_import_detections detections
        where detections.id = detection_id
          and detections.import_session_id = screenshot_import_feedback.import_session_id
          and detections.user_id = (select auth.uid())
      )
    )
  );

grant select, insert, update, delete on public.screenshot_import_sessions to authenticated;
grant select, insert, update, delete on public.screenshot_import_files to authenticated;
grant select, insert, update, delete on public.screenshot_import_detections to authenticated;
grant select, insert, update, delete on public.screenshot_import_changes to authenticated;
grant select, insert on public.screenshot_import_events to authenticated;
grant usage, select on sequence public.screenshot_import_events_id_seq to authenticated;
grant select, insert, update, delete on public.screenshot_import_feedback to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'screenshot-imports',
  'screenshot-imports',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users upload own screenshot imports" on storage.objects;
create policy "Users upload own screenshot imports"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'screenshot-imports'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
drop policy if exists "Users read own screenshot imports" on storage.objects;
create policy "Users read own screenshot imports"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'screenshot-imports'
    and owner_id = (select auth.uid()::text)
  );
drop policy if exists "Users delete own screenshot imports" on storage.objects;
create policy "Users delete own screenshot imports"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'screenshot-imports'
    and owner_id = (select auth.uid()::text)
  );
