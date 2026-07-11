import { formatCPF, formatarTelefoneExibicao, formatCEP } from './maskUtils';
import { labelEnum } from './anamneseUtils';

// Formata uma data pura (YYYY-MM-DD) sem passar por new Date() — evita o bug de
// deslocar um dia por causa do fuso (UTC-3), já que new Date('1983-10-16') é
// interpretado como UTC 00:00 e "volta" um dia em navegadores no Brasil.
function fmtDataSimples(dataStr) {
  if (!dataStr) return '—';
  const [ano, mes, dia] = String(dataStr).split('-');
  if (!ano || !mes || !dia) return dataStr;
  return `${dia}/${mes}/${ano}`;
}

// Para timestamps completos (timestamptz) — já carregam offset, então é seguro
// usar new Date() aqui, fixando o timezone de exibição.
function fmtDataHora(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  } catch {
    return iso;
  }
}

const sim = (b) => (b === true ? 'Sim' : b === false ? 'Não' : 'Não informado');
const val = (v) => (v !== null && v !== undefined && v !== '' ? v : '—');

const LOGO_URL =
  'https://horizons-cdn.hostinger.com/6455b8f5-93cc-4165-9a60-19ac4aff1742/98628f45066337e226eec6505ab15b81.png';

function linha(label, valor) {
  return `<div class="campo"><span class="rotulo">${label}:</span> <span class="valor">${val(valor)}</span></div>`;
}

function secao(titulo, conteudoHtml) {
  return `
    <section class="secao">
      <h2>${titulo}</h2>
      <div class="grid">${conteudoHtml}</div>
    </section>
  `;
}

function montarHTML(a) {
  const interfereEm = [
    a.dor_interfere_trabalho && 'trabalho',
    a.dor_interfere_sono && 'sono',
    a.dor_interfere_atividade && 'atividade física',
    a.dor_interfere_lazer && 'lazer',
  ]
    .filter(Boolean)
    .join(', ') || '—';

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Ficha de Anamnese — ${val(a.nome_completo_informado)}</title>
<style>
  @page { size: A4; margin: 18mm 15mm; }
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, 'Segoe UI', Roboto, Arial, sans-serif;
    color: #1a2e3b;
    font-size: 11.5px;
    line-height: 1.5;
  }
  header {
    display: flex;
    align-items: center;
    gap: 16px;
    border-bottom: 2px solid #5B8FA8;
    padding-bottom: 12px;
    margin-bottom: 16px;
  }
  header img { height: 42px; }
  header h1 { font-size: 16px; margin: 0; color: #2C4A5A; }
  header p { margin: 2px 0 0; color: #5B8FA8; font-size: 11px; }
  .secao { margin-bottom: 14px; page-break-inside: avoid; }
  .secao h2 {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #5B8FA8;
    border-bottom: 1px solid #ddd;
    padding-bottom: 3px;
    margin: 0 0 6px;
  }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3px 24px; }
  .campo { break-inside: avoid; }
  .rotulo { color: #64748b; }
  .valor { color: #1a2e3b; font-weight: 500; }
  .termo-box {
    background: #f4f7f9;
    border: 1px solid #ddd;
    border-radius: 6px;
    padding: 10px 12px;
    margin-bottom: 10px;
    font-size: 10.5px;
    color: #334;
  }
  .termo-box p { margin: 0 0 6px; }
  .termo-box strong { color: #2C4A5A; }
  .assinatura-box { margin-top: 10px; }
  .assinatura-box img {
    max-width: 260px;
    max-height: 100px;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: #fff;
  }
  footer {
    margin-top: 20px;
    padding-top: 8px;
    border-top: 1px solid #ddd;
    font-size: 9.5px;
    color: #94a3b8;
    text-align: center;
  }
  @media print {
    a { text-decoration: none; color: inherit; }
  }
</style>
</head>
<body>

  <header>
    <img src="${LOGO_URL}" alt="Posturare" />
    <div>
      <h1>Ficha de Anamnese</h1>
      <p>Clínica Posturare · Movimento, Saúde e Bem-Estar</p>
    </div>
  </header>

  ${secao('Identificação', `
    ${linha('Nome completo', a.nome_completo_informado)}
    ${linha('CPF', a.cpf_informado ? formatCPF(a.cpf_informado) : '—')}
    ${linha('Telefone', a.telefone_informado ? formatarTelefoneExibicao(a.telefone_informado) : '—')}
    ${linha('Data de nascimento', fmtDataSimples(a.data_nascimento))}
    ${linha('Profissão', a.profissao)}
    ${linha('Estado civil', a.estado_civil)}
    ${linha('Como conheceu', a.como_conheceu)}
  `)}

  ${secao('Endereço', `
    ${linha('CEP', a.cep ? formatCEP(a.cep) : '—')}
    ${linha('Endereço', [a.endereco, a.endereco_numero].filter(Boolean).join(', '))}
    ${linha('Complemento', a.complemento)}
    ${linha('Bairro', a.bairro)}
    ${linha('Cidade', a.cidade)}
    ${linha('UF', a.estado)}
  `)}

  ${secao('Contato de Emergência', `
    ${linha('Nome', a.contato_emergencia_nome)}
    ${linha('Telefone', a.contato_emergencia_telefone ? formatarTelefoneExibicao(a.contato_emergencia_telefone) : '—')}
  `)}

  ${secao('Saúde', `
    ${linha('Doença diagnosticada', a.doenca_diagnosticada)}
    ${linha('Medicação contínua', a.medicacao_continua)}
    ${linha('Possui plano de saúde', sim(a.tem_plano_saude))}
    ${linha('Qual plano', a.qual_plano_saude)}
    ${linha('Plano oferece reembolso', labelEnum('plano_oferece_reembolso', a.plano_oferece_reembolso))}
    ${linha('Interesse em reembolso', labelEnum('interesse_reembolso', a.interesse_reembolso))}
  `)}

  ${secao('Contraindicações (Pilates / Drenagem Mecânica)', `
    ${linha('Gravidez ou suspeita', sim(a.contraindicacao_gravidez))}
    ${linha('Varizes/flebites/trombose', sim(a.contraindicacao_varizes_trombose))}
    ${linha('Cardíaca/hipertensão não controlada', sim(a.contraindicacao_cardiaca_hipertensao))}
    ${linha('Marcapasso/dispositivos', sim(a.contraindicacao_marcapasso))}
    ${linha('Oncológico/cirurgia < 60 dias', sim(a.contraindicacao_oncologico_cirurgia))}
    ${linha('Infecção/ferida aberta', sim(a.contraindicacao_infeccao_ferida))}
    ${linha('Renal/hepática/linfedema', sim(a.contraindicacao_renal_hepatica_linfedema))}
    ${linha('Dor/formigamento/sensibilidade', sim(a.contraindicacao_dor_formigamento))}
    ${linha('Uso de anticoagulantes', sim(a.contraindicacao_anticoagulantes))}
    ${linha('Outras condições', sim(a.contraindicacao_outras))}
    ${a.contraindicacao_outras ? linha('Qual', a.contraindicacao_outras_detalhe) : ''}
  `)}

  ${secao('Dor / Desconforto', `
    ${linha('Tem dor ou desconforto', sim(a.tem_dor_desconforto))}
    ${linha('Local', a.local_dor)}
    ${linha('Intensidade (0–10)', a.intensidade_dor)}
    ${linha('Há quanto tempo', a.tempo_dor)}
    ${linha('Interfere em', interfereEm)}
  `)}

  ${secao('Histórico', `
    ${linha('Já fez fisioterapia', sim(a.fez_fisioterapia))}
    ${linha('Queixa', a.fisio_queixa)}
    ${linha('Resultado', labelEnum('fisio_resultado', a.fisio_resultado))}
    ${linha('Interesse em fisioterapia', labelEnum('interesse_fisioterapia', a.interesse_fisioterapia))}
    ${linha('Atividade física atual', a.atividade_fisica_atual)}
    ${linha('Já praticou Pilates', sim(a.praticou_pilates))}
    ${linha('Tempo de Pilates', a.tempo_pilates)}
  `)}

  ${secao('Objetivos', `
    ${linha('Objetivo principal', labelEnum('objetivo_principal', a.objetivo_principal))}
    ${linha('Qualidade de vida', labelEnum('qualidade_vida', a.qualidade_vida))}
    ${linha('Observações adicionais', a.observacoes_adicionais)}
  `)}

  <section class="secao">
    <h2>Termo de Consentimento, Responsabilidade e LGPD</h2>
    <div class="termo-box">
      <p><strong>Termo de consentimento e LGPD</strong></p>
      <p>Declaro que as informações prestadas neste formulário são verdadeiras e completas, e autorizo a Clínica Posturare a utilizá-las exclusivamente para fins de avaliação, tratamento e acompanhamento clínico.</p>
      <p>Estou ciente de que meus dados pessoais e de saúde serão tratados em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018), armazenados de forma segura e utilizados apenas pela equipe responsável pelo meu atendimento.</p>
      <p>Posso, a qualquer momento, solicitar a correção ou exclusão dos meus dados, salvo obrigação legal de retenção.</p>
      <p><strong>Termo de Responsabilidade sobre Procedimentos</strong></p>
      <p>Fui orientado(a) sobre os benefícios, contraindicações e cuidados dos procedimentos oferecidos pela clínica (incluindo Pilates, Drenagem Linfática/Mecânica e demais terapias).</p>
      <p>Estou ciente de que os procedimentos realizados não substituem acompanhamento médico.</p>
      <p>Comunicarei qualquer desconforto imediatamente ao profissional responsável durante a sessão.</p>
      <p>Autorizo a realização dos procedimentos sob minha responsabilidade, com base nas informações de saúde declaradas neste formulário.</p>
    </div>
    <div class="grid">
      ${linha('Li e aceitei o termo acima', sim(a.aceite_termo))}
      ${linha('Autorizo uso de imagem (clínico)', sim(a.autoriza_fotos))}
      ${linha('Autorizo uso de imagem (marketing/redes sociais)', sim(a.autoriza_divulgacao_marketing))}
      ${linha('Aceite registrado em', fmtDataHora(a.aceite_em))}
    </div>
    <div class="assinatura-box">
      <div class="rotulo" style="margin-bottom:4px;">Assinatura:</div>
      ${a.assinatura_imagem ? `<img src="${a.assinatura_imagem}" alt="Assinatura" />` : val(a.assinatura_digital)}
    </div>
  </section>

  <footer>
    Documento gerado eletronicamente pela Posturare em ${fmtDataHora(new Date().toISOString())}.
    Ficha válida até ${fmtDataSimples(a.validade_ficha_em ? String(a.validade_ficha_em).slice(0, 10) : null)}.
  </footer>

</body>
</html>`;
}

/**
 * Abre uma janela com a ficha de anamnese formatada e dispara a impressão do
 * navegador (o usuário escolhe "Salvar como PDF" no diálogo). Precisa ser chamado
 * de forma síncrona a partir de um clique do usuário, senão o navegador bloqueia
 * o pop-up.
 *
 * @param {Object} anamnese - registro completo de anamnese_paciente (ou objeto equivalente)
 */
export function abrirImpressaoAnamnese(anamnese) {
  const janela = window.open('', '_blank');
  if (!janela) {
    throw new Error(
      'Não foi possível abrir a janela de impressão. Verifique se o navegador bloqueou pop-ups para este site.'
    );
  }
  const html = montarHTML(anamnese || {});
  janela.document.open();
  janela.document.write(html);
  janela.document.close();

  const disparar = () => {
    janela.focus();
    janela.print();
  };

  if (janela.document.readyState === 'complete') {
    disparar();
  } else {
    janela.onload = disparar;
    // fallback caso onload não dispare (alguns navegadores com document.write)
    setTimeout(disparar, 400);
  }
}
