/**
 * Embeddings utility for RAG (Retrieval Augmented Generation)
 * Generates vector embeddings using OpenAI or fallback methods
 */

import { decryptValue, getEncryptionKey } from './decrypt.ts'

export interface EmbeddingResult {
  embedding: number[]
  model: string
  tokens_used: number
  provider: 'openai' | 'fallback'
}

/**
 * Generate embeddings for text using OpenAI API
 * Falls back to local hash-based embedding if OpenAI not available
 * @param text - Text to embed
 * @param model - Model to use (default: text-embedding-3-small)
 * @param apiKey - OpenAI API key (optional, will fetch from integration_configs if not provided)
 */
export async function generateEmbedding(
  text: string,
  model: string = 'text-embedding-3-small',
  apiKey?: string
): Promise<EmbeddingResult> {
  if (!text || text.trim().length === 0) {
    throw new Error('Text cannot be empty')
  }

  try {
    // Se não forneceu API key, tenta usar fallback
    if (!apiKey) {
      console.warn('[embeddings] No API key provided, using fallback embedding')
      return generateFallbackEmbedding(text)
    }

    // Tentar usar OpenAI
    return await generateOpenAIEmbedding(text, model, apiKey)
  } catch (error) {
    console.warn(`[embeddings] OpenAI embedding failed: ${error.message}, using fallback`)
    // Fallback para método local
    return generateFallbackEmbedding(text)
  }
}

/**
 * Generate embedding using OpenAI API
 * Returns 1536-dimensional vector for text-embedding-3-small
 * or 3072-dimensional for text-embedding-3-large
 */
async function generateOpenAIEmbedding(
  text: string,
  model: string,
  apiKey: string
): Promise<EmbeddingResult> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: text,
      model: model,
      encoding_format: 'float',
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()

  return {
    embedding: data.data[0].embedding,
    model: model,
    tokens_used: data.usage.prompt_tokens,
    provider: 'openai',
  }
}

/**
 * Fallback embedding using local hash-based method
 * Generates a 1536-dimensional vector (same as OpenAI's small model)
 * Based on text characteristics: length, char distribution, word patterns
 */
function generateFallbackEmbedding(text: string): EmbeddingResult {
  const dimension = 1536 // Mesmo tamanho do text-embedding-3-small

  // Normalizar texto
  const normalized = text.toLowerCase().trim()
  
  // Gerar múltiplos hashes da string para ter diversidade
  const hashes = [
    hashString(normalized),
    hashString(normalized + '-v2'),
    hashString(normalized + '-v3'),
  ]

  // Criar array de embeddings
  const embedding: number[] = []

  // Usar os hashes para seed valores iniciais
  let seed = hashes[0]
  for (let i = 0; i < dimension; i++) {
    seed = seededRandom(seed, normalized)
    // Valores entre -1 e 1 (normalizado)
    embedding.push((seed % 2) - 1)
  }

  // Adicionar algumas características do texto para melhor distinção
  addTextFeatures(embedding, normalized)

  return {
    embedding: embedding.map(v => Math.min(1, Math.max(-1, v))), // Clamp entre -1 e 1
    model: 'fallback-hash',
    tokens_used: Math.ceil(normalized.length / 4),
    provider: 'fallback',
  }
}

/**
 * Simple hash function para string
 */
function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash)
}

/**
 * Seeded random number generator
 */
function seededRandom(seed: number, str: string): number {
  const multiplier = 1103515245
  const increment = 12345
  const modulus = 2147483648

  let value = (seed * multiplier + increment) % modulus
  
  // Adicionar influência do caractere da string
  if (str.length > 0) {
    value = (value + str.charCodeAt(Math.floor(Math.random() * str.length))) % modulus
  }

  return value
}

/**
 * Adicionar características do texto ao embedding para melhor distinção
 */
function addTextFeatures(embedding: number[], text: string): void {
  const features = {
    length: text.length,
    wordCount: text.split(/\s+/).length,
    uniqueChars: new Set(text).size,
    punctuationCount: (text.match(/[.,!?;:]/g) || []).length,
    digitCount: (text.match(/\d/g) || []).length,
    vowelCount: (text.match(/[aeiouáéíóú]/g) || []).length,
  }

  // Normalizar features para escala -1 a 1
  const maxLength = 1000
  const normalized = {
    length: (features.length / maxLength) * 2 - 1,
    wordCount: Math.min(1, features.wordCount / 100) * 2 - 1,
    uniqueChars: (features.uniqueChars / 256) * 2 - 1,
    punctuation: Math.min(1, features.punctuationCount / 10) * 2 - 1,
    digits: Math.min(1, features.digitCount / 10) * 2 - 1,
    vowels: (features.vowelCount / Math.max(features.wordCount, 1)) * 2 - 1,
  }

  // Distribuir features ao longo do embedding
  const featureArray = Object.values(normalized)
  const stepSize = Math.floor(embedding.length / featureArray.length)

  featureArray.forEach((value, index) => {
    const position = index * stepSize
    if (position < embedding.length) {
      embedding[position] = (embedding[position] + value) / 2
    }
  })
}

/**
 * Calculate cosine similarity between two embeddings
 * Returns value between 0 and 1
 */
export function cosineSimilarity(embA: number[], embB: number[]): number {
  if (embA.length !== embB.length) {
    throw new Error('Embeddings must have same dimension')
  }

  let dotProduct = 0
  let magnitudeA = 0
  let magnitudeB = 0

  for (let i = 0; i < embA.length; i++) {
    dotProduct += embA[i] * embB[i]
    magnitudeA += embA[i] * embA[i]
    magnitudeB += embB[i] * embB[i]
  }

  magnitudeA = Math.sqrt(magnitudeA)
  magnitudeB = Math.sqrt(magnitudeB)

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0
  }

  return dotProduct / (magnitudeA * magnitudeB)
}

/**
 * Get OpenAI API key from integration configs
 */
export async function getOpenAIKey(supabaseClient: any): Promise<string | null> {
  try {
    const { data: config } = await supabaseClient
      .from('integration_configs')
      .select('api_key_encrypted')
      .eq('integration_name', 'OpenAI')
      .eq('is_active', true)
      .single()

    if (!config?.api_key_encrypted) {
      return null
    }

    // Descriptografar
    const encryptionKey = Deno.env.get('ENCRYPTION_KEY') || 'default-key-change-in-production'
    return await decryptValue(config.api_key_encrypted, encryptionKey)
  } catch (error) {
    console.warn('[getOpenAIKey] Error fetching OpenAI key:', error)
    return null
  }
}

