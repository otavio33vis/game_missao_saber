/**
 * session.js — Missão Saber
 * Gerencia o estado da sessão do aluno durante o jogo.
 * Depende de: utils.js
 */
const Session = {
  nomeAluno:      '',
  sobrenomeAluno: '',
  codigoTurma:    '',
  turmaId:        null,
  alunoId:        null,
  mundoAtual:     '',
  _notas:         {},

  // ── Notas ─────────────────────────────────────────────────────────────────
  salvarNota(mundo, nota) { this._notas[mundo] = nota; },
  obterNota(mundo)        { return this._notas[mundo] ?? 0; },
  totalCompletos()        { return Object.keys(this._notas).length; },

  calcularMedia() {
    const vals = Object.values(this._notas);
    if (!vals.length) return 0;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  },

  // ── Reset ──────────────────────────────────────────────────────────────────
  resetar() {
    this.mundoAtual     = '';
    this.turmaId        = null;
    this.alunoId        = null;
    this._notas         = {};
  },

  // ── Exportar resultado para API ───────────────────────────────────────────
  exportar() {
    return {
      nome:         this.nomeAluno,
      sobrenome:    this.sobrenomeAluno || null,
      turma_codigo: this.codigoTurma !== 'Livre' ? this.codigoTurma : null,
      turma_id:     this.turmaId,
      aluno_id:     this.alunoId,
      notas:        { ...this._notas },
      media:        this.calcularMedia(),
      data:         new Date().toISOString()
    };
  }
};