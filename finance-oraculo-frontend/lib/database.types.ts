export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      active_sessions: {
        Row: {
          created_at: string
          device_type: string | null
          expires_at: string
          id: string
          ip_address: unknown
          is_active: boolean
          last_activity_at: string
          location_city: string | null
          location_country: string | null
          session_token: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          device_type?: string | null
          expires_at: string
          id?: string
          ip_address: unknown
          is_active?: boolean
          last_activity_at?: string
          location_city?: string | null
          location_country?: string | null
          session_token: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          device_type?: string | null
          expires_at?: string
          id?: string
          ip_address?: unknown
          is_active?: boolean
          last_activity_at?: string
          location_city?: string | null
          location_country?: string | null
          session_token?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "active_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "active_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_active_users_24h"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_api_metrics: {
        Row: {
          avg_latency_ms: number | null
          created_at: string
          error_count: number | null
          function_name: string
          id: string
          interval_end: string
          interval_start: string
          p50_latency_ms: number | null
          p95_latency_ms: number | null
          p99_latency_ms: number | null
          request_bytes: number | null
          request_count: number | null
          response_bytes: number | null
          success_count: number | null
        }
        Insert: {
          avg_latency_ms?: number | null
          created_at?: string
          error_count?: number | null
          function_name: string
          id?: string
          interval_end: string
          interval_start: string
          p50_latency_ms?: number | null
          p95_latency_ms?: number | null
          p99_latency_ms?: number | null
          request_bytes?: number | null
          request_count?: number | null
          response_bytes?: number | null
          success_count?: number | null
        }
        Update: {
          avg_latency_ms?: number | null
          created_at?: string
          error_count?: number | null
          function_name?: string
          id?: string
          interval_end?: string
          interval_start?: string
          p50_latency_ms?: number | null
          p95_latency_ms?: number | null
          p99_latency_ms?: number | null
          request_bytes?: number | null
          request_count?: number | null
          response_bytes?: number | null
          success_count?: number | null
        }
        Relationships: []
      }
      admin_backups: {
        Row: {
          backup_date: string
          backup_location: string | null
          backup_time: string
          backup_type: string
          completed_at: string | null
          created_at: string
          duration_seconds: number | null
          error_message: string | null
          id: string
          notes: string | null
          retention_days: number | null
          size_mb: number | null
          status: string
          triggered_by: string | null
          triggered_by_user_id: string | null
        }
        Insert: {
          backup_date: string
          backup_location?: string | null
          backup_time?: string
          backup_type: string
          completed_at?: string | null
          created_at?: string
          duration_seconds?: number | null
          error_message?: string | null
          id?: string
          notes?: string | null
          retention_days?: number | null
          size_mb?: number | null
          status: string
          triggered_by?: string | null
          triggered_by_user_id?: string | null
        }
        Update: {
          backup_date?: string
          backup_location?: string | null
          backup_time?: string
          backup_type?: string
          completed_at?: string | null
          created_at?: string
          duration_seconds?: number | null
          error_message?: string | null
          id?: string
          notes?: string | null
          retention_days?: number | null
          size_mb?: number | null
          status?: string
          triggered_by?: string | null
          triggered_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_backups_triggered_by_user_id_fkey"
            columns: ["triggered_by_user_id"]
            isOneToOne: false
            referencedRelation: "v_users_with_access"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_db_metrics: {
        Row: {
          active_connections: number | null
          avg_query_time_ms: number | null
          cpu_percent: number | null
          created_at: string
          db_size_mb: number | null
          disk_percent: number | null
          id: string
          interval_start: string
          iops_read: number | null
          iops_write: number | null
          max_connections: number | null
          memory_percent: number | null
          slow_query_count: number | null
        }
        Insert: {
          active_connections?: number | null
          avg_query_time_ms?: number | null
          cpu_percent?: number | null
          created_at?: string
          db_size_mb?: number | null
          disk_percent?: number | null
          id?: string
          interval_start: string
          iops_read?: number | null
          iops_write?: number | null
          max_connections?: number | null
          memory_percent?: number | null
          slow_query_count?: number | null
        }
        Update: {
          active_connections?: number | null
          avg_query_time_ms?: number | null
          cpu_percent?: number | null
          created_at?: string
          db_size_mb?: number | null
          disk_percent?: number | null
          id?: string
          interval_start?: string
          iops_read?: number | null
          iops_write?: number | null
          max_connections?: number | null
          memory_percent?: number | null
          slow_query_count?: number | null
        }
        Relationships: []
      }
      admin_security_events: {
        Row: {
          assigned_to: string | null
          created_at: string
          description: string
          event_type: string
          id: string
          metadata: Json | null
          resolved_at: string | null
          severity: string
          source: string | null
          status: string | null
          timestamp: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          description: string
          event_type: string
          id?: string
          metadata?: Json | null
          resolved_at?: string | null
          severity: string
          source?: string | null
          status?: string | null
          timestamp?: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          description?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          resolved_at?: string | null
          severity?: string
          source?: string | null
          status?: string | null
          timestamp?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_security_events_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "v_users_with_access"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_security_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_users_with_access"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_sessions: {
        Row: {
          browser: string | null
          created_at: string
          device_name: string | null
          device_type: string | null
          id: string
          ip_address: string | null
          last_activity: string
          location_city: string | null
          location_country: string | null
          location_lat: number | null
          location_lon: number | null
          os: string | null
          status: string | null
          terminated_at: string | null
          user_agent: string | null
          user_email: string
          user_id: string
        }
        Insert: {
          browser?: string | null
          created_at?: string
          device_name?: string | null
          device_type?: string | null
          id?: string
          ip_address?: string | null
          last_activity?: string
          location_city?: string | null
          location_country?: string | null
          location_lat?: number | null
          location_lon?: number | null
          os?: string | null
          status?: string | null
          terminated_at?: string | null
          user_agent?: string | null
          user_email: string
          user_id: string
        }
        Update: {
          browser?: string | null
          created_at?: string
          device_name?: string | null
          device_type?: string | null
          id?: string
          ip_address?: string | null
          last_activity?: string
          location_city?: string | null
          location_country?: string | null
          location_lat?: number | null
          location_lon?: number | null
          os?: string | null
          status?: string | null
          terminated_at?: string | null
          user_agent?: string | null
          user_email?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_users_with_access"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_vulnerabilities: {
        Row: {
          affected_component: string | null
          category: string | null
          created_at: string
          cve_id: string | null
          cvss_score: number | null
          description: string | null
          detected_at: string
          detected_by: string | null
          id: string
          metadata: Json | null
          owner_id: string | null
          remediation_steps: string | null
          resolved_at: string | null
          severity: string
          status: string | null
          title: string
          updated_at: string
        }
        Insert: {
          affected_component?: string | null
          category?: string | null
          created_at?: string
          cve_id?: string | null
          cvss_score?: number | null
          description?: string | null
          detected_at?: string
          detected_by?: string | null
          id?: string
          metadata?: Json | null
          owner_id?: string | null
          remediation_steps?: string | null
          resolved_at?: string | null
          severity: string
          status?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          affected_component?: string | null
          category?: string | null
          created_at?: string
          cve_id?: string | null
          cvss_score?: number | null
          description?: string | null
          detected_at?: string
          detected_by?: string | null
          id?: string
          metadata?: Json | null
          owner_id?: string | null
          remediation_steps?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_vulnerabilities_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "v_users_with_access"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_response_cache: {
        Row: {
          answer_text: string
          cache_expires_at: string
          company_cnpj: string
          created_at: string | null
          id: string
          question_hash: string
          question_text: string
          source_data: Json | null
        }
        Insert: {
          answer_text: string
          cache_expires_at: string
          company_cnpj: string
          created_at?: string | null
          id?: string
          question_hash: string
          question_text: string
          source_data?: Json | null
        }
        Update: {
          answer_text?: string
          cache_expires_at?: string
          company_cnpj?: string
          created_at?: string | null
          id?: string
          question_hash?: string
          question_text?: string
          source_data?: Json | null
        }
        Relationships: []
      }
      anexos: {
        Row: {
          arquivo_url: string | null
          id: string | null
          leilao_id: string | null
          nome_arquivo: string | null
        }
        Insert: {
          arquivo_url?: string | null
          id?: string | null
          leilao_id?: string | null
          nome_arquivo?: string | null
        }
        Update: {
          arquivo_url?: string | null
          id?: string | null
          leilao_id?: string | null
          nome_arquivo?: string | null
        }
        Relationships: []
      }
      anexos_clientes: {
        Row: {
          arquivo_url: string | null
          cliente_id: string | null
          id: string | null
          nome_arquivo: string | null
          uploaded_at: string | null
        }
        Insert: {
          arquivo_url?: string | null
          cliente_id?: string | null
          id?: string | null
          nome_arquivo?: string | null
          uploaded_at?: string | null
        }
        Update: {
          arquivo_url?: string | null
          cliente_id?: string | null
          id?: string | null
          nome_arquivo?: string | null
          uploaded_at?: string | null
        }
        Relationships: []
      }
      anexos_franqueados: {
        Row: {
          arquivo_url: string | null
          franqueado_id: string | null
          id: string | null
          nome_arquivo: string | null
          uploaded_at: string | null
        }
        Insert: {
          arquivo_url?: string | null
          franqueado_id?: string | null
          id?: string | null
          nome_arquivo?: string | null
          uploaded_at?: string | null
        }
        Update: {
          arquivo_url?: string | null
          franqueado_id?: string | null
          id?: string | null
          nome_arquivo?: string | null
          uploaded_at?: string | null
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          key_name: string
          key_type: string
          key_value_encrypted: string
          last_used_at: string | null
          provider: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          key_name: string
          key_type: string
          key_value_encrypted: string
          last_used_at?: string | null
          provider: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          key_name?: string
          key_type?: string
          key_value_encrypted?: string
          last_used_at?: string | null
          provider?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_keys_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_active_users_24h"
            referencedColumns: ["id"]
          },
        ]
      }
      api_request_logs: {
        Row: {
          created_at: string
          error_message: string | null
          function_name: string
          id: string
          ip_address: unknown
          method: string
          path: string
          request_size_bytes: number | null
          response_size_bytes: number | null
          response_time_ms: number | null
          status_code: number
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          function_name: string
          id?: string
          ip_address?: unknown
          method: string
          path: string
          request_size_bytes?: number | null
          response_size_bytes?: number | null
          response_time_ms?: number | null
          status_code: number
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          function_name?: string
          id?: string
          ip_address?: unknown
          method?: string
          path?: string
          request_size_bytes?: number | null
          response_size_bytes?: number | null
          response_time_ms?: number | null
          status_code?: number
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_request_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_request_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_active_users_24h"
            referencedColumns: ["id"]
          },
        ]
      }
      api_usage_logs: {
        Row: {
          created_at: string | null
          endpoint: string
          id: string
          method: string
          response_time: number | null
          status_code: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          endpoint: string
          id?: string
          method: string
          response_time?: number | null
          status_code?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          id?: string
          method?: string
          response_time?: number | null
          status_code?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_usage_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_users_with_access"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string | null
          created_at: string | null
          id: string | null
          ip_address: unknown
          new_value: Json | null
          old_value: Json | null
          resource_id: string | null
          resource_type: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action?: string | null
          created_at?: string | null
          id?: string | null
          ip_address?: unknown
          new_value?: Json | null
          old_value?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string | null
          created_at?: string | null
          id?: string | null
          ip_address?: unknown
          new_value?: Json | null
          old_value?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      backup_status: {
        Row: {
          backup_location: string | null
          backup_type: string
          completed_at: string | null
          duration_seconds: number | null
          error_message: string | null
          id: string
          size_mb: number | null
          started_at: string
          status: string
        }
        Insert: {
          backup_location?: string | null
          backup_type: string
          completed_at?: string | null
          duration_seconds?: number | null
          error_message?: string | null
          id?: string
          size_mb?: number | null
          started_at: string
          status: string
        }
        Update: {
          backup_location?: string | null
          backup_type?: string
          completed_at?: string | null
          duration_seconds?: number | null
          error_message?: string | null
          id?: string
          size_mb?: number | null
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      card_dependencies: {
        Row: {
          cache_ttl_minutes: number | null
          can_parallelize: boolean | null
          card_type: string
          computation_complexity: string | null
          created_at: string
          data_sources: string[] | null
          depends_on: string[] | null
          description: string | null
          display_name: string
          estimated_duration_ms: number | null
          metadata: Json | null
          tier: number | null
          updated_at: string
        }
        Insert: {
          cache_ttl_minutes?: number | null
          can_parallelize?: boolean | null
          card_type: string
          computation_complexity?: string | null
          created_at?: string
          data_sources?: string[] | null
          depends_on?: string[] | null
          description?: string | null
          display_name: string
          estimated_duration_ms?: number | null
          metadata?: Json | null
          tier?: number | null
          updated_at?: string
        }
        Update: {
          cache_ttl_minutes?: number | null
          can_parallelize?: boolean | null
          card_type?: string
          computation_complexity?: string | null
          created_at?: string
          data_sources?: string[] | null
          depends_on?: string[] | null
          description?: string | null
          display_name?: string
          estimated_duration_ms?: number | null
          metadata?: Json | null
          tier?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      card_processing_log: {
        Row: {
          card_type: string
          company_cnpj: string
          created_at: string
          duration_ms: number | null
          error_message: string | null
          event_type: string
          id: string
          metadata: Json | null
          queue_id: string | null
          status: string
          worker_id: string | null
        }
        Insert: {
          card_type: string
          company_cnpj: string
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          queue_id?: string | null
          status: string
          worker_id?: string | null
        }
        Update: {
          card_type?: string
          company_cnpj?: string
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          queue_id?: string | null
          status?: string
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "card_processing_log_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "card_processing_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      card_processing_queue: {
        Row: {
          actual_duration_ms: number | null
          attempts: number | null
          cache_key: string | null
          card_type: string
          company_cnpj: string
          completed_at: string | null
          computed_data: Json | null
          created_at: string
          error_details: Json | null
          estimated_duration_ms: number | null
          expires_at: string | null
          id: string
          input_data: Json | null
          last_error: string | null
          max_attempts: number | null
          period: string
          priority: number | null
          reference_date: string
          started_at: string | null
          status: string | null
          updated_at: string
          worker_id: string | null
        }
        Insert: {
          actual_duration_ms?: number | null
          attempts?: number | null
          cache_key?: string | null
          card_type: string
          company_cnpj: string
          completed_at?: string | null
          computed_data?: Json | null
          created_at?: string
          error_details?: Json | null
          estimated_duration_ms?: number | null
          expires_at?: string | null
          id?: string
          input_data?: Json | null
          last_error?: string | null
          max_attempts?: number | null
          period?: string
          priority?: number | null
          reference_date: string
          started_at?: string | null
          status?: string | null
          updated_at?: string
          worker_id?: string | null
        }
        Update: {
          actual_duration_ms?: number | null
          attempts?: number | null
          cache_key?: string | null
          card_type?: string
          company_cnpj?: string
          completed_at?: string | null
          computed_data?: Json | null
          created_at?: string
          error_details?: Json | null
          estimated_duration_ms?: number | null
          expires_at?: string | null
          id?: string
          input_data?: Json | null
          last_error?: string | null
          max_attempts?: number | null
          period?: string
          priority?: number | null
          reference_date?: string
          started_at?: string | null
          status?: string | null
          updated_at?: string
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "card_processing_queue_card_type_fkey"
            columns: ["card_type"]
            isOneToOne: false
            referencedRelation: "card_dependencies"
            referencedColumns: ["card_type"]
          },
        ]
      }
      cashflow_entries: {
        Row: {
          amount: number
          category: string | null
          company_cnpj: string
          company_nome: string | null
          created_at: string | null
          date: string
          id: number
          kind: string
        }
        Insert: {
          amount: number
          category?: string | null
          company_cnpj: string
          company_nome?: string | null
          created_at?: string | null
          date: string
          id?: number
          kind: string
        }
        Update: {
          amount?: number
          category?: string | null
          company_cnpj?: string
          company_nome?: string | null
          created_at?: string | null
          date?: string
          id?: number
          kind?: string
        }
        Relationships: []
      }
      chunks: {
        Row: {
          content: string
          created_at: string | null
          embedding: string | null
          id: string
          source_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          source_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          source_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chunks_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      client_credentials: {
        Row: {
          access_token: string | null
          api_key: string | null
          api_secret: string | null
          client_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          refresh_token: string | null
          service_name: string
          token_expires_at: string | null
          updated_at: string | null
        }
        Insert: {
          access_token?: string | null
          api_key?: string | null
          api_secret?: string | null
          client_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          refresh_token?: string | null
          service_name: string
          token_expires_at?: string | null
          updated_at?: string | null
        }
        Update: {
          access_token?: string | null
          api_key?: string | null
          api_secret?: string | null
          client_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          refresh_token?: string | null
          service_name?: string
          token_expires_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_credentials_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_table_backup"
            referencedColumns: ["id"]
          },
        ]
      }
      client_integrations: {
        Row: {
          client_id: string
          config: Json | null
          created_at: string | null
          id: string
          integration_type: string
          is_active: boolean | null
          last_sync_at: string | null
          updated_at: string | null
        }
        Insert: {
          client_id: string
          config?: Json | null
          created_at?: string | null
          id?: string
          integration_type: string
          is_active?: boolean | null
          last_sync_at?: string | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          config?: Json | null
          created_at?: string | null
          id?: string
          integration_type?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_integrations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_table_backup"
            referencedColumns: ["id"]
          },
        ]
      }
      client_notifications_config: {
        Row: {
          cash_threshold: number | null
          company_cnpj: string
          created_at: string | null
          daily_snapshot_enabled: boolean | null
          daily_snapshot_time: string | null
          id: string
          monthly_dre_enabled: boolean | null
          overdue_alerts_enabled: boolean | null
          phone_number: string
          runway_threshold_days: number | null
          updated_at: string | null
          weekly_kpi_day: number | null
          weekly_kpi_enabled: boolean | null
        }
        Insert: {
          cash_threshold?: number | null
          company_cnpj: string
          created_at?: string | null
          daily_snapshot_enabled?: boolean | null
          daily_snapshot_time?: string | null
          id?: string
          monthly_dre_enabled?: boolean | null
          overdue_alerts_enabled?: boolean | null
          phone_number: string
          runway_threshold_days?: number | null
          updated_at?: string | null
          weekly_kpi_day?: number | null
          weekly_kpi_enabled?: boolean | null
        }
        Update: {
          cash_threshold?: number | null
          company_cnpj?: string
          created_at?: string | null
          daily_snapshot_enabled?: boolean | null
          daily_snapshot_time?: string | null
          id?: string
          monthly_dre_enabled?: boolean | null
          overdue_alerts_enabled?: boolean | null
          phone_number?: string
          runway_threshold_days?: number | null
          updated_at?: string | null
          weekly_kpi_day?: number | null
          weekly_kpi_enabled?: boolean | null
        }
        Relationships: []
      }
      client_security_audit: {
        Row: {
          action: string | null
          client_franchise: string | null
          client_id: string | null
          client_name: string | null
          id: string | null
          ip_address: unknown
          timestamp: string | null
          user_agent: string | null
          user_id: string | null
          user_role: string | null
          user_unit: string | null
        }
        Insert: {
          action?: string | null
          client_franchise?: string | null
          client_id?: string | null
          client_name?: string | null
          id?: string | null
          ip_address?: unknown
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
          user_role?: string | null
          user_unit?: string | null
        }
        Update: {
          action?: string | null
          client_franchise?: string | null
          client_id?: string | null
          client_name?: string | null
          id?: string | null
          ip_address?: unknown
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
          user_role?: string | null
          user_unit?: string | null
        }
        Relationships: []
      }
      clientes: {
        Row: {
          assinatura_contrato: string | null
          atividade: string | null
          bi: string | null
          cidade: string | null
          cnae: string | null
          cnpj: string | null
          created_at: string | null
          data_contrato: string | null
          data_encerramento: string | null
          data_inicio: string | null
          diferenciais_contrato: string | null
          estado: string | null
          fin: string | null
          franqueado: string | null
          franqueado_id: string | null
          grupo: string | null
          grupo_economico: string | null
          id: string | null
          inicio_previsto: string | null
          licenca: string | null
          marca: string | null
          motivo_saida: string | null
          nome_interno_cliente: string | null
          numero_contrato: number | null
          observacoes: string | null
          operacao_anterior: string | null
          origem: string | null
          pacote_atual: string | null
          parceiro: string | null
          playbpo: string | null
          razao_social: string | null
          responsavel: string | null
          segmento: string | null
          semana: string | null
          sistema: string | null
          status: string | null
          status_onboarding: string | null
          token_f360: string | null
          token_status: string | null
          updated_at: string | null
          valor_sistema: number | null
        }
        Insert: {
          assinatura_contrato?: string | null
          atividade?: string | null
          bi?: string | null
          cidade?: string | null
          cnae?: string | null
          cnpj?: string | null
          created_at?: string | null
          data_contrato?: string | null
          data_encerramento?: string | null
          data_inicio?: string | null
          diferenciais_contrato?: string | null
          estado?: string | null
          fin?: string | null
          franqueado?: string | null
          franqueado_id?: string | null
          grupo?: string | null
          grupo_economico?: string | null
          id?: string | null
          inicio_previsto?: string | null
          licenca?: string | null
          marca?: string | null
          motivo_saida?: string | null
          nome_interno_cliente?: string | null
          numero_contrato?: number | null
          observacoes?: string | null
          operacao_anterior?: string | null
          origem?: string | null
          pacote_atual?: string | null
          parceiro?: string | null
          playbpo?: string | null
          razao_social?: string | null
          responsavel?: string | null
          segmento?: string | null
          semana?: string | null
          sistema?: string | null
          status?: string | null
          status_onboarding?: string | null
          token_f360?: string | null
          token_status?: string | null
          updated_at?: string | null
          valor_sistema?: number | null
        }
        Update: {
          assinatura_contrato?: string | null
          atividade?: string | null
          bi?: string | null
          cidade?: string | null
          cnae?: string | null
          cnpj?: string | null
          created_at?: string | null
          data_contrato?: string | null
          data_encerramento?: string | null
          data_inicio?: string | null
          diferenciais_contrato?: string | null
          estado?: string | null
          fin?: string | null
          franqueado?: string | null
          franqueado_id?: string | null
          grupo?: string | null
          grupo_economico?: string | null
          id?: string | null
          inicio_previsto?: string | null
          licenca?: string | null
          marca?: string | null
          motivo_saida?: string | null
          nome_interno_cliente?: string | null
          numero_contrato?: number | null
          observacoes?: string | null
          operacao_anterior?: string | null
          origem?: string | null
          pacote_atual?: string | null
          parceiro?: string | null
          playbpo?: string | null
          razao_social?: string | null
          responsavel?: string | null
          segmento?: string | null
          semana?: string | null
          sistema?: string | null
          status?: string | null
          status_onboarding?: string | null
          token_f360?: string | null
          token_status?: string | null
          updated_at?: string | null
          valor_sistema?: number | null
        }
        Relationships: []
      }
      clientes_sensitive_data: {
        Row: {
          cnpj: string | null
          contatos_adicionais: string | null
          created_at: string | null
          data_primeiro_pagamento: string | null
          dia_vencimento_mensalidade: number | null
          email: string | null
          endereco: string | null
          fnp: number | null
          id: string | null
          mensalidade: number | null
          royalties: number | null
          socio: string | null
          telefone: string | null
          tipo_pagamento: string | null
          updated_at: string | null
        }
        Insert: {
          cnpj?: string | null
          contatos_adicionais?: string | null
          created_at?: string | null
          data_primeiro_pagamento?: string | null
          dia_vencimento_mensalidade?: number | null
          email?: string | null
          endereco?: string | null
          fnp?: number | null
          id?: string | null
          mensalidade?: number | null
          royalties?: number | null
          socio?: string | null
          telefone?: string | null
          tipo_pagamento?: string | null
          updated_at?: string | null
        }
        Update: {
          cnpj?: string | null
          contatos_adicionais?: string | null
          created_at?: string | null
          data_primeiro_pagamento?: string | null
          dia_vencimento_mensalidade?: number | null
          email?: string | null
          endereco?: string | null
          fnp?: number | null
          id?: string | null
          mensalidade?: number | null
          royalties?: number | null
          socio?: string | null
          telefone?: string | null
          tipo_pagamento?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      clients_table_backup: {
        Row: {
          address: string | null
          city: string | null
          cpf_cnpj: string | null
          created_at: string | null
          email: string | null
          franchisee_id: string
          id: string
          name: string
          notes: string | null
          phone: string | null
          state: string | null
          status: string | null
          updated_at: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          cpf_cnpj?: string | null
          created_at?: string | null
          email?: string | null
          franchisee_id: string
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          state?: string | null
          status?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          cpf_cnpj?: string | null
          created_at?: string | null
          email?: string | null
          franchisee_id?: string
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          state?: string | null
          status?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_franchisee_id_fkey"
            columns: ["franchisee_id"]
            isOneToOne: false
            referencedRelation: "franchisees"
            referencedColumns: ["id"]
          },
        ]
      }
      cockpit_data: {
        Row: {
          created_at: string | null
          franchisee_id: string
          id: string
          metric_date: string | null
          metric_name: string
          metric_value: number | null
        }
        Insert: {
          created_at?: string | null
          franchisee_id: string
          id?: string
          metric_date?: string | null
          metric_name: string
          metric_value?: number | null
        }
        Update: {
          created_at?: string | null
          franchisee_id?: string
          id?: string
          metric_date?: string | null
          metric_name?: string
          metric_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cockpit_data_franchisee_id_fkey"
            columns: ["franchisee_id"]
            isOneToOne: false
            referencedRelation: "franchisees"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_checks: {
        Row: {
          check_name: string
          check_type: string
          checked_at: string
          details: Json | null
          id: string
          passed: boolean
        }
        Insert: {
          check_name: string
          check_type: string
          checked_at?: string
          details?: Json | null
          id?: string
          passed: boolean
        }
        Update: {
          check_name?: string
          check_type?: string
          checked_at?: string
          details?: Json | null
          id?: string
          passed?: boolean
        }
        Relationships: []
      }
      contracts: {
        Row: {
          client_id: string
          created_at: string | null
          description: string | null
          end_date: string | null
          file_url: string | null
          franchisee_id: string
          id: string
          start_date: string | null
          status: string | null
          title: string
          updated_at: string | null
          value: number | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          file_url?: string | null
          franchisee_id: string
          id?: string
          start_date?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
          value?: number | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          file_url?: string | null
          franchisee_id?: string
          id?: string
          start_date?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_table_backup"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_franchisee_id_fkey"
            columns: ["franchisee_id"]
            isOneToOne: false
            referencedRelation: "franchisees"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_analytics: {
        Row: {
          avg_response_time_seconds: number | null
          bot_messages: number
          conversation_id: string | null
          failed_queries: number
          first_message_at: string | null
          id: string
          last_message_at: string | null
          models_used: Json | null
          off_topic_queries: number
          successful_queries: number
          top_topics: string[] | null
          total_cost_usd: number
          total_messages: number
          total_tokens_input: number
          total_tokens_output: number
          updated_at: string
          user_cnpj: string
          user_messages: number
          user_phone: string
        }
        Insert: {
          avg_response_time_seconds?: number | null
          bot_messages?: number
          conversation_id?: string | null
          failed_queries?: number
          first_message_at?: string | null
          id?: string
          last_message_at?: string | null
          models_used?: Json | null
          off_topic_queries?: number
          successful_queries?: number
          top_topics?: string[] | null
          total_cost_usd?: number
          total_messages?: number
          total_tokens_input?: number
          total_tokens_output?: number
          updated_at?: string
          user_cnpj: string
          user_messages?: number
          user_phone: string
        }
        Update: {
          avg_response_time_seconds?: number | null
          bot_messages?: number
          conversation_id?: string | null
          failed_queries?: number
          first_message_at?: string | null
          id?: string
          last_message_at?: string | null
          models_used?: Json | null
          off_topic_queries?: number
          successful_queries?: number
          top_topics?: string[] | null
          total_cost_usd?: number
          total_messages?: number
          total_tokens_input?: number
          total_tokens_output?: number
          updated_at?: string
          user_cnpj?: string
          user_messages?: number
          user_phone?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_analytics_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_context: {
        Row: {
          conversation_id: string | null
          created_at: string
          id: string
          llm_cost_usd: number | null
          llm_model_used: string | null
          message_content: string
          message_role: string
          message_tokens: number | null
          metadata: Json | null
          user_cnpj: string
          user_phone: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          id?: string
          llm_cost_usd?: number | null
          llm_model_used?: string | null
          message_content: string
          message_role: string
          message_tokens?: number | null
          metadata?: Json | null
          user_cnpj: string
          user_phone: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          id?: string
          llm_cost_usd?: number | null
          llm_model_used?: string | null
          message_content?: string
          message_role?: string
          message_tokens?: number | null
          metadata?: Json | null
          user_cnpj?: string
          user_phone?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_context_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_conversation"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_personality_assignment: {
        Row: {
          company_cnpj: string | null
          conversation_ended: string | null
          conversation_started: string | null
          created_at: string
          id: string
          message_count: number | null
          personality_id: string
          phone_number: string
          updated_at: string
          user_feedback: string | null
          user_satisfaction: number | null
        }
        Insert: {
          company_cnpj?: string | null
          conversation_ended?: string | null
          conversation_started?: string | null
          created_at?: string
          id?: string
          message_count?: number | null
          personality_id: string
          phone_number: string
          updated_at?: string
          user_feedback?: string | null
          user_satisfaction?: number | null
        }
        Update: {
          company_cnpj?: string | null
          conversation_ended?: string | null
          conversation_started?: string | null
          created_at?: string
          id?: string
          message_count?: number | null
          personality_id?: string
          phone_number?: string
          updated_at?: string
          user_feedback?: string | null
          user_satisfaction?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_personality_assignment_personality_id_fkey"
            columns: ["personality_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_personalities"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_rag: {
        Row: {
          bot_response: string
          category: string | null
          company_cnpj: string | null
          complexity: string | null
          context_used: Json | null
          conversation_id: string | null
          created_at: string
          id: string
          intent: string | null
          language: string | null
          last_retrieved: string | null
          personality_id: string | null
          question_embedding: string | null
          rag_type: string
          relevance_score: number | null
          required_human_intervention: boolean | null
          response_embedding: string | null
          tags: string[] | null
          times_retrieved: number | null
          updated_at: string
          user_question: string
          user_satisfaction: number | null
          was_successful: boolean | null
        }
        Insert: {
          bot_response: string
          category?: string | null
          company_cnpj?: string | null
          complexity?: string | null
          context_used?: Json | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          intent?: string | null
          language?: string | null
          last_retrieved?: string | null
          personality_id?: string | null
          question_embedding?: string | null
          rag_type: string
          relevance_score?: number | null
          required_human_intervention?: boolean | null
          response_embedding?: string | null
          tags?: string[] | null
          times_retrieved?: number | null
          updated_at?: string
          user_question: string
          user_satisfaction?: number | null
          was_successful?: boolean | null
        }
        Update: {
          bot_response?: string
          category?: string | null
          company_cnpj?: string | null
          complexity?: string | null
          context_used?: Json | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          intent?: string | null
          language?: string | null
          last_retrieved?: string | null
          personality_id?: string | null
          question_embedding?: string | null
          rag_type?: string
          relevance_score?: number | null
          required_human_intervention?: boolean | null
          response_embedding?: string | null
          tags?: string[] | null
          times_retrieved?: number | null
          updated_at?: string
          user_question?: string
          user_satisfaction?: number | null
          was_successful?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_rag_personality_id_fkey"
            columns: ["personality_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_personalities"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_summaries: {
        Row: {
          conversation_id: string | null
          created_at: string
          date_range_end: string
          date_range_start: string
          id: string
          key_decisions: string[] | null
          key_topics: string[] | null
          llm_model_used: string | null
          messages_summarized: number
          summary_text: string
          summary_tokens: number | null
          user_cnpj: string
          user_phone: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          date_range_end: string
          date_range_start: string
          id?: string
          key_decisions?: string[] | null
          key_topics?: string[] | null
          llm_model_used?: string | null
          messages_summarized: number
          summary_text: string
          summary_tokens?: number | null
          user_cnpj: string
          user_phone: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          date_range_end?: string
          date_range_start?: string
          id?: string
          key_decisions?: string[] | null
          key_topics?: string[] | null
          llm_model_used?: string | null
          messages_summarized?: number
          summary_text?: string
          summary_tokens?: number | null
          user_cnpj?: string
          user_phone?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_summaries_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          company_cnpj: string
          created_at: string
          id: string
          phone_number: string
          status: string | null
          updated_at: string
        }
        Insert: {
          company_cnpj: string
          created_at?: string
          id?: string
          phone_number: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          company_cnpj?: string
          created_at?: string
          id?: string
          phone_number?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      crm_opportunities: {
        Row: {
          client_id: string | null
          created_at: string | null
          description: string | null
          expected_close_date: string | null
          franchisee_id: string
          id: string
          probability: number | null
          stage_id: string | null
          status: string | null
          title: string
          updated_at: string | null
          value: number | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          description?: string | null
          expected_close_date?: string | null
          franchisee_id: string
          id?: string
          probability?: number | null
          stage_id?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
          value?: number | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          description?: string | null
          expected_close_date?: string | null
          franchisee_id?: string
          id?: string
          probability?: number | null
          stage_id?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_opportunities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_table_backup"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_opportunities_franchisee_id_fkey"
            columns: ["franchisee_id"]
            isOneToOne: false
            referencedRelation: "franchisees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_opportunities_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "crm_pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_pipeline_stages: {
        Row: {
          color: string | null
          created_at: string | null
          franchisee_id: string
          id: string
          name: string
          order_index: number
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          franchisee_id: string
          id?: string
          name: string
          order_index: number
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          franchisee_id?: string
          id?: string
          name?: string
          order_index?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_pipeline_stages_franchisee_id_fkey"
            columns: ["franchisee_id"]
            isOneToOne: false
            referencedRelation: "franchisees"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string | null
          document: string | null
          email: string | null
          franchisee_id: string
          id: string
          name: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          document?: string | null
          email?: string | null
          franchisee_id: string
          id?: string
          name: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          document?: string | null
          email?: string | null
          franchisee_id?: string
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_franchisee_id_fkey"
            columns: ["franchisee_id"]
            isOneToOne: false
            referencedRelation: "franchisees"
            referencedColumns: ["id"]
          },
        ]
      }
      custos_sistema: {
        Row: {
          bi: number | null
          cliente_id: string | null
          competencia_ano: number | null
          competencia_mes: number | null
          created_at: string | null
          fin: number | null
          franqueado_id: string | null
          id: string | null
          observacoes: string | null
          outros: number | null
          playbpo: number | null
          sistema: string | null
          updated_at: string | null
          valor_sistema: number | null
        }
        Insert: {
          bi?: number | null
          cliente_id?: string | null
          competencia_ano?: number | null
          competencia_mes?: number | null
          created_at?: string | null
          fin?: number | null
          franqueado_id?: string | null
          id?: string | null
          observacoes?: string | null
          outros?: number | null
          playbpo?: number | null
          sistema?: string | null
          updated_at?: string | null
          valor_sistema?: number | null
        }
        Update: {
          bi?: number | null
          cliente_id?: string | null
          competencia_ano?: number | null
          competencia_mes?: number | null
          created_at?: string | null
          fin?: number | null
          franqueado_id?: string | null
          id?: string | null
          observacoes?: string | null
          outros?: number | null
          playbpo?: number | null
          sistema?: string | null
          updated_at?: string | null
          valor_sistema?: number | null
        }
        Relationships: []
      }
      daily_snapshots: {
        Row: {
          available_for_payments: number | null
          cash_balance: number | null
          company_cnpj: string
          created_at: string | null
          ebitda_margin: number | null
          ebitda_mtd: number | null
          id: string
          monthly_burn: number | null
          overdue_payables_amount: number | null
          overdue_payables_count: number | null
          overdue_receivables_amount: number | null
          overdue_receivables_count: number | null
          revenue_mtd: number | null
          runway_days: number | null
          snapshot_date: string
        }
        Insert: {
          available_for_payments?: number | null
          cash_balance?: number | null
          company_cnpj: string
          created_at?: string | null
          ebitda_margin?: number | null
          ebitda_mtd?: number | null
          id?: string
          monthly_burn?: number | null
          overdue_payables_amount?: number | null
          overdue_payables_count?: number | null
          overdue_receivables_amount?: number | null
          overdue_receivables_count?: number | null
          revenue_mtd?: number | null
          runway_days?: number | null
          snapshot_date: string
        }
        Update: {
          available_for_payments?: number | null
          cash_balance?: number | null
          company_cnpj?: string
          created_at?: string | null
          ebitda_margin?: number | null
          ebitda_mtd?: number | null
          id?: string
          monthly_burn?: number | null
          overdue_payables_amount?: number | null
          overdue_payables_count?: number | null
          overdue_receivables_amount?: number | null
          overdue_receivables_count?: number | null
          revenue_mtd?: number | null
          runway_days?: number | null
          snapshot_date?: string
        }
        Relationships: []
      }
      dashboard_cards: {
        Row: {
          calculated_at: string
          card_data: Json
          card_type: string
          company_cnpj: string
          expires_at: string
          id: string
        }
        Insert: {
          calculated_at?: string
          card_data: Json
          card_type: string
          company_cnpj: string
          expires_at?: string
          id?: string
        }
        Update: {
          calculated_at?: string
          card_data?: Json
          card_type?: string
          company_cnpj?: string
          expires_at?: string
          id?: string
        }
        Relationships: []
      }
      database_health_metrics: {
        Row: {
          context: Json | null
          id: string
          metric_name: string
          metric_unit: string | null
          metric_value: number
          recorded_at: string
        }
        Insert: {
          context?: Json | null
          id?: string
          metric_name: string
          metric_unit?: string | null
          metric_value: number
          recorded_at?: string
        }
        Update: {
          context?: Json | null
          id?: string
          metric_name?: string
          metric_unit?: string | null
          metric_value?: number
          recorded_at?: string
        }
        Relationships: []
      }
      dre_entries: {
        Row: {
          account: string
          amount: number
          company_cnpj: string
          company_nome: string | null
          created_at: string | null
          date: string
          id: number
          nature: string
        }
        Insert: {
          account: string
          amount: number
          company_cnpj: string
          company_nome?: string | null
          created_at?: string | null
          date: string
          id?: number
          nature: string
        }
        Update: {
          account?: string
          amount?: number
          company_cnpj?: string
          company_nome?: string | null
          created_at?: string | null
          date?: string
          id?: number
          nature?: string
        }
        Relationships: []
      }
      dre_uploads: {
        Row: {
          company_cnpj: string
          error_message: string | null
          file_name: string
          file_path: string
          file_size_bytes: number | null
          id: string
          mime_type: string | null
          parsed_data: Json | null
          processed_at: string | null
          processing_job_id: string | null
          status: string | null
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          company_cnpj: string
          error_message?: string | null
          file_name: string
          file_path: string
          file_size_bytes?: number | null
          id?: string
          mime_type?: string | null
          parsed_data?: Json | null
          processed_at?: string | null
          processing_job_id?: string | null
          status?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          company_cnpj?: string
          error_message?: string | null
          file_name?: string
          file_path?: string
          file_size_bytes?: number | null
          id?: string
          mime_type?: string | null
          parsed_data?: Json | null
          processed_at?: string | null
          processing_job_id?: string | null
          status?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dre_uploads_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "v_users_with_access"
            referencedColumns: ["id"]
          },
        ]
      }
      economic_group_members: {
        Row: {
          client_id: string
          created_at: string | null
          economic_group_id: string
          id: string
          role: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          economic_group_id: string
          id?: string
          role?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          economic_group_id?: string
          id?: string
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "economic_group_members_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_table_backup"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "economic_group_members_economic_group_id_fkey"
            columns: ["economic_group_id"]
            isOneToOne: false
            referencedRelation: "economic_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      economic_groups: {
        Row: {
          created_at: string | null
          description: string | null
          franchisee_id: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          franchisee_id?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          franchisee_id?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "economic_groups_franchisee_id_fkey"
            columns: ["franchisee_id"]
            isOneToOne: false
            referencedRelation: "franchisees"
            referencedColumns: ["id"]
          },
        ]
      }
      embeddings: {
        Row: {
          company_id: string | null
          content: string | null
          embedding: string | null
          id: number
          metadata: Json | null
          unique_id: string | null
        }
        Insert: {
          company_id?: string | null
          content?: string | null
          embedding?: string | null
          id?: number
          metadata?: Json | null
          unique_id?: string | null
        }
        Update: {
          company_id?: string | null
          content?: string | null
          embedding?: string | null
          id?: number
          metadata?: Json | null
          unique_id?: string | null
        }
        Relationships: []
      }
      f360_accounts: {
        Row: {
          account_id: string
          account_name: string
          account_type: string | null
          balance: number | null
          company_cnpj: string
          created_at: string
          currency: string | null
          id: string
          is_active: boolean | null
          metadata: Json | null
          synced_at: string
        }
        Insert: {
          account_id: string
          account_name: string
          account_type?: string | null
          balance?: number | null
          company_cnpj: string
          created_at?: string
          currency?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          synced_at?: string
        }
        Update: {
          account_id?: string
          account_name?: string
          account_type?: string | null
          balance?: number | null
          company_cnpj?: string
          created_at?: string
          currency?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          synced_at?: string
        }
        Relationships: []
      }
      f360_config: {
        Row: {
          api_key: string
          company_cnpj: string
          created_at: string
          id: string
          is_active: boolean | null
          updated_at: string
        }
        Insert: {
          api_key: string
          company_cnpj: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          updated_at?: string
        }
        Update: {
          api_key?: string
          company_cnpj?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      financial_rag_sync: {
        Row: {
          company_id: string
          created_at: string | null
          data: Json | null
          embeddings: string | null
          id: string
          module: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          data?: Json | null
          embeddings?: string | null
          id?: string
          module: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          data?: Json | null
          embeddings?: string | null
          id?: string
          module?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      financial_uploads: {
        Row: {
          analysis_result: Json | null
          client_id: string | null
          created_at: string | null
          file_name: string
          file_type: string
          file_url: string | null
          id: string
          processed: boolean | null
          processed_at: string | null
          upload_date: string | null
        }
        Insert: {
          analysis_result?: Json | null
          client_id?: string | null
          created_at?: string | null
          file_name: string
          file_type: string
          file_url?: string | null
          id?: string
          processed?: boolean | null
          processed_at?: string | null
          upload_date?: string | null
        }
        Update: {
          analysis_result?: Json | null
          client_id?: string | null
          created_at?: string | null
          file_name?: string
          file_type?: string
          file_url?: string | null
          id?: string
          processed?: boolean | null
          processed_at?: string | null
          upload_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_uploads_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_table_backup"
            referencedColumns: ["id"]
          },
        ]
      }
      franchise_companies: {
        Row: {
          added_at: string
          added_by: string | null
          company_cnpj: string
          company_nome: string
          franchise_id: string
          id: string
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          company_cnpj: string
          company_nome: string
          franchise_id: string
          id?: string
        }
        Update: {
          added_at?: string
          added_by?: string | null
          company_cnpj?: string
          company_nome?: string
          franchise_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "franchise_companies_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "franchise_companies_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "v_active_users_24h"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "franchise_companies_franchise_id_fkey"
            columns: ["franchise_id"]
            isOneToOne: false
            referencedRelation: "franchises"
            referencedColumns: ["id"]
          },
        ]
      }
      franchisees: {
        Row: {
          address: string | null
          city: string | null
          cnpj: string | null
          created_at: string | null
          email: string
          id: string
          is_active: boolean | null
          name: string
          phone: string | null
          state: string | null
          updated_at: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          cnpj?: string | null
          created_at?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          name: string
          phone?: string | null
          state?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          cnpj?: string | null
          created_at?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          name?: string
          phone?: string | null
          state?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      franchises: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          name: string
          owner_user_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name: string
          owner_user_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          owner_user_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "franchises_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "franchises_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "v_active_users_24h"
            referencedColumns: ["id"]
          },
        ]
      }
      franqueados: {
        Row: {
          bloqueado_lances: boolean | null
          cidade: string | null
          codigo: string | null
          created_at: string | null
          estado: string | null
          id: string | null
          nome: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          bloqueado_lances?: boolean | null
          cidade?: string | null
          codigo?: string | null
          created_at?: string | null
          estado?: string | null
          id?: string | null
          nome?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          bloqueado_lances?: boolean | null
          cidade?: string | null
          codigo?: string | null
          created_at?: string | null
          estado?: string | null
          id?: string | null
          nome?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      group_alias: {
        Row: {
          color: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          name: string
          tenant_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          tenant_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          tenant_id?: string
        }
        Relationships: []
      }
      group_alias_members: {
        Row: {
          alias_id: string | null
          company_cnpj: string | null
          company_id: string
          company_name: string | null
          created_at: string | null
          group_id: string
          id: number
          position: number | null
          tenant_id: string
        }
        Insert: {
          alias_id?: string | null
          company_cnpj?: string | null
          company_id: string
          company_name?: string | null
          created_at?: string | null
          group_id: string
          id?: number
          position?: number | null
          tenant_id: string
        }
        Update: {
          alias_id?: string | null
          company_cnpj?: string | null
          company_id?: string
          company_name?: string | null
          created_at?: string | null
          group_id?: string
          id?: number
          position?: number | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_alias_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "group_alias"
            referencedColumns: ["id"]
          },
        ]
      }
      group_aliases: {
        Row: {
          color: string | null
          created_at: string
          created_by: string | null
          description: string | null
          icon: string | null
          id: string
          label: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id: string
          label: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          label?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_aliases_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_users_with_access"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_f360: {
        Row: {
          cliente_nome: string
          cnpj: string
          created_at: string | null
          id: string
          token_enc: string
        }
        Insert: {
          cliente_nome: string
          cnpj: string
          created_at?: string | null
          id?: string
          token_enc: string
        }
        Update: {
          cliente_nome?: string
          cnpj?: string
          created_at?: string | null
          id?: string
          token_enc?: string
        }
        Relationships: []
      }
      integration_omie: {
        Row: {
          app_key_enc: string
          app_secret_enc: string
          cliente_nome: string
          created_at: string | null
          id: string
        }
        Insert: {
          app_key_enc: string
          app_secret_enc: string
          cliente_nome: string
          created_at?: string | null
          id?: string
        }
        Update: {
          app_key_enc?: string
          app_secret_enc?: string
          cliente_nome?: string
          created_at?: string | null
          id?: string
        }
        Relationships: []
      }
      lances: {
        Row: {
          created_at: string | null
          id: string | null
          leilao_id: string | null
          payback_meses: number | null
          usuario_id: string | null
          valor_lance: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          leilao_id?: string | null
          payback_meses?: number | null
          usuario_id?: string | null
          valor_lance?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          leilao_id?: string | null
          payback_meses?: number | null
          usuario_id?: string | null
          valor_lance?: number | null
        }
        Relationships: []
      }
      leiloes: {
        Row: {
          cac_atual: number | null
          cidade_estado: string | null
          custo_interno: number | null
          data_fim: string | null
          data_inicio: string | null
          id: string | null
          margem_liquida: number | null
          mensalidade: number | null
          nome_cliente: string | null
          observacoes: string | null
          segmento: string | null
          status: string | null
        }
        Insert: {
          cac_atual?: number | null
          cidade_estado?: string | null
          custo_interno?: number | null
          data_fim?: string | null
          data_inicio?: string | null
          id?: string | null
          margem_liquida?: number | null
          mensalidade?: number | null
          nome_cliente?: string | null
          observacoes?: string | null
          segmento?: string | null
          status?: string | null
        }
        Update: {
          cac_atual?: number | null
          cidade_estado?: string | null
          custo_interno?: number | null
          data_fim?: string | null
          data_inicio?: string | null
          id?: string | null
          margem_liquida?: number | null
          mensalidade?: number | null
          nome_cliente?: string | null
          observacoes?: string | null
          segmento?: string | null
          status?: string | null
        }
        Relationships: []
      }
      llm_models: {
        Row: {
          context_window: number
          cost_per_1k_input: number
          cost_per_1k_output: number
          created_at: string
          display_name: string
          id: string
          is_active: boolean
          model_name: string
          model_type: string
          provider_id: string
          supports_streaming: boolean
        }
        Insert: {
          context_window?: number
          cost_per_1k_input?: number
          cost_per_1k_output?: number
          created_at?: string
          display_name: string
          id?: string
          is_active?: boolean
          model_name: string
          model_type: string
          provider_id: string
          supports_streaming?: boolean
        }
        Update: {
          context_window?: number
          cost_per_1k_input?: number
          cost_per_1k_output?: number
          created_at?: string
          display_name?: string
          id?: string
          is_active?: boolean
          model_name?: string
          model_type?: string
          provider_id?: string
          supports_streaming?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "llm_models_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "llm_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      llm_providers: {
        Row: {
          api_key_id: string | null
          base_url: string | null
          created_at: string
          display_name: string
          id: string
          is_active: boolean
          provider_name: string
          updated_at: string
        }
        Insert: {
          api_key_id?: string | null
          base_url?: string | null
          created_at?: string
          display_name: string
          id?: string
          is_active?: boolean
          provider_name: string
          updated_at?: string
        }
        Update: {
          api_key_id?: string | null
          base_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
          is_active?: boolean
          provider_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "llm_providers_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      llm_routing_rules: {
        Row: {
          created_at: string
          fallback_model_id: string | null
          id: string
          intent_patterns: string[] | null
          is_active: boolean
          keywords: string[] | null
          max_tokens: number | null
          min_tokens: number | null
          priority: number
          recommended_model_id: string | null
          requires_calculation: boolean | null
          requires_multiple_queries: boolean | null
          requires_reasoning: boolean | null
          rule_description: string | null
          rule_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          fallback_model_id?: string | null
          id?: string
          intent_patterns?: string[] | null
          is_active?: boolean
          keywords?: string[] | null
          max_tokens?: number | null
          min_tokens?: number | null
          priority?: number
          recommended_model_id?: string | null
          requires_calculation?: boolean | null
          requires_multiple_queries?: boolean | null
          requires_reasoning?: boolean | null
          rule_description?: string | null
          rule_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          fallback_model_id?: string | null
          id?: string
          intent_patterns?: string[] | null
          is_active?: boolean
          keywords?: string[] | null
          max_tokens?: number | null
          min_tokens?: number | null
          priority?: number
          recommended_model_id?: string | null
          requires_calculation?: boolean | null
          requires_multiple_queries?: boolean | null
          requires_reasoning?: boolean | null
          rule_description?: string | null
          rule_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "llm_routing_rules_fallback_model_id_fkey"
            columns: ["fallback_model_id"]
            isOneToOne: false
            referencedRelation: "llm_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "llm_routing_rules_recommended_model_id_fkey"
            columns: ["recommended_model_id"]
            isOneToOne: false
            referencedRelation: "llm_models"
            referencedColumns: ["id"]
          },
        ]
      }
      llm_usage: {
        Row: {
          context: string
          cost_usd: number
          created_at: string
          error_message: string | null
          id: string
          latency_ms: number | null
          model: string
          provider: string
          success: boolean | null
          team: string | null
          timestamp: string
          tokens_input: number
          tokens_output: number
          user_id: string | null
        }
        Insert: {
          context: string
          cost_usd?: number
          created_at?: string
          error_message?: string | null
          id?: string
          latency_ms?: number | null
          model: string
          provider: string
          success?: boolean | null
          team?: string | null
          timestamp?: string
          tokens_input?: number
          tokens_output?: number
          user_id?: string | null
        }
        Update: {
          context?: string
          cost_usd?: number
          created_at?: string
          error_message?: string | null
          id?: string
          latency_ms?: number | null
          model?: string
          provider?: string
          success?: boolean | null
          team?: string | null
          timestamp?: string
          tokens_input?: number
          tokens_output?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "llm_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_users_with_access"
            referencedColumns: ["id"]
          },
        ]
      }
      llm_usage_config: {
        Row: {
          config_key: string
          description: string | null
          fallback_model_id: string | null
          id: string
          llm_model_id: string
          max_tokens: number
          temperature: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          config_key: string
          description?: string | null
          fallback_model_id?: string | null
          id?: string
          llm_model_id: string
          max_tokens?: number
          temperature?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          config_key?: string
          description?: string | null
          fallback_model_id?: string | null
          id?: string
          llm_model_id?: string
          max_tokens?: number
          temperature?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "llm_usage_config_fallback_model_id_fkey"
            columns: ["fallback_model_id"]
            isOneToOne: false
            referencedRelation: "llm_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "llm_usage_config_llm_model_id_fkey"
            columns: ["llm_model_id"]
            isOneToOne: false
            referencedRelation: "llm_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "llm_usage_config_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "llm_usage_config_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "v_active_users_24h"
            referencedColumns: ["id"]
          },
        ]
      }
      llm_usage_logs: {
        Row: {
          company_cnpj: string | null
          cost_usd: number
          created_at: string
          error_message: string | null
          id: string
          input_tokens: number
          llm_model_id: string
          output_tokens: number
          request_type: string
          response_time_ms: number | null
          success: boolean
          user_id: string | null
        }
        Insert: {
          company_cnpj?: string | null
          cost_usd?: number
          created_at?: string
          error_message?: string | null
          id?: string
          input_tokens?: number
          llm_model_id: string
          output_tokens?: number
          request_type: string
          response_time_ms?: number | null
          success?: boolean
          user_id?: string | null
        }
        Update: {
          company_cnpj?: string | null
          cost_usd?: number
          created_at?: string
          error_message?: string | null
          id?: string
          input_tokens?: number
          llm_model_id?: string
          output_tokens?: number
          request_type?: string
          response_time_ms?: number | null
          success?: boolean
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "llm_usage_logs_llm_model_id_fkey"
            columns: ["llm_model_id"]
            isOneToOne: false
            referencedRelation: "llm_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "llm_usage_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "llm_usage_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_active_users_24h"
            referencedColumns: ["id"]
          },
        ]
      }
      login_attempts: {
        Row: {
          attempted_at: string
          email: string
          failure_reason: string | null
          id: string
          ip_address: unknown
          success: boolean
          user_agent: string | null
        }
        Insert: {
          attempted_at?: string
          email: string
          failure_reason?: string | null
          id?: string
          ip_address: unknown
          success: boolean
          user_agent?: string | null
        }
        Update: {
          attempted_at?: string
          email?: string
          failure_reason?: string | null
          id?: string
          ip_address?: unknown
          success?: boolean
          user_agent?: string | null
        }
        Relationships: []
      }
      message_template_permissions: {
        Row: {
          can_create: boolean
          can_delete: boolean
          can_edit: boolean
          can_view: boolean
          created_at: string
          id: string
          template_type: string
          user_id: string
        }
        Insert: {
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          template_type: string
          user_id: string
        }
        Update: {
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          template_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_template_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_template_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_active_users_24h"
            referencedColumns: ["id"]
          },
        ]
      }
      omie_config: {
        Row: {
          api_key: string
          app_key: string
          company_cnpj: string
          created_at: string
          id: string
          is_active: boolean | null
          updated_at: string
        }
        Insert: {
          api_key: string
          app_key: string
          company_cnpj: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          updated_at?: string
        }
        Update: {
          api_key?: string
          app_key?: string
          company_cnpj?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      omie_invoices: {
        Row: {
          category: string | null
          company_cnpj: string
          created_at: string
          description: string | null
          due_date: string
          id: string
          invoice_id: string
          invoice_number: string | null
          issue_date: string | null
          metadata: Json | null
          paid_value: number | null
          payment_date: string | null
          provider: string
          status: string
          synced_at: string
          total_value: number
        }
        Insert: {
          category?: string | null
          company_cnpj: string
          created_at?: string
          description?: string | null
          due_date: string
          id?: string
          invoice_id: string
          invoice_number?: string | null
          issue_date?: string | null
          metadata?: Json | null
          paid_value?: number | null
          payment_date?: string | null
          provider?: string
          status: string
          synced_at?: string
          total_value: number
        }
        Update: {
          category?: string | null
          company_cnpj?: string
          created_at?: string
          description?: string | null
          due_date?: string
          id?: string
          invoice_id?: string
          invoice_number?: string | null
          issue_date?: string | null
          metadata?: Json | null
          paid_value?: number | null
          payment_date?: string | null
          provider?: string
          status?: string
          synced_at?: string
          total_value?: number
        }
        Relationships: []
      }
      pagamentos_mensais: {
        Row: {
          cliente_id: string | null
          competencia_ano: number | null
          competencia_mes: number | null
          created_at: string | null
          data_justificativa: string | null
          data_recebimento: string | null
          franqueado_id: string | null
          id: string | null
          justificativa_nao_recebimento: string | null
          recebido: boolean | null
          updated_at: string | null
          usuario_justificativa: string | null
          valor_mensalidade: number | null
        }
        Insert: {
          cliente_id?: string | null
          competencia_ano?: number | null
          competencia_mes?: number | null
          created_at?: string | null
          data_justificativa?: string | null
          data_recebimento?: string | null
          franqueado_id?: string | null
          id?: string | null
          justificativa_nao_recebimento?: string | null
          recebido?: boolean | null
          updated_at?: string | null
          usuario_justificativa?: string | null
          valor_mensalidade?: number | null
        }
        Update: {
          cliente_id?: string | null
          competencia_ano?: number | null
          competencia_mes?: number | null
          created_at?: string | null
          data_justificativa?: string | null
          data_recebimento?: string | null
          franqueado_id?: string | null
          id?: string | null
          justificativa_nao_recebimento?: string | null
          recebido?: boolean | null
          updated_at?: string | null
          usuario_justificativa?: string | null
          valor_mensalidade?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          default_company_cnpj: string | null
          email: string | null
          franqueado_id: string | null
          id: string | null
          name: string | null
          role: string | null
          tipo_usuario: string | null
          two_factor_enabled: boolean | null
          unidade: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          default_company_cnpj?: string | null
          email?: string | null
          franqueado_id?: string | null
          id?: string | null
          name?: string | null
          role?: string | null
          tipo_usuario?: string | null
          two_factor_enabled?: boolean | null
          unidade?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          default_company_cnpj?: string | null
          email?: string | null
          franqueado_id?: string | null
          id?: string | null
          name?: string | null
          role?: string | null
          tipo_usuario?: string | null
          two_factor_enabled?: boolean | null
          unidade?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      rag_documents: {
        Row: {
          category: string | null
          company_cnpj: string | null
          content: string
          created_at: string
          document_type: string
          embedding: string | null
          id: string
          language: string | null
          last_accessed: string | null
          relevance_score: number | null
          summary: string | null
          tags: string[] | null
          title: string
          updated_at: string
          view_count: number | null
        }
        Insert: {
          category?: string | null
          company_cnpj?: string | null
          content: string
          created_at?: string
          document_type: string
          embedding?: string | null
          id?: string
          language?: string | null
          last_accessed?: string | null
          relevance_score?: number | null
          summary?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          view_count?: number | null
        }
        Update: {
          category?: string | null
          company_cnpj?: string | null
          content?: string
          created_at?: string
          document_type?: string
          embedding?: string | null
          id?: string
          language?: string | null
          last_accessed?: string | null
          relevance_score?: number | null
          summary?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          view_count?: number | null
        }
        Relationships: []
      }
      rag_queries: {
        Row: {
          avg_similarity: number | null
          company_cnpj: string | null
          conversation_id: string | null
          created_at: string
          documents_found: number | null
          id: string
          llm_model: string | null
          llm_used: boolean | null
          phone_number: string | null
          query_embedding: string | null
          query_text: string
          search_duration_ms: number | null
          top_document_id: string | null
        }
        Insert: {
          avg_similarity?: number | null
          company_cnpj?: string | null
          conversation_id?: string | null
          created_at?: string
          documents_found?: number | null
          id?: string
          llm_model?: string | null
          llm_used?: boolean | null
          phone_number?: string | null
          query_embedding?: string | null
          query_text: string
          search_duration_ms?: number | null
          top_document_id?: string | null
        }
        Update: {
          avg_similarity?: number | null
          company_cnpj?: string | null
          conversation_id?: string | null
          created_at?: string
          documents_found?: number | null
          id?: string
          llm_model?: string | null
          llm_used?: boolean | null
          phone_number?: string | null
          query_embedding?: string | null
          query_text?: string
          search_duration_ms?: number | null
          top_document_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rag_queries_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rag_queries_top_document_id_fkey"
            columns: ["top_document_id"]
            isOneToOne: false
            referencedRelation: "rag_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limit_tracking: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          identifier: string
          identifier_type: string
          is_blocked: boolean
          request_count: number
          window_end: string
          window_start: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          identifier: string
          identifier_type: string
          is_blocked?: boolean
          request_count?: number
          window_end: string
          window_start: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          identifier?: string
          identifier_type?: string
          is_blocked?: boolean
          request_count?: number
          window_end?: string
          window_start?: string
        }
        Relationships: []
      }
      regulamento: {
        Row: {
          conteudo: string | null
          id: string | null
          updated_at: string | null
        }
        Insert: {
          conteudo?: string | null
          id?: string | null
          updated_at?: string | null
        }
        Update: {
          conteudo?: string | null
          id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      repasses_franqueadora: {
        Row: {
          competencia_ano: number | null
          competencia_mes: number | null
          created_at: string | null
          data_pagamento: string | null
          data_vencimento: string | null
          franqueado_id: string | null
          id: string | null
          status: string | null
          total_marketing: number | null
          total_recebido: number | null
          total_repasse: number | null
          total_royalties: number | null
          updated_at: string | null
        }
        Insert: {
          competencia_ano?: number | null
          competencia_mes?: number | null
          created_at?: string | null
          data_pagamento?: string | null
          data_vencimento?: string | null
          franqueado_id?: string | null
          id?: string | null
          status?: string | null
          total_marketing?: number | null
          total_recebido?: number | null
          total_repasse?: number | null
          total_royalties?: number | null
          updated_at?: string | null
        }
        Update: {
          competencia_ano?: number | null
          competencia_mes?: number | null
          created_at?: string | null
          data_pagamento?: string | null
          data_vencimento?: string | null
          franqueado_id?: string | null
          id?: string | null
          status?: string | null
          total_marketing?: number | null
          total_recebido?: number | null
          total_repasse?: number | null
          total_royalties?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      scheduled_messages: {
        Row: {
          company_cnpj: string
          created_at: string | null
          error_message: string | null
          id: string
          message_data: Json | null
          message_template: string
          message_type: string
          phone_number: string
          scheduled_for: string
          sent_at: string | null
          status: string | null
        }
        Insert: {
          company_cnpj: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          message_data?: Json | null
          message_template: string
          message_type: string
          phone_number: string
          scheduled_for: string
          sent_at?: string | null
          status?: string | null
        }
        Update: {
          company_cnpj?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          message_data?: Json | null
          message_template?: string
          message_type?: string
          phone_number?: string
          scheduled_for?: string
          sent_at?: string | null
          status?: string | null
        }
        Relationships: []
      }
      security_attestations: {
        Row: {
          attestation: string | null
          protection_type: string | null
          security_level: string | null
          table_name: string | null
          verified_date: string | null
        }
        Insert: {
          attestation?: string | null
          protection_type?: string | null
          security_level?: string | null
          table_name?: string | null
          verified_date?: string | null
        }
        Update: {
          attestation?: string | null
          protection_type?: string | null
          security_level?: string | null
          table_name?: string | null
          verified_date?: string | null
        }
        Relationships: []
      }
      security_vulnerabilities: {
        Row: {
          affected_component: string | null
          affected_id: string | null
          description: string
          detected_at: string
          id: string
          ip_address: unknown
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          status: string
          user_id: string | null
          vulnerability_type: string
        }
        Insert: {
          affected_component?: string | null
          affected_id?: string | null
          description: string
          detected_at?: string
          id?: string
          ip_address?: unknown
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          status?: string
          user_id?: string | null
          vulnerability_type: string
        }
        Update: {
          affected_component?: string | null
          affected_id?: string | null
          description?: string
          detected_at?: string
          id?: string
          ip_address?: unknown
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          user_id?: string | null
          vulnerability_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "security_vulnerabilities_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_vulnerabilities_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "v_active_users_24h"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_vulnerabilities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_vulnerabilities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_active_users_24h"
            referencedColumns: ["id"]
          },
        ]
      }
      sources: {
        Row: {
          created_at: string | null
          external_id: string | null
          id: string
          metadata: Json | null
          provider: string
          title: string | null
          url: string | null
        }
        Insert: {
          created_at?: string | null
          external_id?: string | null
          id?: string
          metadata?: Json | null
          provider: string
          title?: string | null
          url?: string | null
        }
        Update: {
          created_at?: string | null
          external_id?: string | null
          id?: string
          metadata?: Json | null
          provider?: string
          title?: string | null
          url?: string | null
        }
        Relationships: []
      }
      sugestoes: {
        Row: {
          created_at: string | null
          descricao: string | null
          id: string | null
          status: string | null
          titulo: string | null
          updated_at: string | null
          usuario_id: string | null
          usuario_nome: string | null
        }
        Insert: {
          created_at?: string | null
          descricao?: string | null
          id?: string | null
          status?: string | null
          titulo?: string | null
          updated_at?: string | null
          usuario_id?: string | null
          usuario_nome?: string | null
        }
        Update: {
          created_at?: string | null
          descricao?: string | null
          id?: string | null
          status?: string | null
          titulo?: string | null
          updated_at?: string | null
          usuario_id?: string | null
          usuario_nome?: string | null
        }
        Relationships: []
      }
      sugestoes_likes: {
        Row: {
          created_at: string | null
          id: string | null
          sugestao_id: string | null
          usuario_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          sugestao_id?: string | null
          usuario_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          sugestao_id?: string | null
          usuario_id?: string | null
        }
        Relationships: []
      }
      sync_logs: {
        Row: {
          company_cnpj: string
          created_at: string
          id: string
          message: string | null
          provider: string
          records_synced: number | null
          status: string
          sync_type: string
          synced_at: string
        }
        Insert: {
          company_cnpj: string
          created_at?: string
          id?: string
          message?: string | null
          provider: string
          records_synced?: number | null
          status: string
          sync_type: string
          synced_at?: string
        }
        Update: {
          company_cnpj?: string
          created_at?: string
          id?: string
          message?: string | null
          provider?: string
          records_synced?: number | null
          status?: string
          sync_type?: string
          synced_at?: string
        }
        Relationships: []
      }
      sync_state: {
        Row: {
          cliente_nome: string | null
          cnpj: string | null
          id: string
          last_cursor: string | null
          last_success_at: string | null
          source: string
          updated_at: string | null
        }
        Insert: {
          cliente_nome?: string | null
          cnpj?: string | null
          id?: string
          last_cursor?: string | null
          last_success_at?: string | null
          source: string
          updated_at?: string | null
        }
        Update: {
          cliente_nome?: string | null
          cnpj?: string | null
          id?: string
          last_cursor?: string | null
          last_success_at?: string | null
          source?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      sync_tables: {
        Row: {
          table_name: string
        }
        Insert: {
          table_name: string
        }
        Update: {
          table_name?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string | null
          client_id: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          franchisee_id: string | null
          id: string
          priority: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          client_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          franchisee_id?: string | null
          id?: string
          priority?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          client_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          franchisee_id?: string | null
          id?: string
          priority?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "v_users_with_access"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_table_backup"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_users_with_access"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_franchisee_id_fkey"
            columns: ["franchisee_id"]
            isOneToOne: false
            referencedRelation: "franchisees"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string | null
          amount: number
          category: string | null
          company_cnpj: string
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          provider: string | null
          transaction_date: string
          transaction_id: string
          type: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          category?: string | null
          company_cnpj: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          provider?: string | null
          transaction_date: string
          transaction_id: string
          type: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          category?: string | null
          company_cnpj?: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          provider?: string | null
          transaction_date?: string
          transaction_id?: string
          type?: string
        }
        Relationships: []
      }
      user_api_keys: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          key_hash: string
          key_prefix: string
          label: string
          last_used_at: string | null
          scopes: string[] | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          key_hash: string
          key_prefix: string
          label: string
          last_used_at?: string | null
          scopes?: string[] | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          key_hash?: string
          key_prefix?: string
          label?: string
          last_used_at?: string | null
          scopes?: string[] | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_api_keys_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_users_with_access"
            referencedColumns: ["id"]
          },
        ]
      }
      user_companies: {
        Row: {
          access_level: string | null
          company_cnpj: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          access_level?: string | null
          company_cnpj: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          access_level?: string | null
          company_cnpj?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_companies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_users_with_access"
            referencedColumns: ["id"]
          },
        ]
      }
      user_company_access: {
        Row: {
          can_delete: boolean
          can_edit: boolean
          can_view: boolean
          company_cnpj: string
          company_nome: string
          granted_at: string
          granted_by: string | null
          id: string
          user_id: string
        }
        Insert: {
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          company_cnpj: string
          company_nome: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          user_id: string
        }
        Update: {
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          company_cnpj?: string
          company_nome?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_company_access_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_company_access_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "v_active_users_24h"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_company_access_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_company_access_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_active_users_24h"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          action: string
          created_at: string
          id: string
          resource: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          resource: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          resource?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_active_users_24h"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          company_cnpj: string | null
          created_at: string
          created_by: string | null
          email: string
          full_name: string
          id: string
          last_login_at: string | null
          role: string
          status: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          company_cnpj?: string | null
          created_at?: string
          created_by?: string | null
          email: string
          full_name: string
          id: string
          last_login_at?: string | null
          role: string
          status?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          company_cnpj?: string | null
          created_at?: string
          created_by?: string | null
          email?: string
          full_name?: string
          id?: string
          last_login_at?: string | null
          role?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_active_users_24h"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "v_users_with_access"
            referencedColumns: ["id"]
          },
        ]
      }
      wasender_credentials: {
        Row: {
          api_key: string
          api_secret: string | null
          created_at: string | null
          id: number
          is_active: boolean | null
          session_id: string | null
          updated_at: string | null
          webhook_url: string | null
        }
        Insert: {
          api_key: string
          api_secret?: string | null
          created_at?: string | null
          id?: number
          is_active?: boolean | null
          session_id?: string | null
          updated_at?: string | null
          webhook_url?: string | null
        }
        Update: {
          api_key?: string
          api_secret?: string | null
          created_at?: string | null
          id?: number
          is_active?: boolean | null
          session_id?: string | null
          updated_at?: string | null
          webhook_url?: string | null
        }
        Relationships: []
      }
      whatsapp_chat_sessions: {
        Row: {
          assigned_to: string | null
          company_cnpj: string | null
          contact_name: string | null
          created_at: string
          id: string
          last_message_at: string | null
          last_message_text: string | null
          metadata: Json | null
          phone_number: string
          provider: string | null
          status: string | null
          tags: string[] | null
          unread_count: number | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          company_cnpj?: string | null
          contact_name?: string | null
          created_at?: string
          id?: string
          last_message_at?: string | null
          last_message_text?: string | null
          metadata?: Json | null
          phone_number: string
          provider?: string | null
          status?: string | null
          tags?: string[] | null
          unread_count?: number | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          company_cnpj?: string | null
          contact_name?: string | null
          created_at?: string
          id?: string
          last_message_at?: string | null
          last_message_text?: string | null
          metadata?: Json | null
          phone_number?: string
          provider?: string | null
          status?: string | null
          tags?: string[] | null
          unread_count?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_chat_sessions_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "v_users_with_access"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_conversations: {
        Row: {
          company_cnpj: string
          created_at: string | null
          id: string
          message_data: Json | null
          message_direction: string
          message_text: string
          phone_number: string
          provider: string | null
          replied_at: string | null
          response_data: Json | null
          response_text: string | null
        }
        Insert: {
          company_cnpj: string
          created_at?: string | null
          id?: string
          message_data?: Json | null
          message_direction: string
          message_text: string
          phone_number: string
          provider?: string | null
          replied_at?: string | null
          response_data?: Json | null
          response_text?: string | null
        }
        Update: {
          company_cnpj?: string
          created_at?: string | null
          id?: string
          message_data?: Json | null
          message_direction?: string
          message_text?: string
          phone_number?: string
          provider?: string | null
          replied_at?: string | null
          response_data?: Json | null
          response_text?: string | null
        }
        Relationships: []
      }
      whatsapp_personalities: {
        Row: {
          age: number | null
          avatar_url: string | null
          bio: string | null
          communication_style: Json | null
          created_at: string
          created_by: string | null
          empathy_level: number | null
          first_name: string
          formality_level: number | null
          full_name: string | null
          gender: string | null
          humor_level: number | null
          id: string
          is_active: boolean | null
          languages: string[] | null
          last_name: string
          last_used: string | null
          personality_type: string
          response_speed: string | null
          satisfaction_avg: number | null
          specialties: string[] | null
          system_prompt: string | null
          updated_at: string
          usage_count: number | null
          voice_config: Json | null
        }
        Insert: {
          age?: number | null
          avatar_url?: string | null
          bio?: string | null
          communication_style?: Json | null
          created_at?: string
          created_by?: string | null
          empathy_level?: number | null
          first_name: string
          formality_level?: number | null
          full_name?: string | null
          gender?: string | null
          humor_level?: number | null
          id?: string
          is_active?: boolean | null
          languages?: string[] | null
          last_name: string
          last_used?: string | null
          personality_type: string
          response_speed?: string | null
          satisfaction_avg?: number | null
          specialties?: string[] | null
          system_prompt?: string | null
          updated_at?: string
          usage_count?: number | null
          voice_config?: Json | null
        }
        Update: {
          age?: number | null
          avatar_url?: string | null
          bio?: string | null
          communication_style?: Json | null
          created_at?: string
          created_by?: string | null
          empathy_level?: number | null
          first_name?: string
          formality_level?: number | null
          full_name?: string | null
          gender?: string | null
          humor_level?: number | null
          id?: string
          is_active?: boolean | null
          languages?: string[] | null
          last_name?: string
          last_used?: string | null
          personality_type?: string
          response_speed?: string | null
          satisfaction_avg?: number | null
          specialties?: string[] | null
          system_prompt?: string | null
          updated_at?: string
          usage_count?: number | null
          voice_config?: Json | null
        }
        Relationships: []
      }
      whatsapp_response_templates: {
        Row: {
          category: string
          context_example: Json | null
          context_required: Json | null
          created_at: string
          embedding: string | null
          id: string
          intent: string
          language: string | null
          last_used: string | null
          personality_id: string | null
          satisfaction_avg: number | null
          tags: string[] | null
          template_text: string
          tone: string | null
          updated_at: string
          usage_count: number | null
          variations: string[] | null
        }
        Insert: {
          category: string
          context_example?: Json | null
          context_required?: Json | null
          created_at?: string
          embedding?: string | null
          id?: string
          intent: string
          language?: string | null
          last_used?: string | null
          personality_id?: string | null
          satisfaction_avg?: number | null
          tags?: string[] | null
          template_text: string
          tone?: string | null
          updated_at?: string
          usage_count?: number | null
          variations?: string[] | null
        }
        Update: {
          category?: string
          context_example?: Json | null
          context_required?: Json | null
          created_at?: string
          embedding?: string | null
          id?: string
          intent?: string
          language?: string | null
          last_used?: string | null
          personality_id?: string | null
          satisfaction_avg?: number | null
          tags?: string[] | null
          template_text?: string
          tone?: string | null
          updated_at?: string
          usage_count?: number | null
          variations?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_response_templates_personality_id_fkey"
            columns: ["personality_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_personalities"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_scheduled: {
        Row: {
          company_cnpj: string | null
          created_at: string
          created_by: string | null
          error_message: string | null
          id: string
          message_content: Json
          phone_number: string
          scheduled_for: string
          sent_at: string | null
          status: string | null
          template_id: string | null
          updated_at: string
        }
        Insert: {
          company_cnpj?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          message_content: Json
          phone_number: string
          scheduled_for: string
          sent_at?: string | null
          status?: string | null
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          company_cnpj?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          message_content?: Json
          phone_number?: string
          scheduled_for?: string
          sent_at?: string | null
          status?: string | null
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_scheduled_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_users_with_access"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_templates: {
        Row: {
          category: string
          content: Json
          created_at: string
          created_by: string | null
          id: string
          language: string | null
          name: string
          provider: string | null
          status: string | null
          updated_at: string
          variables: string[] | null
        }
        Insert: {
          category: string
          content: Json
          created_at?: string
          created_by?: string | null
          id?: string
          language?: string | null
          name: string
          provider?: string | null
          status?: string | null
          updated_at?: string
          variables?: string[] | null
        }
        Update: {
          category?: string
          content?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          language?: string | null
          name?: string
          provider?: string | null
          status?: string | null
          updated_at?: string
          variables?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_users_with_access"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_validation_codes: {
        Row: {
          code: string
          created_at: string | null
          expires_at: string
          id: number
          phone_number: string
          used: boolean | null
        }
        Insert: {
          code: string
          created_at?: string | null
          expires_at: string
          id?: number
          phone_number: string
          used?: boolean | null
        }
        Update: {
          code?: string
          created_at?: string | null
          expires_at?: string
          id?: number
          phone_number?: string
          used?: boolean | null
        }
        Relationships: []
      }
    }
    Views: {
      clients: {
        Row: {
          api_token: string | null
          cnpj: string | null
          connection_error_message: string | null
          created_at: string | null
          franchisee_name: string | null
          franqueado_id: string | null
          id: string | null
          integration_settings: Json | null
          integration_status: string | null
          integration_token: string | null
          integration_type: string | null
          last_connection_check: string | null
          last_sync_at: string | null
          name: string | null
          sync_enabled: boolean | null
          system_type: string | null
          updated_at: string | null
        }
        Insert: {
          api_token?: string | null
          cnpj?: never
          connection_error_message?: never
          created_at?: string | null
          franchisee_name?: string | null
          franqueado_id?: string | null
          id?: string | null
          integration_settings?: never
          integration_status?: never
          integration_token?: string | null
          integration_type?: never
          last_connection_check?: never
          last_sync_at?: never
          name?: never
          sync_enabled?: never
          system_type?: never
          updated_at?: string | null
        }
        Update: {
          api_token?: string | null
          cnpj?: never
          connection_error_message?: never
          created_at?: string | null
          franchisee_name?: string | null
          franqueado_id?: string | null
          id?: string | null
          integration_settings?: never
          integration_status?: never
          integration_token?: string | null
          integration_type?: never
          last_connection_check?: never
          last_sync_at?: never
          name?: never
          sync_enabled?: never
          system_type?: never
          updated_at?: string | null
        }
        Relationships: []
      }
      v_active_users_24h: {
        Row: {
          active_sessions: number | null
          email: string | null
          full_name: string | null
          id: string | null
          last_activity: string | null
          role: string | null
          unique_ips: number | null
        }
        Relationships: [
          {
            foreignKeyName: "users_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "v_users_with_access"
            referencedColumns: ["id"]
          },
        ]
      }
      v_api_metrics_summary: {
        Row: {
          avg_latency: number | null
          day: string | null
          error_rate_percent: number | null
          function_name: string | null
          max_p95_latency: number | null
          total_errors: number | null
          total_requests: number | null
          total_successes: number | null
        }
        Relationships: []
      }
      v_api_traffic_hourly: {
        Row: {
          avg_response_time: number | null
          error_count: number | null
          function_name: string | null
          hour: string | null
          request_count: number | null
          total_request_bytes: number | null
          total_response_bytes: number | null
        }
        Relationships: []
      }
      v_audit_health: {
        Row: {
          cf_rows_120d: number | null
          cnpj: string | null
          dre_rows_120d: number | null
          health: string | null
          last_success_at: string | null
          source: string | null
        }
        Relationships: []
      }
      v_conversation_cost_by_user: {
        Row: {
          avg_response_time_seconds: number | null
          month: string | null
          total_conversations: number | null
          total_cost_usd: number | null
          total_messages: number | null
          total_successful_queries: number | null
          total_tokens_input: number | null
          total_tokens_output: number | null
          user_cnpj: string | null
          user_phone: string | null
        }
        Relationships: []
      }
      v_dashboard_cards_valid: {
        Row: {
          calculated_at: string | null
          card_data: Json | null
          card_type: string | null
          company_cnpj: string | null
          expires_at: string | null
          time_to_expire: unknown
        }
        Insert: {
          calculated_at?: string | null
          card_data?: Json | null
          card_type?: string | null
          company_cnpj?: string | null
          expires_at?: string | null
          time_to_expire?: never
        }
        Update: {
          calculated_at?: string | null
          card_data?: Json | null
          card_type?: string | null
          company_cnpj?: string | null
          expires_at?: string | null
          time_to_expire?: never
        }
        Relationships: []
      }
      v_database_health_summary: {
        Row: {
          avg_value: number | null
          last_recorded: string | null
          max_value: number | null
          metric_name: string | null
          metric_unit: string | null
          min_value: number | null
        }
        Relationships: []
      }
      v_failed_logins_24h: {
        Row: {
          email: string | null
          failure_count: number | null
          first_attempt: string | null
          ip_address: unknown
          last_attempt: string | null
          reasons: string[] | null
        }
        Relationships: []
      }
      v_kpi_monthly: {
        Row: {
          company_cnpj: string | null
          custos: number | null
          despesas: number | null
          ebitda: number | null
          month: string | null
          outras: number | null
          receita: number | null
        }
        Relationships: []
      }
      v_kpi_monthly_enriched: {
        Row: {
          company_cnpj: string | null
          expenses: number | null
          month: string | null
          profit: number | null
          revenue: number | null
        }
        Relationships: []
      }
      v_llm_monthly_usage: {
        Row: {
          avg_response_time_ms: number | null
          model_name: string | null
          month: string | null
          provider_name: string | null
          request_count: number | null
          success_rate: number | null
          total_cost_usd: number | null
          total_input_tokens: number | null
          total_output_tokens: number | null
        }
        Relationships: []
      }
      v_llm_performance_by_model: {
        Row: {
          avg_cost_per_response: number | null
          avg_tokens_per_response: number | null
          display_name: string | null
          model_name: string | null
          provider_name: string | null
          times_used: number | null
          total_cost_usd: number | null
          unique_conversations: number | null
        }
        Relationships: []
      }
      v_llm_usage_monthly: {
        Row: {
          avg_latency_ms: number | null
          context: string | null
          model: string | null
          month: string | null
          provider: string | null
          request_count: number | null
          team: string | null
          total_cost_usd: number | null
          total_tokens_input: number | null
          total_tokens_output: number | null
        }
        Relationships: []
      }
      v_llm_user_monthly_usage: {
        Row: {
          month: string | null
          provider_name: string | null
          request_count: number | null
          total_cost_usd: number | null
          user_email: string | null
          user_name: string | null
        }
        Relationships: []
      }
      v_open_vulnerabilities: {
        Row: {
          count: number | null
          newest: string | null
          oldest: string | null
          recent_descriptions: string[] | null
          severity: string | null
          vulnerability_type: string | null
        }
        Relationships: []
      }
      v_pending_messages: {
        Row: {
          company_cnpj: string | null
          company_name: string | null
          config_phone: string | null
          created_at: string | null
          error_message: string | null
          id: string | null
          message_data: Json | null
          message_template: string | null
          message_type: string | null
          phone_number: string | null
          scheduled_for: string | null
          sent_at: string | null
          status: string | null
        }
        Relationships: []
      }
      v_suspicious_ips: {
        Row: {
          accessed_functions: string[] | null
          auth_failures: number | null
          error_count: number | null
          first_seen: string | null
          ip_address: unknown
          last_seen: string | null
          rate_limited: number | null
          request_count: number | null
        }
        Relationships: []
      }
      v_top_active_conversations: {
        Row: {
          avg_response_time_seconds: number | null
          bot_messages: number | null
          company_name: string | null
          conversation_id: string | null
          failed_queries: number | null
          first_message_at: string | null
          last_message_at: string | null
          models_used: Json | null
          off_topic_queries: number | null
          success_rate: number | null
          successful_queries: number | null
          total_cost_usd: number | null
          total_messages: number | null
          user_cnpj: string | null
          user_messages: number | null
          user_phone: string | null
        }
        Insert: {
          avg_response_time_seconds?: number | null
          bot_messages?: number | null
          company_name?: never
          conversation_id?: string | null
          failed_queries?: number | null
          first_message_at?: string | null
          last_message_at?: string | null
          models_used?: Json | null
          off_topic_queries?: number | null
          success_rate?: never
          successful_queries?: number | null
          total_cost_usd?: number | null
          total_messages?: number | null
          user_cnpj?: string | null
          user_messages?: number | null
          user_phone?: string | null
        }
        Update: {
          avg_response_time_seconds?: number | null
          bot_messages?: number | null
          company_name?: never
          conversation_id?: string | null
          failed_queries?: number | null
          first_message_at?: string | null
          last_message_at?: string | null
          models_used?: Json | null
          off_topic_queries?: number | null
          success_rate?: never
          successful_queries?: number | null
          total_cost_usd?: number | null
          total_messages?: number | null
          user_cnpj?: string | null
          user_messages?: number | null
          user_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_analytics_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      v_users_with_access: {
        Row: {
          avatar_url: string | null
          companies: Json | null
          created_at: string | null
          email: string | null
          id: string | null
          last_sign_in_at: string | null
          name: string | null
          role: string | null
          two_factor_enabled: boolean | null
        }
        Relationships: []
      }
      v_wasender_active_config: {
        Row: {
          api_key: string | null
          api_secret: string | null
          created_at: string | null
          session_id: string | null
          updated_at: string | null
          webhook_url: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_conversation_to_rag: {
        Args: {
          p_category?: string
          p_cnpj?: string
          p_context: Json
          p_intent?: string
          p_personality_id?: string
          p_question: string
          p_response: string
          p_satisfaction?: number
        }
        Returns: string
      }
      assign_random_personality: {
        Args: { p_company_cnpj?: string; p_phone_number: string }
        Returns: string
      }
      bytea_to_text: { Args: { data: string }; Returns: string }
      calculate_card_tier: { Args: { p_card_type: string }; Returns: number }
      check_user_access: {
        Args: { p_cnpj: string; p_user_id: string }
        Returns: boolean
      }
      cleanup_expired_dashboard_cards: { Args: never; Returns: number }
      decrypt_api_key: { Args: { p_id: string }; Returns: string }
      encrypt_api_key: { Args: { p_key_value: string }; Returns: string }
      fn_add_message_to_context: {
        Args: {
          p_content: string
          p_conversation_id: string
          p_cost_usd?: number
          p_llm_model?: string
          p_metadata?: Json
          p_role: string
          p_tokens?: number
          p_user_cnpj: string
          p_user_phone: string
        }
        Returns: string
      }
      fn_calculate_daily_snapshot: {
        Args: { p_cnpj: string; p_date?: string }
        Returns: Json
      }
      fn_check_rate_limit: {
        Args: {
          p_endpoint: string
          p_identifier: string
          p_identifier_type: string
          p_max_requests: number
          p_window_minutes: number
        }
        Returns: boolean
      }
      fn_collect_database_metrics: { Args: never; Returns: undefined }
      fn_detect_brute_force: {
        Args: { p_email: string; p_ip: unknown }
        Returns: undefined
      }
      fn_get_conversation_context: {
        Args: { p_conversation_id: string; p_limit?: number }
        Returns: Json
      }
      fn_kpi_monthly_grouped: {
        Args: { dt_from: string; dt_to: string; group_name: string }
        Returns: {
          custos: number
          despesas: number
          ebitda: number
          margem_bruta: number
          month: string
          outras: number
          receita: number
        }[]
      }
      fn_log_api_request: {
        Args: {
          p_error_message?: string
          p_function_name: string
          p_ip: unknown
          p_method: string
          p_path: string
          p_request_size: number
          p_response_size: number
          p_response_time_ms: number
          p_status_code: number
          p_user_agent: string
          p_user_id: string
        }
        Returns: undefined
      }
      fn_log_login_attempt: {
        Args: {
          p_email: string
          p_failure_reason?: string
          p_ip: unknown
          p_success: boolean
          p_user_agent: string
        }
        Returns: undefined
      }
      fn_route_to_best_llm: {
        Args: {
          p_estimated_tokens?: number
          p_question: string
          p_requires_calculation?: boolean
          p_requires_reasoning?: boolean
        }
        Returns: Json
      }
      fn_schedule_message: {
        Args: {
          p_cnpj: string
          p_data: Json
          p_phone: string
          p_scheduled_for?: string
          p_template: string
          p_type: string
        }
        Returns: string
      }
      fn_summarize_old_context: {
        Args: { p_conversation_id: string }
        Returns: undefined
      }
      fn_update_conversation_analytics: {
        Args: {
          p_conversation_id: string
          p_cost_usd?: number
          p_is_user_message: boolean
          p_model_used?: string
          p_off_topic?: boolean
          p_response_time_seconds?: number
          p_success?: boolean
          p_tokens_input?: number
          p_tokens_output?: number
          p_user_cnpj: string
          p_user_phone: string
        }
        Returns: undefined
      }
      fn_update_daily_snapshot: {
        Args: { p_cnpj: string; p_date?: string }
        Returns: undefined
      }
      get_card_processing_stats: {
        Args: { p_cnpj?: string }
        Returns: {
          avg_duration_ms: number
          cache_hit_rate: number
          done: number
          error: number
          pending: number
          processing: number
          ready_to_process: number
          total: number
        }[]
      }
      get_conversation_personality: {
        Args: { p_phone_number: string }
        Returns: {
          communication_style: Json
          first_name: string
          full_name: string
          personality_id: string
          personality_type: string
          system_prompt: string
        }[]
      }
      get_user_accessible_companies: {
        Args: { p_user_id: string }
        Returns: {
          access_source: string
          can_delete: boolean
          can_edit: boolean
          can_view: boolean
          company_cnpj: string
          company_nome: string
        }[]
      }
      get_user_companies: {
        Args: { p_user_id: string }
        Returns: {
          access_level: string
          cnpj: string
          name: string
        }[]
      }
      get_wasender_credentials: {
        Args: never
        Returns: {
          api_key: string
          api_secret: string
          webhook_url: string
        }[]
      }
      http: {
        Args: { request: Database["public"]["CompositeTypes"]["http_request"] }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "http_request"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_delete:
        | {
            Args: { uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { content: string; content_type: string; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_get:
        | {
            Args: { uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { data: Json; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_head: {
        Args: { uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_header: {
        Args: { field: string; value: string }
        Returns: Database["public"]["CompositeTypes"]["http_header"]
        SetofOptions: {
          from: "*"
          to: "http_header"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_list_curlopt: {
        Args: never
        Returns: {
          curlopt: string
          value: string
        }[]
      }
      http_patch: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_post:
        | {
            Args: { content: string; content_type: string; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { data: Json; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_put: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_reset_curlopt: { Args: never; Returns: boolean }
      http_set_curlopt: {
        Args: { curlopt: string; value: string }
        Returns: boolean
      }
      hybrid_search_documents: {
        Args: {
          p_company_cnpj?: string
          p_limit?: number
          p_query: string
          p_query_embedding: string
        }
        Returns: {
          category: string
          combined_score: number
          content: string
          document_id: string
          summary: string
          title: string
        }[]
      }
      increment_rag_usage: { Args: { p_rag_id: string }; Returns: undefined }
      increment_response_usage: {
        Args: { p_response_id: string; p_satisfaction?: number }
        Returns: undefined
      }
      is_card_ready_to_process: {
        Args: { p_queue_id: string }
        Returns: boolean
      }
      match_chunks: {
        Args: { match_count?: number; query_embedding: string }
        Returns: {
          content: string
          id: string
          similarity: number
          source_id: string
        }[]
      }
      match_embeddings:
        | {
            Args: { match_count?: number; query_text: string }
            Returns: {
              content: string
              id: string
              similarity: number
            }[]
          }
        | {
            Args: {
              match_count: number
              match_threshold: number
              query_embedding: string
            }
            Returns: {
              content: string
              id: number
              metadata: Json
              similarity: number
            }[]
          }
      only_digits: { Args: { txt: string }; Returns: string }
      postgres_fdw_disconnect: { Args: { "": string }; Returns: boolean }
      postgres_fdw_disconnect_all: { Args: never; Returns: boolean }
      postgres_fdw_get_connections: {
        Args: never
        Returns: Record<string, unknown>[]
      }
      postgres_fdw_handler: { Args: never; Returns: unknown }
      refresh_sync_f360: { Args: never; Returns: undefined }
      refresh_sync_omie: { Args: never; Returns: undefined }
      refresh_table: { Args: { p_table: string }; Returns: undefined }
      search_similar_conversations: {
        Args: {
          p_company_cnpj?: string
          p_limit?: number
          p_min_similarity?: number
          p_question_embedding: string
        }
        Returns: {
          bot_response: string
          category: string
          context_used: Json
          conversation_id: string
          rag_type: string
          similarity: number
          user_question: string
        }[]
      }
      search_similar_documents: {
        Args: {
          p_company_cnpj?: string
          p_limit?: number
          p_min_similarity?: number
          p_query_embedding: string
        }
        Returns: {
          category: string
          content: string
          document_id: string
          similarity: number
          summary: string
          title: string
        }[]
      }
      search_similar_responses: {
        Args: {
          p_intent?: string
          p_limit?: number
          p_min_similarity?: number
          p_personality_id?: string
          p_query_embedding: string
        }
        Returns: {
          response_id: string
          similarity: number
          template_text: string
          tone: string
          variations: string[]
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      text_to_bytea: { Args: { data: string }; Returns: string }
      update_document_access: {
        Args: { p_document_id: string }
        Returns: undefined
      }
      urlencode:
        | { Args: { data: Json }; Returns: string }
        | {
            Args: { string: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.urlencode(string => bytea), public.urlencode(string => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { string: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.urlencode(string => bytea), public.urlencode(string => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
      user_has_company_access: {
        Args: {
          p_access_type?: string
          p_company_cnpj: string
          p_user_id: string
        }
        Returns: boolean
      }
      user_has_permission: {
        Args: { p_action: string; p_resource: string; p_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      http_header: {
        field: string | null
        value: string | null
      }
      http_request: {
        method: unknown
        uri: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content_type: string | null
        content: string | null
      }
      http_response: {
        status: number | null
        content_type: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content: string | null
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
