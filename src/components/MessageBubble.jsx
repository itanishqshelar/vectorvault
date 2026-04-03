'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import SourceCard from './SourceCard';
import ConflictBanner from './ConflictBanner';

export default function MessageBubble({ message, onSourceClick }) {
  const [showReasoning, setShowReasoning] = useState(false);

  if (message.role === 'user') {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', animation: 'fadeIn 0.3s ease' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', maxWidth: '768px' }}>
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '16px 16px 4px 16px',
              color: 'white',
              fontSize: '14px',
              lineHeight: '1.625',
              background: 'linear-gradient(to right, #2563eb, #3b82f6)',
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
            }}
          >
            {message.content}
          </div>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              flexShrink: 0,
              background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
            }}
          >
            U
          </div>
        </div>
      </div>
    );
  }

  const parsed = message.parsed;

  const avatarStyle = {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: '#262626',
    color: '#60a5fa',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    flexShrink: 0,
  };

  const bubbleStyle = {
    minWidth: 0,
    padding: '12px 16px',
    borderRadius: '16px 16px 16px 4px',
    background: 'rgba(38, 38, 38, 0.8)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(64, 64, 64, 0.5)',
    fontSize: '14px',
    lineHeight: '1.625',
    wordBreak: 'break-word',
    overflowWrap: 'break-word',
  };

  if (!parsed) {
    return (
      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', maxWidth: '768px', animation: 'fadeIn 0.3s ease' }}>
        <div style={avatarStyle}>V</div>
        <div style={{ ...bubbleStyle, color: '#e5e5e5', whiteSpace: 'pre-wrap' }}>
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', maxWidth: '768px', animation: 'fadeIn 0.3s ease' }}>
      <div style={avatarStyle}>V</div>
      <div style={bubbleStyle}>
        <div style={{ color: '#e5e5e5', whiteSpace: 'pre-wrap' }}>
          {parsed.answer}
        </div>

        {parsed.sources && parsed.sources.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '12px' }}>
            {parsed.sources.map((src, i) => (
              <SourceCard key={i} source={src} onClick={onSourceClick} />
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
              style={{
                marginTop: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px',
                color: '#737373',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
              onClick={() => setShowReasoning(!showReasoning)}
            >
              {showReasoning ? (
                <ChevronDown style={{ width: '12px', height: '12px' }} />
              ) : (
                <ChevronRight style={{ width: '12px', height: '12px' }} />
              )}
              Reasoning
            </button>
            {showReasoning && (
              <div
                style={{
                  marginTop: '8px',
                  padding: '10px 12px',
                  background: 'rgba(23, 23, 23, 0.6)',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: '#a3a3a3',
                  lineHeight: '1.625',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {parsed.reasoning}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
