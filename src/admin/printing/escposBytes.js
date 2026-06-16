/** Convert ESC/POS string (latin1 control bytes) to base64 for the print connector. */
export function escPosStringToBytes(str) {
  const raw = String(str ?? "");
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    bytes[i] = raw.charCodeAt(i) & 0xff;
  }
  return bytes;
}

export function escPosStringToBase64(str) {
  const bytes = escPosStringToBytes(str);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
