-- Store only coarse, purpose-bound source metadata. Original EXIF/GPS metadata
-- is not persisted because images are re-encoded before Storage upload.

alter table public.screenshot_import_files
  add column if not exists original_mime_type text,
  add column if not exists original_size_bytes bigint,
  add column if not exists normalized_mime_type text,
  add column if not exists normalized_size_bytes bigint,
  add column if not exists device_platform text not null default 'unknown';

alter table public.screenshot_import_files
  drop constraint if exists screenshot_import_files_original_mime_type_check,
  drop constraint if exists screenshot_import_files_original_size_bytes_check,
  drop constraint if exists screenshot_import_files_normalized_mime_type_check,
  drop constraint if exists screenshot_import_files_normalized_size_bytes_check,
  drop constraint if exists screenshot_import_files_device_platform_check;

alter table public.screenshot_import_files
  add constraint screenshot_import_files_original_mime_type_check
    check (original_mime_type is null or original_mime_type ~ '^image/'),
  add constraint screenshot_import_files_original_size_bytes_check
    check (original_size_bytes is null or original_size_bytes between 1 and 20971520),
  add constraint screenshot_import_files_normalized_mime_type_check
    check (normalized_mime_type is null or normalized_mime_type = 'image/jpeg'),
  add constraint screenshot_import_files_normalized_size_bytes_check
    check (normalized_size_bytes is null or normalized_size_bytes between 1 and 20971520),
  add constraint screenshot_import_files_device_platform_check
    check (device_platform in (
      'ios', 'android', 'macos', 'windows', 'linux', 'chromeos', 'other', 'unknown'
    ));
