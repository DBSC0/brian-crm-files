const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// ============================================================
// CONFIGURACIÓN — cambiar estos valores con tu usuario/repo
// ============================================================
const GITHUB_USER   = 'DBSC0';
const GITHUB_REPO   = 'brian-crm-files';
const GITHUB_BRANCH = 'main';
// ============================================================

const RAW_BASE = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/${GITHUB_BRANCH}`;

const CONTENT_FILES = [
  'index.html',
  'components/supabase-client.js',
  'components/Layout.jsx',
  'components/StatusBadge.jsx',
  'components/UI.jsx',
  'screens/CajaMora.jsx',
  'screens/Clientes.jsx',
  'screens/Configuracion.jsx',
  'screens/CuotasPagosRecibos.jsx',
  'screens/Dashboard.jsx',
  'screens/ImportarDatos.jsx',
  'screens/Operaciones.jsx',
  'screens/Reportes.jsx',
  'screens/Tarjetas.jsx',
  'data/helpers.js',
  'data/mockData.js',
  'version.txt',
];

function fetchText(url, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { headers: { 'User-Agent': 'BrianCRM-Updater/1.0' } }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} para ${url}`));
        return;
      }
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`Timeout al descargar ${url}`));
    });
  });
}

function fetchBinary(url, destPath, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { headers: { 'User-Agent': 'BrianCRM-Updater/1.0' } }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} para ${url}`));
        return;
      }
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      const file = fs.createWriteStream(destPath);
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
      file.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`Timeout al descargar ${url}`));
    });
  });
}

function readLocalVersion(cacheDir) {
  const versionPath = path.join(cacheDir, 'version.txt');
  if (!fs.existsSync(versionPath)) return '0';
  return fs.readFileSync(versionPath, 'utf-8').trim();
}

async function checkAndUpdate(cacheDir) {
  // Si no está configurado el repo, salir silenciosamente
  if (!GITHUB_USER || GITHUB_USER === 'TU_USUARIO_GITHUB') {
    console.log('[updater] GitHub no configurado, salteando actualizaciones.');
    return false;
  }

  let remoteVersion;
  try {
    remoteVersion = (await fetchText(`${RAW_BASE}/version.txt`)).trim();
  } catch (err) {
    console.warn('[updater] No se pudo verificar actualizaciones:', err.message);
    return false;
  }

  const localVersion = readLocalVersion(cacheDir);
  console.log(`[updater] Local: ${localVersion} | Remoto: ${remoteVersion}`);

  if (remoteVersion <= localVersion) {
    console.log('[updater] Ya está actualizado.');
    return false;
  }

  console.log('[updater] Hay una actualización disponible, descargando...');

  // Descargar a directorio temporal para evitar estado inconsistente
  const tmpDir = path.join(cacheDir, '_tmp_update');
  if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true });
  fs.mkdirSync(tmpDir, { recursive: true });

  try {
    for (const file of CONTENT_FILES) {
      const url = `${RAW_BASE}/${file.replace(/ /g, '%20')}`;
      const dest = path.join(tmpDir, file);
      console.log(`[updater] Descargando: ${file}`);
      await fetchBinary(url, dest);
      // Pequeña pausa para no saturar GitHub
      await new Promise(r => setTimeout(r, 80));
    }
  } catch (err) {
    console.error('[updater] Falló la descarga, abortando update:', err.message);
    fs.rmSync(tmpDir, { recursive: true, force: true });
    return false;
  }

  // Todos los archivos descargados exitosamente → mover al caché
  if (fs.existsSync(cacheDir)) {
    // Eliminar archivos anteriores del caché (no el tmp)
    for (const entry of fs.readdirSync(cacheDir)) {
      if (entry === '_tmp_update') continue;
      fs.rmSync(path.join(cacheDir, entry), { recursive: true, force: true });
    }
  }

  // Mover archivos del tmp al caché
  for (const entry of fs.readdirSync(tmpDir)) {
    fs.renameSync(path.join(tmpDir, entry), path.join(cacheDir, entry));
  }
  fs.rmSync(tmpDir, { recursive: true, force: true });

  console.log(`[updater] Actualización aplicada: ${remoteVersion}`);
  return true;
}

module.exports = { checkAndUpdate };
