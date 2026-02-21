// Phase 5: MLS + Signal Protocol integration
// Placeholder — will integrate ts-mls for group E2EE and 2key-ratchet for DMs

export async function encryptMessage(
  plaintext: string,
  _groupKey?: CryptoKey
): Promise<string> {
  // TODO: Encrypt with MLS group key or Signal session
  // For now, return plaintext
  return plaintext;
}

export async function decryptMessage(
  ciphertext: string,
  _groupKey?: CryptoKey
): Promise<string> {
  // TODO: Decrypt with MLS group key or Signal session
  // For now, return as-is
  return ciphertext;
}
