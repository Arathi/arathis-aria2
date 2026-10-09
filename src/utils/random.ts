export function nextByteArray(length: number): Uint8Array {
  const array = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    const value = Math.random() * 256;
    array[i] = Math.floor(value);
  }
  return array;
}
