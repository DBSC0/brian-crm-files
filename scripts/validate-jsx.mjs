import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let ts;
try {
  ts = require('typescript');
} catch (err) {
  console.error('typescript no esta disponible. Ejecuta npm install antes de validar JSX.');
  process.exit(1);
}

const ROOT = process.cwd();
const JSX_DIRS = ['components', 'screens'];
const PLAIN_JS_FILES = [
  'core/finance.js',
  'core/data-store.js',
  'electron/main.js',
  'electron/updater.js',
  'electron/preload.js',
];

function walk(dir, predicate) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full, predicate);
    return predicate(full) ? [full] : [];
  });
}

function transpileJSX(label, source) {
  const fileName = /\.(jsx|tsx)$/i.test(label) ? label : `${label}.tsx`;
  const result = ts.transpileModule(source, {
    fileName,
    compilerOptions: {
      jsx: ts.JsxEmit.React,
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.None,
      allowJs: true,
      checkJs: false,
    },
    reportDiagnostics: true,
  });

  const errors = (result.diagnostics || []).filter((diag) => diag.category === ts.DiagnosticCategory.Error);
  if (errors.length) {
    const formatted = ts.formatDiagnosticsWithColorAndContext(errors, {
      getCanonicalFileName: (f) => f,
      getCurrentDirectory: () => ROOT,
      getNewLine: () => '\n',
    });
    throw new Error(`${label}\n${formatted}`);
  }
}

function validatePlainJS(file) {
  const abs = path.join(ROOT, file);
  if (!fs.existsSync(abs)) return;
  const source = fs.readFileSync(abs, 'utf8');
  new vm.Script(source, { filename: file });
}

function extractInlineBabelScripts(html) {
  const scripts = [];
  const re = /<script\b(?=[^>]*type=["']text\/babel["'])(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = re.exec(html))) scripts.push(match[1]);
  return scripts;
}

const jsxFiles = JSX_DIRS.flatMap((dir) => walk(path.join(ROOT, dir), (file) => file.endsWith('.jsx')));
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const inlineScripts = extractInlineBabelScripts(html);

try {
  jsxFiles.forEach((file) => transpileJSX(path.relative(ROOT, file), fs.readFileSync(file, 'utf8')));
  inlineScripts.forEach((source, idx) => transpileJSX(`index.html inline text/babel #${idx + 1}`, source));
  PLAIN_JS_FILES.forEach(validatePlainJS);
  console.log(`JSX/HTML validation OK (${jsxFiles.length} JSX files, ${inlineScripts.length} inline scripts).`);
} catch (err) {
  console.error(err.message || err);
  process.exit(1);
}
