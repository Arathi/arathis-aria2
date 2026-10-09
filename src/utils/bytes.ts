export function toHex(
  array: Uint8Array,
  separator: string = "",
  uppercase: boolean = false,
): string {
  const bytes: string[] = [];
  array.forEach((value) => {
    const byte = value.toString(16).padStart(2, "0");
    bytes.push(byte);
  });
  let hex = bytes.join(separator);
  if (uppercase) {
    hex = hex.toUpperCase();
  }
  return hex;
}
