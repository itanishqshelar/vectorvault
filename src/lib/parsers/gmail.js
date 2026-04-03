function extractBody(payload) {
  if (!payload) return '';

  // Top-level body data
  if (payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64url').toString('utf-8');
  }

  // Multipart: prefer text/plain
  if (payload.parts) {
    const plainPart = payload.parts.find((p) => p.mimeType === 'text/plain');
    if (plainPart) return extractBody(plainPart);

    const htmlPart = payload.parts.find((p) => p.mimeType === 'text/html');
    if (htmlPart) {
      const html = extractBody(htmlPart);
      return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    }

    // Recurse into nested multipart
    for (const part of payload.parts) {
      const text = extractBody(part);
      if (text) return text;
    }
  }

  return '';
}

export function parseGmailMessage(message) {
  const headers = message.payload?.headers || [];
  const getHeader = (name) =>
    headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

  const subject = getHeader('Subject') || '(no subject)';
  const from = getHeader('From');
  const to = getHeader('To');
  const dateHeader = getHeader('Date');

  let date = '';
  try {
    date = dateHeader ? new Date(dateHeader).toISOString() : '';
  } catch {
    date = dateHeader;
  }

  const body = extractBody(message.payload);

  const text = [
    `From: ${from}`,
    `To: ${to}`,
    `Date: ${date}`,
    `Subject: ${subject}`,
    '',
    body,
  ]
    .join('\n')
    .trim();

  return {
    text,
    metadata: {
      source_type: 'gmail',
      filename: `Gmail: ${subject}`,
      sender: from,
      date,
      subject,
      message_id: message.id,
    },
  };
}
