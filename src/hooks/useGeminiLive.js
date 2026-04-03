'use client';

import { useRef, useState, useCallback } from 'react';

const MODEL_NAME = 'gemini-3.1-flash-live-preview';
const SAMPLE_RATE_IN = 16000;
const SAMPLE_RATE_OUT = 24000;

/**
 * Custom hook for Gemini Live bidirectional voice streaming.
 *
 * Features:
 * - Ephemeral token auth (server-side key safety)
 * - RAG context injection via system instructions
 * - Audio capture at 16kHz PCM → base64
 * - Audio playback from model at 24kHz PCM
 * - Input/output transcription tracking (stored as text conversation)
 */
export default function useGeminiLive({ onTranscript }) {
  const [status, setStatus] = useState('disconnected'); // disconnected | connecting | active
  const [error, setError] = useState(null);

  const wsRef = useRef(null);
  const audioContextRef = useRef(null);
  const workletNodeRef = useRef(null);
  const streamRef = useRef(null);
  const playbackQueueRef = useRef([]);
  const isPlayingRef = useRef(false);
  const playbackContextRef = useRef(null);

  // ──────────── Audio Playback ────────────
  const playNextChunk = useCallback(async () => {
    if (isPlayingRef.current || playbackQueueRef.current.length === 0) return;
    isPlayingRef.current = true;

    const chunk = playbackQueueRef.current.shift();

    try {
      if (!playbackContextRef.current || playbackContextRef.current.state === 'closed') {
        playbackContextRef.current = new AudioContext({ sampleRate: SAMPLE_RATE_OUT });
      }
      const ctx = playbackContextRef.current;

      // Decode base64 → Int16 PCM → Float32
      const raw = atob(chunk);
      const bytes = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);

      const int16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768;

      const buffer = ctx.createBuffer(1, float32.length, SAMPLE_RATE_OUT);
      buffer.getChannelData(0).set(float32);

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.onended = () => {
        isPlayingRef.current = false;
        playNextChunk();
      };
      source.start();
    } catch (e) {
      console.error('Playback error:', e);
      isPlayingRef.current = false;
      playNextChunk();
    }
  }, []);

  const enqueueAudio = useCallback(
    (base64Data) => {
      playbackQueueRef.current.push(base64Data);
      playNextChunk();
    },
    [playNextChunk]
  );

  // ──────────── Mic Capture via ScriptProcessor fallback ────────────
  const startMicCapture = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: SAMPLE_RATE_IN,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
      },
    });
    streamRef.current = stream;

    const ctx = new AudioContext({ sampleRate: SAMPLE_RATE_IN });
    audioContextRef.current = ctx;
    const source = ctx.createMediaStreamSource(stream);

    // ScriptProcessor for wide browser compat
    const processor = ctx.createScriptProcessor(4096, 1, 1);
    processor.onaudioprocess = (e) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;

      const float32 = e.inputBuffer.getChannelData(0);
      const int16 = new Int16Array(float32.length);
      for (let i = 0; i < float32.length; i++) {
        const s = Math.max(-1, Math.min(1, float32[i]));
        int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }

      const bytes = new Uint8Array(int16.buffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);

      const base64 = btoa(binary);
      ws.send(
        JSON.stringify({
          realtimeInput: {
            audio: {
              data: base64,
              mimeType: 'audio/pcm;rate=16000',
            },
          },
        })
      );
    };

    source.connect(processor);
    processor.connect(ctx.destination);
    workletNodeRef.current = processor;
  }, []);

  const stopMicCapture = useCallback(() => {
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  // ──────────── WebSocket Session ────────────
  const connect = useCallback(async () => {
    if (status === 'connecting' || status === 'active') return;
    setStatus('connecting');
    setError(null);

    try {
      // 1. Get ephemeral token
      const tokenRes = await fetch('/api/live-token', { method: 'POST' });
      if (!tokenRes.ok) throw new Error('Failed to get session token');
      const { token } = await tokenRes.json();

      // 2. Get RAG context
      let ragContext = '';
      try {
        const ctxRes = await fetch('/api/live-context', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: '' }),
        });
        if (ctxRes.ok) {
          const ctxData = await ctxRes.json();
          ragContext = ctxData.context || '';
        }
      } catch {
        // continue without context
      }

      // 3. Open WebSocket
      const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained?access_token=${token}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        // Send setup message
        const systemText = `You are VectorVault, an AI Knowledge Retrieval voice assistant. You answer questions using the provided document context. Be concise, friendly, and cite your sources when possible. If you don't know something, say so.${ragContext ? `\n\nHere is the user's document context:\n${ragContext}` : ''}`;

        const configMessage = {
          setup: {
            model: `models/${MODEL_NAME}`,
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: 'Aoede' },
                },
              },
            },
            systemInstruction: {
              parts: [{ text: systemText }],
            },
            inputAudioTranscription: {},
            outputAudioTranscription: {},
          },
        };

        ws.send(JSON.stringify(configMessage));
      };

      ws.onmessage = async (event) => {
        try {
          let jsonData;
          if (event.data instanceof Blob) {
            jsonData = await event.data.text();
          } else if (event.data instanceof ArrayBuffer) {
            jsonData = new TextDecoder().decode(event.data);
          } else {
            jsonData = event.data;
          }
          const msg = JSON.parse(jsonData);

          // Setup complete
          if (msg.setupComplete) {
            setStatus('active');
            startMicCapture();
            return;
          }

          // Server content
          if (msg.serverContent) {
            const sc = msg.serverContent;

            // Audio data from model
            if (sc.modelTurn?.parts) {
              for (const part of sc.modelTurn.parts) {
                if (part.inlineData?.data) {
                  enqueueAudio(part.inlineData.data);
                }
              }
            }

            // Input transcription (user speech → text)
            if (sc.inputTranscription?.text) {
              onTranscript?.({ role: 'user', text: sc.inputTranscription.text });
            }

            // Output transcription (model speech → text)
            if (sc.outputTranscription?.text) {
              onTranscript?.({ role: 'ai', text: sc.outputTranscription.text });
            }
          }
        } catch (e) {
          console.error('WS message parse error:', e);
        }
      };

      ws.onerror = (e) => {
        console.error('WS error:', e);
        setError('Connection error');
        setStatus('disconnected');
        stopMicCapture();
      };

      ws.onclose = (e) => {
        console.log('WS closed:', e.code, e.reason);
        setStatus('disconnected');
        stopMicCapture();
      };
    } catch (err) {
      console.error('Connection error:', err);
      setError(err.message);
      setStatus('disconnected');
    }
  }, [status, startMicCapture, stopMicCapture, enqueueAudio, onTranscript]);

  const disconnect = useCallback(() => {
    stopMicCapture();

    // Drain playback
    playbackQueueRef.current = [];
    isPlayingRef.current = false;
    if (playbackContextRef.current && playbackContextRef.current.state !== 'closed') {
      playbackContextRef.current.close().catch(() => {});
      playbackContextRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setStatus('disconnected');
    setError(null);
  }, [stopMicCapture]);

  return { status, error, connect, disconnect };
}
