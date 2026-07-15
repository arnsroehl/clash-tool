-- Persist the language detected from OCR independently from the user's app
-- language. Unknown remains a valid, explicit fallback because the OCR worker
-- supports German and English simultaneously.

alter table public.screenshot_import_files
  add column if not exists detected_language text not null default 'unknown',
  add column if not exists language_confidence numeric(5,4) not null default 0;

alter table public.screenshot_import_files
  drop constraint if exists screenshot_import_files_detected_language_check,
  drop constraint if exists screenshot_import_files_language_confidence_check;

alter table public.screenshot_import_files
  add constraint screenshot_import_files_detected_language_check
    check (detected_language in ('de', 'en', 'unknown')),
  add constraint screenshot_import_files_language_confidence_check
    check (language_confidence between 0 and 1);
