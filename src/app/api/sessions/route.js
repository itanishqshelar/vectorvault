import { getSupabase } from '@/lib/supabase';

// GET — List all sessions with their messages
export async function GET() {
  try {
    const supabase = getSupabase();

    const { data: sessions, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) throw error;

    // Fetch messages for all sessions
    const sessionIds = sessions.map((s) => s.id);
    const { data: messages, error: msgError } = await supabase
      .from('chat_messages')
      .select('*')
      .in('session_id', sessionIds.length > 0 ? sessionIds : ['__none__'])
      .order('created_at', { ascending: true });

    if (msgError) throw msgError;

    // Group messages by session
    const messagesBySession = {};
    for (const msg of messages || []) {
      if (!messagesBySession[msg.session_id]) messagesBySession[msg.session_id] = [];
      messagesBySession[msg.session_id].push({
        role: msg.role,
        content: msg.content,
        parsed: msg.parsed,
      });
    }

    const result = sessions.map((s) => ({
      id: s.id,
      title: s.title,
      messages: messagesBySession[s.id] || [],
      createdAt: s.created_at,
    }));

    return Response.json({ sessions: result });
  } catch (error) {
    console.error('Get sessions error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// POST — Create a new session or save messages to an existing session
export async function POST(request) {
  try {
    const supabase = getSupabase();
    const body = await request.json();
    const { action } = body;

    if (action === 'create') {
      const { id, title } = body;
      const { error } = await supabase
        .from('chat_sessions')
        .upsert({ id, title: title || 'New Chat' }, { onConflict: 'id' });

      if (error) throw error;
      return Response.json({ success: true });
    }

    if (action === 'save_messages') {
      const { sessionId, title, messages } = body;

      // Upsert the session (update title)
      const { error: sessError } = await supabase
        .from('chat_sessions')
        .upsert({ id: sessionId, title: title || 'New Chat' }, { onConflict: 'id' });

      if (sessError) throw sessError;

      // Delete existing messages and re-insert (simplest approach)
      const { error: delError } = await supabase
        .from('chat_messages')
        .delete()
        .eq('session_id', sessionId);

      if (delError) throw delError;

      if (messages && messages.length > 0) {
        const rows = messages.map((m) => ({
          session_id: sessionId,
          role: m.role,
          content: m.content,
          parsed: m.parsed || null,
        }));

        const { error: insError } = await supabase
          .from('chat_messages')
          .insert(rows);

        if (insError) throw insError;
      }

      return Response.json({ success: true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Post session error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// DELETE — Delete a session and all its messages
export async function DELETE(request) {
  try {
    const supabase = getSupabase();
    const { id } = await request.json();

    const { error } = await supabase
      .from('chat_sessions')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return Response.json({ success: true });
  } catch (error) {
    console.error('Delete session error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
