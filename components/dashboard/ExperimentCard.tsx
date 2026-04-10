'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { ExperimentSummary } from '@/lib/types'
import { CheckSquare, Clock, FlaskConical, TrendingUp } from 'lucide-react'

const statusColors: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  paused: 'bg-amber-100 text-amber-800 border-amber-200',
  passed: 'bg-blue-100 text-blue-800 border-blue-200',
  failed: 'bg-red-100 text-red-800 border-red-200',
  archived: 'bg-gray-100 text-gray-600 border-gray-200',
}

const tierLabel = (tier: number) => `T${tier}`

interface Props {
  experiment: ExperimentSummary
  onTaskComplete?: (taskId: string) => void
}

export function ExperimentCard({ experiment, onTaskComplete }: Props) {
  const nextTask = experiment.open_tasks?.[0]
  const overdueCount = experiment.open_tasks?.filter(t => {
    if (!t.due_date) return false
    return new Date(t.due_date) < new Date()
  }).length || 0

  const handleTaskComplete = async (e: React.MouseEvent, taskId: string) => {
    e.preventDefault()
    e.stopPropagation()
    await fetch('/api/tasks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'complete', id: taskId }),
    })
    onTaskComplete?.(taskId)
  }

  return (
    <Link href={`/experiments/${experiment.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer border border-gray-200 h-full">
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-semibold text-gray-400 border border-gray-200 rounded px-1.5 py-0.5">
                {tierLabel(experiment.tier)}
              </span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusColors[experiment.status]}`}>
                {experiment.status}
              </span>
              {overdueCount > 0 && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                  {overdueCount} overdue
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-400 shrink-0">
              <Clock size={12} />
              <span>Day {experiment.days_running}</span>
            </div>
          </div>
          <h3 className="font-semibold text-gray-900 text-sm mt-2 leading-snug">
            {experiment.name}
          </h3>
        </CardHeader>

        <CardContent className="px-4 pb-4 space-y-3">
          {/* Hypothesis */}
          {experiment.current_hypothesis && (
            <div>
              <p className="text-xs text-gray-500 font-medium mb-0.5 flex items-center gap-1">
                <FlaskConical size={11} /> Hypothesis
              </p>
              <p className="text-xs text-gray-700 line-clamp-2 leading-relaxed">
                {experiment.current_hypothesis}
              </p>
            </div>
          )}

          {/* Pass/Fail criteria */}
          {experiment.current_pass_fail_criteria && (
            <div>
              <p className="text-xs text-gray-500 font-medium mb-0.5">Pass criteria</p>
              <p className="text-xs text-gray-600 line-clamp-1">{experiment.current_pass_fail_criteria}</p>
            </div>
          )}

          {/* Recent measurements */}
          {experiment.recent_measurements && experiment.recent_measurements.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 font-medium mb-1 flex items-center gap-1">
                <TrendingUp size={11} /> Recent data
              </p>
              <div className="flex flex-wrap gap-1">
                {experiment.recent_measurements.slice(0, 3).map(m => (
                  <span key={m.id} className="text-xs bg-gray-50 border border-gray-200 rounded px-2 py-0.5 text-gray-700">
                    {m.metric_name}: <span className="font-medium">{m.value}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Version badge */}
          {(experiment.current_version_number || 0) > 1 && (
            <div className="text-xs text-purple-600 font-medium">
              v{experiment.current_version_number} — {experiment.versions?.length - 1} pivot{experiment.versions?.length - 1 !== 1 ? 's' : ''}
            </div>
          )}

          {/* Next task */}
          {nextTask && (
            <div className="border-t border-gray-100 pt-2 mt-2">
              <p className="text-xs text-gray-500 font-medium mb-1 flex items-center gap-1">
                <CheckSquare size={11} /> Next task
              </p>
              <div className="flex items-start gap-2">
                <button
                  onClick={(e) => handleTaskComplete(e, nextTask.id)}
                  className="mt-0.5 w-4 h-4 rounded border border-gray-300 hover:border-emerald-500 hover:bg-emerald-50 transition-colors shrink-0"
                  title="Mark done"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-800 line-clamp-2">{nextTask.title}</p>
                  {nextTask.due_date && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      Due {new Date(nextTask.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  )}
                </div>
              </div>
              {experiment.open_tasks.length > 1 && (
                <p className="text-xs text-gray-400 mt-1">+{experiment.open_tasks.length - 1} more tasks</p>
              )}
            </div>
          )}

          {experiment.status === 'active' && !nextTask && (
            <div className="border-t border-gray-100 pt-2 mt-2">
              <p className="text-xs text-gray-400 italic">No open tasks — use AI to add some</p>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
