#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function getRepoRoot() {
  try {
    return execSync('git rev-parse --show-toplevel', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch (error) {
    return null;
  }
}

const repoRoot = getRepoRoot();
const hooksDir = repoRoot ? path.join(repoRoot, '.git', 'hooks') : null;
const preCommitHook = hooksDir ? path.join(hooksDir, 'pre-commit') : null;

if (!hooksDir || !fs.existsSync(hooksDir)) {
  console.log('⚠️  Diretório .git/hooks não encontrado. Pulando configuração de hooks.');
  process.exit(0);
}

const hookContent = `#!/bin/bash
# Pre-commit hook: executa verificações completas do frontend antes de commitar

REPO_ROOT=$(git rev-parse --show-toplevel)
FRONTEND_DIR="\${REPO_ROOT}/finance-oraculo-frontend"

if [ ! -d "\${FRONTEND_DIR}" ]; then
  echo "⚠️  Diretório finance-oraculo-frontend não encontrado. Pulando verificações."
  exit 0
fi

if git diff --cached --name-only | grep -q "^finance-oraculo-frontend/"; then
  echo "🔒 Mudanças detectadas no frontend. Executando verificações de segurança..."
  cd "\${FRONTEND_DIR}" || exit 0

  if [ -f "./scripts/pre-commit-check.sh" ]; then
    ./scripts/pre-commit-check.sh
  else
    npm run security:all
  fi

  if [ $? -ne 0 ]; then
    echo ""
    echo "❌ VERIFICAÇÕES FALHARAM! Commit cancelado."
    echo "💡 Execute 'cd finance-oraculo-frontend && npm run precommit' para ver detalhes."
    exit 1
  fi

  echo "✅ Todas as verificações passaram! Prosseguindo com o commit..."
fi

exit 0
`;

try {
  fs.writeFileSync(preCommitHook, hookContent);
  fs.chmodSync(preCommitHook, 0o755);
  console.log('✅ Pre-commit hook configurado com sucesso!');
} catch (error) {
  console.error('⚠️  Erro ao configurar pre-commit hook:', error.message);
  process.exit(0);
}

