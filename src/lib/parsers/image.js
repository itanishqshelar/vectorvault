import fs from 'fs';
import path from 'path';
import os from 'os';
import AdmZip from 'adm-zip';
import { SarvamAIClient } from 'sarvamai';

export async function parseImage(buffer, filename) {
  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) {
    throw new Error("SARVAM_API_KEY environment variable is not defined");
  }

  const client = new SarvamAIClient({
    apiSubscriptionKey: apiKey,
  });

  const tempDir = os.tmpdir();
  const uploadId = Date.now() + '-' + Math.round(Math.random() * 1e9);
  // Sanitize filename to avoid weird characters in temp file
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  const inputFilePath = path.join(tempDir, `upload-${uploadId}-${sanitizedFilename}`);
  const outputZipPath = path.join(tempDir, `output-${uploadId}.zip`);

  let fullText = '';
  
  try {
    // 1. Write buffer to temp file because sarvam SDK requires file path
    await fs.promises.writeFile(inputFilePath, buffer);

    // 2. Create job
    const jobOptions = { outputFormat: 'md' };
    
    // According to docs, omit language for auto-detect or rely on default
    const job = await client.documentIntelligence.createJob(jobOptions);

    // 3. Upload file
    await job.uploadFile(inputFilePath);

    // 4. Start processing
    await job.start();

    // 5. Wait for completion
    const status = await job.waitUntilComplete();
    if (status.job_state !== 'Completed') {
      throw new Error(`Job ended with state: ${status?.job_state || 'Unknown'}`);
    }

    // 6. Download output
    await job.downloadOutput(outputZipPath);

    // 7. Extract zip and read markdown text
    const zip = new AdmZip(outputZipPath);
    const zipEntries = zip.getEntries();
    
    for (const entry of zipEntries) {
      if (!entry.isDirectory && entry.name.endsWith('.md')) {
        fullText += entry.getData().toString('utf8') + '\n\n';
      }
    }

    if (!fullText.trim()) {
      throw new Error("No markdown text extracted from image.");
    }
    
  } finally {
    // Clean up temporary files
    try {
      if (fs.existsSync(inputFilePath)) {
        await fs.promises.unlink(inputFilePath);
      }
      if (fs.existsSync(outputZipPath)) {
        await fs.promises.unlink(outputZipPath);
      }
    } catch (cleanupError) {
      console.error('Failed to cleanup temp files', cleanupError);
    }
  }

  return {
    text: fullText.trim(),
    metadata: {
      source_type: 'image',
      filename,
      extracted_via: 'sarvam_ai'
    },
  };
}
