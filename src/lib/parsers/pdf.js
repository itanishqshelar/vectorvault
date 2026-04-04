import { PDFParse } from 'pdf-parse';

export async function parsePDF(buffer, filename) {
  const parser = new PDFParse({ data: Buffer.from(buffer) });
  try {
    const textResult = await parser.getText();
    const infoResult = await parser.getInfo();

    const title = infoResult.info?.Title || filename;
    const pages = infoResult.total;

    return {
      text: textResult.text.trim(),
      metadata: {
        source_type: 'pdf',
        filename,
        pages,
        title,
      },
    };
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw new Error(`Failed to parse PDF document: ${error.message}`);
  } finally {
    await parser.destroy().catch(() => {});
  }
}
