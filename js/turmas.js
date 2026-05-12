/**
 * turmas.js — Missão Saber
 * Gerencia turmas e questões no painel do professor.
 * Dados persistidos no localStorage.
 * Depende de: utils.js
 */

const Turmas = {
  _cores:  ['#156FFF', '#2D6A4F', '#8B1A1A', '#b5860d', '#6B21A8'],
  _letras: ['A', 'B', 'C', 'D', 'E'],
  _importarOrigem:   'banco',
  _importarQuestoes: [],

  _estado: {
    turma:           null,
    materia:         null,
    questaoEditando: null
  },

  _getLista()    { return JSON.parse(localStorage.getItem('turmas_lista') || '[]'); },
  _getTurma(cod) { return JSON.parse(localStorage.getItem('turma_' + cod) || 'null'); },
  _salvar(t)     { localStorage.setItem('turma_' + t.codigo, JSON.stringify(t)); },
  _salvarLista(l){ localStorage.setItem('turmas_lista', JSON.stringify(l)); },

  _gerarCodigo() {
    const existentes = this._getLista();
    let cod;
    do { cod = String(Math.floor(1000 + Math.random() * 9000)); }
    while (existentes.includes(cod));
    return cod;
  },

  abrirPopup() {
    document.getElementById('nova-turma-nome').value   = '';
    document.getElementById('nova-turma-codigo').value = this._gerarCodigo();
    document.getElementById('popup-nova-turma').classList.add('ativo');
    setTimeout(() => document.getElementById('nova-turma-nome').focus(), 100);
  },

  fecharPopup() {
    document.getElementById('popup-nova-turma').classList.remove('ativo');
  },

  criar() {
    const nome   = document.getElementById('nova-turma-nome').value.trim();
    const codigo = document.getElementById('nova-turma-codigo').value;
    if (!nome) { mostrarToast('Digite o nome da turma!', 'erro'); return; }
    const turma = { codigo, nome: sanitizar(nome), questoes: [] };
    this._salvar(turma);
    const lista = this._getLista();
    lista.push(codigo);
    this._salvarLista(lista);
    this.fecharPopup();
    this.renderLista();
    mostrarToast(`Turma "${nome}" criada! Código: ${codigo}`);
  },

  renderLista() {
    const container = document.getElementById('lista-turmas');
    const lista     = this._getLista();

    if (!lista.length) {
      container.innerHTML = `
        <div class="prof-empty">
          <div class="prof-empty-icon">🏫</div>
          Nenhuma turma cadastrada ainda.<br>Clique em "+ Nova Turma" para começar.
        </div>`;
      return;
    }

    container.innerHTML = lista.map((cod, i) => {
      const t = this._getTurma(cod);
      if (!t) return '';
      const cor   = this._cores[i % this._cores.length];
      const qMat  = t.questoes.filter(q => q.category === 'matematica').length;
      const qPort = t.questoes.filter(q => q.category === 'portugues').length;
      const total = t.questoes.length;

      return `
        <div class="turma-card" id="tcard-${cod}">
          <div class="turma-header-card" onclick="Turmas.toggleCard('${cod}')">
            <div class="turma-inicial" style="background:${cor}">${t.nome.charAt(0).toUpperCase()}</div>
            <div class="turma-info">
              <div class="turma-nome-txt">${t.nome}</div>
              <div class="turma-qtd-txt">${total} questão${total !== 1 ? 'ões' : ''}</div>
            </div>
            <div class="turma-cod-badge">${cod}</div>
            <div class="turma-seta">▼</div>
          </div>
          <div class="materias-lista">
            <button class="materia-btn-prof mat"
                    style="background:linear-gradient(135deg,#0047FF,#2979FF)"
                    onclick="Turmas.abrirQuestoes('${cod}','matematica')">
              📐 Matemática <span class="mat-qtd">${qMat} questão${qMat !== 1 ? 'ões' : ''}</span>
            </button>
            <button class="materia-btn-prof port"
                    style="background:linear-gradient(135deg,#F5A800,#FFD740);color:#1a0a00"
                    onclick="Turmas.abrirQuestoes('${cod}','portugues')">
              📖 Português <span class="mat-qtd">${qPort} questão${qPort !== 1 ? 'ões' : ''}</span>
            </button>
            <div style="border-top:1px solid rgba(255,255,255,0.08);margin-top:8px;padding-top:8px">
              <button style="width:100%;padding:10px;border:none;border-radius:10px;
                             background:linear-gradient(135deg,#FF1744,#D50000);color:#fff;
                             font-family:var(--fonte-titulo);font-size:0.85rem;letter-spacing:1px;
                             cursor:pointer;transition:opacity .2s"
                      onmouseover="this.style.opacity='.85'"
                      onmouseout="this.style.opacity='1'"
                      onclick="Turmas.excluirTurma('${cod}')">🗑 Excluir turma</button>
            </div>
          </div>
        </div>`;
    }).join('');
  },

  toggleCard(cod) {
    const card      = document.getElementById('tcard-' + cod);
    const expandido = card.classList.contains('expandido');
    document.querySelectorAll('.turma-card').forEach(c => c.classList.remove('expandido'));
    if (!expandido) card.classList.add('expandido');
  },

  excluirTurma(cod) {
    const t = this._getTurma(cod);
    if (!t) return;
    if (!confirm(`Excluir a turma "${t.nome}"?\nTodas as questões serão perdidas.`)) return;
    localStorage.removeItem('turma_' + cod);
    this._salvarLista(this._getLista().filter(c => c !== cod));
    this.renderLista();
    mostrarToast(`Turma "${t.nome}" excluída.`, 'erro');
  },

  abrirQuestoes(cod, materia) {
    this._estado.turma   = this._getTurma(cod);
    this._estado.materia = materia;
    const nomes = { matematica: 'MATEMÁTICA', portugues: 'PORTUGUÊS' };
    document.getElementById('prof-questoes-titulo').textContent =
      `${nomes[materia]} — ${this._estado.turma.nome}`;
    Professor.irPara('prof-painel-questoes');
    this.renderQuestoes();
  },

  renderQuestoes() {
    const container = document.getElementById('prof-lista-questoes');
    const questoes  = this._estado.turma.questoes
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
        <div class="questao-txt-prof">${q.text}</div>
        <div class="questao-acoes-prof">
          <button onclick="Turmas.abrirForm('${q.id}')"
                  class="btn-editar-questao" title="Editar">✏️</button>
          <button onclick="Turmas.excluirUma('${q.id}')"
                  class="btn-editar-questao" title="Excluir"
                  style="color:rgba(255,80,80,0.35)"
                  onmouseover="this.style.color='#FF1744'"
                  onmouseout="this.style.color='rgba(255,80,80,0.35)'">🗑</button>
          <input type="checkbox" class="questao-check" data-id="${q.id}"
                 style="width:16px;height:16px;accent-color:var(--cor-ouro);cursor:pointer;flex-shrink:0"
                 onchange="Turmas._atualizarSelecaoQuestoes()">
        </div>
      </div>`).join('');
  },

  excluirUma(id) {
    if (!confirm('Excluir esta questão?')) return;
    const turma = this._estado.turma;
    turma.questoes = turma.questoes.filter(q => String(q.id) !== String(id));
    this._salvar(turma);
    this._estado.turma = turma;
    this.renderQuestoes();
    mostrarToast('Questão excluída.', 'erro');
  },

  selecionarTodasQuestoes(checked) {
    document.querySelectorAll('.questao-check')
      .forEach(cb => cb.checked = checked);
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

  excluirSelecionadas() {
    const ids = [...document.querySelectorAll('.questao-check:checked')]
      .map(cb => cb.dataset.id);
    if (!ids.length) return;
    if (!confirm(`Excluir ${ids.length} questão${ids.length !== 1 ? 'ões' : ''}?`)) return;
    const turma = this._estado.turma;
    turma.questoes = turma.questoes.filter(q => !ids.includes(String(q.id)));
    this._salvar(turma);
    this._estado.turma = turma;
    this.renderQuestoes();
    mostrarToast(`${ids.length} questão${ids.length !== 1 ? 'ões' : ''} excluída${ids.length !== 1 ? 's' : ''}!`, 'erro');
  },

  abrirForm(idQuestao) {
    this._estado.questaoEditando = idQuestao;
    document.getElementById('prof-form-titulo').textContent =
      idQuestao ? 'EDITAR QUESTÃO' : 'NOVA QUESTÃO';

    let pergunta = '', alts = Array(5).fill(''), correta = 0;
    if (idQuestao) {
      const q = this._estado.turma.questoes.find(x => String(x.id) === String(idQuestao));
      if (q) { pergunta = q.text; alts = [...q.answers]; correta = q.correct_index; }
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

  salvarQuestao() {
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

    if (!questaoEditando) {
      const jaExistem = turma.questoes.filter(q => q.category === materia).length;
      if (jaExistem >= 4) { mostrarToast('Máximo de 4 questões por matéria (modo teste)!', 'erro'); return; }
    }

    if (questaoEditando) {
      const idx = turma.questoes.findIndex(q => String(q.id) === String(questaoEditando));
      if (idx >= 0) {
        turma.questoes[idx].text          = sanitizar(pergunta);
        turma.questoes[idx].answers       = alts.map(sanitizar);
        turma.questoes[idx].correct_index = correta;
      }
      mostrarToast('Questão atualizada!');
    } else {
      turma.questoes.push({
        id:            Date.now(),
        category:      materia,
        text:          sanitizar(pergunta),
        answers:       alts.map(sanitizar),
        correct_index: correta
      });
      mostrarToast('Questão salva!');
    }

    this._salvar(turma);
    this._estado.turma = turma;
    Professor.irPara('prof-painel-questoes');
    this.renderQuestoes();
  },

  // ── Importar ──────────────────────────────────────────────────────────────
  abrirModalImportar() {
    this._importarOrigem   = 'banco';
    this._importarQuestoes = [];
    document.getElementById('modal-importar').classList.add('ativo');
    document.getElementById('import-turma-sel').style.display = 'none';
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
      btnBanco.className = 'btn btn-ouro btn-sm';
      btnTurma.className = 'btn btn-ghost btn-sm';
      selTurma.style.display = 'none';
    } else {
      btnBanco.className = 'btn btn-ghost btn-sm';
      btnTurma.className = 'btn btn-ouro btn-sm';
      selTurma.style.display = 'block';
      const lista = this._getLista().filter(c => c !== this._estado.turma?.codigo);
      const sel   = document.getElementById('import-turma-cod');
      sel.innerHTML = lista.map(cod => {
        const t = this._getTurma(cod);
        return t ? `<option value="${cod}">${t.nome} (${cod})</option>` : '';
      }).join('');
    }
    this.carregarQuestoesImportar();
  },

  carregarQuestoesImportar() {
    const materia = document.getElementById('import-materia').value;
    const lista   = document.getElementById('import-lista');

    if (this._importarOrigem === 'banco') {
      const banco = (typeof Quiz !== 'undefined' && Quiz.banco) ? Quiz.banco : [];
      this._importarQuestoes = banco.filter(q => normalizar(q.category) === normalizar(materia));
    } else {
      const cod   = document.getElementById('import-turma-cod').value;
      const turma = this._getTurma(cod);
      this._importarQuestoes = turma
        ? turma.questoes.filter(q => q.category === materia)
        : [];
    }

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
      <div style="display:flex;align-items:flex-start;padding:10px 12px;border-radius:8px;
                  transition:background .15s"
           onmouseover="this.style.background='rgba(255,255,255,0.04)'"
           onmouseout="this.style.background='transparent'">
        <span style="flex:1;font-size:0.88rem;line-height:1.4;padding-right:12px">${sanitizar(q.text)}</span>
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
    const marcados = document.querySelectorAll(
      '#import-lista input[type="checkbox"]:not(#import-selecionar-todos):checked').length;
    const total = document.querySelectorAll(
      '#import-lista input[type="checkbox"]:not(#import-selecionar-todos)').length;
    document.getElementById('import-contador').textContent =
      `${marcados} selecionada${marcados !== 1 ? 's' : ''}`;
    const chkTodos = document.getElementById('import-selecionar-todos');
    if (chkTodos) chkTodos.checked = total > 0 && marcados === total;
  },

  executarImportacao() {
    const selecionados = [...document.querySelectorAll(
      '#import-lista input[type="checkbox"]:not(#import-selecionar-todos):checked')]
      .map(cb => parseInt(cb.dataset.idx));

    if (!selecionados.length) { mostrarToast('Selecione ao menos uma questão!', 'erro'); return; }

    const materia   = document.getElementById('import-materia').value;
    const turma     = this._estado.turma;
    const jaExistem = turma.questoes.filter(q => q.category === materia).length;

    if (jaExistem + selecionados.length > 4) {
      mostrarToast(`Limite de 4 questões! (${jaExistem} já cadastradas)`, 'erro'); return;
    }

    selecionados.forEach(idx => {
      const q = this._importarQuestoes[idx];
      turma.questoes.push({
        id:            Date.now() + Math.random(),
        category:      materia,
        text:          q.text,
        answers:       [...q.answers],
        correct_index: q.correct_index
      });
    });

    this._salvar(turma);
    this._estado.turma = turma;
    this.fecharModalImportar();
    this.renderQuestoes();
    mostrarToast(`${selecionados.length} questão${selecionados.length !== 1 ? 'ões' : ''} importada${selecionados.length !== 1 ? 's' : ''}!`);
  }
};