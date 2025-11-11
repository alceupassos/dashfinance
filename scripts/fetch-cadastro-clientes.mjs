import fs from 'fs';
import path from 'path';

const root = process.cwd();
const sources = [
  path.resolve(root, 'sua.txt'),
  path.resolve(root, 'DB2.txt')
];

let content = '';
for (const file of sources) {
  if (fs.existsSync(file)) {
    const data = fs.readFileSync(file, 'utf8');
    if (/service_rolesecret/i.test(data) || /Service_role/i.test(data)) {
      content = data;
      break;
    }
  }
}

if (!content) {
  throw new Error('Não foi possível localizar credenciais em sua.txt ou DB2.txt');
}

function extract(regex, label) {
  const match = content.match(regex);
  if (!match) {
    throw new Error(`Não foi possível localizar ${label}`);
  }
  return match[1].trim();
}

const projectUrl = extract(/Project URL\s*=\s*(https:\/\/[^\s]+)/i, 'Project URL');
const serviceRole = extract(/service_rolesecret\s*=\s*(\S+)/i, 'service role');

const restBase = projectUrl.replace(/\/$/, '') + '/rest/v1';
const targetPath = path.resolve(root, 'tmp/cadastro_clientes.json');

console.log('→ Baixando registros de clientes a partir de', restBase);
const response = await fetch(`${restBase}/clientes?select=*`, {
  headers: {
    apikey: serviceRole,
    Authorization: `Bearer ${serviceRole}`,
    Accept: 'application/json',
    Prefer: 'count=exact'
  }
});

if (!response.ok) {
  const text = await response.text();
  throw new Error(`Falha ao buscar clientes: ${response.status} ${response.statusText} — ${text}`);
}

const data = await response.json();
console.log(`→ Recebidos ${data.length} registros.`);

fs.writeFileSync(targetPath, JSON.stringify(data, null, 2));
console.log('→ Arquivo salvo em', targetPath);
