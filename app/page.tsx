'use client'

import { useEffect, useState, useCallback } from 'react'
import { ExperimentCard } from '@/components/dashboard/ExperimentCard'
import { ChatPanel } from '@/components/chat/ChatPanel'
import { ExperimentSummary } from '@/lib/types'
import { FlaskConical, Loader2, PanelRightOpen, PanelRightClose } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Dashboard() {
  const [experiments, setExperiments] = useState<ExperimentSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [chatOpen, setChatOpen] = useState(true)
  const [filter, setFilter] = useState<string>('active')

  const loadExperiments = useCallback(async () => {
    try {
      const res = await fetch('/api/experiments')
      const data = await res.json()
      setExperiments(Array.isArray(data) ? data : [])
    } catch {
      console.error('Failed to load experiments')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadExperiments()
  }, [loadExperiments])

  const handleTaskComplete = useCallback((taskId: string) => {
    setExperiments(prev =>
      prev.map(exp => ({
        ...exp,
        open_tasks: exp.open_tasks.filter(t => t.id !== taskId),
      }))
    )
  }, [])

  const filtered = filter === 'all'
    ? experiments
    : experiments.filter(e => e.status === filter)

  const counts = experiments.reduce((acc, e) => {
    acc[e.status] = (acc[e.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric'
  })

  const todaysTasks = experiments
    .flatMap(e => e.open_tasks.map(t => ({ ...t, experimentName: e.name })))
    .filter(t => {
      if (!t.due_date) return false
      return new Date(t.due_date) <= new Date()
    })
    .sort((a, b) => {
      if (!a.due_date) return 1
      if (!b.due_date) return -1
      return a.due_date.localeCompare(b.due_date)
    })

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <FlaskConical size={20} className="text-indigo-600" />
                <h1 className="text-lg font-bold text-gray-900">Experiment Tracker</h1>
              </div>
              <p className="text-sm text-gray-500 mt-0.5">{today}</p>
            </div>
            <div className="flex items-center gap-3">
              {todaysTasks.length > 0 && (
                <div className="flex items-center gap-1 text-sm bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                  <span className="font-semibold text-amber-700">{todaysTasks.length}</span>
                  <span className="text-amber-600">due today</span>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setChatOpen(!chatOpen)}
                className="gap-1.5"
              >
                {chatOpen ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
                {chatOpen ? 'Hide AI' : 'Open AI'}
              </Button>
            </div>
          </div>
        </header>

        {/* Today's tasks strip */}
        {todaysTasks.length > 0 && (
          <div className="bg-amber-50 border-b border-amber-100 px-6 py-2 shrink-0">
            <div className="flex items-center gap-3 overflow-x-auto">
              <span className="text-xs font-semibold text-amber-700 shrink-0">Due today:</span>
              {todaysTasks.map(task => (
                <div key={task.id} className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={async () => {
                      await fetch('/api/tasks', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'complete', id: task.id }),
                      })
                      handleTaskComplete(task.id)
                    }}
                    className="w-3.5 h-3.5 rounded border border-amber-400 hover:bg-amber-200 transition-colors shrink-0"
                  />
                  <span className="text-xs text-amber-800">
                    <span className="text-amber-500">[{task.experimentName}]</span> {task.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filter tabs */}
        <div className="bg-white border-b border-gray-200 px-6 shrink-0">
          <div className="flex gap-0 -mb-px">
            {(['active', 'paused', 'passed', 'failed', 'all'] as const).map(status => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`text-sm px-4 py-2.5 border-b-2 transition-colors font-medium ${
                  filter === status
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                {status !== 'all' && counts[status] ? (
                  <span className="ml-1.5 text-xs bg-gray-100 text-gray-600 rounded-full px-1.5 py-0.5">
                    {counts[status]}
                  </span>
                ) : null}
                {status === 'all' && experiments.length > 0 ? (
                  <span className="ml-1.5 text-xs bg-gray-100 text-gray-600 rounded-full px-1.5 py-0.5">
                    {experiments.length}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        {/* Experiment grid */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 size={24} className="animate-spin text-gray-400" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <FlaskConical size={32} className="text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">No {filter === 'all' ? '' : filter} experiments</p>
              <p className="text-gray-400 text-sm mt-1">
                {filter === 'active'
                  ? 'Use the AI panel to start your first experiment'
                  : 'Switch to "Active" to see your running experiments'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map(exp => (
                <ExperimentCard
                  key={exp.id}
                  experiment={exp}
                  onTaskComplete={handleTaskComplete}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat panel */}
      {chatOpen && (
        <div className="w-96 border-l border-gray-200 shrink-0 flex flex-col bg-white">
          <ChatPanel onUpdate={loadExperiments} />
        </div>
      )}
    </div>
  )
}
