const ITERATIONS = 100_000
const ENC_PREFIX = 'ENC:'

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as unknown as ArrayBuffer, iterations: ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function encryptPassword(plaintext: string, masterPassword: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv   = crypto.getRandomValues(new Uint8Array(12))
  const key  = await deriveKey(masterPassword, salt)

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext)
  )

  const combined = new Uint8Array(salt.length + iv.length + ciphertext.byteLength)
  combined.set(salt, 0)
  combined.set(iv, salt.length)
  combined.set(new Uint8Array(ciphertext), salt.length + iv.length)

  return ENC_PREFIX + btoa(String.fromCharCode(...combined))
}

export async function decryptPassword(encrypted: string, masterPassword: string): Promise<string> {
  if (!isEncrypted(encrypted)) return encrypted // plain text — return as-is

  const combined = Uint8Array.from(atob(encrypted.slice(ENC_PREFIX.length)), c => c.charCodeAt(0))
  const salt      = combined.slice(0, 16)
  const iv        = combined.slice(16, 28)
  const ciphertext = combined.slice(28)

  const key = await deriveKey(masterPassword, salt)

  try {
    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
    return new TextDecoder().decode(plaintext)
  } catch {
    throw new Error('wrong_password')
  }
}

export function isEncrypted(value: string | null | undefined): boolean {
  return !!value?.startsWith(ENC_PREFIX)
}
