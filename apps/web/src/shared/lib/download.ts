/**
 * Downloads text as a file.
 *
 * @param fileName - Name of the downloaded file.
 * @param text - File content.
 * @param type - MIME type.
 */
export const downloadText = (fileName: string, text: string, type = 'application/json'): void => {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
};
