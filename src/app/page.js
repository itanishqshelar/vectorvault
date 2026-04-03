'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import ChatInterface from '@/components/ChatInterface';
import UploadPanel from '@/components/UploadPanel';
import SyncPanel from '@/components/SyncPanel';
import DocumentViewer from '@/components/DocumentViewer';
import InstallPrompt from '@/components/InstallPrompt';
import Login from '@/components/Login';

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // ─── Check Authentication on mount ───
  useEffect(() => {
    const authStatus = localStorage.getItem('vv_mock_auth');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
    setIsCheckingAuth(false);
  }, []);

  const handleLogin = () => {
    localStorage.setItem('vv_mock_auth', 'true');
    setIsAuthenticated(true);
  };

  const [sources, setSources] = useState([]);
  const [showUpload, setShowUpload] = useState(false);
  const [showSync, setShowSync] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [sessionsLoaded, setSessionsLoaded] = useState(false);
  const [selectedSource, setSelectedSource] = useState(null);
  const [authError, setAuthError] = useState(null);

  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);

  const saveTimeoutRef = useRef({});

  const currentSession = sessions.find(s => s.id === currentSessionId) || sessions[0];

  // ─── Load sessions from Supabase on mount ───
  useEffect(() => {
    async function loadSessions() {
      try {
        const res = await fetch('/api/sessions');
        const data = await res.json();
        const loaded = data.sessions || [];

        if (loaded.length > 0) {
          setSessions(loaded);
          setCurrentSessionId(loaded[0].id);
        } else {
          // No sessions exist — create the default one
          const defaultSession = {
            id: Date.now().toString(),
            title: 'New Chat',
            messages: [],
            createdAt: new Date().toISOString(),
          };
          setSessions([defaultSession]);
          setCurrentSessionId(defaultSession.id);

          // Persist the default session
          fetch('/api/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'create', id: defaultSession.id, title: 'New Chat' }),
          }).catch(() => {});
        }
      } catch {
        // Fallback if API fails
        const fallback = { id: Date.now().toString(), title: 'New Chat', messages: [], createdAt: new Date().toISOString() };
        setSessions([fallback]);
        setCurrentSessionId(fallback.id);
      } finally {
        setSessionsLoaded(true);
      }
    }
    loadSessions();
  }, []);

  // ─── Save session to Supabase (debounced) ───
  const saveSession = useCallback((sessionId, title, messages) => {
    // Clear any previous pending save for this session
    if (saveTimeoutRef.current[sessionId]) {
      clearTimeout(saveTimeoutRef.current[sessionId]);
    }

    // Debounce: save after 800ms of no further changes
    saveTimeoutRef.current[sessionId] = setTimeout(() => {
      fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_messages',
          sessionId,
          title,
          messages,
        }),
      }).catch((err) => console.error('Save session error:', err));
    }, 800);
  }, []);

  const handleNewChat = useCallback(() => {
    const newSession = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      createdAt: new Date().toISOString(),
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);

    // Persist to Supabase
    fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', id: newSession.id, title: 'New Chat' }),
    }).catch(() => {});
  }, []);

  const handleSetMessages = useCallback((updater) => {
    setSessions(prev => prev.map(s => {
      if (s.id === currentSessionId) {
        const nextMessages = typeof updater === 'function' ? updater(s.messages) : updater;
        
        let newTitle = s.title;
        if (s.title === 'New Chat' && nextMessages.length > 0) {
          const firstUserMsg = nextMessages.find(m => m.role === 'user');
          if (firstUserMsg) {
            newTitle = firstUserMsg.content.slice(0, 30) + (firstUserMsg.content.length > 30 ? '...' : '');
          }
        }

        // Auto-save to Supabase
        saveSession(s.id, newTitle, nextMessages);

        return { ...s, messages: nextMessages, title: newTitle };
      }
      return s;
    }));
  }, [currentSessionId, saveSession]);

  const handleDeleteSession = useCallback(async (id) => {
    // Don't delete if it's the only session
    if (sessions.length <= 1) return;

    setSessions(prev => prev.filter(s => s.id !== id));
    if (currentSessionId === id) {
      const remaining = sessions.filter(s => s.id !== id);
      setCurrentSessionId(remaining[0]?.id || null);
    }

    // Delete from Supabase
    fetch('/api/sessions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    }).catch(() => {});
  }, [sessions, currentSessionId]);

  const fetchSources = useCallback(async () => {
    try {
      const res = await fetch('/api/sources');
      const data = await res.json();
      setSources(data.sources || []);
    } catch {
      // silently fail - sources will show as empty
    }
  }, []);

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authStatus = params.get('auth');
    if (authStatus === 'success') {
      setShowSync(true);
      setAuthError(null);
      window.history.replaceState({}, '', '/');
    } else if (authStatus === 'error') {
      const reason = params.get('reason') || 'unknown';
      setAuthError(decodeURIComponent(reason));
      setShowSync(true);
      window.history.replaceState({}, '', '/');
    }
  }, []);

  const handleDeleteSource = async (id) => {
    try {
      await fetch('/api/sources', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      fetchSources();
    } catch {
      // handle error silently
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-950">
        <div style={{ display: 'flex', gap: '4px', padding: '4px 0' }}>
          <div style={{ width: '8px', height: '8px', background: '#60a5fa', borderRadius: '50%', animation: 'typingBounce 1.2s infinite' }} />
          <div style={{ width: '8px', height: '8px', background: '#60a5fa', borderRadius: '50%', animation: 'typingBounce 1.2s infinite 0.2s' }} />
          <div style={{ width: '8px', height: '8px', background: '#60a5fa', borderRadius: '50%', animation: 'typingBounce 1.2s infinite 0.4s' }} />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  // Show loading while sessions load
  if (!sessionsLoaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-950">
        <div style={{ display: 'flex', gap: '4px', padding: '4px 0' }}>
          <div style={{ width: '8px', height: '8px', background: '#60a5fa', borderRadius: '50%', animation: 'typingBounce 1.2s infinite' }} />
          <div style={{ width: '8px', height: '8px', background: '#60a5fa', borderRadius: '50%', animation: 'typingBounce 1.2s infinite 0.2s' }} />
          <div style={{ width: '8px', height: '8px', background: '#60a5fa', borderRadius: '50%', animation: 'typingBounce 1.2s infinite 0.4s' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-950">
      <Sidebar
        sources={sources}
        onDeleteSource={handleDeleteSource}
        isCollapsed={isSidebarCollapsed}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={setCurrentSessionId}
        onNewChat={handleNewChat}
        onDeleteSession={handleDeleteSession}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          onUploadClick={() => setShowUpload(true)}
          onSyncClick={() => setShowSync(true)}
          toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          isSidebarCollapsed={isSidebarCollapsed}
        />
        <div className="flex-1 flex overflow-hidden min-h-0">
          <div className="flex-1 flex flex-col min-w-0">
            {currentSession && (
              <ChatInterface 
                key={currentSession.id}
                messages={currentSession.messages}
                setMessages={handleSetMessages}
                onSourceClick={setSelectedSource}
              />
            )}
          </div>
          {selectedSource && (
            <DocumentViewer 
              source={selectedSource}
              onClose={() => setSelectedSource(null)}
            />
          )}
        </div>
      </div>
      {showUpload && (
        <UploadPanel
          onClose={() => setShowUpload(false)}
          onUploadComplete={fetchSources}
        />
      )}
      {showSync && (
        <SyncPanel
          onClose={() => { setShowSync(false); setAuthError(null); }}
          onSyncComplete={fetchSources}
          authError={authError}
        />
      )}
      <InstallPrompt />
    </div>
  );
}
