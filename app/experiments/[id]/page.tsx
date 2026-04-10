'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChatPanel } from '@/components/chat/ChatPanel'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft, CheckSquare, Clock, FlaskConical, GitBranch,
  Loader2, PanelRightClose, PanelRightOpen, Plus, Square, TrendingUp
} from 'lucide-react'
import { format } from 'date-fns'

const statusColors: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-800',
  paused: 'bg-amber-100 text-amber-800',
  passed: 'bg-blue-100 text-blue-800',
  failed: 'bg-red-100 text-red-800',
  archived: 'bg-gray-100 text-gray-600',
}

const outcomeColors: Record<string, string> = {
  ongoing: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pass: 'bg-blue-50 text-blue-700 border-blue-200',
  fail: 'bg-red-50 text-red-700 border-red-200',
  inconclusive: 'bg-amber-50 text-amber-700 border-amber-200',
}

export default function ExperimentDetail() {
  const { id } = useParams()
  const router = useRouter()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [experiment, setExperiment] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [chatOpen, setChatOpen] = useState(true)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/experiments/${id}`)
      if (!res.ok) { router.push('/'); return }
      const data = await res.json()
      setExperiment(data)
    } catch {
      router.push('/')
    } finally {
      setLoading(false)
    }
  }, [id, router])

  useEffect(() => { load() }, [load])

  const completeTask = async (taskId: string) => {
    await fetch('/api/tasks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'complete', id: taskId }),
    })
    load()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 size={24} className="animate-spin text-gray-400" />
      </div>
    )
  }

  if (!experiment) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const versions: any[] = experiment.versions || []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tasks: any[] = experiment.tasks || []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const measurements: any[] = experiment.measurements || []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentVersion: any = versions[0]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const openTasks: any[] = tasks.filter((t: any) => t.status === 'todo')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doneTasks: any[] = tasks.filter((t: any) => t.status === 'done')

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="text-gray-400 hover:text-gray-600 transition-colors">
                <ArrowLeft size={18} />
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold text-gray-900">{experiment.name as string}</h1>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[experiment.status as string]}`}>
                    {experiment.status as string}
                  </span>
                  <span className="text-xs font-mono text-gray-400 border border-gray-200 rounded px-1.5 py-0.5">
                    T{experiment.tier as number}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-0.5">
                  Day {experiment.days_running as number} · v{experiment.current_version_number as number || 1} · {versions.length} version{versions.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setChatOpen(!chatOpen)} className="gap-1.5">
              {chatOpen ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
              {chatOpen ? 'Hide AI' : 'AI'}
            </Button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Current version */}
          {currentVersion && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <FlaskConical size={14} />
                  Current Experiment (v{currentVersion.version_number as number})
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${outcomeColors[currentVersion.outcome as string]}`}>
                    {currentVersion.outcome as string}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500 font-medium mb-0.5">Hypothesis</p>
                  <p className="text-sm text-gray-800">{currentVersion.hypothesis as string}</p>
                </div>
                {Array.isArray(currentVersion.inputs) && currentVersion.inputs.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 font-medium mb-1">Inputs / Levers</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(currentVersion.inputs as string[]).map((inp, i) => (
                        <span key={i} className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 rounded px-2 py-0.5">
                          {inp}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-500 font-medium mb-0.5">Expected output</p>
                    <p className="text-sm text-gray-700">{currentVersion.expected_output as string}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium mb-0.5">Pass criteria</p>
                    <p className="text-sm text-gray-700">{currentVersion.pass_fail_criteria as string}</p>
                  </div>
                </div>
                {experiment.goal && (
                  <div>
                    <p className="text-xs text-gray-500 font-medium mb-0.5">If passes → gates to</p>
                    <p className="text-sm text-gray-600 italic">{experiment.goal as string}</p>
                  </div>
                )}
                {currentVersion.pivot_reason && (
                  <div className="bg-purple-50 border border-purple-100 rounded-lg px-3 py-2">
                    <p className="text-xs text-purple-700 font-medium mb-0.5">Pivot reason</p>
                    <p className="text-sm text-purple-800">{currentVersion.pivot_reason as string}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Tasks */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <CheckSquare size={14} />
                Tasks
                {openTasks.length > 0 && (
                  <span className="text-xs bg-amber-100 text-amber-700 rounded-full px-1.5 py-0.5">
                    {openTasks.length} open
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {openTasks.length === 0 && doneTasks.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No tasks. Tell the AI what needs to happen next.</p>
              ) : (
                <div className="space-y-1.5">
                  {openTasks.map(task => (
                    <div key={task.id as string} className="flex items-start gap-2.5 group">
                      <button
                        onClick={() => completeTask(task.id as string)}
                        className="mt-0.5 w-4 h-4 rounded border border-gray-300 hover:border-emerald-500 hover:bg-emerald-50 transition-colors shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800">{task.title as string}</p>
                        {task.due_date && (
                          <p className="text-xs text-gray-400">
                            Due {new Date((task.due_date as string) + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 capitalize">{task.type as string}</span>
                    </div>
                  ))}
                  {doneTasks.length > 0 && (
                    <>
                      <Separator className="my-2" />
                      <p className="text-xs text-gray-400 font-medium">Completed ({doneTasks.length})</p>
                      {doneTasks.slice(0, 5).map(task => (
                        <div key={task.id as string} className="flex items-start gap-2.5 opacity-50">
                          <div className="mt-0.5 w-4 h-4 rounded border border-gray-200 bg-gray-100 flex items-center justify-center shrink-0">
                            <div className="w-2 h-2 rounded-sm bg-gray-400" />
                          </div>
                          <p className="text-sm text-gray-500 line-through">{task.title as string}</p>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Measurements */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <TrendingUp size={14} />
                Measurements ({measurements.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {measurements.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No data logged yet. Tell the AI your latest numbers.</p>
              ) : (
                <div className="space-y-1.5">
                  {measurements.slice(0, 20).map(m => (
                    <div key={m.id as string} className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="text-gray-600">{m.metric_name as string}</span>
                      <span className="font-semibold text-gray-900">{m.value as string}</span>
                      <span className="text-xs text-gray-400 shrink-0">
                        {format(new Date(m.measured_at as string), 'MMM d')}
                      </span>
                    </div>
                  ))}
                  {measurements.length > 20 && (
                    <p className="text-xs text-gray-400 text-center pt-1">+{measurements.length - 20} more</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Version history */}
          {versions.length > 1 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <GitBranch size={14} />
                  Pivot History ({versions.length - 1} pivot{versions.length - 1 !== 1 ? 's' : ''})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {versions.slice(1).map((ver) => (
                      <div key={ver.id} className="relative pl-4 border-l-2 border-gray-100">
                        <div className="absolute -left-1.5 top-0 w-3 h-3 rounded-full bg-gray-200" />
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-gray-500">v{ver.version_number}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded border ${outcomeColors[ver.outcome]}`}>
                            {ver.outcome}
                          </span>
                          {ver.start_date && (
                            <span className="text-xs text-gray-400">
                              {format(new Date(ver.start_date), 'MMM d, yyyy')}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 mb-1">{ver.hypothesis}</p>
                        {ver.pivot_reason && (
                          <p className="text-xs text-gray-500 italic">Pivot reason: {ver.pivot_reason}</p>
                        )}
                      </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Chat panel */}
      {chatOpen && (
        <div className="w-96 border-l border-gray-200 shrink-0 flex flex-col bg-white">
          <ChatPanel onUpdate={load} />
        </div>
      )}
    </div>
  )
}
