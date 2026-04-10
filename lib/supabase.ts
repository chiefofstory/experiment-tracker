import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ─── Experiments ───────────────────────────────────────────────────────────

export async function getExperiments() {
  const { data: experiments, error } = await supabase
    .from('experiments')
    .select('*')
    .neq('status', 'archived')
    .order('created_at', { ascending: false })

  if (error) throw error

  // Fetch current version for each experiment
  const withVersions = await Promise.all(
    (experiments || []).map(async (exp) => {
      const { data: versions } = await supabase
        .from('experiment_versions')
        .select('*')
        .eq('experiment_id', exp.id)
        .order('version_number', { ascending: false })

      const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('experiment_id', exp.id)
        .eq('status', 'todo')
        .order('due_date', { ascending: true })

      const { data: measurements } = await supabase
        .from('measurements')
        .select('*')
        .eq('experiment_id', exp.id)
        .order('measured_at', { ascending: false })
        .limit(5)

      const currentVersion = versions?.[0]
      const createdDate = new Date(exp.created_at)
      const daysRunning = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24))

      return {
        ...exp,
        versions: versions || [],
        open_tasks: tasks || [],
        recent_measurements: measurements || [],
        days_running: daysRunning,
        current_hypothesis: currentVersion?.hypothesis,
        current_inputs: currentVersion?.inputs,
        current_expected_output: currentVersion?.expected_output,
        current_pass_fail_criteria: currentVersion?.pass_fail_criteria,
        current_version_number: currentVersion?.version_number,
        current_version_id: currentVersion?.id,
      }
    })
  )

  return withVersions
}

export async function getExperiment(id: string) {
  const { data: exp, error } = await supabase
    .from('experiments')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error

  const { data: versions } = await supabase
    .from('experiment_versions')
    .select('*')
    .eq('experiment_id', id)
    .order('version_number', { ascending: false })

  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('experiment_id', id)
    .order('status', { ascending: true })
    .order('due_date', { ascending: true })

  const { data: measurements } = await supabase
    .from('measurements')
    .select('*')
    .eq('experiment_id', id)
    .order('measured_at', { ascending: false })

  const currentVersion = versions?.[0]
  const createdDate = new Date(exp.created_at)
  const daysRunning = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24))

  return {
    ...exp,
    versions: versions || [],
    tasks: tasks || [],
    measurements: measurements || [],
    days_running: daysRunning,
    current_hypothesis: currentVersion?.hypothesis,
    current_inputs: currentVersion?.inputs,
    current_expected_output: currentVersion?.expected_output,
    current_pass_fail_criteria: currentVersion?.pass_fail_criteria,
    current_version_number: currentVersion?.version_number,
    current_version_id: currentVersion?.id,
    open_tasks: (tasks || []).filter(t => t.status === 'todo'),
    recent_measurements: (measurements || []).slice(0, 5),
  }
}

export async function createExperiment(data: {
  name: string
  tier: number
  status?: string
  goal: string
  hypothesis: string
  inputs: string[]
  expected_output: string
  pass_fail_criteria: string
}) {
  const { data: exp, error } = await supabase
    .from('experiments')
    .insert({
      name: data.name,
      tier: data.tier,
      status: data.status || 'active',
      goal: data.goal,
    })
    .select()
    .single()

  if (error) throw error

  const { error: versionError } = await supabase
    .from('experiment_versions')
    .insert({
      experiment_id: exp.id,
      version_number: 1,
      hypothesis: data.hypothesis,
      inputs: data.inputs,
      expected_output: data.expected_output,
      pass_fail_criteria: data.pass_fail_criteria,
      outcome: 'ongoing',
    })

  if (versionError) throw versionError

  return exp
}

export async function updateExperiment(id: string, updates: Partial<{
  name: string
  tier: number
  status: string
  goal: string
}>) {
  const { data, error } = await supabase
    .from('experiments')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function pivotExperiment(experimentId: string, data: {
  pivot_reason: string
  hypothesis: string
  inputs: string[]
  expected_output: string
  pass_fail_criteria: string
  previous_outcome: 'pass' | 'fail' | 'inconclusive'
  previous_version_id: string
  new_version_number: number
}) {
  // Close the previous version
  await supabase
    .from('experiment_versions')
    .update({ outcome: data.previous_outcome, end_date: new Date().toISOString() })
    .eq('id', data.previous_version_id)

  // Create the new version
  const { data: newVersion, error } = await supabase
    .from('experiment_versions')
    .insert({
      experiment_id: experimentId,
      version_number: data.new_version_number,
      hypothesis: data.hypothesis,
      inputs: data.inputs,
      expected_output: data.expected_output,
      pass_fail_criteria: data.pass_fail_criteria,
      pivot_reason: data.pivot_reason,
      outcome: 'ongoing',
    })
    .select()
    .single()

  if (error) throw error
  return newVersion
}

// ─── Measurements ──────────────────────────────────────────────────────────

export async function addMeasurement(data: {
  experiment_id: string
  version_id?: string
  metric_name: string
  value: string
  notes?: string
  measured_at?: string
}) {
  const { data: measurement, error } = await supabase
    .from('measurements')
    .insert({
      ...data,
      measured_at: data.measured_at || new Date().toISOString(),
    })
    .select()
    .single()

  if (error) throw error
  return measurement
}

// ─── Tasks ─────────────────────────────────────────────────────────────────

export async function addTask(data: {
  experiment_id: string
  title: string
  type?: string
  due_date?: string
}) {
  const { data: task, error } = await supabase
    .from('tasks')
    .insert(data)
    .select()
    .single()

  if (error) throw error
  return task
}

export async function completeTask(id: string) {
  const { data, error } = await supabase
    .from('tasks')
    .update({ status: 'done' })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteTask(id: string) {
  const { error } = await supabase.from('tasks').delete().eq('id', id)
  if (error) throw error
}

export async function getTodaysTasks() {
  const today = new Date().toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('tasks')
    .select('*, experiments(name, tier, status)')
    .eq('status', 'todo')
    .lte('due_date', today)
    .order('due_date', { ascending: true })

  if (error) throw error
  return data || []
}
