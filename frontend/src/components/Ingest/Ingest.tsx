import './Ingest.css'

interface IngestModalProps {
  ingesting: boolean
  ingestProgress: { ingested: number; total: number; percent: number } | null
  ingestError: string | null
  onCancel: () => void
}

export function IngestPopup({ ingesting, ingestProgress, ingestError, onCancel }: IngestModalProps) {
  return (
    <div className="ingest-overlay">
      <div className="ingest-modal">
        <h3>{ingesting ? 'Ingesting repository...' : 'Ingestion failed'}</h3>

        {ingestProgress && ingestProgress.total > 0 &&(
          <>
            <div className="progress-bar">
              <div
                className="progress-bar__fill"
                style={{ width: `${ingestProgress.percent}%` }}
              />
            </div>
            <p className="progress-label">
              {ingestProgress.ingested} / {ingestProgress.total} chunks ({ingestProgress.percent}%)
            </p>
            {ingestProgress.percent < 30 && ingestProgress.total > 1000 && (
              <p className="progress-hint">
                Taking too long? Try restricting supported extensions or adding folders to skip.
              </p>
            )}
          </>
        )}

        {ingestError && (
          <p className="progress-hint" style={{ color: 'var(--error)' }}>
            {ingestError}
          </p>
        )}

        <button className="btn btn--sm" onClick={onCancel}>
          {ingesting ? 'Cancel' : 'Dismiss'}
        </button>
      </div>
    </div>
  )
}