const http = require('http');
const fs   = require('fs');
const path = require('path');
const url  = require('url');

const PORT         = 3000;
const PASTA_WEB    = path.join(__dirname, '..');
const ARQUIVO_RES  = path.join(__dirname, '../data/resultados.json');

// Garante que o arquivo de resultados existe
if (!fs.existsSync(ARQUIVO_RES)) {
  fs.writeFileSync(ARQUIVO_RES, '[]', 'utf8');
}

function lerResultados() {
  try { return JSON.parse(fs.readFileSync(ARQUIVO_RES, 'utf8')); }
  catch { return []; }
}

function salvarResultados(dados) {
  fs.writeFileSync(ARQUIVO_RES, JSON.stringify(dados, null, 2), 'utf8');
}

function tipoMime(ext) {
  const tipos = {
    '.html': 'text/html',
    '.css':  'text/css',
    '.js':   'application/javascript',
    '.json': 'application/json',
    '.png':  'image/png',
    '.jpg':  'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif':  'image/gif',
    '.svg':  'image/svg+xml',
    '.ico':  'image/x-icon',
    '.mp3':  'audio/mpeg',
    '.wav':  'audio/wav',
  };
  return tipos[ext] || 'application/octet-stream';
}

const server = http.createServer((req, res) => {
  const parsed  = url.parse(req.url, true);
  const rotaUrl = parsed.pathname;

  // ── CORS ──
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // ── API: POST /api/resultado ──
  if (rotaUrl === '/api/resultado' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const dados = JSON.parse(body);
        const lista = lerResultados();
        lista.push(dados);
        salvarResultados(lista);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(400); res.end('Erro ao salvar');
      }
    });
    return;
  }

  // ── API: GET /api/resultados ──
  if (rotaUrl === '/api/resultados' && req.method === 'GET') {
    const lista = lerResultados();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(lista));
    return;
  }

  // ── Arquivos estáticos ──
  let filePath = path.join(PASTA_WEB, rotaUrl === '/' ? 'index.html' : rotaUrl);

  // Segurança: impede path traversal
  if (!filePath.startsWith(PASTA_WEB)) {
    res.writeHead(403); res.end('Proibido'); return;
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      // Só faz fallback pra index.html se não for um asset
      const ext = path.extname(filePath);
      if (ext && ext !== '.html') {
        res.writeHead(404); res.end('Não encontrado'); return;
      }
      filePath = path.join(PASTA_WEB, 'index.html');
    }
    fs.readFile(filePath, (err2, data) => {
      if (err2) { res.writeHead(404); res.end('Não encontrado'); return; }
      const ext = path.extname(filePath);
      res.writeHead(200, { 'Content-Type': tipoMime(ext) });
      res.end(data);
    });
  });
});

server.listen(PORT, () => {
  console.log(`[Missão Saber] Servidor rodando em http://localhost:${PORT}`);
});
