/**
 * Decrypt utility for API keys and sensitive data
 * Uses AES-GCM encryption with a key from environment
 */

/**
 * Decrypt a value that was encrypted with encryptValue
 * @param encryptedBase64 - Base64 encoded IV + ciphertext
 * @param encryptionKey - Encryption key (same as used in encrypt)
 * @returns Decrypted value as string
 */
export async function decryptValue(
  encryptedBase64: string,
  encryptionKey: string
): Promise<string> {
  try {
    // Decode from base64
    const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0))
    
    // Split IV and ciphertext
    const iv = combined.slice(0, 12)
    const ciphertext = combined.slice(12)
    
    // Import key
    const encoder = new TextEncoder()
    const keyData = encoder.encode(encryptionKey.slice(0, 32).padEnd(32, '0'))
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    )
    
    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    )
    
    // Convert back to string
    return new TextDecoder().decode(decrypted)
  } catch (error) {
    console.error('[decrypt] Error decrypting value:', error)
    throw new Error(`Failed to decrypt value: ${error.message}`)
  }
}

/**
 * Encrypt a value using AES-GCM
 * @param value - Plain text value to encrypt
 * @param encryptionKey - Encryption key
 * @returns Base64 encoded IV + ciphertext
 */
export async function encryptValue(
  value: string,
  encryptionKey: string
): Promise<string> {
  try {
    const encoder = new TextEncoder()
    const keyData = encoder.encode(encryptionKey.slice(0, 32).padEnd(32, '0'))
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    )

    const iv = crypto.getRandomValues(new Uint8Array(12))
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoder.encode(value)
    )

    // Combine IV and ciphertext
    const encryptedArray = new Uint8Array(encrypted)
    const combined = new Uint8Array(iv.length + encryptedArray.length)
    combined.set(iv)
    combined.set(encryptedArray, iv.length)
    
    // Encode to base64
    return btoa(String.fromCharCode(...combined))
  } catch (error) {
    console.error('[encrypt] Error encrypting value:', error)
    throw new Error(`Failed to encrypt value: ${error.message}`)
  }
}

/**
 * Get encryption key from environment
 * In production, this should come from Supabase Secrets
 */
export function getEncryptionKey(): string {
  const key = Deno.env.get('ENCRYPTION_KEY')
  if (!key) {
    console.warn('[getEncryptionKey] Using default key - should be configured in Supabase Secrets!')
    return 'default-key-change-in-production'
  }
  return key
}

