import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

function db(): SupabaseClient {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) throw new Error('Supabase env vars not configured')
    _client = createClient(url, key)
  }
  return _client
}

// ─── Experiments ───────────────────────────────────────────────────────────

export async function getExperiments() {
  const { data: experiments, error } = await db()
    .from('experiments')
    .select('*')
    .neq('status', 'archived')
    .order('created_at', { ascending: false })

  if (error) throw error

  const withVersions = await Promise.all(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (experiments || []).map(async (exp: any) => {
      const { data: versions } = await db()
        .from('experiment_versions')
        .select('*')
        .eq('experiment_id', exp.id)
        .order('version_number', { ascending: false })

      const { data: tasks } = await db()
        .from('tasks')
        .select('*')
        .eq('experiment_id', exp.id)
        .eq('status', 'todo')
        .order('due_date', { ascending: true })

      const { data: measurements } = await db()
        .from('measurements')
        .select('*')
        .eq('experiment_id', exp.id)
        .order('measured_at', { ascending: false })
        .limit(5)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const currentVersion = versions?.[0] as any
      const daysRunning = Math.floor(
        (Date.now() - new Date(exp.created_at).getTime()) / (1000 * 60 * 60 * 24)
      )

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
  const { data: exp, error } = await db()
    .from('experiments')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error

  const { data: versions } = await db()
    .from('experiment_versions')
    .select('*')
    .eq('experiment_id', id)
    .order('version_number', { ascending: false })

  const { data: tasks } = await db()
    .from('tasks')
    .select('*')
    .eq('experiment_id', id)
    .order('status', { ascending: true })
    .order('due_date', { ascending: true })

  const { data: measurements } = await db()
    .from('measurements')
    .select('*')
    .eq('experiment_id', id)
    .order('measured_at', { ascending: false })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentVersion = versions?.[0] as any
  const daysRunning = Math.floor(
    (Date.now() - new Date(exp.created_at).getTime()) / (1000 * 60 * 60 * 24)
  )

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    open_tasks: (tasks || []).filter((t: any) => t.status === 'todo'),
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
  const { data: exp, error } = await db()
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

  const { error: versionError } = await db()
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
  const { data, error } = await db()
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
  await db()
    .from('experiment_versions')
    .update({ outcome: data.previous_outcome, end_date: new Date().toISOString() })
    .eq('id', data.previous_version_id)

  const { data: newVersion, error } = await db()
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
  const { data: measurement, error } = await db()
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
  const { data: task, error } = await db()
    .from('tasks')
    .insert(data)
    .select()
    .single()

  if (error) throw error
  return task
}

export async function completeTask(id: string) {
  const { data, error } = await db()
    .from('tasks')
    .update({ status: 'done' })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteTask(id: string) {
  const { error } = await db().from('tasks').delete().eq('id', id)
  if (error) throw error
}

export async function getTodaysTasks() {
  const today = new Date().toISOString().split('T')[0]
  const { data, error } = await db()
    .from('tasks')
    .select('*, experiments(name, tier, status)')
    .eq('status', 'todo')
    .lte('due_date', today)
    .order('due_date', { ascending: true })

  if (error) throw error
  return data || []
}
