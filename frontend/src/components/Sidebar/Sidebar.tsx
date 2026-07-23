import { useState } from 'react'
import type { Repository } from '../../types'
import './Sidebar.css'

export function Sidebar({
  repos,
  activeId,
  collapsed,
  onSelect,
  onToggle,
  onIngest, 
  ingesting, 
  onAddRepo,
  onDelete,
}: {
  repos: Repository[]
  activeId: string | null
  collapsed: boolean
  onSelect: (id: string) => void
  onToggle: () => void
  onIngest: (path:string) => void
  ingesting: boolean
  onAddRepo: (repo: Repository) => void
  onDelete: (id: string) => void
}) {

  const [addingRepo, setAddingRepo] = useState(false)
  const [newRepoPath, setNewRepoPath] = useState('')
  const [newRepoName, setNewRepoName] = useState('')

  function handleAddRepo() {
    if (!newRepoPath.trim()) return
    const name = newRepoName.trim() || newRepoPath.split('/').pop() || 'Repo'
    onAddRepo({ 
      id: Date.now().toString(), 
      name, 
      path: newRepoPath.trim(), 
      messages: [] 
    })
    setNewRepoPath('')
    setNewRepoName('')
    setAddingRepo(false)
  }
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
              <button
                className="repo-item__ingest"
                onClick={(e) => {
                  e.stopPropagation()
                  onIngest(repo.path)
                }}
                title="Re-ingest repo"
              >
                {ingesting ? '⟳' : '↺'}
              </button>
              <button
                className="repo-item__delete"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(repo.id)
                }}
                title="Remove repository"
              >
                ×
              </button>
            </button>
            
          ))}
        </nav>
      )}

      {!collapsed && (
      <>
        {addingRepo ? (
          <div className="add-repo-form">
            <input
              className="ext-input"
              placeholder="Folder name (optional)"
              value={newRepoName}
              onChange={(e) => setNewRepoName(e.target.value)}
            />
            <input
              className="ext-input"
              placeholder="/absolute/path/to/repo"
              value={newRepoPath}
              onChange={(e) => setNewRepoPath(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddRepo()}
              autoFocus
            />
            <div className="add-repo-actions">
              <button className="btn btn--sm" onClick={handleAddRepo}>Add</button>
              <button className="btn btn--sm" onClick={() => setAddingRepo(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <button className="add-repo-btn" onClick={() => setAddingRepo(true)}>
            + Add repository
          </button>
        )}
      </>
    )}
    </aside>
  )
}