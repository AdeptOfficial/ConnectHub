// Phase 5: Identity key generation + storage
// For now, generates placeholder keys using WebCrypto

export async function generateIdentityKeyPair() {
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey", "deriveBits"]
  );

  const publicKeyRaw = await crypto.subtle.exportKey("raw", keyPair.publicKey);
  const publicKeyBase64 = btoa(
    String.fromCharCode(...new Uint8Array(publicKeyRaw))
  );

  return {
    keyPair,
    publicKeyBase64,
  };
}

export async function generateSignedPrekey() {
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey", "deriveBits"]
  );

  const publicKeyRaw = await crypto.subtle.exportKey("raw", keyPair.publicKey);
  const publicKeyBase64 = btoa(
    String.fromCharCode(...new Uint8Array(publicKeyRaw))
  );

  // TODO: sign with identity key
  return {
    keyPair,
    publicKeyBase64,
    signature: "", // placeholder
  };
}
