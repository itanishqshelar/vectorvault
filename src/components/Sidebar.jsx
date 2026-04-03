'use client';

const TYPE_ICONS = {
  pdf: { icon: '\u{1F4C4}', cls: 'pdf' },
  excel: { icon: '\u{1F4CA}', cls: 'excel' },
  email: { icon: '\u2709\uFE0F', cls: 'email' },
};

export default function Sidebar({ sources, onDeleteSource }) {
  const totalChunks = sources.reduce((sum, s) => sum + (s.chunk_count || 0), 0);

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <div className="sidebar-logo">V</div>
          <div>
            <div className="sidebar-title">VectorVault</div>
            <div className="sidebar-subtitle">Knowledge Agent</div>
          </div>
        </div>
      </div>

      <div className="sidebar-stats">
        <div className="stat-card">
          <div className="stat-value">{sources.length}</div>
          <div className="stat-label">Documents</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totalChunks}</div>
          <div className="stat-label">Chunks</div>
        </div>
      </div>

      <div className="sidebar-section-title">Document Library</div>

      <div className="sidebar-sources">
        {sources.length === 0 ? (
          <div className="sidebar-empty">
            No documents uploaded yet. Click &quot;Upload&quot; to add your first document.
          </div>
        ) : (
          sources.map((source) => {
            const typeInfo = TYPE_ICONS[source.source_type] || TYPE_ICONS.pdf;
            return (
              <div key={source.id} className="source-item">
                <div className={`source-icon ${typeInfo.cls}`}>{typeInfo.icon}</div>
                <div className="source-info">
                  <div className="source-name">{source.filename}</div>
                  <div className="source-meta">
                    {source.chunk_count} chunks &middot;{' '}
                    {new Date(source.uploaded_at).toLocaleDateString()}
                  </div>
                </div>
                <button
                  className="source-delete"
                  onClick={() => onDeleteSource(source.id)}
                  title="Delete source"
                >
                  &times;
                </button>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
