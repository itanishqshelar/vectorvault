'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import SourceCard from './SourceCard';
import ConflictBanner from './ConflictBanner';

export default function MessageBubble({ message }) {
  const [showReasoning, setShowReasoning] = useState(false);

  if (message.role === 'user') {
    return (
      <div className="flex gap-3 max-w-3xl self-end flex-row-reverse animate-fade-in">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-sm flex-shrink-0">
          U
        </div>
        <div className="px-4 py-3 rounded-2xl rounded-br-sm bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm leading-relaxed">
          {message.content}
        </div>
      </div>
    );
  }

  const parsed = message.parsed;

  if (!parsed) {
    return (
      <div className="flex gap-3 max-w-3xl animate-fade-in">
        <div className="w-8 h-8 rounded-full bg-neutral-800 text-indigo-400 flex items-center justify-center text-sm flex-shrink-0">
          V
        </div>
        <div className="px-4 py-3 rounded-2xl rounded-bl-sm bg-neutral-800/80 backdrop-blur-sm border border-neutral-700/50 text-neutral-200 text-sm leading-relaxed">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 max-w-3xl animate-fade-in">
      <div className="w-8 h-8 rounded-full bg-neutral-800 text-indigo-400 flex items-center justify-center text-sm flex-shrink-0">
        V
      </div>
      <div className="px-4 py-3 rounded-2xl rounded-bl-sm bg-neutral-800/80 backdrop-blur-sm border border-neutral-700/50 text-sm leading-relaxed">
        <div className="text-neutral-200 whitespace-pre-wrap mb-3">
          {parsed.answer}
        </div>

        {parsed.sources && parsed.sources.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {parsed.sources.map((src, i) => (
              <SourceCard key={i} source={src} />
            ))}
          </div>
        )}

        {parsed.conflict_detected !== undefined && (
          <ConflictBanner
            detected={parsed.conflict_detected}
            details={parsed.conflict_details}
          />
        )}

        {parsed.reasoning && (
          <>
            <button
              className="mt-3 flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
              onClick={() => setShowReasoning(!showReasoning)}
            >
              {showReasoning ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
              Reasoning
            </button>
            {showReasoning && (
              <div className="mt-2 px-3 py-2.5 bg-neutral-900/60 rounded-lg text-xs text-neutral-400 leading-relaxed">
                {parsed.reasoning}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
