export type ExperimentStatus = 'active' | 'paused' | 'passed' | 'failed' | 'archived'
export type TaskStatus = 'todo' | 'done'
export type TaskType = 'measure' | 'act' | 'review' | 'decide' | 'other'
export type VersionOutcome = 'pass' | 'fail' | 'inconclusive' | 'ongoing'

export interface Experiment {
  id: string
  name: string
  tier: number
  status: ExperimentStatus
  goal: string // what does passing this tier gate to?
  created_at: string
  updated_at: string
  // from current version (joined)
  current_hypothesis?: string
  current_inputs?: string[]
  current_expected_output?: string
  current_pass_fail_criteria?: string
  current_version_number?: number
  current_version_id?: string
}

export interface ExperimentVersion {
  id: string
  experiment_id: string
  version_number: number
  hypothesis: string
  inputs: string[] // levers being pushed
  expected_output: string
  pass_fail_criteria: string
  outcome: VersionOutcome
  pivot_reason?: string
  start_date: string
  end_date?: string
  created_at: string
}

export interface Measurement {
  id: string
  experiment_id: string
  version_id?: string
  metric_name: string
  value: string // stored as string to support "12%", "$4.20", "3 replies", etc.
  notes?: string
  measured_at: string
  created_at: string
}

export interface Task {
  id: string
  experiment_id: string
  title: string
  type: TaskType
  due_date?: string
  status: TaskStatus
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

// For dashboard display
export interface ExperimentSummary extends Experiment {
  versions: ExperimentVersion[]
  recent_measurements: Measurement[]
  open_tasks: Task[]
  days_running: number
}
