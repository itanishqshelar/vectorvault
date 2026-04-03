'use client';

import { useState } from 'react';
import SourceCard from './SourceCard';
import ConflictBanner from './ConflictBanner';

export default function MessageBubble({ message }) {
  const [showReasoning, setShowReasoning] = useState(false);

  if (message.role === 'user') {
    return (
      <div className="message user">
        <div className="message-avatar">U</div>
        <div className="message-content">{message.content}</div>
      </div>
    );
  }

  // AI message - try to parse structured response
  const parsed = message.parsed;

  if (!parsed) {
    return (
      <div className="message ai">
        <div className="message-avatar">V</div>
        <div className="message-content">
          <div className="message-answer">{message.content}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="message ai">
      <div className="message-avatar">V</div>
      <div className="message-content">
        <div className="message-answer">{parsed.answer}</div>

        {parsed.sources && parsed.sources.length > 0 && (
          <div className="source-chips">
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
              className="reasoning-toggle"
              onClick={() => setShowReasoning(!showReasoning)}
            >
              {showReasoning ? '\u25BC' : '\u25B6'} Reasoning
            </button>
            {showReasoning && (
              <div className="reasoning-content">{parsed.reasoning}</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
