// Extended types for LLM Pricing tables
// These types extend the auto-generated database.types.ts

import { Database } from './database'

export type LLMPricing = {
  id: string
  provider: string
  model: string
  cost_per_1k_input_tokens: number
  cost_per_1k_output_tokens: number
  price_per_1k_input_tokens: number
  price_per_1k_output_tokens: number
  markup_multiplier: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export type LLMTokenUsage = {
  id: string
  user_id: string | null
  empresa_cnpj: string | null
  provider: string
  model: string
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  cost_usd: number
  client_price_usd: number
  feature: string | null
  endpoint: string | null
  request_id: string | null
  metadata: Record<string, any> | null
  created_at: string
}

// Extend the Database type
export type ExtendedDatabase = Database & {
  public: Database['public'] & {
    Tables: Database['public']['Tables'] & {
      llm_pricing: {
        Row: LLMPricing
        Insert: Omit<LLMPricing, 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<LLMPricing, 'id' | 'created_at'>>
      }
      llm_token_usage: {
        Row: LLMTokenUsage
        Insert: Omit<LLMTokenUsage, 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Omit<LLMTokenUsage, 'id' | 'created_at'>>
      }
    }
  }
}

