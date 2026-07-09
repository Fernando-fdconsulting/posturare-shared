// Utilitários compartilhados para o módulo de Anamnese
// Centraliza cálculo de status para evitar divergências entre componentes.

/**
 * Calcula o status atual de anamnese para um lead a partir de seus registros.
 * @param {Array} anamneses - registros de anamnese_paciente do lead (qualquer ordem)
 * @returns {Object} { status, anamnese, diasParaVencer }
 *   status ∈ 'nunca' | 'link_pendente' | 'link_expirado' | 'valida' | 'vencendo' | 'vencida'
 */
export function getAnamneseStatus(anamneses) {
  if (!Array.isArray(anamneses) || anamneses.length === 0) {
    return { status: 'nunca', anamnese: null, diasParaVencer: null };
  }

  const agora = new Date();

  // 1) Procura a anamnese preenchida mais recente
  const preenchidas = anamneses
    .filter(a => a.preenchida_em)
    .sort((a, b) => new Date(b.preenchida_em) - new Date(a.preenchida_em));

  if (preenchidas.length > 0) {
    const ultima = preenchidas[0];
    const validade = ultima.validade_ficha_em ? new Date(ultima.validade_ficha_em) : null;

    if (!validade || validade < agora) {
      return { status: 'vencida', anamnese: ultima, diasParaVencer: null };
    }

    const dias = Math.ceil((validade - agora) / (1000 * 60 * 60 * 24));
    if (dias <= 30) {
      return { status: 'vencendo', anamnese: ultima, diasParaVencer: dias };
    }
    return { status: 'valida', anamnese: ultima, diasParaVencer: dias };
  }

  // 2) Sem preenchida — vê se há link pendente
  const linksAtivos = anamneses
    .filter(a => !a.token_usado && !a.token_invalidado_em)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  if (linksAtivos.length > 0) {
    const link = linksAtivos[0];
    const expira = link.token_expira_em ? new Date(link.token_expira_em) : null;
    if (expira && expira < agora) {
      return { status: 'link_expirado', anamnese: link, diasParaVencer: null };
    }
    return { status: 'link_pendente', anamnese: link, diasParaVencer: null };
  }

  // 3) Nada ativo
  return { status: 'nunca', anamnese: null, diasParaVencer: null };
}

/**
 * Lista pendências de revisão de campos sensíveis para um registro de anamnese.
 * Considera pendente quando o campo foi informado mas ainda não foi marcado como aprovado/rejeitado.
 * @param {Object} anamnese
 * @returns {Array<{campo, valorInformado, jaRevisado, aprovado}>}
 */
export function getPendenciasRevisao(anamnese) {
  if (!anamnese) return [];

  const pendencias = [];
  const checar = (campo, valorInformado, aprovado, aprovadoEm) => {
    if (valorInformado && valorInformado.trim() !== '') {
      pendencias.push({
        campo,
        valorInformado,
        jaRevisado: !!aprovadoEm,
        aprovado: !!aprovado,
      });
    }
  };

  checar('nome_completo', anamnese.nome_completo_informado, anamnese.nome_completo_aprovado, anamnese.nome_completo_aprovado_em);
  checar('cpf', anamnese.cpf_informado, anamnese.cpf_aprovado, anamnese.cpf_aprovado_em);
  checar('telefone', anamnese.telefone_informado, anamnese.telefone_aprovado, anamnese.telefone_aprovado_em);

  return pendencias;
}

/** Quantas pendências aguardam revisão humana (não revisadas ainda) */
export function contarPendenciasAbertas(anamnese) {
  return getPendenciasRevisao(anamnese).filter(p => !p.jaRevisado).length;
}

export const LABEL_CAMPO_SENSIVEL = {
  nome_completo: 'Nome Completo',
  cpf: 'CPF',
  telefone: 'Telefone',
};

// Labels amigáveis para valores enum dos campos CHECK constraint
export const ENUM_LABELS = {
  fisio_resultado: {
    completa: 'Melhora completa',
    parcial: 'Melhora parcial',
    nao: 'Não teve melhora',
    interrompi: 'Interrompi antes de terminar',
  },
  interesse_fisioterapia: {
    alivio_dor: 'Alívio de dor',
    prevencao_qualidade: 'Prevenção / qualidade de vida',
    orientacao: 'Orientação / avaliação',
    nao_pensou: 'Ainda não pensei',
  },
  interesse_reembolso: {
    sim: 'Sim',
    nao: 'Não',
    mais_informacoes: 'Quero mais informações',
  },
  objetivo_principal: {
    alivio_dor: 'Alívio de dor',
    reabilitacao: 'Reabilitação',
    fortalecimento: 'Fortalecimento',
    mobilidade: 'Mobilidade',
    qualidade_vida: 'Qualidade de vida',
  },
  plano_oferece_reembolso: {
    sim: 'Sim',
    nao: 'Não',
    nao_sei: 'Não sei',
  },
  qualidade_vida: {
    pessima: 'Péssima',
    ruim: 'Ruim',
    regular: 'Regular',
    boa: 'Boa',
    excelente: 'Excelente',
  },
};

export function labelEnum(campo, valor) {
  if (!valor) return null;
  return ENUM_LABELS[campo]?.[valor] || valor;
}
