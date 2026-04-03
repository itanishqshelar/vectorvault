import * as XLSX from 'xlsx';

export function parseExcel(buffer, filename) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const allText = [];
  const sheets = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    if (rows.length === 0) continue;

    const headers = rows[0].map((h) => String(h || '').trim());
    sheets.push(sheetName);

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.every((cell) => cell === null || cell === undefined || cell === ''))
        continue;

      const parts = headers
        .map((header, j) => {
          const val = row[j];
          if (val === null || val === undefined || val === '') return null;
          return `${header}: ${val}`;
        })
        .filter(Boolean);

      if (parts.length > 0) {
        allText.push(`${parts.join(', ')} (Sheet: ${sheetName}, Row: ${i + 1})`);
      }
    }
  }

  return {
    text: allText.join('\n'),
    metadata: {
      source_type: 'excel',
      filename,
      sheets,
      row_count: allText.length,
    },
  };
}
