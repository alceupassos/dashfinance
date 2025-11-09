/**
 * MCP Servers Dashboard - Control Panel
 * Gerenciar todos os MCP servers com on/off toggle
 * 
 * Componentes:
 * - Status real-time de cada server
 * - Botões de toggle (on/off)
 * - Health checks
 * - Logs e métricas
 * - Integração com Federated MCP
 */

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Toggle } from '@/components/ui/toggle';

interface MCPServer {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'degraded';
  isRunning: boolean;
  description: string;
  features: string[];
  lastHealthCheck: Date;
  responseTime?: number;
  errorCount?: number;
  requestCount?: number;
}

interface FederationStatus {
  totalServers: number;
  onlineServers: number;
  degradedServers: number;
  offlineServers: number;
  overallStatus: 'healthy' | 'degraded' | 'critical';
}

export default function MCPDashboard() {
  const [servers, setServers] = useState<MCPServer[]>([
    {
      id: 'supabase',
      name: 'Supabase MCP',
      status: 'online',
      isRunning: true,
      description: 'Database migrations, edge functions, SQL execution',
      features: ['13 Functions', 'Migrations', 'TypeScript Types', 'Advisors'],
      lastHealthCheck: new Date(),
      responseTime: 245,
      errorCount: 0,
      requestCount: 1250,
    },
    {
      id: 'snyk',
      name: 'Snyk MCP',
      status: 'online',
      isRunning: true,
      description: 'Security scanning and vulnerability detection',
      features: ['Vulnerability Scanning', 'Risk Scoring', 'Remediation', 'Reports'],
      lastHealthCheck: new Date(),
      responseTime: 512,
      errorCount: 0,
      requestCount: 350,
    },
    {
      id: 'github',
      name: 'GitHub MCP',
      status: 'online',
      isRunning: true,
      description: 'Code analysis and PR review automation',
      features: ['PR Analysis', 'Code Review', 'Security Alerts', 'Auto Comments'],
      lastHealthCheck: new Date(),
      responseTime: 389,
      errorCount: 0,
      requestCount: 220,
    },
    {
      id: 'code-reviewer',
      name: 'Code Reviewer AI',
      status: 'online',
      isRunning: true,
      description: 'AI-powered code analysis and auto-fixing',
      features: ['Static Analysis', 'AI Analysis', 'Auto-Fixes', 'Sentry Integration'],
      lastHealthCheck: new Date(),
      responseTime: 1205,
      errorCount: 1,
      requestCount: 180,
    },
    {
      id: 'federated',
      name: 'Federated MCP',
      status: 'online',
      isRunning: true,
      description: 'Multi-server orchestration and load balancing',
      features: ['Orchestration', 'Health Checks', 'Load Balancing', 'Retry Policy'],
      lastHealthCheck: new Date(),
      responseTime: 125,
      errorCount: 0,
      requestCount: 2100,
    },
  ]);

  const [federationStatus, setFederationStatus] = useState<FederationStatus>({
    totalServers: 5,
    onlineServers: 5,
    degradedServers: 0,
    offlineServers: 0,
    overallStatus: 'healthy',
  });

  const [selectedServer, setSelectedServer] = useState<string | null>('supabase');
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Toggle server on/off
   */
  const toggleServer = async (serverId: string) => {
    setIsLoading(true);
    try {
      const server = servers.find((s) => s.id === serverId);
      if (!server) return;

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

      // Atualizar status da federação
      updateFederationStatus();
    } catch (error) {
      console.error('Failed to toggle server:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Update federation status
   */
  const updateFederationStatus = () => {
    const onlineCount = servers.filter((s) => s.isRunning && s.status === 'online').length;
    const degradedCount = servers.filter((s) => s.isRunning && s.status === 'degraded').length;
    const offlineCount = servers.filter((s) => !s.isRunning || s.status === 'offline').length;

    let overallStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (degradedCount > 0) overallStatus = 'degraded';
    if (offlineCount >= servers.length / 2) overallStatus = 'critical';

    setFederationStatus({
      totalServers: servers.length,
      onlineServers: onlineCount,
      degradedServers: degradedCount,
      offlineServers: offlineCount,
      overallStatus,
    });
  };

  /**
   * Run health check
   */
  const runHealthCheck = async () => {
    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      // Simular update de last health check
      setServers((prevServers) =>
        prevServers.map((s) => ({
          ...s,
          lastHealthCheck: new Date(),
        }))
      );

      updateFederationStatus();
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Get status badge color
   */
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'degraded':
        return 'bg-yellow-500';
      case 'offline':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };


  useEffect(() => {
    updateFederationStatus();
  }, []);

  return (
    <div className="space-y-8 p-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">MCP Servers Dashboard</h1>
        <p className="text-gray-500">Monitor and control all MCP servers in real-time</p>
      </div>

      {/* Federation Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Servers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{federationStatus.totalServers}</div>
            <p className="text-xs text-gray-500 mt-1">MCP servers configured</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Online</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{federationStatus.onlineServers}</div>
            <p className="text-xs text-gray-500 mt-1">Servers running</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Degraded</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{federationStatus.degradedServers}</div>
            <p className="text-xs text-gray-500 mt-1">Performance issues</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Overall Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-sm font-bold px-3 py-1 rounded-full inline-block ${
              federationStatus.overallStatus === 'healthy'
                ? 'bg-green-100 text-green-800'
                : federationStatus.overallStatus === 'degraded'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {federationStatus.overallStatus.toUpperCase()}
            </div>
            <p className="text-xs text-gray-500 mt-2">System health</p>
          </CardContent>
        </Card>
      </div>

      {/* Alert */}
      {federationStatus.overallStatus !== 'healthy' && (
        <Alert className={`${
          federationStatus.overallStatus === 'degraded'
            ? 'border-yellow-200 bg-yellow-50'
            : 'border-red-200 bg-red-50'
        }`}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className={`${
            federationStatus.overallStatus === 'degraded'
              ? 'text-yellow-800'
              : 'text-red-800'
          }`}>
            {federationStatus.offlineServers > 0
              ? `${federationStatus.offlineServers} server(s) offline - check configuration`
              : `${federationStatus.degradedServers} server(s) degraded - monitor performance`}
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">MCP Servers</h2>
            <Button
              onClick={runHealthCheck}
              disabled={isLoading}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {isLoading ? 'Checking...' : 'Run Health Check'}
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {servers.map((server) => (
              <Card key={server.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div>
                        <CardTitle className="text-lg">{server.name}</CardTitle>
                        <CardDescription>{server.description}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Badge
                          className={`${getStatusColor(
                            server.status
                          )} text-white capitalize`}
                        >
                          {server.status}
                        </Badge>
                      </div>
                      <Button
                        onClick={() => toggleServer(server.id)}
                        disabled={isLoading}
                        variant={server.isRunning ? 'default' : 'outline'}
                        size="sm"
                      >
                        {server.isRunning ? '🟢 ON' : '🔴 OFF'}
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Response Time</p>
                      <p className="text-lg font-semibold">
                        {server.responseTime}ms
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Errors</p>
                      <p className={`text-lg font-semibold ${
                        server.errorCount! > 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {server.errorCount}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Requests</p>
                      <p className="text-lg font-semibold">{server.requestCount}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Last Check</p>
                      <p className="text-sm font-semibold">
                        {server.lastHealthCheck.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {server.features.map((feature) => (
                      <Badge key={feature} variant="secondary">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Server Details</CardTitle>
              <CardDescription>
                {selectedServer
                  ? `Detailed information for ${
                      servers.find((s) => s.id === selectedServer)?.name
                    }`
                  : 'Select a server to view details'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedServer && servers.find((s) => s.id === selectedServer) && (
                <div className="space-y-4">
                  {(() => {
                    const server = servers.find((s) => s.id === selectedServer)!;
                    return (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-semibold text-gray-600">ID</p>
                            <p className="font-mono text-sm">{server.id}</p>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-600">Status</p>
                            <Badge className={getStatusColor(server.status)}>
                              {server.status}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-600">Running</p>
                            <p>{server.isRunning ? '✅ Yes' : '❌ No'}</p>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-600">Response Time</p>
                            <p>{server.responseTime}ms</p>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Metrics Tab */}
        <TabsContent value="metrics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>Real-time performance across all servers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {servers.map((server) => (
                  <div key={server.id} className="pb-4 border-b last:border-0">
                    <div className="flex justify-between items-center mb-2">
                      <p className="font-semibold">{server.name}</p>
                      <p className="text-sm text-gray-500">{server.responseTime}ms</p>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{
                          width: `${Math.min((server.responseTime! / 2000) * 100, 100)}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Event Logs</CardTitle>
              <CardDescription>Recent server activity and events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {[
                  { time: '14:32:45', event: 'Health check passed - All servers online' },
                  { time: '14:30:12', event: 'Snyk MCP vulnerability scan completed' },
                  { time: '14:28:01', event: 'GitHub PR #123 analyzed successfully' },
                  { time: '14:25:33', event: 'Code Reviewer AI detected 3 issues' },
                  { time: '14:20:15', event: 'Federated MCP load balanced requests' },
                ].map((log, idx) => (
                  <div key={idx} className="flex items-start gap-3 py-2 border-b last:border-0">
                    <p className="text-xs text-gray-500 font-mono min-w-max">{log.time}</p>
                    <p className="text-sm text-gray-700">{log.event}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

