/**
 * Snyk MCP Server - Open Source Implementation
 * Escaneamento de segurança e vulnerabilidades
 * 
 * Propósito: Integração com Snyk para análise de vulnerabilidades
 * Data: 09/11/2025
 */

interface SnykVulnerability {
  id: string;
  title: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
  packageName: string;
  packageVersion: string;
  fixedVersion?: string;
  cvss: number;
  references: string[];
  lastUpdated: Date;
}

interface SnykScanResult {
  projectId: string;
  scanId: string;
  timestamp: Date;
  totalVulnerabilities: number;
  vulnerabilityBreakdown: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  vulnerabilities: SnykVulnerability[];
  remediationAdvice: string[];
  riskScore: number;
}

interface RemediationOption {
  action: "upgrade" | "patch" | "remove" | "replace";
  package: string;
  targetVersion: string;
  riskLevel: number;
  affectedVulnerabilities: string[];
}

/**
 * Snyk MCP Server
 * Integração com Snyk para scanning de vulnerabilidades
 */
class SnykMCPServer {
  private apiToken: string;
  private apiUrl: string = "https://api.snyk.io/v1";
  private scanResults: Map<string, SnykScanResult> = new Map();

  constructor(apiToken?: string) {
    this.apiToken = apiToken || process.env.SNYK_API_TOKEN || "";
    if (!this.apiToken) {
      throw new Error("SNYK_API_TOKEN environment variable not set");
    }
    console.log("✅ Snyk MCP Server initialized");
  }

  /**
   * Escanear projeto para vulnerabilidades
   */
  async scanProject(
    projectId: string,
    manifestPath?: string
  ): Promise<SnykScanResult> {
    console.log(`🔍 Scanning project ${projectId} with Snyk...`);

    try {
      const response = await fetch(`${this.apiUrl}/test`, {
        method: "POST",
        headers: {
          Authorization: `token ${this.apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId,
          manifestPath: manifestPath || "package.json",
        }),
      });

      if (!response.ok) {
        throw new Error(`Snyk API error: ${response.status}`);
      }

      const data = await response.json();
      const scanResult = this.parseSnykResponse(projectId, data);
      this.scanResults.set(projectId, scanResult);

      console.log(
        `✅ Scan complete: ${scanResult.totalVulnerabilities} vulnerabilities found`
      );
      return scanResult;
    } catch (error) {
      console.error("❌ Snyk scan failed:", error);
      throw error;
    }
  }

  /**
   * Parsear resposta do Snyk
   */
  private parseSnykResponse(projectId: string, data: any): SnykScanResult {
    const vulnerabilities: SnykVulnerability[] = (data.vulnerabilities || []).map(
      (vuln: any) => ({
        id: vuln.id,
        title: vuln.title,
        description: vuln.description,
        severity: vuln.severity,
        packageName: vuln.package,
        packageVersion: vuln.version,
        fixedVersion: vuln.fixedIn,
        cvss: vuln.cvssScore || 0,
        references: vuln.references || [],
        lastUpdated: new Date(vuln.publication),
      })
    );

    const breakdown = {
      critical: vulnerabilities.filter((v) => v.severity === "critical").length,
      high: vulnerabilities.filter((v) => v.severity === "high").length,
      medium: vulnerabilities.filter((v) => v.severity === "medium").length,
      low: vulnerabilities.filter((v) => v.severity === "low").length,
    };

    const riskScore = this.calculateRiskScore(vulnerabilities);
    const remediationAdvice = this.generateRemediationAdvice(vulnerabilities);

    return {
      projectId,
      scanId: `scan-${Date.now()}`,
      timestamp: new Date(),
      totalVulnerabilities: vulnerabilities.length,
      vulnerabilityBreakdown: breakdown,
      vulnerabilities,
      remediationAdvice,
      riskScore,
    };
  }

  /**
   * Calcular score de risco
   */
  private calculateRiskScore(vulnerabilities: SnykVulnerability[]): number {
    let score = 0;

    vulnerabilities.forEach((vuln) => {
      const severityWeights = {
        critical: 10,
        high: 7,
        medium: 4,
        low: 1,
      };
      score += severityWeights[vuln.severity] * (1 + vuln.cvss / 10);
    });

    return Math.min(100, score);
  }

  /**
   * Gerar conselhos de remediação
   */
  private generateRemediationAdvice(vulnerabilities: SnykVulnerability[]): string[] {
    const advice: string[] = [];

    const criticalCount = vulnerabilities.filter((v) => v.severity === "critical").length;
    const highCount = vulnerabilities.filter((v) => v.severity === "high").length;

    if (criticalCount > 0) {
      advice.push(`🚨 CRITICAL: ${criticalCount} critical vulnerabilities must be fixed immediately`);
    }

    if (highCount > 0) {
      advice.push(
        `⚠️ HIGH: ${highCount} high-severity vulnerabilities should be addressed within 7 days`
      );
    }

    // Agrupar por pacote
    const packageMap = new Map<string, SnykVulnerability[]>();
    vulnerabilities.forEach((vuln) => {
      if (!packageMap.has(vuln.packageName)) {
        packageMap.set(vuln.packageName, []);
      }
      packageMap.get(vuln.packageName)!.push(vuln);
    });

    // Top 3 pacotes com mais vulnerabilidades
    const topPackages = Array.from(packageMap.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 3);

    topPackages.forEach(([pkg, vulns]) => {
      const fixable = vulns.filter((v) => v.fixedVersion);
      if (fixable.length > 0) {
        advice.push(
          `📦 ${pkg}: ${fixable.length}/${vulns.length} vulnerabilities have fixes available`
        );
      }
    });

    return advice;
  }

  /**
   * Obter opções de remediação
   */
  async getRemediationOptions(projectId: string): Promise<RemediationOption[]> {
    const scanResult = this.scanResults.get(projectId);
    if (!scanResult) {
      throw new Error(`No scan result found for project ${projectId}`);
    }

    const options: RemediationOption[] = [];
    const processedPackages = new Set<string>();

    for (const vuln of scanResult.vulnerabilities) {
      if (processedPackages.has(vuln.packageName)) continue;
      processedPackages.add(vuln.packageName);

      if (vuln.fixedVersion) {
        options.push({
          action: "upgrade",
          package: vuln.packageName,
          targetVersion: vuln.fixedVersion,
          riskLevel: this.calculateRemediationRisk(vuln),
          affectedVulnerabilities: scanResult.vulnerabilities
            .filter((v) => v.packageName === vuln.packageName)
            .map((v) => v.id),
        });
      }
    }

    return options;
  }

  /**
   * Calcular risco de remediação
   */
  private calculateRemediationRisk(vuln: SnykVulnerability): number {
    // Risco baseado em diferença de versão
    // Major version bump = maior risco
    const versionParts = vuln.packageVersion.split(".");
    const fixedParts = (vuln.fixedVersion || "0.0.0").split(".");

    if (versionParts[0] !== fixedParts[0]) {
      return 8; // Major bump = alto risco
    } else if (versionParts[1] !== fixedParts[1]) {
      return 5; // Minor bump = médio risco
    } else {
      return 2; // Patch = baixo risco
    }
  }

  /**
   * Gerar relatório
   */
  generateReport(projectId: string): string {
    const scanResult = this.scanResults.get(projectId);
    if (!scanResult) {
      throw new Error(`No scan result found for project ${projectId}`);
    }

    const report = `
═══════════════════════════════════════════════════════════════
                    SNYK SECURITY REPORT
═══════════════════════════════════════════════════════════════

Project ID: ${scanResult.projectId}
Scan ID: ${scanResult.scanId}
Timestamp: ${scanResult.timestamp.toISOString()}

VULNERABILITY SUMMARY
─────────────────────────────────────────────────────────────
Total Vulnerabilities: ${scanResult.totalVulnerabilities}
  • Critical: ${scanResult.vulnerabilityBreakdown.critical}
  • High: ${scanResult.vulnerabilityBreakdown.high}
  • Medium: ${scanResult.vulnerabilityBreakdown.medium}
  • Low: ${scanResult.vulnerabilityBreakdown.low}

Risk Score: ${scanResult.riskScore}/100

REMEDIATION ADVICE
─────────────────────────────────────────────────────────────
${scanResult.remediationAdvice.map((advice) => `• ${advice}`).join("\n")}

TOP VULNERABILITIES
─────────────────────────────────────────────────────────────
${scanResult.vulnerabilities
  .slice(0, 5)
  .map(
    (vuln) => `
• ${vuln.title}
  Severity: ${vuln.severity.toUpperCase()}
  Package: ${vuln.packageName}@${vuln.packageVersion}
  ${vuln.fixedVersion ? `Fixed in: ${vuln.fixedVersion}` : "No fix available"}
`
  )
  .join("")}

═══════════════════════════════════════════════════════════════
`;

    return report;
  }

  /**
   * Listar scans anteriores
   */
  listScans(): Map<string, SnykScanResult> {
    return this.scanResults;
  }
}

// Export para uso como módulo
export default SnykMCPServer;
export { SnykVulnerability, SnykScanResult, RemediationOption };

/**
 * CLI Usage Example
 */
if (require.main === module) {
  const snyk = new SnykMCPServer();

  // Exemplo: Escanear projeto
  snyk
    .scanProject("dashfinance-backend")
    .then(async (result) => {
      console.log("\n📊 Scan Result Summary:");
      console.log(`Total Vulnerabilities: ${result.totalVulnerabilities}`);
      console.log(`Risk Score: ${result.riskScore}/100`);

      // Obter opções de remediação
      const remediationOptions = await snyk.getRemediationOptions("dashfinance-backend");
      console.log(`\n🔧 Remediation Options:`);
      remediationOptions.forEach((option) => {
        console.log(
          `  • Upgrade ${option.package} to ${option.targetVersion} (Risk: ${option.riskLevel}/10)`
        );
      });

      // Gerar relatório
      const report = snyk.generateReport("dashfinance-backend");
      console.log(report);
    })
    .catch((error) => {
      console.error("❌ Snyk scan failed:", error);
    });
}

