export function nextBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    const value = Math.random() * 256;
    bytes[i] = Math.floor(value);
  }
  return bytes;
}