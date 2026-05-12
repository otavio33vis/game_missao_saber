/**
 * professor.js — Missão Saber
 * Autenticação, navegação e relatório de resultados.
 * Depende de: utils.js, turmas.js
 */

const Professor = {
  _resultados:   [],
  _usuarioAtual: null,

  _ADMIN: { nome: 'Administrador', usuario: 'admin', senha: '123', isAdmin: true },

  _getProfessores() {
    return JSON.parse(localStorage.getItem('professores_lista') || '[]');
  },
  _salvarProfessores(lista) {
    localStorage.setItem('professores_lista', JSON.stringify(lista));
  },

  login() {
    const usuario = document.getElementById('prof-usuario').value.trim();
    const senha   = document.getElementById('prof-senha').value.trim();
    const erro    = document.getElementById('login-erro');

    if (usuario === this._ADMIN.usuario && senha === this._ADMIN.senha) {
      this._iniciarSessao(this._ADMIN); return;
    }

    const prof = this._getProfessores().find(p => p.usuario === usuario && p.senha === senha);
    if (prof) {
      this._iniciarSessao({ ...prof, isAdmin: false }); return;
    }

    erro.style.display = 'block';
    setTimeout(() => erro.style.display = 'none', 3000);
  },

  _iniciarSessao(usuario) {
    this._usuarioAtual = usuario;
    sessionStorage.setItem('prof_logado', JSON.stringify(usuario));
    this._entrarNoPainel();
  },

  sair() {
    sessionStorage.removeItem('prof_logado');
    this._usuarioAtual = null;
    window.location.href = 'index.html';
  },

  _entrarNoPainel() {
    const nav = document.getElementById('prof-nav');
    if (nav) nav.style.display = 'flex';

    const btnGerenciar = document.getElementById('btn-gerenciar-profs');
    if (btnGerenciar) btnGerenciar.style.display = this._usuarioAtual?.isAdmin ? 'flex' : 'none';

    const nomeEl = document.getElementById('prof-nome-logado');
    if (nomeEl) nomeEl.textContent = this._usuarioAtual?.nome || '';

    this.mostrarAba('inicio');
  },

  irPara(id) {
    document.querySelectorAll('.prof-painel').forEach(p => p.classList.remove('ativo'));
    document.getElementById(id)?.classList.add('ativo');
  },

  mostrarAba(aba) {
    document.querySelectorAll('.prof-aba').forEach(a => a.classList.remove('ativa'));
    document.getElementById('aba-' + aba)?.classList.add('ativa');
    if (aba === 'inicio')     { this.irPara('prof-painel-inicio'); }
    if (aba === 'turmas')     { this.irPara('prof-painel-turmas'); Turmas.renderLista(); }
    if (aba === 'resultados') {
      this.irPara('prof-painel-resultados-turmas');
      this.carregarResultados().then(() => this._renderTurmasResultados());
    }
  },

  abrirModalProfessores() {
    document.getElementById('modal-professores').classList.add('ativo');
    this._renderListaProfessores();
  },

  fecharModalProfessores() {
    document.getElementById('modal-professores').classList.remove('ativo');
    document.getElementById('novo-prof-nome').value    = '';
    document.getElementById('novo-prof-usuario').value = '';
    document.getElementById('novo-prof-senha').value   = '';
  },

  adicionarProfessor() {
    const nome    = document.getElementById('novo-prof-nome').value.trim();
    const usuario = document.getElementById('novo-prof-usuario').value.trim();
    const senha   = document.getElementById('novo-prof-senha').value.trim();

    if (!nome || !usuario || !senha) { mostrarToast('Preencha todos os campos!', 'erro'); return; }

    const lista = this._getProfessores();
    if (lista.find(p => p.usuario === usuario) || usuario === 'admin') {
      mostrarToast('Usuário já existe!', 'erro'); return;
    }

    lista.push({ nome: sanitizar(nome), usuario: sanitizar(usuario), senha });
    this._salvarProfessores(lista);
    this._renderListaProfessores();
    document.getElementById('novo-prof-nome').value    = '';
    document.getElementById('novo-prof-usuario').value = '';
    document.getElementById('novo-prof-senha').value   = '';
    mostrarToast(`Professor "${nome}" cadastrado!`);
  },

  removerProfessor(usuario) {
    if (!confirm('Remover este professor?')) return;
    this._salvarProfessores(this._getProfessores().filter(p => p.usuario !== usuario));
    this._renderListaProfessores();
    mostrarToast('Professor removido.', 'erro');
  },

  _renderListaProfessores() {
    const lista     = this._getProfessores();
    const container = document.getElementById('lista-professores');
    if (!lista.length) {
      container.innerHTML = '<p style="text-align:center;color:rgba(255,255,255,0.4);padding:20px 0">Nenhum professor cadastrado ainda.</p>';
      return;
    }
    container.innerHTML = lista.map(p => `
      <div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.08)">
        <div style="width:36px;height:36px;border-radius:50%;background:rgba(255,215,0,0.15);display:flex;align-items:center;justify-content:center;font-family:var(--fonte-titulo);color:var(--cor-ouro);font-size:0.9rem;flex-shrink:0">${p.nome.charAt(0).toUpperCase()}</div>
        <div style="flex:1">
          <div style="font-weight:700;font-size:0.9rem">${sanitizar(p.nome)}</div>
          <div style="font-size:0.75rem;color:rgba(255,255,255,0.5)">@${sanitizar(p.usuario)}</div>
        </div>
        <button class="btn btn-vermelho btn-sm" onclick="Professor.removerProfessor('${p.usuario}')">✕</button>
      </div>`).join('');
  },

  _renderTurmasResultados() {
    const container = document.getElementById('res-turmas-lista');
    const lista     = Turmas._getLista();

    if (!lista.length) {
      container.innerHTML = '<div class="prof-empty"><div class="prof-empty-icon">📊</div>Nenhuma turma cadastrada ainda.</div>';
      return;
    }

    const statsPorTurma = {};
    this._resultados.forEach(r => {
      if (!statsPorTurma[r.turma]) statsPorTurma[r.turma] = { alunos: {}, notas: [] };
      statsPorTurma[r.turma].alunos[r.nome] = true;
      statsPorTurma[r.turma].notas.push(r.nota);
    });

    const cores = ['#156FFF','#2D6A4F','#8B1A1A','#b5860d','#6B21A8'];
    container.innerHTML = lista.map((cod, i) => {
      const t     = Turmas._getTurma(cod); if (!t) return '';
      const stats = statsPorTurma[cod] || { alunos:{}, notas:[] };
      const total = Object.keys(stats.alunos).length;
      const media = stats.notas.length ? (stats.notas.reduce((a,b)=>a+b,0)/stats.notas.length).toFixed(1) : null;
      const cor   = cores[i % cores.length];
      const mc    = media >= 6 ? 'var(--cor-verde)' : media ? 'var(--cor-vermelho)' : 'rgba(255,255,255,0.4)';

      return `
        <div onclick="Professor.abrirResultadosTurma('${cod}')"
             style="display:flex;align-items:center;gap:14px;padding:16px 20px;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.1);border-radius:16px;margin-bottom:10px;cursor:pointer;transition:border-color .2s"
             onmouseover="this.style.borderColor='var(--cor-ouro)'"
             onmouseout="this.style.borderColor='rgba(255,255,255,0.1)'">
          <div style="width:44px;height:44px;border-radius:50%;background:${cor};display:flex;align-items:center;justify-content:center;font-family:var(--fonte-titulo);font-size:1.1rem;flex-shrink:0">${t.nome.charAt(0).toUpperCase()}</div>
          <div style="flex:1">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
              <span style="font-weight:800;font-size:0.95rem">${sanitizar(t.nome)}</span>
              <span style="font-size:0.75rem;color:var(--cor-ouro);background:rgba(255,215,0,0.1);padding:2px 8px;border-radius:20px;letter-spacing:2px">${cod}</span>
            </div>
            <div style="background:rgba(255,255,255,0.1);border-radius:4px;height:5px;overflow:hidden;margin-bottom:4px">
              <div style="background:var(--cor-verde);height:100%;width:${Math.min(100, total*10)}%;border-radius:4px"></div>
            </div>
            <div style="font-size:0.75rem;color:rgba(255,255,255,0.5)">${total} aluno${total!==1?'s':''} com resultado</div>
          </div>
          <div style="text-align:right;flex-shrink:0">
            <div style="font-family:var(--fonte-titulo);font-size:1.6rem;color:${mc}">${media||'—'}</div>
            <div style="font-size:0.7rem;color:rgba(255,255,255,0.4)">média</div>
          </div>
          <div style="color:rgba(255,255,255,0.3);font-size:1.2rem">›</div>
        </div>`;
    }).join('');
  },

  abrirResultadosTurma(cod) {
    const t = Turmas._getTurma(cod); if (!t) return;
    this._turmaSelecionada = cod;
    document.getElementById('res-detalhe-titulo').textContent = `${t.nome} — ${cod}`;
    this.irPara('prof-painel-resultados-detalhe');
    this._renderResultadosTurma(cod);
  },

  _renderResultadosTurma(cod) {
    const busca  = (document.getElementById('res-busca')?.value || '').toLowerCase();
    const filtro = document.getElementById('res-filtro')?.value || 'todos';

    const alunos = {};
    this._resultados.filter(r => r.turma === cod).forEach(r => {
      if (!alunos[r.nome]) alunos[r.nome] = { nome: r.nome, notas: {} };
      alunos[r.nome].notas[r.mundo] = r.nota;
    });

    const calcMedia = a => {
      const v = Object.values(a.notas);
      return v.length ? v.reduce((x,y)=>x+y,0)/v.length : 0;
    };

    let lista = Object.values(alunos);
    if (busca)   lista = lista.filter(a => a.nome.toLowerCase().includes(busca));
    if (filtro === 'aprovados')  lista = lista.filter(a => calcMedia(a) >= 6);
    if (filtro === 'reprovados') lista = lista.filter(a => calcMedia(a) < 6 && Object.keys(a.notas).length > 0);

    const todos      = Object.values(alunos);
    const aprovados  = todos.filter(a => calcMedia(a) >= 6).length;
    const mediaGeral = todos.length
      ? (todos.reduce((s,a) => s + calcMedia(a), 0) / todos.length).toFixed(1)
      : '—';

    document.getElementById('res-stat-total').textContent  = todos.length;
    document.getElementById('res-stat-media').textContent  = mediaGeral;
    document.getElementById('res-stat-aprov').textContent  = aprovados;
    document.getElementById('res-stat-reprov').textContent = todos.length - aprovados;

    document.getElementById('prof-tabela-detalhe').innerHTML = lista.length
      ? lista.map(a => {
          const med    = calcMedia(a);
          const aprov  = med >= 6;
          const medStr = Object.keys(a.notas).length ? med.toFixed(1) : '-';
          const bg     = aprov ? 'rgba(29,185,84,0.2)' : 'rgba(231,76,60,0.2)';
          const cl     = aprov ? 'var(--cor-verde)' : 'var(--cor-vermelho)';
          return `<tr style="border-top:1px solid rgba(255,255,255,0.06)">
            <td style="padding:12px 16px">${sanitizar(a.nome)}</td>
            <td style="padding:12px 16px;text-align:center">${a.notas.matematica??'-'}</td>
            <td style="padding:12px 16px;text-align:center">${a.notas.portugues??'-'}</td>
            <td style="padding:12px 16px;text-align:center">
              <span style="background:${bg};color:${cl};padding:3px 12px;border-radius:20px;font-weight:700;font-size:0.85rem">${medStr}</span>
            </td>
          </tr>`;
        }).join('')
      : '<tr><td colspan="4" style="text-align:center;padding:24px;opacity:0.5">Nenhum resultado encontrado</td></tr>';
  },

  async carregarResultados() {
    try {
      const res = await fetch('/api/resultados');
      this._resultados = await res.json();
    } catch(e) {
      this._resultados = [];
    }
  },

  exportarCSV(cod) {
    const alunos = {};
    (cod ? this._resultados.filter(r=>r.turma===cod) : this._resultados).forEach(r => {
      const key = `${r.nome}__${r.turma}`;
      if (!alunos[key]) alunos[key] = { nome:r.nome, turma:r.turma, notas:{} };
      alunos[key].notas[r.mundo] = r.nota;
    });
    const linhas = [['Nome','Turma','Matemática','Português','Média']];
    Object.values(alunos).forEach(a => {
      const v = Object.values(a.notas);
      linhas.push([a.nome, a.turma, a.notas.matematica??'', a.notas.portugues??'',
        v.length ? (v.reduce((x,y)=>x+y,0)/v.length).toFixed(1) : '']);
    });
    const csv  = linhas.map(l=>l.join(';')).join('\n');
    const blob = new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8;'});
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href     = url;
    link.download = `missao-saber-${new Date().toLocaleDateString('pt-BR').replace(/\//g,'-')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }
};