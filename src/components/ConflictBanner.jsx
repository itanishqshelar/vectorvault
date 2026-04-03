'use client';

import { AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ConflictBanner({ detected, details }) {
  if (detected) {
    return (
      <div className="mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 animate-fade-in">
        <div className="flex items-center gap-2 font-semibold text-amber-400 text-xs">
          <AlertTriangle className="w-3.5 h-3.5" />
          Conflict Detected
        </div>
        <div className="mt-1 text-[11px] text-amber-300/80 leading-relaxed">
          {details}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20 animate-fade-in">
      <div className="flex items-center gap-2 font-semibold text-green-400 text-xs">
        <CheckCircle className="w-3.5 h-3.5" />
        Sources Consistent
      </div>
      <div className="mt-1 text-[11px] text-green-300/80 leading-relaxed">
        No conflicting information found across sources.
      </div>
    </div>
  );
}
