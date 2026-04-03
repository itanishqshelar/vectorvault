'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Radio, X, Mic, MicOff } from 'lucide-react';
import useGeminiLive from '@/hooks/useGeminiLive';

/**
 * LiveVoiceOrb: A stunning animated orb UI for Gemini Live Voice.
 *
 * Behavior:
 * - Shows a pulsing animated orb when a live session is active
 * - Transcripts (user & AI) are collected and stored as text messages
 * - On disconnect, accumulated transcripts are injected into the chat history
 */
export default function LiveVoiceOrb({ onSessionEnd, isOpen, onClose }) {
  const [userTranscripts, setUserTranscripts] = useState([]);
  const [aiTranscripts, setAiTranscripts] = useState([]);
  const [currentUserText, setCurrentUserText] = useState('');
  const [currentAiText, setCurrentAiText] = useState('');
  const userBufferRef = useRef('');
  const aiBufferRef = useRef('');
  const turnTimeoutRef = useRef(null);

  const handleTranscript = useCallback(({ role, text }) => {
    if (role === 'user') {
      userBufferRef.current += text;
      setCurrentUserText(userBufferRef.current);

      clearTimeout(turnTimeoutRef.current);
      turnTimeoutRef.current = setTimeout(() => {
        if (userBufferRef.current.trim()) {
          setUserTranscripts((prev) => [...prev, userBufferRef.current.trim()]);
        }
        userBufferRef.current = '';
        setCurrentUserText('');
      }, 2000);
    } else {
      aiBufferRef.current += text;
      setCurrentAiText(aiBufferRef.current);

      clearTimeout(turnTimeoutRef.current);
      turnTimeoutRef.current = setTimeout(() => {
        if (aiBufferRef.current.trim()) {
          setAiTranscripts((prev) => [...prev, aiBufferRef.current.trim()]);
        }
        aiBufferRef.current = '';
        setCurrentAiText('');
      }, 2000);
    }
  }, []);

  const { status, error, connect, disconnect } = useGeminiLive({
    onTranscript: handleTranscript,
  });

  // Auto-connect when opened
  useEffect(() => {
    if (isOpen && status === 'disconnected') {
      connect();
    }
  }, [isOpen, status, connect]);

  const handleClose = useCallback(() => {
    // Flush any remaining buffers
    const finalUserText = userBufferRef.current.trim();
    const finalAiText = aiBufferRef.current.trim();

    const allUserTexts = [...userTranscripts, ...(finalUserText ? [finalUserText] : [])];
    const allAiTexts = [...aiTranscripts, ...(finalAiText ? [finalAiText] : [])];

    disconnect();

    // Build messages from the accumulated transcripts
    const messages = [];
    const maxLen = Math.max(allUserTexts.length, allAiTexts.length);
    for (let i = 0; i < maxLen; i++) {
      if (allUserTexts[i]) {
        messages.push({ role: 'user', content: `🎙️ ${allUserTexts[i]}` });
      }
      if (allAiTexts[i]) {
        messages.push({ role: 'ai', content: allAiTexts[i], parsed: null });
      }
    }

    if (messages.length > 0) {
      onSessionEnd?.(messages);
    }

    // Reset state
    setUserTranscripts([]);
    setAiTranscripts([]);
    setCurrentUserText('');
    setCurrentAiText('');
    userBufferRef.current = '';
    aiBufferRef.current = '';

    onClose?.();
  }, [disconnect, userTranscripts, aiTranscripts, onSessionEnd, onClose]);

  if (!isOpen) return null;

  const isActive = status === 'active';
  const isConnecting = status === 'connecting';

  return (
    <div className="live-orb-overlay">
      <div className="live-orb-backdrop" onClick={handleClose} />

      <div className="live-orb-container">
        {/* Close button */}
        <button className="live-orb-close" onClick={handleClose} title="End session">
          <X style={{ width: '20px', height: '20px' }} />
        </button>

        {/* Status label */}
        <div className="live-orb-status">
          {isConnecting && 'Connecting...'}
          {isActive && 'Live Session Active'}
          {error && `Error: ${error}`}
        </div>

        {/* The Orb */}
        <div className={`live-orb ${isActive ? 'live-orb--active' : ''} ${isConnecting ? 'live-orb--connecting' : ''}`}>
          <div className="live-orb-core" />
          <div className="live-orb-ring live-orb-ring--1" />
          <div className="live-orb-ring live-orb-ring--2" />
          <div className="live-orb-ring live-orb-ring--3" />
          {isActive && (
            <>
              <div className="live-orb-particle live-orb-particle--1" />
              <div className="live-orb-particle live-orb-particle--2" />
              <div className="live-orb-particle live-orb-particle--3" />
              <div className="live-orb-particle live-orb-particle--4" />
              <div className="live-orb-particle live-orb-particle--5" />
              <div className="live-orb-particle live-orb-particle--6" />
            </>
          )}
        </div>

        {/* Mic indicator */}
        <div className="live-orb-mic">
          {isActive ? (
            <Mic style={{ width: '16px', height: '16px', color: '#60a5fa' }} />
          ) : (
            <MicOff style={{ width: '16px', height: '16px', color: '#737373' }} />
          )}
          <span>{isActive ? 'Listening...' : 'Microphone off'}</span>
        </div>

        {/* Live transcript preview */}
        <div className="live-orb-transcript">
          {currentUserText && (
            <div className="live-transcript-line live-transcript-user">
              <span className="live-transcript-label">You:</span> {currentUserText}
            </div>
          )}
          {currentAiText && (
            <div className="live-transcript-line live-transcript-ai">
              <span className="live-transcript-label">AI:</span> {currentAiText}
            </div>
          )}
          {!currentUserText && !currentAiText && isActive && (
            <div className="live-transcript-line live-transcript-hint">
              Start speaking — your conversation will be saved as text
            </div>
          )}
        </div>

        {/* End session button */}
        {isActive && (
          <button className="live-orb-end-btn" onClick={handleClose}>
            <Radio style={{ width: '16px', height: '16px' }} />
            End Session
          </button>
        )}
      </div>
    </div>
  );
}
