function extractBody(payload) {
  if (!payload) return '';

  // Only decode body.data when this is a leaf node (no parts).
  // Multipart nodes have body.data = '' which must be ignored.
  if (payload.body?.data && !payload.parts) {
    return Buffer.from(payload.body.data, 'base64url').toString('utf-8');
  }

  // Multipart: prefer text/plain, then text/html, then recurse
  if (payload.parts) {
    // Search recursively — handles multipart/mixed wrapping multipart/alternative
    const allParts = flattenParts(payload.parts);

    const plainPart = allParts.find((p) => p.mimeType === 'text/plain' && p.body?.data);
    if (plainPart) {
      return Buffer.from(plainPart.body.data, 'base64url').toString('utf-8');
    }

    const htmlPart = allParts.find((p) => p.mimeType === 'text/html' && p.body?.data);
    if (htmlPart) {
      const html = Buffer.from(htmlPart.body.data, 'base64url').toString('utf-8');
      return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    }
  }

  return '';
}

function flattenParts(parts) {
  const result = [];
  for (const part of parts) {
    result.push(part);
    if (part.parts) result.push(...flattenParts(part.parts));
  }
  return result;
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
