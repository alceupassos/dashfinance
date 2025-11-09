"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useUserStore } from "@/store/use-user-store"
import { apiInterceptor } from "@/lib/api-interceptor"

export interface UsageData {
  user_id: string
  company_cnpj: string | null
  session_start: string
  session_end: string
  session_duration_seconds: number
  pages_visited: string[]
  features_used: string[]
  api_calls_count: number
  api_calls_successful: number
  api_calls_failed: number
  avg_api_duration_ms: number
  llm_interactions_count: number
  whatsapp_messages_sent: number
  whatsapp_messages_received: number
}

export function useTrackUsage() {
  const pathname = usePathname()
  const sessionStartRef = useRef<Date | null>(null)
  const pagesVisitedRef = useRef<Set<string>>(new Set())
  const featuresUsedRef = useRef<Set<string>>(new Set())
  const llmCounterRef = useRef<number>(0)
  const { profile } = useUserStore()

  useEffect(() => {
    // Iniciar sessão se ainda não iniciada
    if (!sessionStartRef.current) {
      sessionStartRef.current = new Date()
    }
    
    // Adicionar página atual
    if (pathname) {
      pagesVisitedRef.current.add(pathname)
    }
  }, [pathname])

  // Registrar sessão ao fechar/navegar (usando beforeunload)
  useEffect(() => {
    const handleBeforeUnload = async () => {
      if (!sessionStartRef.current) return

      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session || !profile) return

        const duration = Math.floor(
          (new Date().getTime() - sessionStartRef.current.getTime()) / 1000
        )

        // Obter métricas de API calls do interceptor
        const apiMetrics = apiInterceptor.getSummary()

        // Preparar dados de uso
        const usageData: UsageData = {
          user_id: session.user.id,
          company_cnpj: profile.company_cnpj || null,
          session_start: sessionStartRef.current.toISOString(),
          session_end: new Date().toISOString(),
          session_duration_seconds: duration,
          pages_visited: Array.from(pagesVisitedRef.current),
          features_used: Array.from(featuresUsedRef.current),
          api_calls_count: apiMetrics.total_calls,
          api_calls_successful: apiMetrics.successful,
          api_calls_failed: apiMetrics.failed,
          avg_api_duration_ms: apiMetrics.avg_duration_ms,
          llm_interactions_count: llmCounterRef.current,
          whatsapp_messages_sent: 0,
          whatsapp_messages_received: 0,
        }

        console.log('[useTrackUsage] Sending session data:', usageData)

        // Usar sendBeacon para garantir que seja enviado mesmo ao fechar
        const jsonData = JSON.stringify(usageData)
        navigator.sendBeacon(
          `${process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL}/track-user-usage`,
          jsonData
        )
      } catch (error) {
        console.error('[useTrackUsage] Error ending session:', error)
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [profile])

  const trackFeature = (featureName: string) => {
    featuresUsedRef.current.add(featureName)
    console.log(`[useTrackUsage] Feature tracked: ${featureName}`)
  }

  const trackLLMInteraction = () => {
    llmCounterRef.current++
    console.log(`[useTrackUsage] LLM interaction #${llmCounterRef.current}`)
  }

  const trackWhatsAppMessage = (direction: 'sent' | 'received') => {
    // Será registrado no backend automaticamente quando mensagem é processada
    console.log(`[useTrackUsage] WhatsApp message ${direction}`)
  }

  return {
    trackFeature,
    trackLLMInteraction,
    trackWhatsAppMessage,
    getMetrics: apiInterceptor.getSummary.bind(apiInterceptor),
  }
}

