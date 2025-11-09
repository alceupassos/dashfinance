// Supabase Database Types
// This file can be auto-generated with: npx supabase gen types typescript

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          name: string
          email: string
          avatar_url: string | null
          role: string
          two_factor_enabled: boolean
          default_company_cnpj: string | null
          available_companies: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          avatar_url?: string | null
          role?: string
          two_factor_enabled?: boolean
          default_company_cnpj?: string | null
          available_companies?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          avatar_url?: string | null
          role?: string
          two_factor_enabled?: boolean
          default_company_cnpj?: string | null
          available_companies?: string[]
          created_at?: string
          updated_at?: string
        }
      }
      // Add other tables as needed
      [key: string]: any
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

