import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

export async function parsePDF(buffer, filename) {
  const data = new Uint8Array(buffer);
  const doc = await getDocument({ data }).promise;

  let fullText = '';
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    fullText += content.items.map((item) => item.str).join(' ') + '\n';
  }

  let title = filename;
  try {
    const metadata = await doc.getMetadata();
    title = metadata?.info?.Title || filename;
  } catch {}

  const numPages = doc.numPages;
  await doc.destroy();

  return {
    text: fullText.trim(),
    metadata: {
      source_type: 'pdf',
      filename,
      pages: numPages,
      title,
    },
  };
}
