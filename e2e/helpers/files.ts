import type { Download } from '@playwright/test';

/** A file to upload: a path on disk, or a name with its content. */
export type UploadFile = string | { name: string; mimeType: string; buffer: Buffer };

/**
 * Builds a JSON file to upload.
 *
 * @param name - File name.
 * @param content - Text of the file (not necessarily valid JSON).
 * @returns The file, ready for setInputFiles.
 */
export const jsonFile = (name: string, content: string): UploadFile => ({
  name,
  mimeType: 'application/json',
  buffer: Buffer.from(content),
});

/**
 * Reads the text of a downloaded file.
 *
 * @param download - Download started by the page.
 * @returns The file content.
 */
export const downloadedText = async (download: Download): Promise<string> => {
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk as Buffer));
  return Buffer.concat(chunks).toString('utf8');
};
