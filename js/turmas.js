/**
 * turmas.js — Missão Saber
 * Gerencia turmas e questões via API (PostgreSQL).
 * Depende de: utils.js
 */

  function stripHtml(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return (tmp.textContent || tmp.innerText || '').trim();
  }

const Turmas = {
  _cores:  ['#156FFF', '#2D6A4F', '#8B1A1A', '#b5860d', '#6B21A8'],
  _letras: ['A', 'B', 'C', 'D', 'E'],
  _cache:  [], // lista de turmas em memória
  _importarOrigem:   'banco',
  _importarQuestoes: [],

  _estado: {
    turma:           null, // objeto completo da turma
    materia:         null,
    questaoEditando: null
  },

  // ── Helpers de código (ainda usados pelo mapa.js via /api/turma/:cod) ─────
  _getLista() { return this._cache.map(t => t.codigo); },
  _getTurma(cod) { return this._cache.find(t => t.codigo === cod) || null; },

  _gerarCodigo() {
    const existentes = (this._cache || []).map(t => t.codigo);
    let cod;
    do { cod = String(Math.floor(1000 + Math.random() * 9000)); }
    while (existentes.includes(cod));
    return cod;
  },

  // ── Popup criar turma ─────────────────────────────────────────────────────
  abrirPopup() {
    if (!Array.isArray(this._cache)) this._cache = [];
    document.getElementById('nova-turma-nome').value         = '';
    document.getElementById('nova-turma-codigo').value       = this._gerarCodigo();
    document.getElementById('nova-turma-total-alunos').value = '';
    document.getElementById('popup-nova-turma').classList.add('ativo');
    setTimeout(() => document.getElementById('nova-turma-nome').focus(), 100);
  },

  fecharPopup() {
    document.getElementById('popup-nova-turma').classList.remove('ativo');
  },

  async criar() {
    const nome         = document.getElementById('nova-turma-nome').value.trim();
    const codigo       = document.getElementById('nova-turma-codigo').value;
    const total_alunos = document.getElementById('nova-turma-total-alunos').value.trim();

    if (!nome) { mostrarToast('Digite o nome da turma!', 'erro'); return; }

    try {
      const resp = await fetch('/api/turmas', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          codigo,
          nome,
          professor_id: Professor._usuarioAtual.id,
          total_alunos: total_alunos ? parseInt(total_alunos) : null
        })
      });
      const data = await resp.json();
      if (!resp.ok) { mostrarToast(data.erro || 'Erro ao criar turma!', 'erro'); return; }
      this.fecharPopup();
      await this.renderLista();
      mostrarToast(`Turma "${nome}" criada! Código: ${codigo}`);
    } catch { mostrarToast('Erro ao criar turma!', 'erro'); }
  },

  async renderLista() {
    const container = document.getElementById('lista-turmas');
    try {
      const resp = await fetch(`/api/turmas?professor_id=${Professor._usuarioAtual.id}`);
      this._cache = await resp.json();
    } catch { this._cache = []; }

    if (!this._cache.length) {
      container.innerHTML = `
        <div class="prof-empty">
          <div class="prof-empty-icon">🏫</div>
          Nenhuma turma cadastrada ainda.<br>Clique em "+ Nova Turma" para começar.
        </div>`;
      return;
    }

    container.innerHTML = this._cache.map((t, i) => {
      const cor   = this._cores[i % this._cores.length];
      const qMat  = (t.questoes || []).filter(q => q.category === 'matematica').length;
      const qPort = (t.questoes || []).filter(q => q.category === 'portugues').length;
      const total = (t.questoes || []).length;

      return `
        <div class="turma-card" id="tcard-${t.codigo}">
          <div class="turma-header-card" onclick="Turmas.toggleCard('${t.codigo}')">
            <div class="turma-inicial" style="background:${cor}">${t.nome.charAt(0).toUpperCase()}</div>
            <div class="turma-info">
              <div class="turma-nome-txt">${t.nome}</div>
              <div class="turma-qtd-txt" id="qtd-${t.codigo}">carregando...</div>
            </div>
            <div class="turma-cod-badge">${t.codigo}</div>
            <div class="turma-seta">▼</div>
          </div>
          <div class="materias-lista">
            <button class="materia-btn-prof mat"
                    style="background:linear-gradient(135deg,#0047FF,#2979FF)"
                    onclick="Turmas.abrirQuestoes('${t.codigo}','matematica')">
              📐 Matemática <span class="mat-qtd" id="qmat-${t.codigo}">...</span>
            </button>
            <button class="materia-btn-prof port"
                    style="background:linear-gradient(135deg,#F5A800,#FFD740);color:#1a0a00"
                    onclick="Turmas.abrirQuestoes('${t.codigo}','portugues')">
              📖 Português <span class="mat-qtd" id="qport-${t.codigo}">...</span>
            </button>
            <div style="border-top:1px solid rgba(255,255,255,0.08);margin-top:8px;padding-top:8px">
              <button style="width:100%;padding:10px;border:none;border-radius:10px;
                             background:linear-gradient(135deg,#FF1744,#D50000);color:#fff;
                             font-family:var(--fonte-titulo);font-size:0.85rem;letter-spacing:1px;
                             cursor:pointer;transition:opacity .2s"
                      onmouseover="this.style.opacity='.85'"
                      onmouseout="this.style.opacity='1'"
                      onclick="Turmas.excluirTurma('${t.codigo}', ${t.id})">🗑 Excluir turma</button>
            </div>
          </div>
        </div>`;
    }).join('');

    // Carrega contagem de questões pra cada turma em background
    this._cache.forEach(t => this._atualizarContagemTurma(t));
  },

  async _atualizarContagemTurma(t) {
    try {
      const resp = await fetch(`/api/turmas/${t.id}/questoes`);
      const questoes = await resp.json();
      t.questoes = questoes;
      const qMat  = questoes.filter(q => q.category === 'matematica').length;
      const qPort = questoes.filter(q => q.category === 'portugues').length;
      const total = questoes.length;
      const qtdEl = document.getElementById(`qtd-${t.codigo}`);
      const matEl = document.getElementById(`qmat-${t.codigo}`);
      const porEl = document.getElementById(`qport-${t.codigo}`);
      if (qtdEl) qtdEl.textContent = `${total} questão${total !== 1 ? 'ões' : ''}`;
      if (matEl) matEl.textContent = `${qMat} questão${qMat !== 1 ? 'ões' : ''}`;
      if (porEl) porEl.textContent = `${qPort} questão${qPort !== 1 ? 'ões' : ''}`;
    } catch {}
  },

  toggleCard(cod) {
    const card      = document.getElementById('tcard-' + cod);
    const expandido = card.classList.contains('expandido');
    document.querySelectorAll('.turma-card').forEach(c => c.classList.remove('expandido'));
    if (!expandido) card.classList.add('expandido');
  },

  async excluirTurma(cod, id) {
    const t = this._getTurma(cod);
    if (!t) return;
    if (!confirm(`Excluir a turma "${t.nome}"?\nTodas as questões serão perdidas.`)) return;
    try {
      await fetch(`/api/turmas/${id}`, { method: 'DELETE' });
      await this.renderLista();
      mostrarToast(`Turma "${t.nome}" excluída.`, 'erro');
    } catch { mostrarToast('Erro ao excluir turma!', 'erro'); }
  },

  async abrirQuestoes(cod, materia) {
    const t = this._getTurma(cod);
    if (!t) return;
    // Recarrega questões frescas do banco
    const resp = await fetch(`/api/turmas/${t.id}/questoes`);
    const questoes = await resp.json();
    t.questoes = questoes;

    this._estado.turma   = t;
    this._estado.materia = materia;
    const nomes = { matematica: 'MATEMÁTICA', portugues: 'PORTUGUÊS' };
    document.getElementById('prof-questoes-titulo').textContent =
      `${nomes[materia]} — ${t.nome}`;
    Professor.irPara('prof-painel-questoes');
    this.renderQuestoes();
  },

  renderQuestoes() {
    const container = document.getElementById('prof-lista-questoes');
    const questoes  = (this._estado.turma.questoes || [])
      .filter(q => q.category === this._estado.materia);

    const chkTodos = document.getElementById('selecionar-todos-questoes');
    if (chkTodos) chkTodos.checked = false;
    const count  = document.getElementById('questoes-selecionadas-count');
    if (count)   count.textContent = '';
    const btnExc = document.getElementById('btn-excluir-selecionadas');
    if (btnExc)  btnExc.style.display = 'none';

    if (!questoes.length) {
      container.innerHTML = `
        <div class="prof-empty">
          <div class="prof-empty-icon">📝</div>
          Nenhuma questão cadastrada.<br>Clique em "+ Nova Questão".
        </div>`;
      return;
    }

    container.innerHTML = questoes.map((q, i) => `
      <div class="questao-item-prof">
        <div class="questao-num-prof">${i + 1}</div>
        <div class="questao-txt-prof">${sanitizar(stripHtml(q.text))}</div>
        <div class="questao-acoes-prof">
          <button onclick="Turmas.abrirForm(${q.id})"
                  class="btn-editar-questao" title="Editar">✏️</button>
          <button onclick="Turmas.excluirUma(${q.id})"
                  class="btn-editar-questao" title="Excluir"
                  style="color:#FF4444"
                  onmouseover="this.style.color='#FF1744'"
                  onmouseout="this.style.color='#FF4444'">🗑</button>
          <input type="checkbox" class="questao-check" data-id="${q.id}"
                 style="width:16px;height:16px;accent-color:var(--cor-ouro);cursor:pointer;flex-shrink:0"
                 onchange="Turmas._atualizarSelecaoQuestoes()">
        </div>
      </div>`).join('');
  },

  async excluirUma(id) {
    if (!confirm('Excluir esta questão?')) return;
    try {
      await fetch(`/api/questoes/${id}`, { method: 'DELETE' });
      // Atualiza local
      this._estado.turma.questoes = this._estado.turma.questoes.filter(q => q.id !== id);
      this.renderQuestoes();
      this._atualizarContagemTurma(this._estado.turma);
      mostrarToast('Questão excluída.', 'erro');
    } catch { mostrarToast('Erro ao excluir!', 'erro'); }
  },

  selecionarTodasQuestoes(checked) {
    document.querySelectorAll('.questao-check').forEach(cb => cb.checked = checked);
    this._atualizarSelecaoQuestoes();
  },

  _atualizarSelecaoQuestoes() {
    const checks   = [...document.querySelectorAll('.questao-check')];
    const marcados = checks.filter(c => c.checked);
    const count    = document.getElementById('questoes-selecionadas-count');
    const btnExc   = document.getElementById('btn-excluir-selecionadas');
    const chkTodos = document.getElementById('selecionar-todos-questoes');
    if (count)    count.textContent    = marcados.length ? `${marcados.length} selecionada${marcados.length !== 1 ? 's' : ''}` : '';
    if (btnExc)   btnExc.style.display = marcados.length ? 'inline-flex' : 'none';
    if (chkTodos) chkTodos.checked     = checks.length > 0 && marcados.length === checks.length;
  },

  async excluirSelecionadas() {
    const ids = [...document.querySelectorAll('.questao-check:checked')]
      .map(cb => parseInt(cb.dataset.id));
    if (!ids.length) return;
    if (!confirm(`Excluir ${ids.length} questão${ids.length !== 1 ? 'ões' : ''}?`)) return;
    try {
      await fetch('/api/questoes', {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ids })
      });
      this._estado.turma.questoes = this._estado.turma.questoes.filter(q => !ids.includes(q.id));
      this.renderQuestoes();
      this._atualizarContagemTurma(this._estado.turma);
      mostrarToast(`${ids.length} questão${ids.length !== 1 ? 'ões' : ''} excluída${ids.length !== 1 ? 's' : ''}!`, 'erro');
    } catch { mostrarToast('Erro ao excluir!', 'erro'); }
  },

  abrirForm(idQuestao) {
    this._estado.questaoEditando = idQuestao;
    document.getElementById('prof-form-titulo').textContent =
      idQuestao ? 'EDITAR QUESTÃO' : 'NOVA QUESTÃO';

    let pergunta = '', alts = Array(5).fill(''), correta = 0;
    if (idQuestao) {
      const q = this._estado.turma.questoes.find(x => x.id === idQuestao);
      if (q) {
        pergunta = q.text;
        alts     = Array.isArray(q.answers) ? q.answers : JSON.parse(q.answers);
        correta  = q.correct_index;
      }
    }

    document.getElementById('prof-pergunta').value = pergunta;
    document.getElementById('prof-alternativas').innerHTML =
      this._letras.map((l, i) => `
        <div class="alt-row">
          <div class="alt-letra-badge">${l}</div>
          <input type="text" id="prof-alt-${i}"
                 placeholder="Alternativa ${l}"
                 value="${sanitizar(alts[i] || '')}">
          <input type="radio" name="prof-correta" value="${i}"
                 ${correta === i ? 'checked' : ''}
                 title="Marcar como correta">
        </div>`).join('');

    Professor.irPara('prof-painel-form');
  },

  async salvarQuestao() {
    const pergunta = document.getElementById('prof-pergunta').value.trim();
    if (!pergunta) { mostrarToast('Digite a pergunta!', 'erro'); return; }

    const alts = this._letras.map((_, i) =>
      document.getElementById('prof-alt-' + i).value.trim()
    );
    if (alts.some(a => !a)) { mostrarToast('Preencha todas as alternativas!', 'erro'); return; }

    const radio = document.querySelector('input[name="prof-correta"]:checked');
    if (!radio) { mostrarToast('Marque a alternativa correta!', 'erro'); return; }

    const { turma, materia, questaoEditando } = this._estado;
    const correta = parseInt(radio.value);

    try {
      if (questaoEditando) {
        const resp = await fetch(`/api/questoes/${questaoEditando}`, {
          method:  'PUT',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ text: pergunta, answers: alts, correct_index: correta })
        });
        const data = await resp.json();
        if (!resp.ok) { mostrarToast(data.erro || 'Erro ao salvar!', 'erro'); return; }
        // Atualiza local
        const idx = turma.questoes.findIndex(q => q.id === questaoEditando);
        if (idx >= 0) turma.questoes[idx] = data.questao;
        mostrarToast('Questão atualizada!');
      } else {
        const resp = await fetch(`/api/turmas/${turma.id}/questoes`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ category: materia, text: pergunta, answers: alts, correct_index: correta })
        });
        const data = await resp.json();
        if (!resp.ok) { mostrarToast(data.erro || 'Erro ao salvar!', 'erro'); return; }
        turma.questoes = [...(turma.questoes || []), data.questao];
        mostrarToast('Questão salva!');
      }
      this._estado.turma = turma;
      this._atualizarContagemTurma(turma);
      Professor.irPara('prof-painel-questoes');
      this.renderQuestoes();
    } catch { mostrarToast('Erro ao salvar questão!', 'erro'); }
  },

  // ── Importar ──────────────────────────────────────────────────────────────
  abrirModalImportar() {
    this._importarOrigem   = 'banco';
    this._importarQuestoes = [];
    document.getElementById('modal-importar').classList.add('ativo');
    document.getElementById('import-turma-sel').style.display = 'none';

    const selectMateria = document.getElementById('import-materia');
    if (selectMateria) selectMateria.value = this._estado.materia;

    const jaExistem  = (this._estado.turma.questoes || []).filter(q => q.category === this._estado.materia).length;
    const elContador = document.getElementById('import-ja-cadastradas');
    if (elContador) elContador.textContent = `${jaExistem} ${jaExistem !== 1 ? 'questões' : 'questão'} cadastrada${jaExistem !== 1 ? 's' : ''}`;

    document.getElementById('import-lista').innerHTML =
      '<p style="text-align:center;color:rgba(255,255,255,0.4);padding:20px 0">Selecione uma origem</p>';
    document.getElementById('import-contador').textContent = '0 selecionadas';
    document.getElementById('import-btn-banco').className = 'btn btn-ouro btn-sm';
    document.getElementById('import-btn-turma').className = 'btn btn-ghost btn-sm';
    this.importarOrigem('banco');
  },

  fecharModalImportar() {
    document.getElementById('modal-importar').classList.remove('ativo');
  },

  importarOrigem(origem) {
    this._importarOrigem = origem;
    const btnBanco = document.getElementById('import-btn-banco');
    const btnTurma = document.getElementById('import-btn-turma');
    const selTurma = document.getElementById('import-turma-sel');

    if (origem === 'banco') {
      btnBanco.className     = 'btn btn-ouro btn-sm';
      btnTurma.className     = 'btn btn-ghost btn-sm';
      selTurma.style.display = 'none';
    } else {
      btnBanco.className     = 'btn btn-ghost btn-sm';
      btnTurma.className     = 'btn btn-ouro btn-sm';
      selTurma.style.display = 'block';
      const sel = document.getElementById('import-turma-cod');
      sel.innerHTML = this._cache
        .filter(t => t.codigo !== this._estado.turma?.codigo)
        .map(t => `<option value="${t.id}">${t.nome} (${t.codigo})</option>`)
        .join('');
    }
    this.carregarQuestoesImportar();
  },

  async carregarQuestoesImportar() {
    const materia = this._estado.materia;
    const lista   = document.getElementById('import-lista');

    const selectMateria = document.getElementById('import-materia');
    if (selectMateria) selectMateria.value = materia;

    const jaExistem2  = (this._estado.turma.questoes || []).filter(q => q.category === materia).length;
    const elContador2 = document.getElementById('import-ja-cadastradas');
    if (elContador2) elContador2.textContent = `${jaExistem2} ${jaExistem2 !== 1 ? 'questões' : 'questão'} cadastrada${jaExistem2 !== 1 ? 's' : ''}`;

    lista.innerHTML = '<p style="text-align:center;color:rgba(255,255,255,0.4);padding:20px 0">Carregando...</p>';

    try {
      if (this._importarOrigem === 'banco') {
        const resp = await fetch(`/api/banco?category=${materia}`);
        this._importarQuestoes = await resp.json();
      } else {
        const turmaId = document.getElementById('import-turma-cod').value;
        const resp    = await fetch(`/api/turmas/${turmaId}/questoes?category=${materia}`);
        this._importarQuestoes = await resp.json();
      }
    } catch { this._importarQuestoes = []; }

    if (!this._importarQuestoes.length) {
      lista.innerHTML = '<p style="text-align:center;color:rgba(255,255,255,0.4);padding:20px 0">Nenhuma questão encontrada</p>';
      document.getElementById('import-contador').textContent = '0 selecionadas';
      return;
    }

    const itemTodos = `
      <div style="display:flex;align-items:center;padding:10px 12px;
                  border-bottom:1px solid rgba(255,255,255,0.08);margin-bottom:4px">
        <span style="flex:1;font-size:0.88rem;font-weight:700;color:rgba(255,215,0,0.85)">Selecionar todas</span>
        <input type="checkbox" id="import-selecionar-todos"
               style="width:16px;height:16px;accent-color:var(--cor-ouro);cursor:pointer"
               onchange="Turmas.importarSelecionarTodos(this.checked)">
      </div>`;

    const itens = this._importarQuestoes.map((q, i) => `
      <div style="display:flex;align-items:flex-start;padding:10px 12px;border-radius:8px;transition:background .15s"
           onmouseover="this.style.background='rgba(255,255,255,0.04)'"
           onmouseout="this.style.background='transparent'">
        <span style="flex:1;font-size:0.88rem;line-height:1.4;padding-right:12px">${sanitizar(stripHtml(q.text))}</span>
        <input type="checkbox" data-idx="${i}"
               style="width:16px;height:16px;accent-color:var(--cor-ouro);cursor:pointer;flex-shrink:0;margin-top:2px"
               onchange="Turmas._atualizarContadorImportar()">
      </div>`).join('');

    lista.innerHTML = itemTodos + itens;
    document.getElementById('import-contador').textContent = '0 selecionadas';
  },

  importarSelecionarTodos(checked) {
    document.querySelectorAll('#import-lista input[type="checkbox"]:not(#import-selecionar-todos)')
      .forEach(cb => cb.checked = checked);
    this._atualizarContadorImportar();
  },

  _atualizarContadorImportar() {
    const marcados = document.querySelectorAll('#import-lista input[type="checkbox"]:not(#import-selecionar-todos):checked').length;
    const total    = document.querySelectorAll('#import-lista input[type="checkbox"]:not(#import-selecionar-todos)').length;
    document.getElementById('import-contador').textContent = `${marcados} selecionada${marcados !== 1 ? 's' : ''}`;
    const chkTodos = document.getElementById('import-selecionar-todos');
    if (chkTodos) chkTodos.checked = total > 0 && marcados === total;
  },

  async executarImportacao() {
    const selecionados = [...document.querySelectorAll(
      '#import-lista input[type="checkbox"]:not(#import-selecionar-todos):checked')]
      .map(cb => parseInt(cb.dataset.idx));

    if (!selecionados.length) { mostrarToast('Selecione ao menos uma questão!', 'erro'); return; }

    const materia   = this._estado.materia;
    const turma     = this._estado.turma;
    const jaExistem = (turma.questoes || []).filter(q => q.category === materia).length;

    if (jaExistem + selecionados.length > 10) {
      mostrarToast(`Limite de 10 questões! (${jaExistem} já cadastradas)`, 'erro'); return;
    }

    try {
      const novas = [];
      for (const idx of selecionados) {
        const q    = this._importarQuestoes[idx];
        const resp = await fetch(`/api/turmas/${turma.id}/questoes`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            category:      materia,
            text:          q.text,
            answers:       Array.isArray(q.answers) ? q.answers : JSON.parse(q.answers),
            correct_index: q.correct_index,
            image_url:     q.image_url || null
          })
        });
        const data = await resp.json();
        if (resp.ok) novas.push(data.questao);
      }
      turma.questoes = [...(turma.questoes || []), ...novas];
      this._estado.turma = turma;
      this.fecharModalImportar();
      this.renderQuestoes();
      this._atualizarContagemTurma(turma);
      mostrarToast(`${novas.length} questão${novas.length !== 1 ? 'ões' : ''} importada${novas.length !== 1 ? 's' : ''}!`);
    } catch { mostrarToast('Erro ao importar questões!', 'erro'); }
  }
};