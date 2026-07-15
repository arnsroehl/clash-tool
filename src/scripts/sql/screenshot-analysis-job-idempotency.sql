-- Prevent parallel start-analysis requests from creating duplicate active
-- stages for the same screenshot. Completed and failed jobs remain as history
-- and do not block an explicit retry.

create unique index if not exists screenshot_analysis_jobs_one_active_stage_idx
  on public.screenshot_analysis_jobs (import_session_id, screenshot_id, job_type)
  where screenshot_id is not null and status in ('queued', 'running');
