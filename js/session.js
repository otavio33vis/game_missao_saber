/**
 * session.js — Missão Saber
 * Gerencia o estado da sessão do aluno durante o jogo.
 * Depende de: utils.js
 */

const Session = {
  nomeAluno:   '',
  codigoTurma: '',
  mundoAtual:  '',
  _notas:      {},

  // ── Notas ──────────────────────────────────────────────────────────────────
  salvarNota(mundo, nota) {
    this._notas[mundo] = nota;
  },

  obterNota(mundo) {
    return this._notas[mundo] ?? 0;
  },

  totalCompletos() {
    return Object.keys(this._notas).length;
  },

  calcularMedia() {
    const vals = Object.values(this._notas);
    if (!vals.length) return 0;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  },

  // ── Reset ──────────────────────────────────────────────────────────────────
  resetar() {
    this.mundoAtual  = '';
    this._notas      = {};
  },

  // ── Exportar resultado para API ───────────────────────────────────────────
  exportar() {
    return {
      nome:  this.nomeAluno,
      turma: this.codigoTurma,
      notas: { ...this._notas },
      media: this.calcularMedia(),
      data:  new Date().toISOString()
    };
  }
};
