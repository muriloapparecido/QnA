import { useState } from 'react'
import './SettingsPanel.css'

export function SettingsPanel({
  open,
  supportedExtensions, 
  skipDirs,
  onToggle,
  onSupportedExtensionsChange,
  onSkipDirsChange,
}: {
  open: boolean
  supportedExtensions: string[]
  skipDirs: string[]
  onToggle: () => void
  onSupportedExtensionsChange: (exts: string[]) => void
  onSkipDirsChange: (dirs: string[]) => void
}) {
  const [extDraft, setExtDraft] = useState('')
  const [dirDraft, setDirDraft] = useState('')

  function addExtension() {
    const cleaned = extDraft.trim().replace(/^\./, '')
    if (!cleaned || supportedExtensions.includes(cleaned)) return
    onSupportedExtensionsChange([...supportedExtensions, cleaned])
    setExtDraft('')
  }

  function addDir() {
    const cleaned = dirDraft.trim()
    if (!cleaned || skipDirs.includes(cleaned)) return
    onSkipDirsChange([...skipDirs, cleaned])
    setDirDraft('')
  }

  return (
    <aside className={`settings-panel ${open ? 'settings-panel--open' : ''}`}>
      <div className="settings-panel__header">
        <button className="icon-btn" onClick={onToggle} title="Settings">⚙</button>
        {open && <span className="settings-panel__title">Settings</span>}
      </div>

      {open && (
        <div className="settings-panel__body">

          <section className="settings-section">
            <h3 className="settings-section__heading">Supported extensions</h3>
            <p className="settings-section__hint">Only files with these extensions will be ingested.</p>
            <div className="ext-input-row">
              <input
                className="ext-input"
                value={extDraft}
                onChange={(e) => setExtDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addExtension()}
                placeholder=".ts"
              />
              <button className="btn btn--sm" onClick={addExtension}>Add</button>
            </div>
            <ul className="ext-list">
              {supportedExtensions.map((ext) => (
                <li key={ext} className="ext-tag">
                  {ext}
                  <button className="ext-tag__remove" onClick={() => onSupportedExtensionsChange(supportedExtensions.filter((e) => e !== ext))}>×</button>
                </li>
              ))}
            </ul>
          </section>

          <section className="settings-section">
            <h3 className="settings-section__heading">Skipped directories</h3>
            <p className="settings-section__hint">These folders will be ignored during ingestion.</p>
            <div className="ext-input-row">
              <input
                className="ext-input"
                value={dirDraft}
                onChange={(e) => setDirDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addDir()}
                placeholder="node_modules"
              />
              <button className="btn btn--sm" onClick={addDir}>Add</button>
            </div>
            <ul className="ext-list">
              {skipDirs.map((dir) => (
                <li key={dir} className="ext-tag">
                  {dir}
                  <button className="ext-tag__remove" onClick={() => onSkipDirsChange(skipDirs.filter((d) => d !== dir))}>×</button>
                </li>
              ))}
            </ul>
          </section>

        </div>
      )}
    </aside>
  )
}