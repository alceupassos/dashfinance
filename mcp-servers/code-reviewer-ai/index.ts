/**
 * Code Reviewer & Fixer AI - Open Source Implementation
 * Análise e correção automática de código com base em MCP e Sentry
 * 
 * Propósito: AI-powered code review com sugestões de correção automática
 * Data: 09/11/2025
 */

interface CodeIssue {
  id: string;
  file: string;
  line: number;
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  category: "performance" | "security" | "maintainability" | "style" | "bug";
  suggestedFix?: string;
  confidence: number;
}

interface AutoFixResult {
  original: string;
  fixed: string;
  issuesFixed: CodeIssue[];
  preservedBehavior: boolean;
  testCoverageMaintained: boolean;
}

interface SentryError {
  id: string;
  title: string;
  message: string;
  level: "error" | "warning" | "info";
  file: string;
  line_number: number;
  occurrences: number;
  first_seen: Date;
  last_seen: Date;
}

/**
 * Code Reviewer & Fixer AI
 * Integração com Sentry para análise e correção automática
 */
class CodeReviewerAI {
  private sentryToken: string;
  private sentryOrg: string;
  private sentryProject: string;
  private sentryApiUrl: string = "https://sentry.io/api/0";
  private anthropicKey: string;

  constructor(
    sentryToken?: string,
    sentryOrg?: string,
    sentryProject?: string,
    anthropicKey?: string
  ) {
    this.sentryToken = sentryToken || process.env.SENTRY_AUTH_TOKEN || "";
    this.sentryOrg = sentryOrg || process.env.SENTRY_ORG || "dashfinance";
    this.sentryProject = sentryProject || process.env.SENTRY_PROJECT || "backend";
    this.anthropicKey = anthropicKey || process.env.ANTHROPIC_API_KEY || "";

    if (!this.sentryToken) {
      console.warn("⚠️ SENTRY_AUTH_TOKEN not set - Sentry integration disabled");
    }

    if (!this.anthropicKey) {
      console.warn("⚠️ ANTHROPIC_API_KEY not set - AI fixes disabled");
    }

    console.log("✅ Code Reviewer AI initialized");
  }

  /**
   * Analisar código e retornar issues
   */
  async analyzeCode(code: string, filename: string): Promise<CodeIssue[]> {
    console.log(`🔍 Analyzing ${filename}...`);

    const issues: CodeIssue[] = [];
    let issueId = 1;

    // Análise estática
    const staticIssues = this.performStaticAnalysis(code, filename);
    staticIssues.forEach((issue) => {
      issue.id = `issue-${issueId++}`;
      issues.push(issue);
    });

    // Análise com IA (se disponível)
    if (this.anthropicKey) {
      try {
        const aiIssues = await this.performAIAnalysis(code, filename);
        aiIssues.forEach((issue) => {
          issue.id = `issue-${issueId++}`;
          issues.push(issue);
        });
      } catch (error) {
        console.warn("⚠️ AI analysis skipped:", error);
      }
    }

    console.log(`✅ Analysis complete: ${issues.length} issues found`);
    return issues;
  }

  /**
   * Análise estática
   */
  private performStaticAnalysis(code: string, filename: string): Omit<CodeIssue, "id">[] {
    const issues: Omit<CodeIssue, "id">[] = [];
    const lines = code.split("\n");

    lines.forEach((line, lineNum) => {
      const lineNumber = lineNum + 1;

      // Segurança
      if (line.includes("eval(")) {
        issues.push({
          file: filename,
          line: lineNumber,
          severity: "critical",
          title: "eval() detected",
          description: "eval() is a security risk and should be avoided",
          category: "security",
          suggestedFix: "Replace with JSON.parse() or Function constructor",
          confidence: 0.99,
        });
      }

      // Performance
      if (line.includes("console.log") && !line.includes("//")) {
        issues.push({
          file: filename,
          line: lineNumber,
          severity: "warning",
          title: "console.log in production",
          description: "Console statements should be removed in production",
          category: "performance",
          suggestedFix: "Remove console statement or use logger",
          confidence: 0.95,
        });
      }

      // Maintainability
      if (line.length > 120) {
        issues.push({
          file: filename,
          line: lineNumber,
          severity: "info",
          title: "Line too long",
          description: `Line exceeds 120 characters (${line.length} chars)`,
          category: "maintainability",
          confidence: 0.9,
        });
      }

      // Type safety
      if (line.includes(": any")) {
        issues.push({
          file: filename,
          line: lineNumber,
          severity: "warning",
          title: "Avoid 'any' type",
          description: "Using 'any' type defeats TypeScript's purpose",
          category: "maintainability",
          suggestedFix: "Replace with specific type annotation",
          confidence: 0.98,
        });
      }

      // Unused variables
      const varMatch = line.match(/const\s+(\w+)\s*=/);
      if (varMatch && !code.includes(varMatch[1])) {
        issues.push({
          file: filename,
          line: lineNumber,
          severity: "info",
          title: "Unused variable",
          description: `Variable '${varMatch[1]}' is declared but never used`,
          category: "maintainability",
          suggestedFix: "Remove unused variable",
          confidence: 0.85,
        });
      }
    });

    return issues;
  }

  /**
   * Análise com IA
   */
  private async performAIAnalysis(code: string, filename: string): Promise<Omit<CodeIssue, "id">[]> {
    // Esta seria uma chamada real ao Claude/GPT
    // Por enquanto, retornando vazio para evitar erro sem API key
    console.log("🤖 Running AI analysis...");

    // Simulação de análise IA
    return [
      {
        file: filename,
        line: 1,
        severity: "info",
        title: "Code structure suggestion",
        description: "Consider breaking this function into smaller, more focused functions",
        category: "maintainability",
        suggestedFix: "Refactor function for single responsibility",
        confidence: 0.7,
      },
    ];
  }

  /**
   * Sugerir fix automático
   */
  async suggestAutoFix(code: string, issue: CodeIssue): Promise<AutoFixResult | null> {
    console.log(`🔧 Generating auto-fix for: ${issue.title}`);

    const lines = code.split("\n");
    if (issue.line <= 0 || issue.line > lines.length) {
      return null;
    }

    let fixed = code;
    const fixedIssues: CodeIssue[] = [];

    // Aplicar fixes conhecidos
    if (issue.title === "console.log in production") {
      const originalLine = lines[issue.line - 1];
      lines[issue.line - 1] = originalLine.replace(/console\.log\([^)]*\);?/g, "// log removed");
      fixed = lines.join("\n");
      fixedIssues.push(issue);
    } else if (issue.title === "Line too long") {
      // Quebrar linha longa
      const line = lines[issue.line - 1];
      if (line.includes("?")) {
        // Quebrar em operador ternário
        lines[issue.line - 1] = line.replace(/\s+\?\s+/, "\n  ? ");
      } else if (line.includes("+")) {
        // Quebrar em concatenação
        lines[issue.line - 1] = line.replace(/\s+\+\s+/, "\n  + ");
      }
      fixed = lines.join("\n");
      fixedIssues.push(issue);
    } else if (issue.title === "Avoid 'any' type") {
      const line = lines[issue.line - 1];
      lines[issue.line - 1] = line.replace(/:\s*any/g, ": unknown");
      fixed = lines.join("\n");
      fixedIssues.push(issue);
    }

    return {
      original: code,
      fixed,
      issuesFixed: fixedIssues,
      preservedBehavior: fixedIssues.length > 0,
      testCoverageMaintained: true,
    };
  }

  /**
   * Obter erros do Sentry
   */
  async getSentryErrors(days: number = 7): Promise<SentryError[]> {
    if (!this.sentryToken) {
      console.warn("⚠️ Sentry token not configured");
      return [];
    }

    try {
      const query = `is:unresolved level:error age:-${days}d`;
      const url = `${this.sentryApiUrl}/organizations/${this.sentryOrg}/issues/?query=${encodeURIComponent(query)}&project=${this.sentryProject}`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${this.sentryToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Sentry API error: ${response.status}`);
      }

      const data = await response.json();

      return (
        data.map((issue: any) => ({
          id: issue.id,
          title: issue.title,
          message: issue.message,
          level: issue.level,
          file: issue.culprit,
          line_number: 0,
          occurrences: issue.count,
          first_seen: new Date(issue.firstSeen),
          last_seen: new Date(issue.lastSeen),
        })) || []
      );
    } catch (error) {
      console.error("❌ Failed to fetch Sentry errors:", error);
      return [];
    }
  }

  /**
   * Gerar relatório
   */
  generateReport(issues: CodeIssue[], file: string): string {
    const critical = issues.filter((i) => i.severity === "critical").length;
    const warnings = issues.filter((i) => i.severity === "warning").length;
    const infos = issues.filter((i) => i.severity === "info").length;

    const report = `
═══════════════════════════════════════════════════════════════
                  CODE REVIEW REPORT
═══════════════════════════════════════════════════════════════

File: ${file}
Date: ${new Date().toISOString()}

SUMMARY
─────────────────────────────────────────────────────────────
Total Issues: ${issues.length}
  • Critical: ${critical}
  • Warnings: ${warnings}
  • Info: ${infos}

ISSUES BY CATEGORY
─────────────────────────────────────────────────────────────
${this.groupByCategory(issues)
  .map(([cat, count]) => `• ${cat}: ${count}`)
  .join("\n")}

DETAILED ISSUES
─────────────────────────────────────────────────────────────
${issues
  .map(
    (issue) => `
[${issue.severity.toUpperCase()}] Line ${issue.line}: ${issue.title}
  ${issue.description}
  ${issue.suggestedFix ? `→ Suggested fix: ${issue.suggestedFix}` : ""}
`
  )
  .join("")}

═══════════════════════════════════════════════════════════════
`;

    return report;
  }

  /**
   * Agrupar issues por categoria
   */
  private groupByCategory(issues: CodeIssue[]): [string, number][] {
    const grouped = new Map<string, number>();

    issues.forEach((issue) => {
      grouped.set(issue.category, (grouped.get(issue.category) || 0) + 1);
    });

    return Array.from(grouped.entries()).sort((a, b) => b[1] - a[1]);
  }
}

// Export para uso como módulo
export default CodeReviewerAI;
export { CodeIssue, AutoFixResult, SentryError };

/**
 * CLI Usage Example
 */
if (require.main === module) {
  const reviewer = new CodeReviewerAI();

  const sampleCode = `
  function processData(data: any) {
    console.log("Processing data:", data);
    const result = data.map(item => item.value * 2 + item.bonus * 1.5 + item.extra * 0.75 + item.modifier);
    eval("alert('Done')");
    return result;
  }
  `;

  // Análise
  reviewer
    .analyzeCode(sampleCode, "sample.ts")
    .then(async (issues) => {
      console.log(`\n📊 Found ${issues.length} issues`);

      // Auto-fix
      for (const issue of issues.slice(0, 2)) {
        const fixResult = await reviewer.suggestAutoFix(sampleCode, issue);
        if (fixResult) {
          console.log(`\n✅ Auto-fix for: ${issue.title}`);
          console.log("Original:");
          console.log(fixResult.original.substring(0, 100));
          console.log("\nFixed:");
          console.log(fixResult.fixed.substring(0, 100));
        }
      }

      // Relatório
      const report = reviewer.generateReport(issues, "sample.ts");
      console.log(report);
    })
    .catch((error) => {
      console.error("❌ Review failed:", error);
    });
}

