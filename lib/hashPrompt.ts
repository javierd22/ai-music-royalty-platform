/**
 * Computes the SHA-256 hash of a text prompt for provenance tracking.
 * Used in Partner SDK and Sandbox for unique prompt identification.
 *
 * @param prompt - The text prompt to hash
 * @returns Promise<string> - Hexadecimal SHA-256 hash
 */
export async function hashPrompt(prompt: string): Promise<string> {
  const encoder = new globalThis.TextEncoder();
  const data = encoder.encode(prompt);
  const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data);
  const hashArray = [...new Uint8Array(hashBuffer)];
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}
