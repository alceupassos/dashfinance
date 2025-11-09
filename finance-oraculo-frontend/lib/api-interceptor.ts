/**
 * API Interceptor para tracking de chamadas de API em tempo real
 * Captura todas as requisições e envia métricas para o backend
 */

export interface APICallMetrics {
  endpoint: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  status: number
  duration_ms: number
  timestamp: Date
  error?: string
}

class APIInterceptor {
  private metrics: APICallMetrics[] = []
  private batchSize = 50
  private batchIntervalMs = 30000 // 30 segundos
  private isRunning = false

  constructor() {
    this.setupBatchSender()
  }

  /**
   * Interceptar fetch global
   */
  public init(): void {
    if (this.isRunning) return

    const originalFetch = globalThis.fetch

    globalThis.fetch = async (
      input: RequestInfo | URL,
      init?: RequestInit
    ): Promise<Response> => {
      const startTime = performance.now()
      const endpoint = typeof input === 'string' ? input : input.toString()
      const method = (init?.method || 'GET').toUpperCase() as any

      try {
        const response = await originalFetch(input, init)
        const duration = performance.now() - startTime

        // Registrar métrica bem-sucedida
        this.addMetric({
          endpoint,
          method,
          status: response.status,
          duration_ms: Math.round(duration),
          timestamp: new Date(),
        })

        return response
      } catch (error) {
        const duration = performance.now() - startTime

        // Registrar erro
        this.addMetric({
          endpoint,
          method,
          status: 0, // Erro de conexão
          duration_ms: Math.round(duration),
          timestamp: new Date(),
          error: error instanceof Error ? error.message : 'Unknown error',
        })

        throw error
      }
    }

    this.isRunning = true
    console.log('[APIInterceptor] Initialized')
  }

  /**
   * Adicionar métrica
   */
  private addMetric(metric: APICallMetrics): void {
    this.metrics.push(metric)

    // Enviar batch se atingiu tamanho máximo
    if (this.metrics.length >= this.batchSize) {
      this.sendBatch()
    }
  }

  /**
   * Configurar envio periódico de batch
   */
  private setupBatchSender(): void {
    setInterval(() => {
      if (this.metrics.length > 0) {
        this.sendBatch()
      }
    }, this.batchIntervalMs)
  }

  /**
   * Enviar batch de métricas para backend
   */
  private async sendBatch(): Promise<void> {
    if (this.metrics.length === 0) return

    const batch = this.metrics.splice(0, this.batchSize)

    try {
      // Agrupar por tipo
      const grouped = {
        total_calls: batch.length,
        successful: batch.filter(m => m.status >= 200 && m.status < 300).length,
        failed: batch.filter(m => m.status >= 400).length,
        errors: batch.filter(m => m.error).length,
        avg_duration_ms: Math.round(
          batch.reduce((sum, m) => sum + m.duration_ms, 0) / batch.length
        ),
        endpoints: this.groupByEndpoint(batch),
        timestamp: new Date().toISOString(),
      }

      // Enviar via Supabase Functions
      const functionUrl = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL
      if (!functionUrl) {
        console.warn('[APIInterceptor] SUPABASE_FUNCTIONS_URL not configured')
        return
      }

      // Usar sendBeacon para garantir envio mesmo ao fechar página
      const data = JSON.stringify(grouped)
      navigator.sendBeacon(
        `${functionUrl}/track-api-metrics`,
        data
      )

      console.log(`[APIInterceptor] Sent ${batch.length} metrics`)
    } catch (error) {
      console.error('[APIInterceptor] Error sending batch:', error)
      // Re-adicionar ao batch para tentar novamente
      this.metrics.unshift(...batch)
    }
  }

  /**
   * Agrupar métricas por endpoint
   */
  private groupByEndpoint(metrics: APICallMetrics[]): Record<string, any> {
    const grouped: Record<string, any> = {}

    for (const metric of metrics) {
      const endpoint = new URL(metric.endpoint, 'http://dummy.com').pathname
      if (!grouped[endpoint]) {
        grouped[endpoint] = {
          count: 0,
          methods: {},
          avg_duration_ms: 0,
          errors: 0,
        }
      }

      grouped[endpoint].count++
      grouped[endpoint].avg_duration_ms = Math.round(
        (grouped[endpoint].avg_duration_ms + metric.duration_ms) / 2
      )

      if (!grouped[endpoint].methods[metric.method]) {
        grouped[endpoint].methods[metric.method] = 0
      }
      grouped[endpoint].methods[metric.method]++

      if (metric.error) {
        grouped[endpoint].errors++
      }
    }

    return grouped
  }

  /**
   * Obter métricas locais (não enviadas ainda)
   */
  public getMetrics(): APICallMetrics[] {
    return [...this.metrics]
  }

  /**
   * Limpar métricas
   */
  public clearMetrics(): void {
    this.metrics = []
  }

  /**
   * Obter resumo de métricas
   */
  public getSummary() {
    return {
      total_calls: this.metrics.length,
      successful: this.metrics.filter(m => m.status >= 200 && m.status < 300).length,
      failed: this.metrics.filter(m => m.status >= 400).length,
      errors: this.metrics.filter(m => m.error).length,
      avg_duration_ms: this.metrics.length > 0
        ? Math.round(this.metrics.reduce((sum, m) => sum + m.duration_ms, 0) / this.metrics.length)
        : 0,
    }
  }
}

// Singleton
export const apiInterceptor = new APIInterceptor()

// Auto-initialize on client side
if (typeof window !== 'undefined') {
  apiInterceptor.init()
}

