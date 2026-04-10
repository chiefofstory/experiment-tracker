-- Experiment Tracker Schema
-- Run this in Supabase SQL editor to set up the database

-- Experiments: the top-level entity
create table experiments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tier integer not null default 1,
  status text not null default 'active' check (status in ('active','paused','passed','failed','archived')),
  goal text not null default '', -- what does passing this tier gate to?
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Versions: each pivot creates a new version
create table experiment_versions (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references experiments(id) on delete cascade,
  version_number integer not null default 1,
  hypothesis text not null default '',
  inputs jsonb not null default '[]', -- array of strings: levers being pushed
  expected_output text not null default '',
  pass_fail_criteria text not null default '',
  outcome text not null default 'ongoing' check (outcome in ('pass','fail','inconclusive','ongoing')),
  pivot_reason text,
  start_date timestamptz not null default now(),
  end_date timestamptz,
  created_at timestamptz not null default now(),
  unique(experiment_id, version_number)
);

-- Measurements: data points logged over time
create table measurements (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references experiments(id) on delete cascade,
  version_id uuid references experiment_versions(id) on delete set null,
  metric_name text not null,
  value text not null,
  notes text,
  measured_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Tasks: action items tied to experiments
create table tasks (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references experiments(id) on delete cascade,
  title text not null,
  type text not null default 'other' check (type in ('measure','act','review','decide','other')),
  due_date date,
  status text not null default 'todo' check (status in ('todo','done')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for common queries
create index on experiments(status);
create index on experiment_versions(experiment_id);
create index on measurements(experiment_id, measured_at desc);
create index on tasks(experiment_id, status);
create index on tasks(due_date) where status = 'todo';

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger experiments_updated_at before update on experiments
  for each row execute function update_updated_at();

create trigger tasks_updated_at before update on tasks
  for each row execute function update_updated_at();
