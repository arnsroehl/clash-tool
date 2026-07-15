-- Keep user-created timeline reminders when generated notifications are refreshed.
alter table public.planner_notifications add column if not exists is_manual boolean not null default false;
create index if not exists planner_notifications_manual_idx on public.planner_notifications(account_id, notify_at) where is_manual;
