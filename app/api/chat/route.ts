import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
import { buildSystemPrompt, parseToolCalls, stripToolCalls } from '@/lib/ai-context'
import { getExperiments, createExperiment, addMeasurement, addTask, completeTask, updateExperiment, pivotExperiment } from '@/lib/supabase'
import { ChatMessage } from '@/lib/types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function executeTool(tool: string, params: Record<string, unknown>) {
  switch (tool) {
    case 'log_measurement':
      return addMeasurement({
        experiment_id: params.experiment_id as string,
        version_id: params.version_id as string | undefined,
        metric_name: params.metric_name as string,
        value: params.value as string,
        notes: params.notes as string | undefined,
        measured_at: params.measured_at as string | undefined,
      })

    case 'add_multiple_measurements': {
      const measurements = params.measurements as Array<{
        experiment_id: string
        version_id?: string
        metric_name: string
        value: string
        notes?: string
      }>
      return Promise.all(measurements.map(m => addMeasurement(m)))
    }

    case 'complete_task':
      return completeTask(params.task_id as string)

    case 'add_task':
      return addTask({
        experiment_id: params.experiment_id as string,
        title: params.title as string,
        type: params.type as string | undefined,
        due_date: params.due_date as string | undefined,
      })

    case 'create_experiment':
      return createExperiment({
        name: params.name as string,
        tier: params.tier as number,
        goal: params.goal as string,
        hypothesis: params.hypothesis as string,
        inputs: params.inputs as string[],
        expected_output: params.expected_output as string,
        pass_fail_criteria: params.pass_fail_criteria as string,
      })

    case 'update_experiment_status':
      return updateExperiment(params.experiment_id as string, {
        status: params.status as string,
      })

    case 'record_pivot':
      return pivotExperiment(params.experiment_id as string, {
        pivot_reason: params.pivot_reason as string,
        hypothesis: params.new_hypothesis as string,
        inputs: params.new_inputs as string[],
        expected_output: params.new_expected_output as string,
        pass_fail_criteria: params.new_pass_fail_criteria as string,
        previous_outcome: params.previous_outcome as 'pass' | 'fail' | 'inconclusive',
        previous_version_id: params.previous_version_id as string,
        new_version_number: params.new_version_number as number,
      })

    default:
      return { error: `Unknown tool: ${tool}` }
  }
}

export async function POST(req: NextRequest) {
  try {
    const { messages }: { messages: ChatMessage[] } = await req.json()

    const experiments = await getExperiments()
    const systemPrompt = buildSystemPrompt(experiments as never)

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    })

    const rawText = response.content[0].type === 'text' ? response.content[0].text : ''
    const toolCalls = parseToolCalls(rawText)
    const displayText = stripToolCalls(rawText)

    // Execute tool calls
    const toolResults: Array<{ tool: string; result: unknown; error?: string }> = []
    for (const call of toolCalls) {
      try {
        const result = await executeTool(call.tool, call.params)
        toolResults.push({ tool: call.tool, result })
      } catch (err) {
        toolResults.push({ tool: call.tool, result: null, error: String(err) })
      }
    }

    return NextResponse.json({
      message: displayText,
      toolsExecuted: toolResults.map(r => ({
        tool: r.tool,
        success: !r.error,
        error: r.error,
      })),
    })
  } catch (err) {
    console.error('Chat error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
