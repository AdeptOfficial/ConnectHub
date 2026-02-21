// Phase 5: LeaseKey wrapping/unwrapping using WebCrypto AES-256-GCM + HKDF
// Placeholder implementation

export async function generateLeaseWrappingKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["wrapKey", "unwrapKey"]
  );
}

export async function wrapKey(
  keyToWrap: CryptoKey,
  wrappingKey: CryptoKey
): Promise<{ wrapped: ArrayBuffer; iv: Uint8Array }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const wrapped = await crypto.subtle.wrapKey("raw", keyToWrap, wrappingKey, {
    name: "AES-GCM",
    iv,
  });
  return { wrapped, iv };
}

export async function unwrapKey(
  wrapped: ArrayBuffer,
  wrappingKey: CryptoKey,
  iv: Uint8Array
): Promise<CryptoKey> {
  return crypto.subtle.unwrapKey(
    "raw",
    wrapped,
    wrappingKey,
    { name: "AES-GCM", iv },
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}
