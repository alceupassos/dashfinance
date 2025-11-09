/**
 * GitHub MCP Server - Open Source Implementation
 * Análise de código e segurança via GitHub API
 * 
 * Propósito: Análise de código, PR review, security scanning
 * Data: 09/11/2025
 */

interface GitHubCodeReview {
  id: string;
  file: string;
  line: number;
  severity: "critical" | "warning" | "info";
  message: string;
  suggestion?: string;
  category: string;
}

interface GitHubSecurityAlert {
  id: string;
  type: string;
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  affected_package?: string;
  affected_range?: string;
  fixed_in?: string;
  url: string;
  state: "open" | "dismissed" | "fixed";
}

interface PRAnalysisResult {
  prNumber: number;
  title: string;
  author: string;
  reviewComments: GitHubCodeReview[];
  securityAlerts: GitHubSecurityAlert[];
  metrics: {
    linesAdded: number;
    linesRemoved: number;
    filesChanged: number;
    complexity_score: number;
    test_coverage_change: number;
  };
  recommendation: "approve" | "request_changes" | "comment";
  summary: string;
}

/**
 * GitHub MCP Server
 * Análise de código e security scanning
 */
class GitHubMCPServer {
  private token: string;
  private owner: string;
  private repo: string;
  private apiUrl: string = "https://api.github.com";

  constructor(token?: string, owner?: string, repo?: string) {
    this.token = token || process.env.GITHUB_TOKEN || "";
    this.owner = owner || process.env.GITHUB_OWNER || "dashfinance";
    this.repo = repo || process.env.GITHUB_REPO || "dashfinance";

    if (!this.token) {
      throw new Error("GITHUB_TOKEN environment variable not set");
    }

    console.log(`✅ GitHub MCP Server initialized for ${this.owner}/${this.repo}`);
  }

  /**
   * Analisar Pull Request
   */
  async analyzePR(prNumber: number): Promise<PRAnalysisResult> {
    console.log(`🔍 Analyzing PR #${prNumber}...`);

    try {
      // Obter detalhes do PR
      const prData = await this.getPRDetails(prNumber);

      // Obter mudanças dos arquivos
      const files = await this.getPRFiles(prNumber);

      // Análise de código
      const reviewComments = await this.performCodeReview(files);

      // Security alerts
      const securityAlerts = await this.getSecurityAlerts();

      // Cálcular métricas
      const metrics = this.calculateMetrics(files);

      // Gerar recomendação
      const recommendation = this.generateRecommendation(
        reviewComments,
        securityAlerts,
        metrics
      );

      const summary = this.generateSummary(reviewComments, securityAlerts);

      return {
        prNumber,
        title: prData.title,
        author: prData.user.login,
        reviewComments,
        securityAlerts,
        metrics,
        recommendation,
        summary,
      };
    } catch (error) {
      console.error("❌ PR analysis failed:", error);
      throw error;
    }
  }

  /**
   * Obter detalhes do PR
   */
  private async getPRDetails(prNumber: number): Promise<any> {
    const response = await fetch(
      `${this.apiUrl}/repos/${this.owner}/${this.repo}/pulls/${prNumber}`,
      {
        headers: {
          Authorization: `token ${this.token}`,
          "Accept": "application/vnd.github.v3+json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch PR details: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Obter arquivos modificados no PR
   */
  private async getPRFiles(prNumber: number): Promise<any[]> {
    const response = await fetch(
      `${this.apiUrl}/repos/${this.owner}/${this.repo}/pulls/${prNumber}/files`,
      {
        headers: {
          Authorization: `token ${this.token}`,
          "Accept": "application/vnd.github.v3+json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch PR files: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Realizar code review
   */
  private async performCodeReview(files: any[]): Promise<GitHubCodeReview[]> {
    const reviews: GitHubCodeReview[] = [];
    let reviewId = 1;

    for (const file of files) {
      // Ignorar arquivos específicos
      if (this.shouldIgnoreFile(file.filename)) {
        continue;
      }

      const fileReviews = this.analyzeFile(file);
      fileReviews.forEach((review) => {
        review.id = `review-${reviewId++}`;
      });
      reviews.push(...fileReviews);
    }

    return reviews;
  }

  /**
   * Analisar arquivo individual
   */
  private analyzeFile(file: any): Omit<GitHubCodeReview, "id">[] {
    const reviews: Omit<GitHubCodeReview, "id">[] = [];
    const patch = file.patch || "";

    // Checagens de padrões
    const checks = [
      {
        pattern: /console\.(log|debug|info)/g,
        severity: "warning" as const,
        message: "Remove console statements in production code",
        category: "code-quality",
      },
      {
        pattern: /TODO|FIXME/g,
        severity: "info" as const,
        message: "Unresolved TODO/FIXME comment",
        category: "documentation",
      },
      {
        pattern: /\/\*\s*@ts-ignore/g,
        severity: "warning" as const,
        message: "Type checking disabled with @ts-ignore",
        category: "type-safety",
      },
      {
        pattern: /any\s*[,\[\(\)]/g,
        severity: "warning" as const,
        message: "Avoid using 'any' type",
        category: "type-safety",
      },
      {
        pattern: /eval\(/g,
        severity: "critical" as const,
        message: "eval() is a security risk",
        category: "security",
      },
    ];

    checks.forEach((check) => {
      let match;
      let line = 1;

      while ((match = check.pattern.exec(patch)) !== null) {
        line = patch.substring(0, match.index).split("\n").length;
        reviews.push({
          file: file.filename,
          line,
          severity: check.severity,
          message: check.message,
          category: check.category,
        });
      }
    });

    return reviews;
  }

  /**
   * Obter alertas de segurança
   */
  private async getSecurityAlerts(): Promise<GitHubSecurityAlert[]> {
    try {
      const response = await fetch(
        `${this.apiUrl}/repos/${this.owner}/${this.repo}/security-advisories`,
        {
          headers: {
            Authorization: `token ${this.token}`,
            "Accept": "application/vnd.github.v3+json",
          },
        }
      );

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return (
        data.map((advisory: any) => ({
          id: advisory.id,
          type: advisory.type,
          severity: advisory.severity,
          description: advisory.description,
          affected_package: advisory.package?.name,
          affected_range: advisory.affected_range,
          fixed_in: advisory.fixed_in,
          url: advisory.url,
          state: advisory.state,
        })) || []
      );
    } catch (error) {
      console.warn("⚠️ Could not fetch security alerts:", error);
      return [];
    }
  }

  /**
   * Calcular métricas
   */
  private calculateMetrics(files: any[]): PRAnalysisResult["metrics"] {
    let linesAdded = 0;
    let linesRemoved = 0;
    let complexity_score = 0;

    files.forEach((file) => {
      linesAdded += file.additions || 0;
      linesRemoved += file.deletions || 0;

      // Estimar complexidade baseada no tamanho
      if (file.additions > 500) complexity_score += 2;
      if (file.additions > 100) complexity_score += 1;
    });

    return {
      linesAdded,
      linesRemoved,
      filesChanged: files.length,
      complexity_score: Math.min(10, complexity_score),
      test_coverage_change: this.estimateTestCoverageChange(files),
    };
  }

  /**
   * Estimar mudança de cobertura de testes
   */
  private estimateTestCoverageChange(files: any[]): number {
    const testFiles = files.filter((f) => f.filename.match(/\.test\.|\.spec\./));
    if (testFiles.length === 0) return -5; // Sem testes = ruim
    return Math.min(10, testFiles.length * 2);
  }

  /**
   * Gerar recomendação
   */
  private generateRecommendation(
    reviews: GitHubCodeReview[],
    alerts: GitHubSecurityAlert[],
    metrics: PRAnalysisResult["metrics"]
  ): "approve" | "request_changes" | "comment" {
    const criticalReviews = reviews.filter((r) => r.severity === "critical").length;
    const criticalAlerts = alerts.filter((a) => a.severity === "critical").length;

    if (criticalReviews > 0 || criticalAlerts > 0) {
      return "request_changes";
    }

    if (reviews.filter((r) => r.severity === "warning").length > 3) {
      return "comment";
    }

    return "approve";
  }

  /**
   * Gerar sumário
   */
  private generateSummary(reviews: GitHubCodeReview[], alerts: GitHubSecurityAlert[]): string {
    const issues = reviews.length + alerts.length;

    if (issues === 0) {
      return "✅ No issues found - PR is ready to merge";
    }

    return `⚠️ Found ${issues} issue(s): ${reviews.length} code review comment(s) and ${alerts.length} security alert(s)`;
  }

  /**
   * Verificar se arquivo deve ser ignorado
   */
  private shouldIgnoreFile(filename: string): boolean {
    const ignorePatterns = [
      /\.lock$/,
      /\.config\.json$/,
      /\.env/,
      /node_modules/,
      /dist\//,
      /build\//,
    ];

    return ignorePatterns.some((pattern) => pattern.test(filename));
  }

  /**
   * Posterar comment no PR
   */
  async postPRComment(prNumber: number, body: string): Promise<void> {
    const response = await fetch(
      `${this.apiUrl}/repos/${this.owner}/${this.repo}/issues/${prNumber}/comments`,
      {
        method: "POST",
        headers: {
          Authorization: `token ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ body }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to post comment: ${response.status}`);
    }

    console.log("✅ Comment posted to PR");
  }

  /**
   * Gerar comentário markdown
   */
  generateMarkdownComment(result: PRAnalysisResult): string {
    return `## 🤖 Automated Code Review

### Summary
${result.summary}

### Metrics
- Lines Added: ${result.metrics.linesAdded}
- Lines Removed: ${result.metrics.linesRemoved}
- Files Changed: ${result.metrics.filesChanged}
- Complexity Score: ${result.metrics.complexity_score}/10

### Recommendation
**${result.recommendation.toUpperCase().replace(/_/g, " ")}**

### Code Review Issues
${
  result.reviewComments.length === 0
    ? "✅ No code review issues"
    : result.reviewComments
        .slice(0, 5)
        .map((r) => `- **[${r.severity.toUpperCase()}]** ${r.file}:${r.line} - ${r.message}`)
        .join("\n")
}

### Security Alerts
${
  result.securityAlerts.length === 0
    ? "✅ No security alerts"
    : result.securityAlerts
        .slice(0, 5)
        .map((a) => `- **[${a.severity.toUpperCase()}]** ${a.description}`)
        .join("\n")
}

---
*Generated by GitHub MCP Server*`;
  }
}

// Export para uso como módulo
export default GitHubMCPServer;
export { GitHubCodeReview, GitHubSecurityAlert, PRAnalysisResult };

/**
 * CLI Usage Example
 */
if (require.main === module) {
  const github = new GitHubMCPServer();

  // Exemplo: Analisar PR
  github
    .analyzePR(1)
    .then((result) => {
      console.log("\n📋 PR Analysis Result:");
      console.log(`PR #${result.prNumber}: ${result.title}`);
      console.log(`Author: ${result.author}`);
      console.log(`Recommendation: ${result.recommendation}`);
      console.log(`Review Comments: ${result.reviewComments.length}`);
      console.log(`Security Alerts: ${result.securityAlerts.length}`);

      // Gerar e postar comentário
      const comment = github.generateMarkdownComment(result);
      console.log("\n💬 Generated Comment:");
      console.log(comment);
    })
    .catch((error) => {
      console.error("❌ PR analysis failed:", error);
    });
}

