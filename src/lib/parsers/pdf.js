import { PDFParse } from 'pdf-parse';

// Disable pdfjs web worker — not supported in Next.js server environment
PDFParse.setWorker('');

export async function parsePDF(buffer, filename) {
  const parser = new PDFParse({ data: buffer });
  const [textResult, infoResult] = await Promise.all([
    parser.getText(),
    parser.getInfo(),
  ]);
  await parser.destroy();

  return {
    text: textResult.text,
    metadata: {
      source_type: 'pdf',
      filename,
      pages: textResult.total,
      title: infoResult.info?.Title || filename,
    },
  };
}
