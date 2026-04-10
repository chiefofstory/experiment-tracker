'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ChatMessage } from '@/lib/types'
import { Bot, Send, X, Loader2, RefreshCw } from 'lucide-react'

interface Props {
  onUpdate?: () => void
}

export function ChatPanel({ onUpdate }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: "Morning. What's going on with your experiments today? You can log data, check off tasks, start a new one, or tell me about a pivot.",
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return

    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      })

      const data = await res.json()

      if (data.error) {
        setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${data.error}` }])
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: data.message }])
        if (data.toolsExecuted?.some((t: { success: boolean }) => t.success)) {
          onUpdate?.()
        }
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Try again.' }])
    } finally {
      setLoading(false)
      textareaRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const reset = () => {
    setMessages([{
      role: 'assistant',
      content: "Fresh start. What are we working on?",
    }])
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-2">
          <Bot size={16} className="text-indigo-600" />
          <span className="font-semibold text-sm text-gray-800">AI Assistant</span>
        </div>
        <Button variant="ghost" size="sm" onClick={reset} className="h-7 px-2 text-gray-400 hover:text-gray-600">
          <RefreshCw size={13} />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[90%] rounded-xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-sm'
                  : 'bg-gray-100 text-gray-800 rounded-bl-sm'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-xl rounded-bl-sm px-3 py-2">
              <Loader2 size={14} className="animate-spin text-gray-400" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 px-4 py-3 border-t border-gray-100">
        <div className="flex gap-2 items-end">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Log data, add a task, start an experiment..."
            className="resize-none text-sm min-h-[60px] max-h-[140px] rounded-xl border-gray-200"
            rows={2}
          />
          <Button
            onClick={send}
            disabled={!input.trim() || loading}
            size="sm"
            className="h-9 w-9 p-0 rounded-xl bg-indigo-600 hover:bg-indigo-700 shrink-0"
          >
            <Send size={14} />
          </Button>
        </div>
        <p className="text-xs text-gray-400 mt-1.5">Enter to send · Shift+Enter for newline</p>
      </div>
    </div>
  )
}
