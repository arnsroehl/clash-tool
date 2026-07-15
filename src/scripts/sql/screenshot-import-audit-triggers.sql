-- Database-level audit trail for every screenshot import entry point.
-- SECURITY INVOKER keeps the existing RLS ownership checks in force.

create or replace function public.audit_screenshot_import_session()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.screenshot_import_events (
      import_session_id,
      user_id,
      event_type,
      details
    ) values (
      new.id,
      new.user_id,
      'import_created',
      jsonb_build_object(
        'selected_import_type', new.selected_import_type,
        'game_version', new.game_version,
        'retain_originals', new.retain_originals
      )
    );
  elsif tg_op = 'UPDATE' and old.status is distinct from new.status then
    insert into public.screenshot_import_events (
      import_session_id,
      user_id,
      event_type,
      details
    ) values (
      new.id,
      new.user_id,
      'import_status_changed',
      jsonb_build_object('from', old.status, 'to', new.status)
    );
  end if;
  return new;
end;
$$;

revoke all on function public.audit_screenshot_import_session() from public;
revoke all on function public.audit_screenshot_import_session() from anon;
revoke all on function public.audit_screenshot_import_session() from authenticated;

drop trigger if exists audit_screenshot_import_session_trigger
  on public.screenshot_import_sessions;
create trigger audit_screenshot_import_session_trigger
after insert or update of status on public.screenshot_import_sessions
for each row execute function public.audit_screenshot_import_session();

create or replace function public.audit_screenshot_import_file()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.screenshot_import_events (
      import_session_id,
      user_id,
      event_type,
      details
    ) values (
      new.import_session_id,
      new.user_id,
      'screenshot_uploaded',
      jsonb_build_object(
        'screenshot_id', new.id,
        'screen_type', new.screen_type,
        'width', new.width,
        'height', new.height
      )
    );
  elsif tg_op = 'UPDATE'
    and old.deleted_at is null
    and new.deleted_at is not null then
    insert into public.screenshot_import_events (
      import_session_id,
      user_id,
      event_type,
      details
    ) values (
      new.import_session_id,
      new.user_id,
      'original_screenshot_deleted',
      jsonb_build_object(
        'screenshot_id', new.id,
        'processing_status', new.processing_status,
        'deleted_at', new.deleted_at
      )
    );
  end if;
  return new;
end;
$$;

revoke all on function public.audit_screenshot_import_file() from public;
revoke all on function public.audit_screenshot_import_file() from anon;
revoke all on function public.audit_screenshot_import_file() from authenticated;

drop trigger if exists audit_screenshot_import_file_trigger
  on public.screenshot_import_files;
create trigger audit_screenshot_import_file_trigger
after insert or update of deleted_at on public.screenshot_import_files
for each row execute function public.audit_screenshot_import_file();

