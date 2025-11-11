import fs from 'fs';
import path from 'path';

const root = process.cwd();
const content = fs.readFileSync(path.resolve(root, 'sua.txt'), 'utf8');
const projectUrl = (content.match(/Project URL=\s*(https:\/\/[^\s]+)/i) || [])[1];
const serviceRole = (content.match(/service_rolesecret=\s*(\S+)/i) || [])[1];

if (!projectUrl || !serviceRole) {
  throw new Error('Credenciais não encontradas em sua.txt');
}

const restBase = projectUrl.replace(/\/$/, '') + '/rest/v1';

const endpoint = process.argv[2];
if (!endpoint) {
  throw new Error('Informe o endpoint REST após o script. Ex: node query-cadastro.mjs "clientes?select=id"');
}

const url = `${restBase}/${endpoint}`;
console.log('→ GET', url);

const response = await fetch(url, {
  headers: {
    apikey: serviceRole,
    Authorization: `Bearer ${serviceRole}`,
    Accept: 'application/json'
  }
});

const text = await response.text();
console.log(text);
