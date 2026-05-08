const http = require('http');
const fs   = require('fs');
const path = require('path');
const url  = require('url');

const PORT        = process.env.PORT || 3000;
const PASTA_WEB   = path.join(__dirname, '..');
const ARQUIVO_RES = path.join(__dirname, '../data/resultados.json');
const ARQUIVO_BANCO = path.join(__dirname, '../data/question_bank.json');

if (!fs.existsSync(ARQUIVO_RES)) fs.writeFileSync(ARQUIVO_RES, '[]', 'utf8');

function lerResultados() { try { return JSON.parse(fs.readFileSync(ARQUIVO_RES,'utf8')); } catch { return []; } }
function salvarResultados(d) { fs.writeFileSync(ARQUIVO_RES, JSON.stringify(d,null,2),'utf8'); }

function tipoMime(ext) {
  const t={'.html':'text/html','.css':'text/css','.js':'application/javascript','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.svg':'image/svg+xml','.ico':'image/x-icon','.mp3':'audio/mpeg','.wav':'audio/wav'};
  return t[ext]||'application/octet-stream';
}

function lerBody(req) {
  return new Promise((res,rej)=>{
    let b=''; req.on('data',c=>b+=c); req.on('end',()=>res(b)); req.on('error',rej);
  });
}

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const rota   = parsed.pathname;

  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if (req.method==='OPTIONS') { res.writeHead(204); res.end(); return; }

  // POST /api/resultado
  if (rota==='/api/resultado' && req.method==='POST') {
    const body = await lerBody(req);
    try {
      const lista=lerResultados(); lista.push(JSON.parse(body)); salvarResultados(lista);
      res.writeHead(200,{'Content-Type':'application/json'}); res.end(JSON.stringify({ok:true}));
    } catch { res.writeHead(400); res.end('Erro'); }
    return;
  }

  // GET /api/resultados
  if (rota==='/api/resultados' && req.method==='GET') {
    res.writeHead(200,{'Content-Type':'application/json'});
    res.end(JSON.stringify(lerResultados()));
    return;
  }

  // POST /api/banco — salva question_bank.json
  if (rota==='/api/banco' && req.method==='POST') {
    const body = await lerBody(req);
    try {
      fs.writeFileSync(ARQUIVO_BANCO, JSON.stringify(JSON.parse(body),null,2),'utf8');
      res.writeHead(200,{'Content-Type':'application/json'}); res.end(JSON.stringify({ok:true}));
    } catch { res.writeHead(400); res.end('Erro ao salvar banco'); }
    return;
  }

  // Arquivos estáticos
  let filePath = path.join(PASTA_WEB, rota==='/'?'index.html':rota);
  if (!filePath.startsWith(PASTA_WEB)) { res.writeHead(403); res.end('Proibido'); return; }

  fs.stat(filePath, (err,stat) => {
    if (err||!stat.isFile()) {
      const ext=path.extname(filePath);
      if (ext&&ext!=='.html') { res.writeHead(404); res.end('Não encontrado'); return; }
      filePath=path.join(PASTA_WEB,'index.html');
    }
    fs.readFile(filePath,(err2,data)=>{
      if(err2){res.writeHead(404);res.end('Não encontrado');return;}
      res.writeHead(200,{'Content-Type':tipoMime(path.extname(filePath))});
      res.end(data);
    });
  });
});

server.listen(PORT, () => console.log(`[Missão Saber] Servidor rodando em http://localhost:${PORT}`));