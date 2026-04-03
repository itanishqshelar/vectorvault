'use client';

import { FileText, Sheet, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';

const TYPE_INFO = {
  pdf: { icon: FileText, label: 'PDF' },
  excel: { icon: Sheet, label: 'Excel' },
  email: { icon: Mail, label: 'Email' },
};

const RELEVANCE_COLORS = {
  high: 'bg-green-400',
  medium: 'bg-amber-400',
  low: 'bg-neutral-500',
};

export default function SourceCard({ source }) {
  const info = TYPE_INFO[source.type] || TYPE_INFO.pdf;
  const Icon = info.icon;
  const dotColor = RELEVANCE_COLORS[source.relevance] || RELEVANCE_COLORS.medium;

  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-neutral-900/60 border border-neutral-700/50 rounded-full text-[11px] font-medium text-neutral-400">
      <span className={cn('w-1.5 h-1.5 rounded-full', dotColor)} />
      <Icon className="w-3 h-3" />
      <span>{source.filename}</span>
      {source.section && <span className="text-neutral-600">&middot; {source.section}</span>}
    </div>
  );
}
