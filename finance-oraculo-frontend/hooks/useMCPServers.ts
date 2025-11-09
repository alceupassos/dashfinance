/**
 * Hook para gerenciar MCP Servers
 * Controla estado, on/off, health checks e métricas
 */

import { useState, useCallback, useEffect } from 'react';

export interface MCPServer {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'degraded';
  isRunning: boolean;
  responseTime?: number;
  errorCount?: number;
  requestCount?: number;
  lastHealthCheck: Date;
}

export interface FederationStatus {
  totalServers: number;
  onlineServers: number;
  degradedServers: number;
  offlineServers: number;
  overallStatus: 'healthy' | 'degraded' | 'critical';
}

const DEFAULT_SERVERS: MCPServer[] = [
  {
    id: 'supabase',
    name: 'Supabase MCP',
    status: 'online',
    isRunning: true,
    responseTime: 245,
    errorCount: 0,
    requestCount: 1250,
    lastHealthCheck: new Date(),
  },
  {
    id: 'snyk',
    name: 'Snyk MCP',
    status: 'online',
    isRunning: true,
    responseTime: 512,
    errorCount: 0,
    requestCount: 350,
    lastHealthCheck: new Date(),
  },
  {
    id: 'github',
    name: 'GitHub MCP',
    status: 'online',
    isRunning: true,
    responseTime: 389,
    errorCount: 0,
    requestCount: 220,
    lastHealthCheck: new Date(),
  },
  {
    id: 'code-reviewer',
    name: 'Code Reviewer AI',
    status: 'online',
    isRunning: true,
    responseTime: 1205,
    errorCount: 1,
    requestCount: 180,
    lastHealthCheck: new Date(),
  },
  {
    id: 'federated',
    name: 'Federated MCP',
    status: 'online',
    isRunning: true,
    responseTime: 125,
    errorCount: 0,
    requestCount: 2100,
    lastHealthCheck: new Date(),
  },
];

export function useMCPServers() {
  const [servers, setServers] = useState<MCPServer[]>(DEFAULT_SERVERS);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Calcular status da federação
   */
  const calculateFederationStatus = useCallback((serverList: MCPServer[]): FederationStatus => {
    const onlineServers = serverList.filter((s) => s.isRunning && s.status === 'online').length;
    const degradedServers = serverList.filter((s) => s.isRunning && s.status === 'degraded').length;
    const offlineServers = serverList.filter((s) => !s.isRunning || s.status === 'offline').length;

    let overallStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (degradedServers > 0) overallStatus = 'degraded';
    if (offlineServers >= serverList.length / 2) overallStatus = 'critical';

    return {
      totalServers: serverList.length,
      onlineServers,
      degradedServers,
      offlineServers,
      overallStatus,
    };
  }, []);

  /**
   * Toggle servidor on/off
   */
  const toggleServer = useCallback(
    async (serverId: string): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        // Simular API call
        await new Promise((resolve) => setTimeout(resolve, 500));

        setServers((prevServers) =>
          prevServers.map((s) =>
            s.id === serverId
              ? {
                  ...s,
                  isRunning: !s.isRunning,
                  status: !s.isRunning ? 'online' : 'offline',
                  lastHealthCheck: new Date(),
                }
              : s
          )
        );
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        console.error('Failed to toggle server:', err);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Rodar health check
   */
  const runHealthCheck = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      // Simular health check
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setServers((prevServers) =>
        prevServers.map((s) => {
          // Simular valores aleatórios
          const randomResponseTime = Math.floor(Math.random() * 2000) + 50;
          const randomErrors = Math.random() > 0.95 ? 1 : 0;
          const randomRequests = Math.floor(Math.random() * 1000) + 100;

          return {
            ...s,
            responseTime: randomResponseTime,
            errorCount: randomErrors,
            requestCount: randomRequests,
            status: s.isRunning ? (randomResponseTime > 1500 ? 'degraded' : 'online') : 'offline',
            lastHealthCheck: new Date(),
          };
        })
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Health check failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Restart servidor específico
   */
  const restartServer = useCallback(
    async (serverId: string): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        // Simular restart (off -> on)
        await new Promise((resolve) => setTimeout(resolve, 1500));

        setServers((prevServers) =>
          prevServers.map((s) =>
            s.id === serverId
              ? {
                  ...s,
                  isRunning: true,
                  status: 'online',
                  responseTime: Math.floor(Math.random() * 1000) + 100,
                  errorCount: 0,
                  lastHealthCheck: new Date(),
                }
              : s
          )
        );
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        console.error('Failed to restart server:', err);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Stop all servers
   */
  const stopAllServers = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setServers((prevServers) =>
        prevServers.map((s) => ({
          ...s,
          isRunning: false,
          status: 'offline',
          lastHealthCheck: new Date(),
        }))
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Start all servers
   */
  const startAllServers = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setServers((prevServers) =>
        prevServers.map((s) => ({
          ...s,
          isRunning: true,
          status: 'online',
          responseTime: Math.floor(Math.random() * 1000) + 100,
          lastHealthCheck: new Date(),
        }))
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Get servidor específico
   */
  const getServer = useCallback(
    (serverId: string): MCPServer | undefined => {
      return servers.find((s) => s.id === serverId);
    },
    [servers]
  );

  /**
   * Get federação status
   */
  const federationStatus = calculateFederationStatus(servers);

  return {
    servers,
    federationStatus,
    isLoading,
    error,
    toggleServer,
    runHealthCheck,
    restartServer,
    stopAllServers,
    startAllServers,
    getServer,
  };
}

