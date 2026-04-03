'use client';

const TYPE_INFO = {
  pdf: { icon: '\u{1F4C4}', label: 'PDF' },
  excel: { icon: '\u{1F4CA}', label: 'Excel' },
  email: { icon: '\u2709\uFE0F', label: 'Email' },
};

export default function SourceCard({ source }) {
  const info = TYPE_INFO[source.type] || TYPE_INFO.pdf;

  return (
    <div className="source-chip">
      <span className={`source-chip-dot ${source.relevance || 'medium'}`} />
      <span>{info.icon}</span>
      <span>{source.filename}</span>
      {source.section && <span> &middot; {source.section}</span>}
    </div>
  );
}
