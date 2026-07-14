-- Allow one guided import session to combine every supported screenshot area.

alter table public.screenshot_import_sessions
  drop constraint if exists screenshot_import_sessions_selected_import_type_check;

alter table public.screenshot_import_sessions
  add constraint screenshot_import_sessions_selected_import_type_check
  check (selected_import_type in (
    'laboratory', 'heroes', 'pets', 'equipment', 'builders', 'buildings',
    'walls', 'village', 'resources', 'profile', 'full'
  ));
