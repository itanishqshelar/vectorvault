import pdf from 'pdf-parse';

export async function parsePDF(buffer, filename) {
  try {
    const dataBuffer = Buffer.from(buffer);
    const data = await pdf(dataBuffer);

    let title = filename;
    if (data.info && data.info.Title) {
      title = data.info.Title;
    }

    return {
      text: data.text.trim(),
      metadata: {
        source_type: 'pdf',
        filename,
        pages: data.numpages,
        title,
      },
    };
  } catch (error) {
    console.error('Error parsing PDF with pdf-parse:', error);
    throw new Error('Failed to parse PDF document.');
  }
}
