import { useState, useRef, useEffect } from 'react'
import './App.css'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Message {
  id: number
  role: 'user' | 'assistant'
  content: string
  sources?: string
}

interface Repository {
  id: string
  name: string
  path: string
  messages: Message[]
}

// ─── Mock data (replace with real data later) ────────────────────────────────

const INITIAL_REPOS: Repository[] = [
  { id: 'maps', name: 'MAPS', path: '../../MAPS', messages: [] },
]

// ─── Sub-components ──────────────────────────────────────────────────────────

function Sidebar({
  repos,
  activeId,
  collapsed,
  onSelect,
  onToggle,
}: {
  repos: Repository[]
  activeId: string
  collapsed: boolean
  onSelect: (id: string) => void
  onToggle: () => void
}) {
  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
      <div className="sidebar__header">
        {!collapsed && <span className="sidebar__title">Repositories</span>}
        <button className="icon-btn" onClick={onToggle} title={collapsed ? 'Expand' : 'Collapse'}>
          {collapsed ? '›' : '‹'}
        </button>
      </div>

      {!collapsed && (
        <nav className="sidebar__nav">
          {repos.map((repo) => (
            <button
              key={repo.id}
              className={`repo-item ${activeId === repo.id ? 'repo-item--active' : ''}`}
              onClick={() => onSelect(repo.id)}
            >
              <span className="repo-item__icon">⬡</span>
              <span className="repo-item__name">{repo.name}</span>
            </button>
          ))}
        </nav>
      )}
    </aside>
  )
}

function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === 'user'
  return (
    <div className={`message ${isUser ? 'message--user' : 'message--assistant'}`}>
      <div className="message__bubble">
        <pre className="message__content">{message.content}</pre>
        {message.sources && (
          <details className="message__sources">
            <summary>Sources</summary>
            <pre className="message__source-text">{message.sources}</pre>
          </details>
        )}
      </div>
    </div>
  )
}

function SettingsPanel({
  open,
  ignoredExtensions,
  onToggle,
  onExtensionsChange,
}: {
  open: boolean
  ignoredExtensions: string[]
  onToggle: () => void
  onExtensionsChange: (exts: string[]) => void
}) {
  const [draft, setDraft] = useState('')

  function addExtension() {
    const cleaned = draft.trim().replace(/^\./, '')
    if (!cleaned || ignoredExtensions.includes(cleaned)) return
    onExtensionsChange([...ignoredExtensions, cleaned])
    setDraft('')
  }

  function removeExtension(ext: string) {
    onExtensionsChange(ignoredExtensions.filter((e) => e !== ext))
  }

  return (
    <aside className={`settings-panel ${open ? 'settings-panel--open' : ''}`}>
      <div className="settings-panel__header">
        <button className="icon-btn" onClick={onToggle} title="Settings">
          ⚙
        </button>
        {open && <span className="settings-panel__title">Settings</span>}
      </div>

      {open && (
        <div className="settings-panel__body">
          <section className="settings-section">
            <h3 className="settings-section__heading">Ignored extensions</h3>
            <p className="settings-section__hint">Files with these extensions won't be searched.</p>

            <div className="ext-input-row">
              <input
                className="ext-input"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addExtension()}
                placeholder=".svg"
              />
              <button className="btn btn--sm" onClick={addExtension}>
                Add
              </button>
            </div>

            <ul className="ext-list">
              {ignoredExtensions.map((ext) => (
                <li key={ext} className="ext-tag">
                  .{ext}
                  <button className="ext-tag__remove" onClick={() => removeExtension(ext)}>
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </aside>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [repos, setRepos] = useState<Repository[]>(INITIAL_REPOS)
  const [activeRepoId, setActiveRepoId] = useState<string>(INITIAL_REPOS[0].id)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [ignoredExtensions, setIgnoredExtensions] = useState<string[]>(['svg', 'png', 'jpg', 'webp'])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)
  const activeRepo = repos.find((r) => r.id === activeRepoId)!

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeRepo.messages])

  function addMessage(repoId: string, message: Message) {
    setRepos((prev) =>
      prev.map((r) =>
        r.id === repoId ? { ...r, messages: [...r.messages, message] } : r
      )
    )
  }

  async function handleSubmit() {
    const question = input.trim()
    if (!question || loading) return

    setInput('')
    setError(null)

    // Add user message immediately
    const userMsg: Message = {
      id: Date.now(),
      role: 'user',
      content: question,
    }
    addMessage(activeRepoId, userMsg)
    setLoading(true)

    try {
      const response = await fetch('http://localhost:8000/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          repo_path: activeRepo.path,
          ignored_extensions: ignoredExtensions,
        }),
      })

      if (!response.ok) throw new Error(`Server error: ${response.status}`)

      const data = await response.json()

      const assistantMsg: Message = {
        id: Date.now() + 1,
        role: 'assistant',
        content: data.Response ?? data.answer ?? 'No response.',
        sources: data.Source ?? data.sources,
      }
      addMessage(activeRepoId, assistantMsg)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="layout">
      {/* Left sidebar — repo list */}
      <Sidebar
        repos={repos}
        activeId={activeRepoId}
        collapsed={sidebarCollapsed}
        onSelect={setActiveRepoId}
        onToggle={() => setSidebarCollapsed((v) => !v)}
      />

      {/* Main chat area */}
      <main className="chat">
        <header className="chat__header">
          <span className="chat__repo-name">{activeRepo.name}</span>
          <span className="chat__subtitle">codebase Q&A</span>
        </header>

        <div className="chat__messages">
          {activeRepo.messages.length === 0 && (
            <div className="chat__empty">
              <p>Ask anything about <strong>{activeRepo.name}</strong>.</p>
              <p className="chat__empty-hint">Try: "where is the add row button?" or "how does saving work?"</p>
            </div>
          )}

          {activeRepo.messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}

          {loading && (
            <div className="message message--assistant">
              <div className="message__bubble message__bubble--loading">
                <span className="loading-dot" />
                <span className="loading-dot" />
                <span className="loading-dot" />
              </div>
            </div>
          )}

          {error && (
            <div className="chat__error">{error}</div>
          )}

          <div ref={bottomRef} />
        </div>

        <form
          className="chat__input-row"
          onSubmit={(e) => { e.preventDefault(); handleSubmit() }}
        >
          <textarea
            className="chat__textarea"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit()
              }
            }}
            placeholder="Ask a question about the codebase… (Enter to send, Shift+Enter for newline)"
            rows={2}
            disabled={loading}
          />
          <button
            type="submit"
            className="btn btn--primary"
            disabled={loading || input.trim() === ''}
          >
            {loading ? '…' : 'Ask'}
          </button>
        </form>
      </main>

      {/* Right settings panel */}
      <SettingsPanel
        open={settingsOpen}
        ignoredExtensions={ignoredExtensions}
        onToggle={() => setSettingsOpen((v) => !v)}
        onExtensionsChange={setIgnoredExtensions}
      />
    </div>
  )
}