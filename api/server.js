require('dotenv').config();
const http    = require('http');
const path    = require('path');
const url     = require('url');
const bcrypt  = require('bcrypt');
const { Pool } = require('pg');

const SALT_ROUNDS = 10;

const PORT     = process.env.PORT || 3000;
const PASTA_WEB = path.join(__dirname, '..');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

pool.connect()
  .then(() => console.log('[Missão Saber] PostgreSQL conectado'))
  .catch(e => console.error('[Missão Saber] Erro ao conectar PostgreSQL:', e.message));

function lerBody(req) {
  return new Promise((res, rej) => {
    let b = ''; req.on('data', c => b += c); req.on('end', () => res(b)); req.on('error', rej);
  });
}

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function erro(res, status, msg) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ ok: false, erro: msg }));
}

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const rota   = parsed.pathname;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  try {

    // ── ACESSOS ──────────────────────────────────────────────────────────────

    if (rota === '/api/acesso' && req.method === 'POST') {
      const body = JSON.parse(await lerBody(req));
      await pool.query(
        'INSERT INTO acessos (tipo, user_agent) VALUES ($1, $2)',
        [body.tipo, body.userAgent || null]
      );
      return json(res, 200, { ok: true });
    }

    // ── PROFESSORES ──────────────────────────────────────────────────────────

    if (rota === '/api/professor/login' && req.method === 'POST') {
      const { usuario, senha } = JSON.parse(await lerBody(req));
      const r = await pool.query(
        'SELECT id, nome, usuario, senha, is_admin FROM professores WHERE usuario=$1 and ativo = true',
        [usuario]
      );
      if (!r.rows.length) return erro(res, 401, 'Usuário ou senha incorretos');
      const senhaValida = await bcrypt.compare(senha, r.rows[0].senha);
      if (!senhaValida) return erro(res, 401, 'Usuário ou senha incorretos');
      const { senha: _, ...professor } = r.rows[0]; // remove senha do retorno
      return json(res, 200, { ok: true, professor });
    }

    if (rota === '/api/professores' && req.method === 'GET') {
      const r = await pool.query(
        'SELECT id, nome, usuario, is_admin FROM professores WHERE is_admin=false and ativo = true ORDER BY nome'
      );
      return json(res, 200, r.rows);
    }

    if (rota === '/api/professores' && req.method === 'POST') {
      const { nome, usuario, senha } = JSON.parse(await lerBody(req));
      if (!nome || !usuario || !senha) return erro(res, 400, 'Preencha todos os campos');
      const existe = await pool.query('SELECT id FROM professores WHERE usuario=$1', [usuario]);
      if (existe.rows.length) return erro(res, 409, 'Usuário já existe');
      const hash = await bcrypt.hash(senha, SALT_ROUNDS);
      const r = await pool.query(
        'INSERT INTO professores (nome, usuario, senha) VALUES ($1,$2,$3) RETURNING id, nome, usuario',
        [nome, usuario, hash]
      );
      return json(res, 201, { ok: true, professor: r.rows[0] });
    }

    if (rota.startsWith('/api/professores/') && req.method === 'DELETE') {
      const id = rota.split('/api/professores/')[1];
      await pool.query('UPDATE professores SET ativo=false WHERE id=$1 AND is_admin=false and ativo=true', [id]);
      return json(res, 200, { ok: true });
    }

    // ── TURMAS ───────────────────────────────────────────────────────────────

    if (rota === '/api/turmas' && req.method === 'GET') {
      const professor_id = parsed.query.professor_id;
      const r = await pool.query(
        'SELECT id, codigo, nome, total_alunos FROM turmas WHERE professor_id=$1 ORDER BY criado_em',
        [professor_id]
      );
      return json(res, 200, r.rows);
    }

    if (rota === '/api/turmas' && req.method === 'POST') {
      const { codigo, nome, professor_id, total_alunos } = JSON.parse(await lerBody(req));
      const dup = await pool.query(
        'SELECT id FROM turmas WHERE professor_id=$1 AND LOWER(nome)=LOWER($2)',
        [professor_id, nome]
      );
      if (dup.rows.length) return erro(res, 409, 'Já existe uma turma com esse nome');
      const r = await pool.query(
        'INSERT INTO turmas (codigo, nome, professor_id, total_alunos) VALUES ($1,$2,$3,$4) RETURNING id, codigo, nome',
        [codigo, nome, professor_id, total_alunos || null]
      );
      return json(res, 201, { ok: true, turma: r.rows[0] });
    }

    if (rota.startsWith('/api/turmas/') && !rota.includes('/questoes') && req.method === 'DELETE') {
      const id = rota.split('/api/turmas/')[1];
      await pool.query('DELETE FROM turmas WHERE id=$1', [id]);
      return json(res, 200, { ok: true });
    }

    if (rota.startsWith('/api/turma/') && req.method === 'GET') {
      const codigo = decodeURIComponent(rota.split('/api/turma/')[1]);
      const r = await pool.query('SELECT id, codigo, nome FROM turmas WHERE codigo=$1', [codigo]);
      if (!r.rows.length) return erro(res, 404, 'Turma não encontrada');
      return json(res, 200, r.rows[0]);
    }

    // ── QUESTÕES ─────────────────────────────────────────────────────────────

    // GET /api/turmas/:id/questoes
    if (rota.match(/^\/api\/turmas\/\d+\/questoes$/) && req.method === 'GET') {
      const turma_id = rota.split('/')[3];
      const category = parsed.query.category;
      const q = category
        ? 'SELECT * FROM questoes WHERE turma_id=$1 AND category=$2 ORDER BY criado_em'
        : 'SELECT * FROM questoes WHERE turma_id=$1 ORDER BY criado_em';
      const params = category ? [turma_id, category] : [turma_id];
      const r = await pool.query(q, params);
      return json(res, 200, r.rows);
    }

    // POST /api/turmas/:id/questoes
    if (rota.match(/^\/api\/turmas\/\d+\/questoes$/) && req.method === 'POST') {
      const turma_id = rota.split('/')[3];
      const { category, text, answers, correct_index, image_url } = JSON.parse(await lerBody(req));
      const count = await pool.query(
        'SELECT COUNT(*) FROM questoes WHERE turma_id=$1 AND category=$2',
        [turma_id, category]
      );
      if (parseInt(count.rows[0].count) >= 10)
        return erro(res, 400, 'Máximo de 10 questões por matéria');
      const r = await pool.query(
        'INSERT INTO questoes (turma_id, category, text, answers, correct_index, image_url) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
        [turma_id, category, text, JSON.stringify(answers), correct_index, image_url || null]
      );
      return json(res, 201, { ok: true, questao: r.rows[0] });
    }

    // PUT /api/questoes/:id
    if (rota.match(/^\/api\/questoes\/\d+$/) && req.method === 'PUT') {
      const id = rota.split('/')[3];
      const { text, answers, correct_index, image_url } = JSON.parse(await lerBody(req));
      const r = await pool.query(
        'UPDATE questoes SET text=$1, answers=$2, correct_index=$3, image_url=$4 WHERE id=$5 RETURNING *',
        [text, JSON.stringify(answers), correct_index, image_url || null, id]
      );
      return json(res, 200, { ok: true, questao: r.rows[0] });
    }

    // DELETE /api/questoes/:id
    if (rota.match(/^\/api\/questoes\/\d+$/) && req.method === 'DELETE') {
      const id = rota.split('/')[3];
      await pool.query('DELETE FROM questoes WHERE id=$1', [id]);
      return json(res, 200, { ok: true });
    }

    // DELETE /api/questoes em massa
    if (rota === '/api/questoes' && req.method === 'DELETE') {
      const { ids } = JSON.parse(await lerBody(req));
      await pool.query('DELETE FROM questoes WHERE id = ANY($1)', [ids]);
      return json(res, 200, { ok: true });
    }

    // ── BANCO GLOBAL ─────────────────────────────────────────────────────────

    if (rota === '/api/banco' && req.method === 'GET') {
      const category = parsed.query.category;
      const q = category
        ? 'SELECT * FROM banco_questoes WHERE category=$1 ORDER BY id'
        : 'SELECT * FROM banco_questoes ORDER BY id';
      const params = category ? [category] : [];
      const r = await pool.query(q, params);
      return json(res, 200, r.rows);
    }

    // ── ALUNOS ───────────────────────────────────────────────────────────────

    if (rota === '/api/aluno' && req.method === 'POST') {
      const { nome, sobrenome, turma_codigo } = JSON.parse(await lerBody(req));
      const t = await pool.query('SELECT id FROM turmas WHERE codigo=$1', [turma_codigo]);
      if (!t.rows.length) return erro(res, 404, 'Turma não encontrada');
      const turma_id = t.rows[0].id;
      const r = await pool.query(
        `INSERT INTO alunos (nome, sobrenome, turma_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (nome, sobrenome, turma_id) DO UPDATE SET turma_id=EXCLUDED.turma_id
         RETURNING id`,
        [nome, sobrenome, turma_id]
      );
      return json(res, 200, { ok: true, aluno_id: r.rows[0].id, turma_id });
    }

    // ── RESULTADOS ───────────────────────────────────────────────────────────

    if (rota === '/api/resultado' && req.method === 'POST') {
      const body = JSON.parse(await lerBody(req));
      const { nome, sobrenome, turma_codigo, turma_id, aluno_id, mundo, nota, acertos, total } = body;
      await pool.query(
        `INSERT INTO resultados
           (aluno_id, nome_aluno, sobrenome_aluno, turma_id, turma_codigo, mundo, nota, acertos, total)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [aluno_id || null, nome, sobrenome || null, turma_id || null, turma_codigo || null, mundo, nota, acertos, total]
      );
      return json(res, 200, { ok: true });
    }

    if (rota === '/api/resultados' && req.method === 'GET') {
      const turma_id = parsed.query.turma_id;
      const q = turma_id
        ? 'SELECT * FROM resultados WHERE turma_id=$1 ORDER BY jogado_em DESC'
        : 'SELECT * FROM resultados ORDER BY jogado_em DESC';
      const r = await pool.query(q, turma_id ? [turma_id] : []);
      return json(res, 200, r.rows);
    }

    if (rota.startsWith('/api/ranking/') && req.method === 'GET') {
      const codigo = decodeURIComponent(rota.split('/api/ranking/')[1]);
      const r = await pool.query(
        `SELECT
           nome_aluno AS nome,
           sobrenome_aluno AS sobrenome,
           AVG(nota) AS media
         FROM resultados
         WHERE turma_codigo=$1
         GROUP BY nome_aluno, sobrenome_aluno
         ORDER BY media DESC`,
        [codigo]
      );
      const ranking = r.rows.map((a, i) => ({
        posicao: i + 1,
        nome: a.sobrenome ? `${a.nome} ${a.sobrenome}` : a.nome,
        media: parseFloat(Number(a.media).toFixed(2))
      }));
      return json(res, 200, ranking);
    }

  } catch (e) {
    console.error('[Missão Saber] Erro:', e.message);
    erro(res, 500, 'Erro interno do servidor');
  }
});

server.listen(PORT, () => console.log(`[Missão Saber] Servidor rodando na porta ${PORT}`));