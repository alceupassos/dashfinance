#!/usr/bin/env node

/**
 * Importa e sincroniza clientes F360 a partir do CSV `CLIENTES_F360_com_TOKEN.csv`.
 *
 * Requisitos:
 *  - Variáveis de ambiente:
 *      SUPABASE_URL (ex.: https://xzrmzmcoslomtzkzgskn.supabase.co)
 *      SUPABASE_SERVICE_ROLE_KEY
 *      APP_KMS  (mesma chave utilizada pelas edge functions)
 *
 *  - CSV no formato:
 *      Nome;CNPJ;Token
 *
 * A rotina executa, para cada linha:
 *  1. Atualiza/insera o registro em `public.clientes`
 *  2. Criptografa e armazena o token em `public.integration_f360`
 */

import fs from "fs";
import path from "path";

const ROOT = process.cwd();

const args = process.argv.slice(2);
const fileArg = args.find((arg) => !arg.startsWith("--"));
const dryRun = args.includes("--dry-run");

const csvPath = path.resolve(ROOT, fileArg ?? "CLIENTES_F360_com_TOKEN.csv");
const supabaseUrl = process.env.SUPABASE_URL ?? "https://xzrmzmcoslomtzkzgskn.supabase.co";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE;
const kmsKey = process.env.APP_KMS;

if (!serviceRoleKey) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY não definido. Exporte a variável antes de executar.");
  process.exit(1);
}

if (!kmsKey && !dryRun) {
  console.error("❌ APP_KMS não definido. Exporte a variável com a chave de criptografia.");
  process.exit(1);
}

if (!fs.existsSync(csvPath)) {
  console.error(`❌ Arquivo CSV não encontrado: ${csvPath}`);
  process.exit(1);
}

function sanitizeCnpj(value) {
  return value?.replace(/[^0-9]/g, "") ?? "";
}

function normalizeName(value) {
  return value?.trim() ?? "";
}

function parseCsv(content) {
  const lines = content.replace(/\r/g, "").split("\n").filter((line) => line.trim().length > 0);
  if (lines.length < 2) {
    return [];
  }

  const header = lines[0].split(";");
  if (header.length < 3) {
    throw new Error("CSV inválido: cabeçalho deve conter pelo menos três colunas (Nome;CNPJ;Token).");
  }

  const result = [];
  for (let i = 1; i < lines.length; i += 1) {
    const raw = lines[i].split(";");
    if (raw.length < 3) {
      console.warn(`⚠️  Linha ${i + 1} ignorada: formato inesperado.`);
      continue;
    }
    const [name, cnpj, token] = raw;
    const normalizedName = normalizeName(name);
    const cleanedCnpj = sanitizeCnpj(cnpj);
    const cleanedToken = normalizeName(token);

    if (!normalizedName || !cleanedCnpj || !cleanedToken) {
      console.warn(`⚠️  Linha ${i + 1} ignorada: Nome/CNPJ/Token ausentes.`);
      continue;
    }

    result.push({
      name: normalizedName,
      cnpj: cleanedCnpj,
      token: cleanedToken
    });
  }

  return result;
}

async function callRpc(functionName, payload) {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${functionName}`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "tx=commit"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`RPC ${functionName} falhou (${response.status} ${response.statusText}) → ${text}`);
  }

  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text.replace(/"/g, "").trim();
  }
}

function groupByToken(entries) {
  const map = new Map();
  for (const item of entries) {
    const bucket = map.get(item.token) ?? [];
    bucket.push(item);
    map.set(item.token, bucket);
  }
  return map;
}

async function main() {
  const csvContent = fs.readFileSync(csvPath, "utf8");
  const entries = parseCsv(csvContent);

  if (entries.length === 0) {
    console.error("❌ CSV sem registros válidos.");
    process.exit(1);
  }

  const uniqueKeyed = new Map();
  for (const entry of entries) {
    const key = `${entry.name}|${entry.cnpj}`;
    if (uniqueKeyed.has(key)) {
      console.warn(`⚠️  Registo duplicado detectado para ${entry.name} (${entry.cnpj}). Mantendo a primeira ocorrência.`);
      continue;
    }
    uniqueKeyed.set(key, entry);
  }

  const dedupedEntries = [...uniqueKeyed.values()];

  console.log(`📥 Registros totais no CSV: ${entries.length}`);
  console.log(`📦 Registros após deduplicação: ${dedupedEntries.length}`);
  if (dryRun) {
    console.log("🛈 Modo dry-run: nenhum dado será enviado ao Supabase.");
  }

  const stats = {
    processed: 0,
    clientesUpdated: 0,
    integrationsUpserted: 0,
    failures: []
  };

  for (const entry of dedupedEntries) {
    stats.processed += 1;
    const context = `${entry.name} (CNPJ: ${entry.cnpj})`;

    try {
      if (!dryRun) {
        const clienteId = await callRpc("sync_cliente_identifiers_from_csv", {
          _cliente_nome: entry.name,
          _cnpj: entry.cnpj,
          _token: entry.token,
          _token_status: "ativo"
        });

        if (!clienteId) {
          throw new Error("RPC sync_cliente_identifiers_from_csv retornou resposta vazia.");
        }
        stats.clientesUpdated += 1;

        const integrationId = await callRpc("upsert_integration_f360_company", {
          _cliente_nome: entry.name,
          _cnpj: entry.cnpj,
          _token: entry.token,
          _kms: kmsKey
        });

        if (!integrationId) {
          throw new Error("RPC upsert_integration_f360_company retornou resposta vazia.");
        }

        stats.integrationsUpserted += 1;
      }

      console.log(`✅ ${context} sincronizado.`);
    } catch (error) {
      stats.failures.push({ entry, error: error.message });
      console.error(`❌ Falha ao sincronizar ${context}: ${error.message}`);
    }
  }

  const grouped = groupByToken(dedupedEntries);
  console.log("\n📊 Resumo por token:");
  for (const [token, companies] of grouped.entries()) {
    console.log(`  • ${token}: ${companies.length} empresa(s)`);
  }

  console.log("\n✅ Processados:", stats.processed);
  console.log("   ↳ Clientes atualizados:", stats.clientesUpdated);
  console.log("   ↳ Integrações atualizadas:", stats.integrationsUpserted);
  console.log("   ↳ Falhas:", stats.failures.length);

  if (stats.failures.length > 0) {
    console.log("\n❗ Falhas detalhadas:");
    stats.failures.forEach((failure) => {
      console.log(`  - ${failure.entry.name} (${failure.entry.cnpj}): ${failure.error}`);
    });
  }
}

main().catch((error) => {
  console.error("❌ Erro inesperado:", error);
  process.exit(1);
});

