'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Ticket, CheckCircle, Clock, ExternalLink, X, Loader2, RefreshCw } from 'lucide-react';

function StatusBadge({ status }) {
  if (status === 'RESOLVED') {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-green-400"
        style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}
      >
        <CheckCircle className="w-3 h-3" />
        Resolved
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-red-400"
      style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
    >
      <Clock className="w-3 h-3" />
      Open
    </span>
  );
}

function TicketModal({ ticket, onClose, onResolve, resolving }) {
  const [emailText, setEmailText] = useState('');
  const [loadingEmail, setLoadingEmail] = useState(false);

  useEffect(() => {
    if (!ticket.source_id) return;
    setLoadingEmail(true);
    fetch(`/api/sources/${ticket.source_id}/raw`)
      .then(r => r.text())
      .then(text => setEmailText(text))
      .catch(() => setEmailText('Failed to load email content.'))
      .finally(() => setLoadingEmail(false));
  }, [ticket.source_id]);

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-neutral-900 rounded-2xl w-[640px] max-w-[92vw] max-h-[85vh] flex flex-col shadow-2xl shadow-black/50"
        style={{ border: '1px solid #262626' }}
      >
        {/* Modal header */}
        <div className="flex items-start justify-between p-6 pb-4" style={{ borderBottom: '1px solid #262626' }}>
          <div className="flex-1 min-w-0 pr-4">
            <h2 className="text-white font-semibold text-base leading-snug">{ticket.title}</h2>
            <p className="text-neutral-500 text-xs mt-1">{ticket.customer_email}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <StatusBadge status={ticket.status} />
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-neutral-500 hover:text-white hover:bg-neutral-800 transition-colors"
              style={{ border: 'none', background: 'none' }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Email body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loadingEmail ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 text-neutral-500 animate-spin" />
            </div>
          ) : (
            <pre className="text-neutral-300 text-sm whitespace-pre-wrap font-mono leading-relaxed">
              {emailText || 'No email content linked to this ticket.'}
            </pre>
          )}
        </div>

        {/* Modal footer */}
        <div className="flex items-center justify-between p-6 pt-4" style={{ borderTop: '1px solid #262626' }}>
          <div className="text-xs text-neutral-600">
            {new Date(ticket.created_at).toLocaleDateString('en-US', {
              year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
            })}
          </div>
          <div className="flex items-center gap-2">
            {ticket.source_id && (
              <a
                href={`/api/sources/${ticket.source_id}/raw`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                style={{ border: '1px solid #404040' }}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View Source
              </a>
            )}
            {ticket.status === 'OPEN' && (
              <button
                onClick={() => onResolve(ticket.id)}
                disabled={resolving}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-green-400 hover:bg-green-500/10 transition-colors disabled:opacity-50 cursor-pointer"
                style={{ border: '1px solid rgba(34,197,94,0.3)', background: 'none' }}
              >
                {resolving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                Mark Resolved
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CRMPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [resolving, setResolving] = useState(false);

  // Auth gate — same mock auth as main page
  useEffect(() => {
    const authStatus = localStorage.getItem('vv_mock_auth');
    if (authStatus !== 'true') {
      router.push('/');
    }
  }, [router]);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const qs = filter !== 'ALL' ? `?status=${filter}` : '';
      const res = await fetch(`/api/tickets${qs}`);
      const data = await res.json();
      setTickets(data.tickets || []);
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const handleResolve = async (id) => {
    setResolving(true);
    try {
      const res = await fetch(`/api/tickets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'RESOLVED' }),
      });
      if (!res.ok) throw new Error('Failed to update');
      setSelectedTicket(null);
      await fetchTickets();
    } catch (err) {
      console.error(err);
    } finally {
      setResolving(false);
    }
  };

  const filterTabs = ['ALL', 'OPEN', 'RESOLVED'];
  const counts = {
    ALL: tickets.length,
    OPEN: tickets.filter(t => t.status === 'OPEN').length,
    RESOLVED: tickets.filter(t => t.status === 'RESOLVED').length,
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* Page header */}
      <header
        className="flex items-center justify-between px-6 py-3.5 bg-neutral-900/60 backdrop-blur-xl"
        style={{ borderBottom: '1px solid #262626' }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/')}
            className="p-1.5 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            style={{ border: 'none', background: 'none' }}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Ticket className="w-5 h-5 text-neutral-400" />
            <span className="font-semibold text-[15px]">Service Tickets</span>
          </div>
        </div>
        <button
          onClick={fetchTickets}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors disabled:opacity-50 cursor-pointer"
          style={{ border: '1px solid #404040', background: 'none' }}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total', value: counts.ALL, color: 'text-neutral-300' },
            { label: 'Open', value: counts.OPEN, color: 'text-red-400' },
            { label: 'Resolved', value: counts.RESOLVED, color: 'text-green-400' },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className="bg-neutral-900 rounded-xl p-4"
              style={{ border: '1px solid #262626' }}
            >
              <p className="text-neutral-500 text-xs mb-1">{label}</p>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 mb-4">
          {filterTabs.map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${
                filter === tab ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-neutral-300'
              }`}
              style={{
                border: filter === tab ? '1px solid #404040' : '1px solid transparent',
                background: filter === tab ? undefined : 'none',
              }}
            >
              {tab.charAt(0) + tab.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Ticket list */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 text-neutral-500 animate-spin" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Ticket className="w-10 h-10 text-neutral-700" />
            <p className="text-neutral-500 text-sm">No tickets found</p>
            <p className="text-neutral-600 text-xs">Sync Gmail to auto-detect complaint emails</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tickets.map(ticket => (
              <div
                key={ticket.id}
                onClick={() => setSelectedTicket(ticket)}
                className="flex items-center gap-4 px-5 py-4 bg-neutral-900 rounded-xl cursor-pointer hover:bg-neutral-800/70 transition-colors"
                style={{ border: '1px solid #262626' }}
              >
                <div className={`w-2 h-2 rounded-full shrink-0 ${ticket.status === 'OPEN' ? 'bg-red-500' : 'bg-green-500'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{ticket.title}</p>
                  <p className="text-neutral-500 text-xs mt-0.5 truncate">{ticket.customer_email || 'Unknown sender'}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <StatusBadge status={ticket.status} />
                  <span className="text-neutral-600 text-xs">
                    {new Date(ticket.created_at).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric',
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {selectedTicket && (
        <TicketModal
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
          onResolve={handleResolve}
          resolving={resolving}
        />
      )}
    </div>
  );
}
