import { simpleParser } from 'mailparser';

export async function parseEmail(buffer, filename) {
  const parsed = await simpleParser(buffer);

  const body = parsed.text || parsed.html?.replace(/<[^>]*>/g, ' ') || '';

  const header = [
    `From: ${parsed.from?.text || 'Unknown'}`,
    `To: ${parsed.to?.text || 'Unknown'}`,
    `Date: ${parsed.date?.toISOString() || 'Unknown'}`,
    `Subject: ${parsed.subject || 'No Subject'}`,
  ].join('\n');

  return {
    text: `${header}\n\n${body}`,
    metadata: {
      source_type: 'email',
      filename,
      sender: parsed.from?.text || 'Unknown',
      date: parsed.date?.toISOString() || null,
      subject: parsed.subject || 'No Subject',
    },
  };
}
