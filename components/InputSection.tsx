
import React, { useRef, useState, useMemo } from 'react';
import { Upload, Plus, Trash2, Zap, Sparkles, Loader2, Link2, CheckCircle, BarChart3, AlertTriangle, FileSpreadsheet, Server, Table, Target, Calculator, Database, Code2, Palette, Calendar, History, User, Rocket } from 'lucide-react';
import { AppState, ClientBriefing, ActionPlanItem, PlatformConfig, GoogleAdsAPIData } from '../types';
import { generateStrategicActionPlan, parseBriefingWithAI, getMockGoogleAdsData } from '../services/geminiService';

interface InputSectionProps {
  briefing: ClientBriefing;
  setBriefing: React.Dispatch<React.SetStateAction<ClientBriefing>>;
  actionPlan: ActionPlanItem[];
  setActionPlan: (a: ActionPlanItem[]) => void;
  
  // Date Period
  reportPeriod: AppState['reportPeriod'];
  setReportPeriod: (p: AppState['reportPeriod']) => void;

  // Previous Reports
  previousReportsFiles: File[];
  setPreviousReportsFiles: (f: File[]) => void;
  
  // Database Indicator
  dbHistoryAvailable?: boolean;

  // Meta Logs
  metaFiles: File[];
  setMetaFiles: (f: File[]) => void;
  
  // Meta Performance
  metaPerformanceFiles: File[];
  setMetaPerformanceFiles: (f: File[]) => void;
  metaSheetUrl: string;
  setMetaSheetUrl: (url: string) => void;
  metaSheetContent: string | null;
  setMetaSheetContent: (c: string | null) => void;

  // Google Logs
  googleFiles: File[];
  setGoogleFiles: (f: File[]) => void;
  
  // Real Data Files
  googleKeywordsFile: File | null;
  setGoogleKeywordsFile: (f: File | null) => void;
  googleSearchTermsFile: File | null;
  setGoogleSearchTermsFile: (f: File | null) => void;
  googleAdsFile: File | null;
  setGoogleAdsFile: (f: File | null) => void;

  // Onboarding
  clientHasHistory: boolean;
  setClientHasHistory: (h: boolean) => void;
  onboardingHistoryFiles: File[];
  setOnboardingHistoryFiles: (f: File[]) => void;
  onRunOnboarding: () => void;

  onGenerate: () => void;
  onRunAudit: () => void;
  onGenerateCreative: () => void;
  isGenerating: boolean;
  isConnected: boolean;
  onConnect: () => void;
  dataSourceMode: 'demo' | 'real' | 'api_bridge';
  setDataSourceMode: (m: 'demo' | 'real' | 'api_bridge') => void;
}

export const InputSection: React.FC<InputSectionProps> = ({
  briefing,
  setBriefing,
  actionPlan,
  setActionPlan,
  reportPeriod,
  setReportPeriod,
  previousReportsFiles,
  setPreviousReportsFiles,
  dbHistoryAvailable,
  metaFiles,
  setMetaFiles,
  metaPerformanceFiles,
  setMetaPerformanceFiles,
  metaSheetUrl,
  setMetaSheetUrl,
  metaSheetContent,
  setMetaSheetContent,
  googleFiles,
  setGoogleFiles,
  
  googleKeywordsFile,
  setGoogleKeywordsFile,
  googleSearchTermsFile,
  setGoogleSearchTermsFile,
  googleAdsFile,
  setGoogleAdsFile,

  clientHasHistory,
  setClientHasHistory,
  onboardingHistoryFiles,
  setOnboardingHistoryFiles,
  onRunOnboarding,

  onGenerate,
  onRunAudit,
  onGenerateCreative,
  isGenerating,
  isConnected,
  onConnect,
  dataSourceMode,
  setDataSourceMode
}) => {
  const metaInputRef = useRef<HTMLInputElement>(null);
  const metaPerfInputRef = useRef<HTMLInputElement>(null);
  const kwInputRef = useRef<HTMLInputElement>(null);
  const stInputRef = useRef<HTMLInputElement>(null);
  const adInputRef = useRef<HTMLInputElement>(null);
  const prevReportsInputRef = useRef<HTMLInputElement>(null);
  const onboardingInputRef = useRef<HTMLInputElement>(null);

  const [isPlanning, setIsPlanning] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [metaPerfMode, setMetaPerfMode] = useState<'csv' | 'sheets'>('sheets');
  const [isFetchingSheet, setIsFetchingSheet] = useState(false);
  
  // API Bridge State
  const [apiJsonInput, setApiJsonInput] = useState("");
  const [apiData, setApiData] = useState<GoogleAdsAPIData | null>(null);

  // Calculate Totals
  const totals = useMemo(() => {
    let totalMonthly = 0;
    const platforms = briefing.platforms;
    
    if (platforms.meta.enabled) totalMonthly += Number(platforms.meta.budget) || 0;
    if (platforms.google.enabled) totalMonthly += Number(platforms.google.budget) || 0;
    if (platforms.linkedin.enabled) totalMonthly += Number(platforms.linkedin.budget) || 0;
    if (platforms.tiktok.enabled) totalMonthly += Number(platforms.tiktok.budget) || 0;

    return {
      monthly: totalMonthly,
      daily: totalMonthly / 30.4 // Standard average days in month
    };
  }, [briefing.platforms]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'metaLog' | 'metaPerf' | 'google' | 'prevReports' | 'onboarding') => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      if (type === 'metaLog') setMetaFiles([...metaFiles, ...newFiles]);
      else if (type === 'metaPerf') setMetaPerformanceFiles([...metaPerformanceFiles, ...newFiles]);
      else if (type === 'prevReports') setPreviousReportsFiles([...previousReportsFiles, ...newFiles]);
      else if (type === 'onboarding') setOnboardingHistoryFiles([...onboardingHistoryFiles, ...newFiles]);
      else setGoogleFiles([...googleFiles, ...newFiles]);
    }
  };

  const removeFile = (index: number, type: 'metaLog' | 'metaPerf' | 'google' | 'prevReports' | 'onboarding') => {
    if (type === 'metaLog') {
      const nf = [...metaFiles];
      nf.splice(index, 1);
      setMetaFiles(nf);
    } else if (type === 'metaPerf') {
      const nf = [...metaPerformanceFiles];
      nf.splice(index, 1);
      setMetaPerformanceFiles(nf);
    } else if (type === 'prevReports') {
        const nf = [...previousReportsFiles];
        nf.splice(index, 1);
        setPreviousReportsFiles(nf);
    } else if (type === 'onboarding') {
        const nf = [...onboardingHistoryFiles];
        nf.splice(index, 1);
        setOnboardingHistoryFiles(nf);
    } else {
      const nf = [...googleFiles];
      nf.splice(index, 1);
      setGoogleFiles(nf);
    }
  };

  const addActionItem = () => {
    setActionPlan([
      ...actionPlan,
      { id: Date.now().toString(), description: '', status: 'Pending', deadline: '' }
    ]);
  };

  const updateActionItem = (index: number, field: keyof ActionPlanItem, value: string) => {
    const newPlan = [...actionPlan];
    newPlan[index] = { ...newPlan[index], [field]: value };
    setActionPlan(newPlan);
  };

  const removeActionItem = (index: number) => {
    const newPlan = [...actionPlan];
    newPlan.splice(index, 1);
    setActionPlan(newPlan);
  };

  const updatePlatformConfig = (platform: keyof ClientBriefing['platforms'], field: keyof PlatformConfig, value: any) => {
    setBriefing({
      ...briefing,
      platforms: {
        ...briefing.platforms,
        [platform]: {
          ...briefing.platforms[platform],
          [field]: value
        }
      }
    });
  };

  const handleAutoGeneratePlan = async () => {
    const apiKey = process.env.API_KEY || (document.querySelector('input[type="password"]') as HTMLInputElement)?.value;
    
    if (!apiKey && !process.env.API_KEY) {
      alert("Por favor, insira sua chave de API nas Configurações primeiro.");
      return;
    }

    if (!briefing.objective || briefing.objective.trim() === '') {
        alert("O Plano de Ação só pode ser gerado APÓS o preenchimento do Briefing (Objetivo).");
        return;
    }

    setIsPlanning(true);
    try {
      const newItems = await generateStrategicActionPlan(
          apiKey || '', 
          briefing,
          metaPerformanceFiles,
          metaSheetContent,
          previousReportsFiles,
          {
            keywords: dataSourceMode === 'real' ? googleKeywordsFile : null,
            searchTerms: dataSourceMode === 'real' ? googleSearchTermsFile : null,
            ads: dataSourceMode === 'real' ? googleAdsFile : null,
            apiData: dataSourceMode === 'api_bridge' ? apiData : null
          }
      );
      setActionPlan([...actionPlan, ...newItems]);
    } catch (e) {
      alert("Falha ao gerar plano. Tente novamente.");
    } finally {
      setIsPlanning(false);
    }
  };

  const handleSmartPaste = async () => {
    if (!briefing.rawInput?.trim()) return;
    
    const apiKey = process.env.API_KEY || (document.querySelector('input[type="password"]') as HTMLInputElement)?.value;
    if (!apiKey) {
      alert("Por favor, insira sua chave de API nas Configurações primeiro.");
      return;
    }

    setIsParsing(true);
    try {
      const parsed = await parseBriefingWithAI(apiKey, briefing.rawInput);
      setBriefing(prev => ({
        ...prev,
        ...parsed,
        platforms: {
          ...prev.platforms,
          ...(parsed.platforms || {})
        }
      }));
    } catch (e) {
      alert("Falha ao analisar o briefing.");
    } finally {
      setIsParsing(false);
    }
  };

  const fetchSheet = async () => {
    if (!metaSheetUrl) return;
    setIsFetchingSheet(true);
    try {
      const response = await fetch(metaSheetUrl);
      if (!response.ok) throw new Error("A resposta da rede não foi ok");
      const text = await response.text();
      setMetaSheetContent(text);
    } catch (error) {
      console.error(error);
      alert("Falha ao buscar Google Sheet. \n\nCertifique-se de: \n1. Arquivo > Compartilhar > Publicar na Web \n2. Selecione 'Valores separados por vírgula (.csv)' \n3. Copie o link gerado.");
    } finally {
      setIsFetchingSheet(false);
    }
  };

  const handleLoadMockData = () => {
      const mock = getMockGoogleAdsData();
      setApiData(mock);
      setApiJsonInput(JSON.stringify(mock, null, 2));
  };

  const handleParseApiJson = () => {
      try {
          const parsed = JSON.parse(apiJsonInput);
          setApiData(parsed);
      } catch (e) {
          alert("Formato JSON inválido. Cole uma resposta válida da API do Google Ads.");
      }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Central de Comando</h2>
          <p className="text-slate-500">Configure parâmetros, integre plataformas e audite a performance.</p>
        </div>

        {/* DATE PICKER HEADER */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="flex flex-col">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 mb-1">
                    <Calendar className="w-3 h-3" /> Data Inicial
                </label>
                <input 
                    type="date" 
                    value={reportPeriod.start}
                    onChange={(e) => setReportPeriod({ ...reportPeriod, start: e.target.value })}
                    className="text-sm font-semibold text-slate-700 bg-transparent outline-none cursor-pointer"
                />
            </div>
            <div className="h-8 w-px bg-slate-200"></div>
            <div className="flex flex-col">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 mb-1">
                    <Calendar className="w-3 h-3" /> Data Final
                </label>
                <input 
                    type="date" 
                    value={reportPeriod.end}
                    onChange={(e) => setReportPeriod({ ...reportPeriod, end: e.target.value })}
                    className="text-sm font-semibold text-slate-700 bg-transparent outline-none cursor-pointer"
                />
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Col: Briefing & Integrations */}
        <div className="space-y-6">
          
          {/* 1. SMART BRIEFING */}
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-brand-500 rounded-full"></span>
              Briefing do Cliente
            </h3>
            
            {/* Smart Paste Area */}
            <div className="mb-6">
               <div className="flex items-center justify-between mb-2">
                 <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cola Rápida (WhatsApp/Email)</label>
                 <button 
                  onClick={handleSmartPaste}
                  disabled={isParsing || !briefing.rawInput}
                  className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded border border-indigo-100 flex items-center gap-1 hover:bg-indigo-100 disabled:opacity-50"
                 >
                   {isParsing ? <Loader2 className="w-3 h-3 animate-spin"/> : <Sparkles className="w-3 h-3" />}
                   Preencher Automático
                 </button>
               </div>
               <textarea
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 placeholder:text-slate-400"
                  rows={3}
                  placeholder="Cole a mensagem do cliente aqui... ex: 'Clínica em SP, verba de 5k, foco em pós-operatório...'"
                  value={briefing.rawInput || ''}
                  onChange={(e) => setBriefing({ ...briefing, rawInput: e.target.value })}
               />
            </div>

            <div className="space-y-4 border-t border-slate-100 pt-4">
              {/* Nome do Cliente */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                   <User className="w-4 h-4 text-slate-400" />
                   Nome do Cliente / Projeto
                </label>
                <input
                  type="text"
                  placeholder="ex: Clínica Oxy Prime"
                  className="w-full p-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 font-semibold text-slate-800"
                  value={briefing.clientName}
                  onChange={(e) => setBriefing({ ...briefing, clientName: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Objetivo do Negócio</label>
                <textarea
                  className="w-full p-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  rows={2}
                  value={briefing.objective}
                  onChange={(e) => setBriefing({ ...briefing, objective: e.target.value })}
                />
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                 <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Público Alvo</label>
                  <input
                    type="text"
                    placeholder="ex: Mulheres 25-45, renda alta..."
                    className="w-full p-2 border border-slate-300 rounded-md text-sm"
                    value={briefing.targetAudience}
                    onChange={(e) => setBriefing({ ...briefing, targetAudience: e.target.value })}
                  />
                </div>
                 <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Concorrentes / Benchmarks</label>
                  <input
                    type="text"
                    placeholder="ex: Concorrente A, Clínica B..."
                    className="w-full p-2 border border-slate-300 rounded-md text-sm"
                    value={briefing.competitors}
                    onChange={(e) => setBriefing({ ...briefing, competitors: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Prioridades</label>
                  <input
                    type="text"
                    className="w-full p-2 border border-slate-300 rounded-md text-sm"
                    value={briefing.priorities}
                    onChange={(e) => setBriefing({ ...briefing, priorities: e.target.value })}
                  />
                </div>
                 <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Restrições</label>
                  <input
                    type="text"
                    className="w-full p-2 border border-slate-300 rounded-md text-sm"
                    value={briefing.restrictions}
                    onChange={(e) => setBriefing({ ...briefing, restrictions: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* 2. INVESTMENT MATRIX */}
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
             <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-emerald-500" />
                  Matriz de Investimento & Metas
                </h3>
             </div>
             
             <div className="p-0">
                <table className="w-full text-sm text-left">
                  <thead className="bg-white text-slate-500 border-b border-slate-100">
                    <tr>
                      <th className="p-3 font-medium w-10 text-center">Ativo</th>
                      <th className="p-3 font-medium">Plataforma</th>
                      <th className="p-3 font-medium w-32">Verba (Mês)</th>
                      <th className="p-3 font-medium w-24">CPA Alvo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {/* Meta */}
                    <tr className={briefing.platforms.meta.enabled ? 'bg-white' : 'bg-slate-50 opacity-60'}>
                      <td className="p-3 text-center">
                        <input type="checkbox" checked={briefing.platforms.meta.enabled} onChange={(e) => updatePlatformConfig('meta', 'enabled', e.target.checked)} className="rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
                      </td>
                      <td className="p-3 font-medium text-slate-700">Meta Ads</td>
                      <td className="p-3">
                        <div className="relative">
                          <span className="absolute left-2 top-1.5 text-slate-400 text-xs">R$</span>
                          <input type="number" value={briefing.platforms.meta.budget} onChange={(e) => updatePlatformConfig('meta', 'budget', e.target.value)} disabled={!briefing.platforms.meta.enabled} className="w-full pl-6 py-1 border border-slate-200 rounded text-xs" />
                        </div>
                      </td>
                      <td className="p-3">
                        <input type="number" value={briefing.platforms.meta.targetCPA} onChange={(e) => updatePlatformConfig('meta', 'targetCPA', e.target.value)} disabled={!briefing.platforms.meta.enabled} className="w-full p-1 border border-slate-200 rounded text-xs" placeholder="45.00" />
                      </td>
                    </tr>

                    {/* Google */}
                    <tr className={briefing.platforms.google.enabled ? 'bg-white' : 'bg-slate-50 opacity-60'}>
                      <td className="p-3 text-center">
                        <input type="checkbox" checked={briefing.platforms.google.enabled} onChange={(e) => updatePlatformConfig('google', 'enabled', e.target.checked)} className="rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
                      </td>
                      <td className="p-3 font-medium text-slate-700">Google Ads</td>
                      <td className="p-3">
                         <div className="relative">
                          <span className="absolute left-2 top-1.5 text-slate-400 text-xs">R$</span>
                          <input type="number" value={briefing.platforms.google.budget} onChange={(e) => updatePlatformConfig('google', 'budget', e.target.value)} disabled={!briefing.platforms.google.enabled} className="w-full pl-6 py-1 border border-slate-200 rounded text-xs" />
                        </div>
                      </td>
                      <td className="p-3">
                         <input type="number" value={briefing.platforms.google.targetCPA} onChange={(e) => updatePlatformConfig('google', 'targetCPA', e.target.value)} disabled={!briefing.platforms.google.enabled} className="w-full p-1 border border-slate-200 rounded text-xs" placeholder="60.00" />
                      </td>
                    </tr>

                    {/* LinkedIn */}
                    <tr className={briefing.platforms.linkedin.enabled ? 'bg-white' : 'bg-slate-50 opacity-60'}>
                      <td className="p-3 text-center">
                        <input type="checkbox" checked={briefing.platforms.linkedin.enabled} onChange={(e) => updatePlatformConfig('linkedin', 'enabled', e.target.checked)} className="rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
                      </td>
                      <td className="p-3 font-medium text-slate-700">LinkedIn Ads</td>
                      <td className="p-3">
                         <div className="relative">
                          <span className="absolute left-2 top-1.5 text-slate-400 text-xs">R$</span>
                          <input type="number" value={briefing.platforms.linkedin.budget} onChange={(e) => updatePlatformConfig('linkedin', 'budget', e.target.value)} disabled={!briefing.platforms.linkedin.enabled} className="w-full pl-6 py-1 border border-slate-200 rounded text-xs" />
                        </div>
                      </td>
                      <td className="p-3">
                         <input type="number" value={briefing.platforms.linkedin.targetCPA} onChange={(e) => updatePlatformConfig('linkedin', 'targetCPA', e.target.value)} disabled={!briefing.platforms.linkedin.enabled} className="w-full p-1 border border-slate-200 rounded text-xs" placeholder="0.00" />
                      </td>
                    </tr>

                    {/* TikTok */}
                    <tr className={briefing.platforms.tiktok.enabled ? 'bg-white' : 'bg-slate-50 opacity-60'}>
                      <td className="p-3 text-center">
                        <input type="checkbox" checked={briefing.platforms.tiktok.enabled} onChange={(e) => updatePlatformConfig('tiktok', 'enabled', e.target.checked)} className="rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
                      </td>
                      <td className="p-3 font-medium text-slate-700">TikTok Ads</td>
                      <td className="p-3">
                         <div className="relative">
                          <span className="absolute left-2 top-1.5 text-slate-400 text-xs">R$</span>
                          <input type="number" value={briefing.platforms.tiktok.budget} onChange={(e) => updatePlatformConfig('tiktok', 'budget', e.target.value)} disabled={!briefing.platforms.tiktok.enabled} className="w-full pl-6 py-1 border border-slate-200 rounded text-xs" />
                        </div>
                      </td>
                      <td className="p-3">
                         <input type="number" value={briefing.platforms.tiktok.targetCPA} onChange={(e) => updatePlatformConfig('tiktok', 'targetCPA', e.target.value)} disabled={!briefing.platforms.tiktok.enabled} className="w-full p-1 border border-slate-200 rounded text-xs" placeholder="0.00" />
                      </td>
                    </tr>
                  </tbody>
                </table>
             </div>

             {/* Totalizer Footer */}
             <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
                <div className="text-xs text-slate-400">
                  Calculado baseado nas plataformas ativas.
                </div>
                <div className="flex gap-6 text-right">
                  <div>
                     <div className="text-[10px] text-slate-400 uppercase tracking-wider">Invest. Médio Diário</div>
                     <div className="text-lg font-mono font-bold text-emerald-400">R$ {totals.daily.toFixed(2)}</div>
                  </div>
                  <div className="border-l border-slate-700 pl-6">
                     <div className="text-[10px] text-slate-400 uppercase tracking-wider">Total Mensal</div>
                     <div className="text-xl font-bold">R$ {totals.monthly.toFixed(2)}</div>
                  </div>
                </div>
             </div>
          </section>

          {/* 3. NEW CLIENT DIAGNOSTIC / ONBOARDING */}
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-5">
                <Rocket className="w-24 h-24 text-orange-500" />
             </div>
             <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2 relative z-10">
              <span className="w-1 h-6 bg-orange-500 rounded-full"></span>
              Diagnóstico Inicial (Onboarding)
            </h3>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 relative z-10">
               <div className="flex items-center gap-3 mb-4">
                   <div className="bg-white p-2 rounded shadow-sm">
                       <History className="w-6 h-6 text-orange-600" />
                   </div>
                   <div>
                       <h4 className="font-semibold text-sm text-slate-800">Ponto de Partida</h4>
                       <p className="text-xs text-slate-500">Defina se o cliente já possui dados ou é zero-to-one.</p>
                   </div>
               </div>

               {/* Toggle History */}
               <div className="bg-white rounded-lg border border-slate-200 p-1 flex mb-4">
                    <button 
                        onClick={() => setClientHasHistory(false)}
                        className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded transition-colors ${!clientHasHistory ? 'bg-orange-50 text-orange-700 border border-orange-100' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <Sparkles className="w-3 h-3" /> Conta Nova (Zero)
                    </button>
                    <button 
                         onClick={() => setClientHasHistory(true)}
                        className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded transition-colors ${clientHasHistory ? 'bg-orange-50 text-orange-700 border border-orange-100' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <Database className="w-3 h-3" /> Cliente com Histórico
                    </button>
                </div>

                {clientHasHistory && (
                  <div className="space-y-3 animate-in fade-in">
                      <div className="text-xs text-slate-600 mb-2">
                        Faça upload de relatórios CSV contendo dados de pelo menos 90 dias (ou Vitalício) para análise de tendência (Total vs 3 Meses vs 30 Dias).
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="file" ref={onboardingInputRef} hidden accept=".csv" onChange={(e) => handleFileChange(e, 'onboarding')} multiple />
                        <button onClick={() => onboardingInputRef.current?.click()} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded text-xs text-slate-600 hover:bg-slate-50 w-full text-left">
                           <Upload className="w-4 h-4 text-orange-500" />
                           Upload Histórico Completo (.csv)
                        </button>
                      </div>
                       <div className="space-y-2">
                         {onboardingHistoryFiles.map((file, idx) => (
                           <div key={idx} className="flex items-center justify-between bg-white p-2 rounded border border-slate-200 text-xs">
                             <span className="truncate max-w-[200px]">{file.name}</span>
                             <button onClick={() => removeFile(idx, 'onboarding')} className="text-red-500"><Trash2 className="w-3 h-3"/></button>
                           </div>
                         ))}
                       </div>
                  </div>
                )}
                
                <div className="mt-4 pt-4 border-t border-slate-200">
                    <button 
                        onClick={onRunOnboarding}
                        disabled={isGenerating}
                        className="w-full flex items-center justify-center gap-2 bg-orange-600 text-white text-xs font-semibold px-3 py-2.5 rounded shadow hover:bg-orange-500 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {isGenerating ? <Loader2 className="w-3 h-3 animate-spin"/> : <Rocket className="w-3 h-3" />}
                        Gerar Diagnóstico & Guide de Peças
                    </button>
                </div>
            </div>
          </section>

          {/* 4. META ADS DATA INTELLIGENCE */}
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-5">
                <Target className="w-24 h-24 text-teal-500" />
             </div>
             <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2 relative z-10">
              <span className="w-1 h-6 bg-teal-500 rounded-full"></span>
              Inteligência de Dados Meta Ads
            </h3>
            {/* ... Existing Meta Content ... */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 relative z-10">
               <div className="flex items-center gap-3 mb-4">
                  <div className="bg-white p-2 rounded shadow-sm">
                      <img src="https://upload.wikimedia.org/wikipedia/commons/7/7b/Meta_Platforms_Inc._logo.svg" alt="Meta" className="w-6 h-6" />
                  </div>
                  <div>
                      <h4 className="font-semibold text-sm text-slate-800">Dados de Performance</h4>
                      <p className="text-xs text-slate-500">Importe relatórios de CPA, ROAS, CTR</p>
                  </div>
               </div>

               {/* Meta Data Mode Toggle */}
                <div className="bg-white rounded-lg border border-slate-200 p-1 flex mb-4">
                    <button 
                        onClick={() => setMetaPerfMode('sheets')}
                        className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded transition-colors ${metaPerfMode === 'sheets' ? 'bg-teal-50 text-teal-700 border border-teal-100' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <FileSpreadsheet className="w-3 h-3" /> Google Sheets
                    </button>
                    <button 
                         onClick={() => setMetaPerfMode('csv')}
                        className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded transition-colors ${metaPerfMode === 'csv' ? 'bg-teal-50 text-teal-700 border border-teal-100' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <Table className="w-3 h-3" /> Relatórios CSV
                    </button>
                </div>

                {metaPerfMode === 'sheets' ? (
                   <div className="space-y-3 animate-in fade-in">
                       <div className="flex gap-2">
                         <input 
                           type="text" 
                           className="flex-1 text-xs p-2 border border-slate-300 rounded"
                           placeholder="https://docs.google.com/spreadsheets/.../pub?output=csv"
                           value={metaSheetUrl}
                           onChange={(e) => setMetaSheetUrl(e.target.value)}
                         />
                         <button 
                           onClick={fetchSheet}
                           disabled={isFetchingSheet || !metaSheetUrl}
                           className="bg-teal-600 text-white px-3 py-1 rounded text-xs hover:bg-teal-500 disabled:opacity-50"
                         >
                           {isFetchingSheet ? <Loader2 className="w-3 h-3 animate-spin"/> : "Buscar"}
                         </button>
                       </div>
                       {metaSheetContent ? (
                          <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 p-2 rounded border border-emerald-100">
                             <CheckCircle className="w-3 h-3" />
                             <span>Planilha carregada com sucesso</span>
                             <button onClick={() => setMetaSheetContent(null)} className="ml-auto text-slate-400 hover:text-red-500"><Trash2 className="w-3 h-3"/></button>
                          </div>
                       ) : (
                         <div className="text-[10px] text-slate-500 leading-tight">
                            <strong>Como usar:</strong> No Google Sheets, vá em <span className="font-mono bg-slate-100 px-1">Arquivo</span> {'>'} <span className="font-mono bg-slate-100 px-1">Compartilhar</span> {'>'} <span className="font-mono bg-slate-100 px-1">Publicar na web</span>. Selecione "Valores separados por vírgula (.csv)" e copie o link.
                         </div>
                       )}
                    </div>
                ) : (
                    <div className="space-y-3 animate-in fade-in">
                       <div className="flex items-center gap-2">
                        <input type="file" ref={metaPerfInputRef} hidden accept=".csv" onChange={(e) => handleFileChange(e, 'metaPerf')} multiple />
                        <button onClick={() => metaPerfInputRef.current?.click()} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded text-xs text-slate-600 hover:bg-slate-50 w-full text-left">
                           <Upload className="w-4 h-4 text-teal-500" />
                           Upload Relatório Performance (.csv)
                        </button>
                      </div>
                       <div className="space-y-2">
                         {metaPerformanceFiles.map((file, idx) => (
                           <div key={idx} className="flex items-center justify-between bg-white p-2 rounded border border-slate-200 text-xs">
                             <span className="truncate max-w-[200px]">{file.name}</span>
                             <button onClick={() => removeFile(idx, 'metaPerf')} className="text-red-500"><Trash2 className="w-3 h-3"/></button>
                           </div>
                         ))}
                       </div>
                    </div>
                )}
            </div>
          </section>

          {/* 5. GOOGLE ADS INTEGRATION */}
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative overflow-hidden transition-all duration-300">
             <div className="absolute top-0 right-0 p-4 opacity-10">
                <Link2 className="w-24 h-24 text-blue-500" />
             </div>
             <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2 relative z-10">
              <span className="w-1 h-6 bg-blue-500 rounded-full"></span>
              Auditoria Google Ads (Deep Dive)
            </h3>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 relative z-10">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-white p-2 rounded shadow-sm">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg" alt="Google" className="w-6 h-6" />
                        </div>
                        <div>
                            <h4 className="font-semibold text-sm text-slate-800">Modo de Conexão</h4>
                            <p className="text-xs text-slate-500">Escolha a fonte para auditoria</p>
                        </div>
                    </div>
                </div>

                {/* Integration Mode Toggle */}
                <div className="bg-white rounded-lg border border-slate-200 p-1 flex mb-4">
                    <button 
                        onClick={() => setDataSourceMode('demo')}
                        className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded transition-colors ${dataSourceMode === 'demo' ? 'bg-slate-100 text-slate-700' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <Sparkles className="w-3 h-3" /> Modo Demo
                    </button>
                    <button 
                         onClick={() => setDataSourceMode('real')}
                        className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded transition-colors ${dataSourceMode === 'real' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <Server className="w-3 h-3" /> Upload CSV
                    </button>
                    <button 
                         onClick={() => setDataSourceMode('api_bridge')}
                        className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded transition-colors ${dataSourceMode === 'api_bridge' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <Code2 className="w-3 h-3" /> API Bridge
                    </button>
                </div>

                {dataSourceMode === 'api_bridge' && (
                  <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                     <div className="text-xs text-indigo-700 bg-indigo-50 p-2 rounded border border-indigo-100 mb-2">
                       <strong>Modo API Bridge:</strong> Cole o JSON completo de seus Scripts do Google Ads ou backend para análise em tempo real.
                    </div>
                    
                    <div className="relative">
                      <textarea
                        className="w-full h-32 p-2 text-xs font-mono border border-slate-300 rounded bg-slate-100 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder='Cole o JSON aqui: { "campaigns": [...], "adGroups": [...] }'
                        value={apiJsonInput}
                        onChange={(e) => setApiJsonInput(e.target.value)}
                        onBlur={handleParseApiJson}
                      />
                       <div className="absolute bottom-2 right-2 flex gap-2">
                          <button onClick={handleLoadMockData} className="text-[10px] bg-slate-200 px-2 py-1 rounded text-slate-600 hover:bg-slate-300">Carregar Mock</button>
                       </div>
                    </div>

                    {apiData && (
                       <div className="grid grid-cols-3 gap-2 text-xs text-slate-600 bg-white p-2 rounded border border-slate-200">
                          <div className="flex flex-col items-center">
                             <span className="font-bold">{apiData.campaigns.length}</span>
                             <span className="text-[10px]">Campanhas</span>
                          </div>
                          <div className="flex flex-col items-center border-l border-slate-100">
                             <span className="font-bold">{apiData.adGroups.length}</span>
                             <span className="text-[10px]">Grupos</span>
                          </div>
                          <div className="flex flex-col items-center border-l border-slate-100">
                             <span className="font-bold">{apiData.audiences.length}</span>
                             <span className="text-[10px]">Audiências</span>
                          </div>
                       </div>
                    )}
                  </div>
                )}

                {dataSourceMode === 'real' && (
                  <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                    <div className="grid grid-cols-1 gap-2">
                      {/* Keywords Upload */}
                      <div className="flex items-center gap-2">
                        <input type="file" ref={kwInputRef} hidden accept=".csv" onChange={(e) => e.target.files && setGoogleKeywordsFile(e.target.files[0])} />
                        <button onClick={() => kwInputRef.current?.click()} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded text-xs text-slate-600 hover:bg-slate-50 w-full text-left">
                           <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                           {googleKeywordsFile ? googleKeywordsFile.name : "Upload Relatório Palavras-Chave.csv"}
                        </button>
                        {googleKeywordsFile && <button onClick={() => setGoogleKeywordsFile(null)} className="text-red-400"><Trash2 className="w-4 h-4"/></button>}
                      </div>

                      {/* Search Terms Upload */}
                      <div className="flex items-center gap-2">
                        <input type="file" ref={stInputRef} hidden accept=".csv" onChange={(e) => e.target.files && setGoogleSearchTermsFile(e.target.files[0])} />
                         <button onClick={() => stInputRef.current?.click()} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded text-xs text-slate-600 hover:bg-slate-50 w-full text-left">
                           <FileSpreadsheet className="w-4 h-4 text-amber-500" />
                           {googleSearchTermsFile ? googleSearchTermsFile.name : "Upload Relatório Termos de Pesquisa.csv"}
                        </button>
                        {googleSearchTermsFile && <button onClick={() => setGoogleSearchTermsFile(null)} className="text-red-400"><Trash2 className="w-4 h-4"/></button>}
                      </div>

                      {/* Ads Upload */}
                       <div className="flex items-center gap-2">
                        <input type="file" ref={adInputRef} hidden accept=".csv" onChange={(e) => e.target.files && setGoogleAdsFile(e.target.files[0])} />
                         <button onClick={() => adInputRef.current?.click()} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded text-xs text-slate-600 hover:bg-slate-50 w-full text-left">
                           <FileSpreadsheet className="w-4 h-4 text-blue-500" />
                           {googleAdsFile ? googleAdsFile.name : "Upload Performance Anúncios.csv"}
                        </button>
                         {googleAdsFile && <button onClick={() => setGoogleAdsFile(null)} className="text-red-400"><Trash2 className="w-4 h-4"/></button>}
                      </div>
                    </div>
                  </div>
                )}

                {dataSourceMode === 'demo' && (
                  <div className="text-xs text-slate-500 italic text-center py-2">
                    Usando dados simulados para demonstração. Mude para "API Bridge" para analisar dados reais.
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-slate-200">
                    <button 
                        onClick={() => {
                           if (dataSourceMode === 'api_bridge' && apiData) {
                             onRunAudit();
                           } else {
                             onRunAudit();
                           }
                        }}
                        disabled={isGenerating}
                        className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white text-xs font-semibold px-3 py-2.5 rounded shadow hover:bg-indigo-500 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isGenerating ? <Loader2 className="w-3 h-3 animate-spin"/> : <BarChart3 className="w-3 h-3" />}
                        {dataSourceMode === 'demo' ? 'Rodar Auditoria Demo' : 'Auditar Dados'}
                    </button>
                </div>
            </div>
          </section>

          {/* 6. LOGS DE ATIVIDADE & HISTÓRICO */}
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-purple-500 rounded-full"></span>
              Logs e Histórico (Obrigatório)
            </h3>
            
            <div className="space-y-4">
              {/* Meta History Card */}
              <div className="border border-slate-300 rounded-lg overflow-hidden">
                 <div className="bg-slate-50 p-2 border-b border-slate-200">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Histórico de Alterações (Change History)</h4>
                 </div>

                 <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                         <span className="text-xs text-slate-500">Upload CSV de logs de atividade.</span>
                        <input type="file" ref={metaInputRef} hidden accept=".csv" onChange={(e) => handleFileChange(e, 'metaLog')} multiple />
                         <button 
                            onClick={() => metaInputRef.current?.click()}
                            className="text-brand-600 text-xs font-semibold hover:underline"
                          >
                            + Adicionar Arquivo
                          </button>
                    </div>

                   <div className="space-y-2">
                     {metaFiles.length === 0 && <p className="text-xs text-slate-400 italic">Nenhum log enviado</p>}
                     {metaFiles.map((file, idx) => (
                       <div key={idx} className="flex items-center justify-between bg-white p-2 rounded border border-slate-200 text-xs">
                         <span className="truncate max-w-[200px]">{file.name}</span>
                         <button onClick={() => removeFile(idx, 'metaLog')} className="text-red-500"><Trash2 className="w-3 h-3"/></button>
                       </div>
                     ))}
                   </div>
                 </div>
              </div>

               {/* Previous Reports (Context) */}
               <div className="border border-slate-300 rounded-lg overflow-hidden border-dashed">
                 <div className="bg-slate-50 p-2 border-b border-slate-200 flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                        <History className="w-3 h-3"/> Relatórios Anteriores
                    </h4>
                    {dbHistoryAvailable && (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                        <Database className="w-3 h-3" />
                        Histórico do Banco Carregado
                      </span>
                    )}
                 </div>

                 <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                         <span className="text-xs text-slate-500">Anexe PDFs ou DOCs antigos para contexto.</span>
                        <input type="file" ref={prevReportsInputRef} hidden accept=".txt,.md,.csv,.json" onChange={(e) => handleFileChange(e, 'prevReports')} multiple />
                         <button 
                            onClick={() => prevReportsInputRef.current?.click()}
                            className="text-slate-600 text-xs font-semibold hover:underline"
                          >
                            + Anexar
                          </button>
                    </div>

                   <div className="space-y-2">
                     {previousReportsFiles.map((file, idx) => (
                       <div key={idx} className="flex items-center justify-between bg-white p-2 rounded border border-slate-200 text-xs">
                         <span className="truncate max-w-[200px]">{file.name}</span>
                         <button onClick={() => removeFile(idx, 'prevReports')} className="text-red-500"><Trash2 className="w-3 h-3"/></button>
                       </div>
                     ))}
                   </div>
                 </div>
              </div>

            </div>
          </section>
        </div>

        {/* Right Col: Action Plan */}
        <div className="space-y-6">
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-full flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
              <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <span className="w-1 h-6 bg-emerald-500 rounded-full"></span>
                Plano de Ação & Estratégia
              </h3>
              <div className="flex gap-2">
                <button 
                  onClick={handleAutoGeneratePlan}
                  disabled={isPlanning}
                  className="px-3 py-1.5 rounded-md bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200 text-xs font-medium flex items-center gap-2 transition-colors"
                  title="Analisar web para estratégias e gerar plano"
                >
                  {isPlanning ? <Loader2 className="w-3 h-3 animate-spin"/> : <Sparkles className="w-3 h-3" />}
                  Auto-Estratégia
                </button>
                <button 
                  onClick={addActionItem}
                  className="p-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto max-h-[600px] pr-2">
              {actionPlan.length === 0 && (
                <div className="text-center py-10 text-slate-400">
                  <p className="text-sm">Nenhuma ação planejada.</p>
                  <div className="flex justify-center mt-4">
                     <button onClick={handleAutoGeneratePlan} className="text-indigo-500 text-xs underline flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Gerar com IA
                     </button>
                  </div>
                </div>
              )}
              {actionPlan.map((item, index) => (
                <div key={item.id} className="bg-slate-50 p-3 rounded-lg border border-slate-200 group relative">
                  <button 
                    onClick={() => removeActionItem(index)}
                    className="absolute top-2 right-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                  <textarea
                    placeholder="Descrição da ação..."
                    className="w-full bg-transparent text-sm mb-2 border-b border-transparent focus:border-slate-300 focus:outline-none resize-none"
                    value={item.description}
                    rows={2}
                    onChange={(e) => updateActionItem(index, 'description', e.target.value)}
                  />
                  <div className="flex gap-2">
                    <select 
                      className="text-xs p-1 rounded border border-slate-200 bg-white"
                      value={item.status}
                      onChange={(e) => updateActionItem(index, 'status', e.target.value as any)}
                    >
                      <option value="Pending">Pendente</option>
                      <option value="In Progress">Em Progresso</option>
                      <option value="Completed">Concluído</option>
                    </select>
                    <input 
                      type="date"
                      className="text-xs p-1 rounded border border-slate-200 bg-white"
                      value={item.deadline}
                      onChange={(e) => updateActionItem(index, 'deadline', e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-slate-200 gap-4">
        <button
          onClick={onGenerateCreative}
          disabled={isGenerating}
          className={`flex items-center gap-2 px-6 py-4 rounded-lg font-bold text-indigo-600 border border-indigo-200 bg-indigo-50 shadow-sm transition-all hover:bg-indigo-100 active:scale-95 disabled:opacity-50`}
        >
          {isGenerating ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Palette className="w-5 h-5" />
          )}
          Gerar Estratégia Criativa
        </button>

        <button
          onClick={onGenerate}
          disabled={isGenerating || (metaFiles.length === 0 && !metaSheetContent && metaPerformanceFiles.length === 0)}
          className={`flex items-center gap-2 px-8 py-4 rounded-lg font-bold text-white shadow-lg shadow-brand-500/30 transition-all ${
            isGenerating 
              ? 'bg-slate-400 cursor-not-allowed' 
              : 'bg-brand-600 hover:bg-brand-500 hover:scale-105 active:scale-95'
          }`}
        >
          {isGenerating ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Analisando Logs...
            </>
          ) : (
            <>
              <Zap className="w-5 h-5" />
              Gerar Relatório Diário de Bordo
            </>
          )}
        </button>
      </div>
    </div>
  );
};