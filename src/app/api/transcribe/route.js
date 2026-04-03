export async function POST(request) {
  try {
    const formData = await request.formData();
    const audio = formData.get('audio');

    if (!audio) {
      return new Response(JSON.stringify({ error: 'No audio provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const groqForm = new FormData();
    groqForm.append('file', audio, 'recording.webm');
    groqForm.append('model', 'whisper-large-v3-turbo');
    groqForm.append('response_format', 'json');

    const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: groqForm,
    });

    if (!res.ok) {
      const err = await res.text();
      return new Response(JSON.stringify({ error: err }), {
        status: res.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await res.json();
    return new Response(JSON.stringify({ text: data.text }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
