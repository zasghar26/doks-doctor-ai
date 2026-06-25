'use client'

import { useState, useRef, useEffect } from 'react'
import { createAgentRun, subscribeToAgentRun } from '../lib/api'
import type { AgentRunEvent, AgentRunResult, AgentStage } from '../lib/types'

interface AgentChatProps {
  clusterId: string
}

interface Message {
  id: string
  type: 'user' | 'agent'
  content: string
  timestamp: Date
  runId?: string
  stages?: AgentRunEvent[]
  result?: AgentRunResult
  error?: string
}

const STAGES_ORDER: AgentStage[] = ['discover', 'gather', 'analyze', 'answer', 'done']

export default function AgentChat({ clusterId }: AgentChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [running, setRunning] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || running) return

    const question = input.trim()
    setInput('')
    setRunning(true)

    // Add user message
    const userMessage: Message = {
      id: crypto.randomUUID(),
      type: 'user',
      content: question,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMessage])

    // Create agent message placeholder
    const agentMessageId = crypto.randomUUID()
    const agentMessage: Message = {
      id: agentMessageId,
      type: 'agent',
      content: '',
      timestamp: new Date(),
      stages: [],
    }
    setMessages(prev => [...prev, agentMessage])

    try {
      // Start agent run
      const { run_id } = await createAgentRun(clusterId, question)
      
      // Update with run_id
      setMessages(prev =>
        prev.map(m =>
          m.id === agentMessageId ? { ...m, runId: run_id } : m
        )
      )

      // Subscribe to SSE events
      const unsubscribe = subscribeToAgentRun(
        run_id,
        (event) => {
          if (event.type === 'stage') {
            const stageEvent = event.data as AgentRunEvent
            setMessages(prev =>
              prev.map(m =>
                m.id === agentMessageId
                  ? { ...m, stages: [...(m.stages || []), stageEvent] }
                  : m
              )
            )
          } else if (event.type === 'result') {
            const result = event.data as AgentRunResult
            setMessages(prev =>
              prev.map(m =>
                m.id === agentMessageId
                  ? { ...m, result, content: result.answer }
                  : m
              )
            )
            setRunning(false)
          }
        },
        (error) => {
          console.error('SSE error', error)
          setMessages(prev =>
            prev.map(m =>
              m.id === agentMessageId
                ? { ...m, error: 'Connection lost. Please try again.' }
                : m
            )
          )
          setRunning(false)
        }
      )

      // Cleanup on unmount
      return () => unsubscribe()
    } catch (err) {
      setMessages(prev =>
        prev.map(m =>
          m.id === agentMessageId
            ? { ...m, error: err instanceof Error ? err.message : 'Failed to start investigation' }
            : m
        )
      )
      setRunning(false)
    }
  }

  return (
    <div className="card flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-neutral-200">
        <h3 className="font-medium text-neutral-900">AI Investigation</h3>
        <p className="text-sm text-neutral-500">Ask questions about your cluster</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-neutral-500 py-8">
            <p className="mb-2">Ask a question to start investigating</p>
            <div className="space-y-1 text-sm">
              <SuggestedQuestion onClick={setInput}>Why are my pods crashing?</SuggestedQuestion>
              <SuggestedQuestion onClick={setInput}>What issues need immediate attention?</SuggestedQuestion>
              <SuggestedQuestion onClick={setInput}>Are there any network connectivity problems?</SuggestedQuestion>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id}>
            {message.type === 'user' ? (
              <UserMessage content={message.content} />
            ) : (
              <AgentMessage message={message} />
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-neutral-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your cluster..."
            className="input flex-1"
            disabled={running}
          />
          <button
            type="submit"
            disabled={running || !input.trim()}
            className="btn-primary px-4"
          >
            {running ? (
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function SuggestedQuestion({ children, onClick }: { children: string; onClick: (q: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onClick(children)}
      className="text-primary-600 hover:text-primary-700 hover:underline"
    >
      {children}
    </button>
  )
}

function UserMessage({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div className="bg-primary-500 text-white rounded-lg px-4 py-2 max-w-[80%]">
        {content}
      </div>
    </div>
  )
}

function AgentMessage({ message }: { message: Message }) {
  const currentStage = message.stages?.[message.stages.length - 1]?.stage

  return (
    <div className="space-y-3">
      {/* Stage timeline */}
      {message.stages && message.stages.length > 0 && !message.result && (
        <div className="flex items-center gap-2 text-sm">
          {STAGES_ORDER.slice(0, -1).map((stage) => {
            const stageEvent = message.stages?.find(s => s.stage === stage)
            const isActive = currentStage === stage
            const isDone = message.stages?.some(s => STAGES_ORDER.indexOf(s.stage) > STAGES_ORDER.indexOf(stage))

            return (
              <div key={stage} className="flex items-center gap-1">
                <span className={`
                  ${isDone ? 'stage-done' : ''}
                  ${isActive ? 'stage-active' : ''}
                  ${!isDone && !isActive ? 'stage-pending' : ''}
                `}>
                  {stageEvent?.message || stage}
                </span>
                {stage !== 'answer' && <span className="text-neutral-300">→</span>}
              </div>
            )
          })}
        </div>
      )}

      {/* Error state */}
      {message.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-danger">
          {message.error}
        </div>
      )}

      {/* Result */}
      {message.result && (
        <div className="bg-neutral-50 rounded-lg p-4 space-y-3">
          {/* Answer */}
          <div className="text-neutral-900 whitespace-pre-wrap">{message.result.answer}</div>

          {/* Confidence badge */}
          <div className="flex items-center gap-2">
            <span className={`badge ${
              message.result.confidence === 'high' ? 'badge-success' :
              message.result.confidence === 'medium' ? 'badge-warning' :
              'badge-info'
            }`}>
              {message.result.confidence} confidence
            </span>
          </div>

          {/* Evidence */}
          {message.result.evidence.length > 0 && (
            <div className="border-t border-neutral-200 pt-3">
              <div className="text-sm font-medium text-neutral-700 mb-2">Evidence</div>
              <ul className="text-sm text-neutral-600 space-y-1">
                {message.result.evidence.map((e, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-neutral-400">•</span>
                    <span>{e}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Verification commands */}
          {message.result.verification_commands.length > 0 && (
            <div className="border-t border-neutral-200 pt-3">
              <div className="text-sm font-medium text-neutral-700 mb-2">Verification commands</div>
              <div className="space-y-1">
                {message.result.verification_commands.map((cmd, i) => (
                  <code key={i} className="block text-sm bg-neutral-800 text-green-400 px-3 py-2 rounded font-mono">
                    {cmd}
                  </code>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Loading state */}
      {!message.result && !message.error && (
        <div className="flex items-center gap-2 text-neutral-500">
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>Investigating...</span>
        </div>
      )}
    </div>
  )
}
