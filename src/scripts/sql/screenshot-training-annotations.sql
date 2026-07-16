-- Private manual annotations for building detection training.
-- The screenshot remains governed by the existing import retention policy.

create table if not exists public.screenshot_training_annotations (
  id uuid primary key default gen_random_uuid(),
  import_session_id uuid not null references public.screenshot_import_sessions(id) on delete cascade,
  screenshot_id uuid not null references public.screenshot_import_files(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  annotation_kind text not null default 'object_icon' check (annotation_kind in (
    'object_card', 'object_icon', 'level_region', 'status_icon',
    'time_region', 'resource_region', 'ui_anchor'
  )),
  entity_id text not null check (char_length(entity_id) between 1 and 160),
  entity_type text not null check (entity_type in ('building', 'wall')),
  level integer check (level is null or level between 0 and 100),
  bounding_box jsonb not null check (
    jsonb_typeof(bounding_box) = 'object'
    and (bounding_box->>'x')::numeric between 0 and 1
    and (bounding_box->>'y')::numeric between 0 and 1
    and (bounding_box->>'width')::numeric > 0
    and (bounding_box->>'height')::numeric > 0
    and (bounding_box->>'x')::numeric + (bounding_box->>'width')::numeric <= 1
    and (bounding_box->>'y')::numeric + (bounding_box->>'height')::numeric <= 1
  ),
  improvement_consent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists screenshot_training_annotations_user_session_idx
  on public.screenshot_training_annotations (user_id, import_session_id, screenshot_id);
create index if not exists screenshot_training_annotations_session_idx
  on public.screenshot_training_annotations (import_session_id);
create index if not exists screenshot_training_annotations_consented_idx
  on public.screenshot_training_annotations (screenshot_id, entity_id)
  where improvement_consent = true;

alter table public.screenshot_training_annotations enable row level security;

drop policy if exists "Users manage own screenshot training annotations"
  on public.screenshot_training_annotations;
create policy "Users manage own screenshot training annotations"
  on public.screenshot_training_annotations for all to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.screenshot_import_sessions sessions
      where sessions.id = import_session_id
        and sessions.user_id = (select auth.uid())
    )
    and exists (
      select 1
      from public.screenshot_import_files files
      where files.id = screenshot_id
        and files.import_session_id = screenshot_training_annotations.import_session_id
        and files.user_id = (select auth.uid())
        and files.screen_type = 'village'
        and files.deleted_at is null
    )
  );

grant select, insert, update, delete
  on public.screenshot_training_annotations to authenticated;
