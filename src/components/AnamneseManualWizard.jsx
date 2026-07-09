import React, { useState, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { X, ChevronLeft, ChevronRight, Check, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { Progress } from '../ui/progress';
import { useToast } from '../ui/use-toast';
import SignaturePad from './SignaturePad';
import { formatCPF, formatPhone, formatCEP, removeMask, validateCPF } from '../utils/maskUtils';
import { fetchAddressByCEP } from '../utils/viaCepService';

// Remove DDI 55 do telefone para edição (mantém apenas DDD + número)
const stripDDI55 = (tel) => {
  if (!tel) return '';
  const limpo = String(tel).replace(/\D/g, '');
  if (limpo.startsWith('55') && (limpo.length === 12 || limpo.length === 13)) {
    return limpo.slice(2);
  }
  return limpo;
};

/**
 * Wizard multi-step de Anamnese — reutilizável entre posturare-crm e posturare-app.
 *
 * Usa classes semânticas do shadcn (text-foreground, bg-background, border-border etc.)
 * em vez de cores fixas, para se adaptar automaticamente ao tema do app consumidor
 * (CRM = dark, posturare-app = claro/marca Posturare) via CSS variables definidas
 * no index.css de cada projeto.
 *
 * Props:
 * - dadosIniciais: { nome, cpf, telefone }    -> valores atuais do lead/cliente (pré-preencher campos sensíveis)
 * - modo: 'manual' (CRM) | 'publico' (app público)
 * - onSubmit: async (payload) => void          -> pai decide se chama RPC, insert direto, etc.
 *     payload usa os nomes de campo do banco anamnese_paciente (ex.: nome_completo_informado, cpf_informado...).
 *     Se for chamar a RPC submeter_anamnese_publica, o pai precisa remapear nome_completo_informado -> nome_completo,
 *     cpf_informado -> cpf, telefone_informado -> telefone (a RPC espera esses nomes sem o sufixo _informado).
 * - onCancel: () => void
 */
function AnamneseManualWizard({ dadosIniciais = {}, modo = 'manual', onSubmit, onCancel }) {
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);

  const [data, setData] = useState({
    nome_completo_informado: dadosIniciais.nome || '',
    cpf_informado: dadosIniciais.cpf || '',
    telefone_informado: stripDDI55(dadosIniciais.telefone),
    data_nascimento: '',
    profissao: '',
    estado_civil: '',
    como_conheceu: '',

    cep: '',
    endereco: '',
    endereco_numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',

    contato_emergencia_nome: '',
    contato_emergencia_telefone: '',

    doenca_diagnosticada: '',
    medicacao_continua: '',
    tem_plano_saude: false,
    qual_plano_saude: '',
    plano_oferece_reembolso: '',
    interesse_reembolso: '',

    tem_dor_desconforto: false,
    local_dor: '',
    intensidade_dor: '',
    tempo_dor: '',
    dor_interfere_trabalho: false,
    dor_interfere_sono: false,
    dor_interfere_atividade: false,
    dor_interfere_lazer: false,

    fez_fisioterapia: false,
    fisio_queixa: '',
    fisio_resultado: '',
    interesse_fisioterapia: '',
    atividade_fisica_atual: '',
    praticou_pilates: false,
    tempo_pilates: '',

    objetivo_principal: '',
    qualidade_vida: '',
    observacoes_adicionais: '',

    aceite_termo: false,
    autoriza_fotos: false,
    autoriza_divulgacao_marketing: false,
    assinatura_digital: '',
    assinatura_imagem: '',
  });

  const update = (campo, valor) => setData((prev) => ({ ...prev, [campo]: valor }));

  const steps = useMemo(
    () => [
      { id: 'identificacao', label: 'Identificação' },
      { id: 'endereco', label: 'Endereço & Emergência' },
      { id: 'saude', label: 'Saúde' },
      { id: 'dor', label: 'Dor / Desconforto' },
      { id: 'historico', label: 'Histórico' },
      { id: 'objetivos', label: 'Objetivos' },
      { id: 'termo', label: 'Termo & Assinatura' },
    ],
    []
  );

  const progresso = Math.round(((step + 1) / steps.length) * 100);

  const validarPasso = () => {
    const s = steps[step].id;
    if (s === 'identificacao') {
      if (!data.nome_completo_informado.trim()) return 'Nome completo é obrigatório.';
      if (!data.cpf_informado || !validateCPF(data.cpf_informado)) return 'CPF inválido.';
      if (removeMask(data.telefone_informado).length < 10) return 'Telefone inválido.';
      if (!data.data_nascimento) return 'Data de nascimento é obrigatória.';
    }
    if (s === 'objetivos') {
      if (!data.objetivo_principal) return 'Objetivo principal é obrigatório.';
    }
    if (s === 'termo') {
      if (!data.aceite_termo) return 'É necessário aceitar o termo para concluir.';
      if (!data.assinatura_imagem) return 'Assine no campo de assinatura para concluir.';
    }
    return null;
  };

  const avancar = () => {
    const erro = validarPasso();
    if (erro) {
      toast({ title: 'Verifique os campos', description: erro, variant: 'destructive' });
      return;
    }
    setStep((s) => Math.min(s + 1, steps.length - 1));
  };

  const voltar = () => setStep((s) => Math.max(s - 1, 0));

  const handleSubmit = async () => {
    const erro = validarPasso();
    if (erro) {
      toast({ title: 'Verifique os campos', description: erro, variant: 'destructive' });
      return;
    }

    const payload = {
      ...data,
      cpf_informado: removeMask(data.cpf_informado),
      telefone_informado: removeMask(data.telefone_informado),
      cep: removeMask(data.cep),
      contato_emergencia_telefone: removeMask(data.contato_emergencia_telefone),
      intensidade_dor: data.intensidade_dor ? parseInt(data.intensidade_dor, 10) : null,
      assinatura_digital: data.nome_completo_informado,
    };

    Object.keys(payload).forEach((k) => {
      if (payload[k] === '') payload[k] = null;
    });

    setSaving(true);
    try {
      await onSubmit?.(payload);
    } catch (err) {
      toast({
        title: 'Erro ao salvar',
        description: err?.message || 'Não foi possível salvar a anamnese.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCepBlur = async () => {
    const limpo = removeMask(data.cep);
    if (limpo.length !== 8) return;
    setCepLoading(true);
    try {
      const r = await fetchAddressByCEP(limpo);
      setData((prev) => ({
        ...prev,
        endereco: r.endereco || prev.endereco,
        bairro: r.bairro || prev.bairro,
        cidade: r.cidade || prev.cidade,
        estado: r.estado || prev.estado,
      }));
    } catch {
      // silencioso
    } finally {
      setCepLoading(false);
    }
  };

  const selectCls =
    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring [&_option]:text-foreground';
  const textareaCls =
    'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring';

  const renderStep = () => {
    const s = steps[step].id;
    if (s === 'identificacao') return renderIdentificacao();
    if (s === 'endereco') return renderEndereco();
    if (s === 'saude') return renderSaude();
    if (s === 'dor') return renderDor();
    if (s === 'historico') return renderHistorico();
    if (s === 'objetivos') return renderObjetivos();
    if (s === 'termo') return renderTermo();
    return null;
  };

  function renderIdentificacao() {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Nome completo *</Label>
          <Input
            value={data.nome_completo_informado}
            onChange={(e) => update('nome_completo_informado', e.target.value)}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>CPF *</Label>
            <Input
              value={formatCPF(data.cpf_informado)}
              onChange={(e) => update('cpf_informado', e.target.value)}
              placeholder="000.000.000-00"
            />
          </div>
          <div className="space-y-2">
            <Label>Telefone *</Label>
            <Input
              value={formatPhone(data.telefone_informado)}
              onChange={(e) => update('telefone_informado', e.target.value)}
              placeholder="(11) 99999-9999"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Data de nascimento *</Label>
            <Input
              type="date"
              value={data.data_nascimento}
              onChange={(e) => update('data_nascimento', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Profissão</Label>
            <Input
              value={data.profissao}
              onChange={(e) => update('profissao', e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Estado civil</Label>
            <select
              value={data.estado_civil}
              onChange={(e) => update('estado_civil', e.target.value)}
              className={selectCls}
            >
              <option value="">Selecione...</option>
              <option value="Solteiro(a)">Solteiro(a)</option>
              <option value="Casado(a)">Casado(a)</option>
              <option value="União Estável">União Estável</option>
              <option value="Divorciado(a)">Divorciado(a)</option>
              <option value="Viúvo(a)">Viúvo(a)</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Como nos conheceu?</Label>
            <select
              value={data.como_conheceu}
              onChange={(e) => update('como_conheceu', e.target.value)}
              className={selectCls}
            >
              <option value="">Selecione...</option>
              <option value="Indicação">Indicação</option>
              <option value="Instagram">Instagram</option>
              <option value="Google">Google</option>
              <option value="WhatsApp">WhatsApp</option>
              <option value="Passando em frente">Passando em frente</option>
              <option value="Convênio / Pass">Convênio / Pass</option>
              <option value="Outro">Outro</option>
            </select>
          </div>
        </div>
      </div>
    );
  }

  function renderEndereco() {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>CEP</Label>
            <div className="relative">
              <Input
                value={formatCEP(data.cep)}
                onChange={(e) => update('cep', e.target.value)}
                onBlur={handleCepBlur}
                placeholder="00000-000"
              />
              {cepLoading && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground absolute right-3 top-3" />
              )}
            </div>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Endereço</Label>
            <Input
              value={data.endereco}
              onChange={(e) => update('endereco', e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Número</Label>
            <Input
              value={data.endereco_numero}
              onChange={(e) => update('endereco_numero', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Complemento</Label>
            <Input
              value={data.complemento}
              onChange={(e) => update('complemento', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Bairro</Label>
            <Input
              value={data.bairro}
              onChange={(e) => update('bairro', e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2 sm:col-span-2">
            <Label>Cidade</Label>
            <Input
              value={data.cidade}
              onChange={(e) => update('cidade', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>UF</Label>
            <Input
              value={data.estado}
              onChange={(e) => update('estado', e.target.value.toUpperCase().slice(0, 2))}
              maxLength={2}
            />
          </div>
        </div>

        <div className="pt-4 border-t border-border">
          <h4 className="font-semibold mb-3">Contato de emergência</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={data.contato_emergencia_nome}
                onChange={(e) => update('contato_emergencia_nome', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input
                value={formatPhone(data.contato_emergencia_telefone)}
                onChange={(e) => update('contato_emergencia_telefone', e.target.value)}
                placeholder="(11) 99999-9999"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderSaude() {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Possui alguma doença diagnosticada?</Label>
          <textarea
            value={data.doenca_diagnosticada}
            onChange={(e) => update('doenca_diagnosticada', e.target.value)}
            className={textareaCls}
            placeholder="Ex.: Hipertensão, diabetes, etc. Se nenhuma, escreva 'Nenhuma'."
          />
        </div>
        <div className="space-y-2">
          <Label>Faz uso contínuo de alguma medicação?</Label>
          <textarea
            value={data.medicacao_continua}
            onChange={(e) => update('medicacao_continua', e.target.value)}
            className={textareaCls}
            placeholder="Liste medicações e dosagens. Se nenhuma, escreva 'Nenhuma'."
          />
        </div>

        <div className="pt-4 border-t border-border space-y-3">
          <label className="flex items-center gap-2">
            <Checkbox
              checked={data.tem_plano_saude}
              onCheckedChange={(v) => update('tem_plano_saude', !!v)}
            />
            Possui plano de saúde
          </label>
          {data.tem_plano_saude && (
            <div className="space-y-4 pl-6">
              <div className="space-y-2">
                <Label>Qual plano?</Label>
                <Input
                  value={data.qual_plano_saude}
                  onChange={(e) => update('qual_plano_saude', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>O plano oferece reembolso?</Label>
                  <select
                    value={data.plano_oferece_reembolso}
                    onChange={(e) => update('plano_oferece_reembolso', e.target.value)}
                    className={selectCls}
                  >
                    <option value="">Selecione...</option>
                    <option value="sim">Sim</option>
                    <option value="nao">Não</option>
                    <option value="nao_sei">Não sei</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Tem interesse em usar reembolso?</Label>
                  <select
                    value={data.interesse_reembolso}
                    onChange={(e) => update('interesse_reembolso', e.target.value)}
                    className={selectCls}
                  >
                    <option value="">Selecione...</option>
                    <option value="sim">Sim</option>
                    <option value="nao">Não</option>
                    <option value="mais_informacoes">Quero mais informações</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderDor() {
    return (
      <div className="space-y-4">
        <label className="flex items-center gap-2">
          <Checkbox
            checked={data.tem_dor_desconforto}
            onCheckedChange={(v) => update('tem_dor_desconforto', !!v)}
          />
          Sente dor ou desconforto atualmente
        </label>

        {data.tem_dor_desconforto && (
          <div className="space-y-4 pl-6">
            <div className="space-y-2">
              <Label>Local da dor</Label>
              <Input
                value={data.local_dor}
                onChange={(e) => update('local_dor', e.target.value)}
                placeholder="Ex.: lombar, cervical, joelho direito..."
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Intensidade (0–10)</Label>
                <Input
                  type="number"
                  min={0}
                  max={10}
                  value={data.intensidade_dor}
                  onChange={(e) => update('intensidade_dor', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Há quanto tempo?</Label>
                <Input
                  value={data.tempo_dor}
                  onChange={(e) => update('tempo_dor', e.target.value)}
                  placeholder="Ex.: 2 semanas, 6 meses..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>A dor interfere em:</Label>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Checkbox
                    checked={data.dor_interfere_trabalho}
                    onCheckedChange={(v) => update('dor_interfere_trabalho', !!v)}
                  />
                  Trabalho
                </label>
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Checkbox
                    checked={data.dor_interfere_sono}
                    onCheckedChange={(v) => update('dor_interfere_sono', !!v)}
                  />
                  Sono
                </label>
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Checkbox
                    checked={data.dor_interfere_atividade}
                    onCheckedChange={(v) => update('dor_interfere_atividade', !!v)}
                  />
                  Atividade física
                </label>
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Checkbox
                    checked={data.dor_interfere_lazer}
                    onCheckedChange={(v) => update('dor_interfere_lazer', !!v)}
                  />
                  Lazer
                </label>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderHistorico() {
    return (
      <div className="space-y-4">
        <label className="flex items-center gap-2">
          <Checkbox
            checked={data.fez_fisioterapia}
            onCheckedChange={(v) => update('fez_fisioterapia', !!v)}
          />
          Já fez fisioterapia anteriormente
        </label>
        {data.fez_fisioterapia && (
          <div className="space-y-4 pl-6">
            <div className="space-y-2">
              <Label>Para qual queixa?</Label>
              <Input
                value={data.fisio_queixa}
                onChange={(e) => update('fisio_queixa', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Resultado obtido</Label>
              <select
                value={data.fisio_resultado}
                onChange={(e) => update('fisio_resultado', e.target.value)}
                className={selectCls}
              >
                <option value="">Selecione...</option>
                <option value="completa">Melhora completa</option>
                <option value="parcial">Melhora parcial</option>
                <option value="nao">Não teve melhora</option>
                <option value="interrompi">Interrompi antes de terminar</option>
              </select>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label>Tem interesse em fisioterapia?</Label>
          <select
            value={data.interesse_fisioterapia}
            onChange={(e) => update('interesse_fisioterapia', e.target.value)}
            className={selectCls}
          >
            <option value="">Selecione...</option>
            <option value="alivio_dor">Alívio de dor</option>
            <option value="prevencao_qualidade">Prevenção / qualidade de vida</option>
            <option value="orientacao">Orientação / avaliação</option>
            <option value="nao_pensou">Ainda não pensei</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label>Pratica atividade física atualmente?</Label>
          <textarea
            value={data.atividade_fisica_atual}
            onChange={(e) => update('atividade_fisica_atual', e.target.value)}
            className={textareaCls}
            placeholder="Qual, frequência, há quanto tempo..."
          />
        </div>

        <div className="pt-4 border-t border-border space-y-3">
          <label className="flex items-center gap-2">
            <Checkbox
              checked={data.praticou_pilates}
              onCheckedChange={(v) => update('praticou_pilates', !!v)}
            />
            Já praticou Pilates antes
          </label>
          {data.praticou_pilates && (
            <div className="space-y-2 pl-6">
              <Label>Por quanto tempo?</Label>
              <Input
                value={data.tempo_pilates}
                onChange={(e) => update('tempo_pilates', e.target.value)}
                placeholder="Ex.: 6 meses, 2 anos..."
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderObjetivos() {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Objetivo principal *</Label>
          <select
            value={data.objetivo_principal}
            onChange={(e) => update('objetivo_principal', e.target.value)}
            className={selectCls}
          >
            <option value="">Selecione...</option>
            <option value="alivio_dor">Alívio de dor</option>
            <option value="reabilitacao">Reabilitação (pós-cirurgia, lesão)</option>
            <option value="fortalecimento">Fortalecimento / condicionamento</option>
            <option value="mobilidade">Mobilidade / flexibilidade</option>
            <option value="qualidade_vida">Qualidade de vida / bem-estar</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label>Como avalia sua qualidade de vida hoje?</Label>
          <select
            value={data.qualidade_vida}
            onChange={(e) => update('qualidade_vida', e.target.value)}
            className={selectCls}
          >
            <option value="">Selecione...</option>
            <option value="excelente">Excelente</option>
            <option value="boa">Boa</option>
            <option value="regular">Regular</option>
            <option value="ruim">Ruim</option>
            <option value="pessima">Péssima</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label>Observações adicionais</Label>
          <textarea
            value={data.observacoes_adicionais}
            onChange={(e) => update('observacoes_adicionais', e.target.value)}
            className={textareaCls}
            placeholder="Detalhes sobre seu objetivo, expectativas, ou qualquer informação relevante..."
          />
        </div>
      </div>
    );
  }

  function renderTermo() {
    return (
      <div className="space-y-4">
        <div className="p-4 rounded-md bg-muted border border-border text-sm text-muted-foreground max-h-48 overflow-y-auto">
          <p className="mb-2 font-semibold text-foreground">Termo de consentimento e LGPD</p>
          <p className="mb-2">
            Declaro que as informações prestadas neste formulário são verdadeiras e completas, e
            autorizo a Clínica Posturare a utilizá-las exclusivamente para fins de avaliação,
            tratamento e acompanhamento clínico.
          </p>
          <p className="mb-2">
            Estou ciente de que meus dados pessoais e de saúde serão tratados em conformidade com a
            Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018), armazenados de forma
            segura e utilizados apenas pela equipe responsável pelo meu atendimento.
          </p>
          <p>
            Posso, a qualquer momento, solicitar a correção ou exclusão dos meus dados, salvo
            obrigação legal de retenção.
          </p>
        </div>

        <label className="flex items-start gap-2">
          <Checkbox
            checked={data.aceite_termo}
            onCheckedChange={(v) => update('aceite_termo', !!v)}
            className="mt-1"
          />
          <span className="text-sm">
            Li e concordo com o termo de consentimento e tratamento de dados (LGPD). *
          </span>
        </label>

        <label className="flex items-start gap-2">
          <Checkbox
            checked={data.autoriza_fotos}
            onCheckedChange={(v) => update('autoriza_fotos', !!v)}
            className="mt-1"
          />
          <span className="text-sm">
            Autorizo o uso de imagens (fotos/vídeos de avaliação) para fins clínicos e de
            acompanhamento de evolução.
          </span>
        </label>

        <label className="flex items-start gap-2">
          <Checkbox
            checked={data.autoriza_divulgacao_marketing}
            onCheckedChange={(v) => update('autoriza_divulgacao_marketing', !!v)}
            className="mt-1"
          />
          <span className="text-sm">
            Autorizo o uso de minhas imagens para divulgação nas redes sociais e materiais de
            marketing da Posturare.
          </span>
        </label>

        <div className="space-y-2">
          <Label>Assinatura *</Label>
          {data.nome_completo_informado && (
            <p className="text-xs text-muted-foreground">Assinando como: {data.nome_completo_informado}</p>
          )}
          <SignaturePad
            value={data.assinatura_imagem}
            onChange={(dataUri) => update('assinatura_imagem', dataUri)}
          />
        </div>
      </div>
    );
  }

  const titulo =
    modo === 'manual'
      ? 'Preenchimento de Anamnese (manual)'
      : 'Ficha de Anamnese';

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-3xl animate-in fade-in zoom-in duration-200">
        <Card className="glass-effect flex flex-col max-h-[95vh]">
          <div className="p-4 sm:p-6 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-bold">{titulo}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Passo {step + 1} de {steps.length} · {steps[step].label}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onCancel}
              disabled={saving}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="px-4 sm:px-6 pt-4">
            <Progress value={progresso} className="h-1.5" />
          </div>

          <div className="overflow-y-auto p-4 sm:p-6">{renderStep()}</div>

          <div className="p-4 sm:p-6 border-t border-border flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={voltar}
              disabled={step === 0 || saving}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Voltar
            </Button>

            {step < steps.length - 1 ? (
              <Button
                type="button"
                onClick={avancar}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Próximo
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Concluir
                  </>
                )}
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );

  return ReactDOM.createPortal(
    modalContent,
    document.getElementById('modal-root') || document.body
  );
}

export default AnamneseManualWizard;
