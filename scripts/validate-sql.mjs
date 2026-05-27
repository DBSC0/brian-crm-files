import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const MIGRATIONS_DIR = path.join(ROOT, 'supabase', 'migrations');

const bannedPatterns = [
  { re: /\bDROP\s+TABLE\b/i, message: 'DROP TABLE requiere revision manual explicita' },
  { re: /\bTRUNCATE\b/i, message: 'TRUNCATE requiere revision manual explicita' },
  { re: /\bDELETE\s+FROM\b(?![\s\S]*\bWHERE\b)/i, message: 'DELETE FROM sin WHERE requiere revision manual explicita' },
];

function listSqlFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listSqlFiles(full);
    return entry.name.endsWith('.sql') ? [full] : [];
  });
}

const files = listSqlFiles(MIGRATIONS_DIR);
const errors = [];
const warnings = [];

for (const file of files) {
  const rel = path.relative(ROOT, file);
  const sql = fs.readFileSync(file, 'utf8');
  if (!/^\d{8,}_.+\.sql$/.test(path.basename(file))) {
    errors.push(`${rel}: el nombre deberia empezar con fecha/secuencia, ej. 20260526_descripcion.sql`);
  }
  for (const pattern of bannedPatterns) {
    if (pattern.re.test(sql)) errors.push(`${rel}: ${pattern.message}`);
  }
  if (/\bALTER\s+TABLE\b/i.test(sql) && !/\bIF\s+(?:NOT\s+)?EXISTS\b/i.test(sql)) {
    warnings.push(`${rel}: ALTER TABLE sin IF EXISTS/IF NOT EXISTS detectado`);
  }
  if (/\bCREATE\s+TABLE\b/i.test(sql) && !/\bIF\s+NOT\s+EXISTS\b/i.test(sql)) {
    warnings.push(`${rel}: CREATE TABLE sin IF NOT EXISTS detectado`);
  }
}

if (errors.length) {
  console.error('SQL validation failed:\n' + errors.map((e) => `- ${e}`).join('\n'));
  process.exit(1);
}

if (warnings.length) {
  console.warn('SQL validation warnings:\n' + warnings.map((e) => `- ${e}`).join('\n'));
}

console.log(`SQL validation OK (${files.length} migration files).`);
