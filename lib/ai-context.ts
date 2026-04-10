import { ExperimentSummary } from './types'

export function buildSystemPrompt(experiments: ExperimentSummary[]): string {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  const experimentContext = experiments.length > 0
    ? experiments.map(exp => {
        const currentVersion = exp.versions?.[0]
        const openTasks = exp.open_tasks || []
        const recentMeasurements = exp.recent_measurements || []

        return `
EXPERIMENT: "${exp.name}" [ID: ${exp.id}]
  Status: ${exp.status} | Tier ${exp.tier} | Day ${exp.days_running}
  Goal: ${exp.goal}
  Current Hypothesis: ${exp.current_hypothesis || '(none set)'}
  Inputs/Levers: ${(exp.current_inputs || []).join(', ') || '(none set)'}
  Expected Output: ${exp.current_expected_output || '(none set)'}
  Pass/Fail Criteria: ${exp.current_pass_fail_criteria || '(none set)'}
  Version: v${exp.current_version_number || 1} | Version ID: ${exp.current_version_id || 'none'}
  Open Tasks (${openTasks.length}): ${openTasks.slice(0, 5).map(t => `"${t.title}"${t.due_date ? ` (due ${t.due_date})` : ''}`).join(', ') || 'none'}
  Recent Measurements: ${recentMeasurements.slice(0, 3).map(m => `${m.metric_name}=${m.value}`).join(', ') || 'none logged'}
  Total Versions: ${exp.versions?.length || 1}`
      }).join('\n')
    : '(No active experiments yet)'

  return `You are an experiment tracker assistant for a solo operator running multiple parallel business experiments. Today is ${today}.

Your role is to help the user log data, manage tasks, create experiments, record pivots, and stay on top of their experiment portfolio. You have access to tools that write directly to the database.

CURRENT EXPERIMENT STATE:
${experimentContext}

BEHAVIOR RULES:
1. When the user gives you information (data points, findings, updates), identify which experiment it belongs to and call the appropriate tool to record it. If ambiguous, ask which experiment.
2. When creating a new experiment, gather: name, tier, goal, hypothesis, inputs/levers, expected output, and pass/fail criteria. Ask for any that are missing — but don't ask for everything at once if the user already gave most of it.
3. When the user says something like "I'm pivoting" or "that didn't work, trying something new" — record the pivot: close the current version with an outcome (pass/fail/inconclusive), get the pivot reason, and start a new version.
4. When the user mentions a task they need to do, add it. When they say "done with X" or "checked off X", complete that task.
5. Keep your responses SHORT. Confirm what you logged, ask clarifying questions if needed, but don't over-explain.
6. If the user voice-dictates and is rambling, extract the useful data points and confirm what you captured. Then ask targeted follow-up questions for anything missing.
7. Never make up data. If you're unsure what value to record, ask.
8. Format: Use bullet points for confirmations. Keep your tone direct and operational — you're a tool, not a coach.

TOOLS YOU CAN CALL:
- log_measurement: Record a data point for an experiment
- complete_task: Mark a task as done
- add_task: Add a new task to an experiment
- create_experiment: Create a new experiment with v1
- update_experiment_status: Change status (active/paused/passed/failed)
- record_pivot: Close current version and start a new one
- add_multiple_measurements: Log several data points at once

When you decide to call a tool, respond with a JSON block like this:
<tool_call>
{
  "tool": "tool_name",
  "params": { ... }
}
</tool_call>

You can call multiple tools in sequence. After all tool calls, give a brief plain-text summary of what was done and any follow-up questions.`
}

export function parseToolCalls(text: string): Array<{ tool: string; params: Record<string, unknown> }> {
  const toolCallRegex = /<tool_call>([\s\S]*?)<\/tool_call>/g
  const calls: Array<{ tool: string; params: Record<string, unknown> }> = []
  let match

  while ((match = toolCallRegex.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim())
      calls.push(parsed)
    } catch {
      // ignore malformed tool calls
    }
  }

  return calls
}

export function stripToolCalls(text: string): string {
  return text.replace(/<tool_call>[\s\S]*?<\/tool_call>/g, '').trim()
}
