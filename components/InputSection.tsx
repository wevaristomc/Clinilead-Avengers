
import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Upload, Plus, Trash2, Zap, Sparkles, Loader2, Link2, CheckCircle, BarChart3, AlertTriangle, FileSpreadsheet, Server, Table, Target, Calculator, Database, Code2, Palette, Calendar, History, User, Rocket, Search, RotateCcw, MousePointerClick, ImageIcon, Copy, StickyNote, FileText, ChevronDown, ChevronUp, BookOpen, Clipboard, TrendingUp, MapPin, Smartphone, Clock, Users, Layers, BrainCircuit, Key } from 'lucide-react';
import { AppState, ClientBriefing, ActionPlanItem, PlatformConfig, GoogleAdsAPIData, MetaAdsAPIData, SystemLog, HistoricalReport, AIProvider } from '../types';
import { generateStrategicActionPlan, parseBriefingWithAI, getMockGoogleAdsData, getMockMetaAdsData } from '../services/geminiService';
import { deleteReport } from '../services/databaseService';

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
  dbHistoryReports?: HistoricalReport[]; 
  onDeleteReport?: (id: string) => void; 
  reportCustomInstructions?: string; 
  setReportCustomInstructions?: (s: string) => void; 

  // Meta Logs
  metaFiles: File[];
  setMetaFiles: (f: File[]) => void;
  metaHistoryText?: string; 
  setMetaHistoryText?: (t: string) => void; 
  
  // Meta Performance
  metaPerformanceFiles: File[];
  setMetaPerformanceFiles: (f: File[]) => void;
  metaSheetUrl: string;
  setMetaSheetUrl: (url: string) => void;
  metaSheetContent: string | null;
  setMetaSheetContent: (c: string | null) => void;
  // Meta Demo
  metaDemographicsFile?: File | null;
  setMetaDemographicsFile?: (f: File | null) => void;
  
  // Meta API Data
  metaAdsData?: MetaAdsAPIData | null;
  setMetaAdsData?: (data: MetaAdsAPIData | null) => void;

  // Google API Data
  googleAdsData?: GoogleAdsAPIData | null;

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

  // Expanded Google Files
  googleAuctionInsightsFile?: File | null;
  setGoogleAuctionInsightsFile?: (f: File | null) => void;
  googleDevicesFile?: File | null;
  setGoogleDevicesFile?: (f: File | null) => void;
  googleAgeFile?: File | null;
  setGoogleAgeFile?: (f: File | null) => void;
  googleGenderFile?: File | null;
  setGoogleGenderFile?: (f: File | null) => void;
  googleLocationsFile?: File | null;
  setGoogleLocationsFile?: (f: File | null) => void;
  googleSchedulesFile?: File | null;
  setGoogleSchedulesFile?: (f: File | null) => void;

  // Diagnostics
  diagnosticFiles?: File[];
  setDiagnosticFiles?: (f: File[]) => void;
  diagnosticUrl?: string;
  setDiagnosticUrl?: (u: string) => void;
  diagnosticContent?: string | null;
  setDiagnosticContent?: (c: string | null) => void;

  // NEW: Clarity Files
  clarityFiles: File[];
  setClarityFiles: (f: File[]) => void;

  // Onboarding
  clientHasHistory: boolean;
  setClientHasHistory: (h: boolean) => void;
  onboardingHistoryFiles: File[];
  setOnboardingHistoryFiles: (f: File[]) => void;
  onRunOnboarding: () => void;
  
  onClearWorkspace: () => void; // Explicit Prop

  onGenerate: () => void;
  onGeneratePart?: (part: number) => void; // NEW PROP
  onGeneratePerformance?: () => void; 
  onRunAudit: () => void;
  onGenerateCreative: () => void;
  onAnalyzeCompetitors: () => void;
  
  isGenerating: boolean;
  isConnected: boolean;
  onConnect: () => void;
  dataSourceMode: 'demo' | 'real' | 'api_bridge';
  setDataSourceMode: (m: 'demo' | 'real' | 'api_bridge') => void;
  metaDataSourceMode?: 'demo' | 'csv' | 'json_bridge';
  setMetaDataSourceMode?: (m: 'demo' | 'csv' | 'json_bridge') => void;
  
  systemLogs: SystemLog[];
  apiKey?: string; 

  // NEW: AI Provider Params
  aiProvider: AIProvider;
  setAiProvider: (p: AIProvider) => void;
  openaiKey: string;
  setOpenaiKey: (k: string) => void;
  anthropicKey: string;
  setAnthropicKey: (k: string) => void;
}

export const InputSection: React.FC<InputSectionProps> = ({
  briefing, setBriefing, actionPlan, setActionPlan, reportPeriod, setReportPeriod,
  previousReportsFiles, setPreviousReportsFiles, dbHistoryAvailable, dbHistoryReports = [], onDeleteReport,
  reportCustomInstructions, setReportCustomInstructions, metaFiles, setMetaFiles, metaHistoryText, setMetaHistoryText,
  metaPerformanceFiles, setMetaPerformanceFiles, metaSheetUrl, setMetaSheetUrl, metaSheetContent, setMetaSheetContent,
  metaDemographicsFile, setMetaDemographicsFile, metaAdsData, setMetaAdsData, googleAdsData,
  googleFiles, setGoogleFiles, googleKeywordsFile, setGoogleKeywordsFile, googleSearchTermsFile, setGoogleSearchTermsFile,
  googleAdsFile, setGoogleAdsFile, googleAuctionInsightsFile, setGoogleAuctionInsightsFile, googleDevicesFile, setGoogleDevicesFile,
  googleAgeFile, setGoogleAgeFile, googleGenderFile, setGoogleGenderFile, googleLocationsFile, setGoogleLocationsFile,
  googleSchedulesFile, setGoogleSchedulesFile, diagnosticFiles = [], setDiagnosticFiles, diagnosticUrl = '', setDiagnosticUrl,
  diagnosticContent, setDiagnosticContent, clarityFiles, setClarityFiles, clientHasHistory, setClientHasHistory,
  onboardingHistoryFiles, setOnboardingHistoryFiles, onRunOnboarding,
  
  onClearWorkspace,

  onGenerate, onGeneratePart, onGeneratePerformance, onRunAudit, onGenerateCreative, onAnalyzeCompetitors,
  isGenerating, isConnected, onConnect, dataSourceMode, setDataSourceMode, metaDataSourceMode = 'demo', setMetaDataSourceMode,
  systemLogs, apiKey,
  aiProvider, setAiProvider, openaiKey, setOpenaiKey, anthropicKey, setAnthropicKey
}) => {
  // Refs
  const metaInputRef = useRef<HTMLInputElement>(null);
  const metaPerfInputRef = useRef<HTMLInputElement>(null);
  const metaDemoRef = useRef<HTMLInputElement>(null); 
  const googleLogRef = useRef<HTMLInputElement>(null);
  
  const kwInputRef = useRef<HTMLInputElement>(null);
  const stInputRef = useRef<HTMLInputElement>(null);
  const adInputRef = useRef<HTMLInputElement>(null);
  
  const auctionRef = useRef<HTMLInputElement>(null);
  const devicesRef = useRef<HTMLInputElement>(null);
  const ageRef = useRef<HTMLInputElement>(null);
  const genderRef = useRef<HTMLInputElement>(null);
  const locationsRef = useRef<HTMLInputElement>(null);
  const schedRef = useRef<HTMLInputElement>(null);

  const diagnosticInputRef = useRef<HTMLInputElement>(null);

  const [isPlanning, setIsPlanning] = useState(false);
  const [isFetchingDiag, setIsFetchingDiag] = useState(false);
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [showPartButtons, setShowPartButtons] = useState(false);
  const [showKeys, setShowKeys] = useState(false);

  const DOC_TYPES = ".csv, .txt, .json, .doc, .docx, .pdf, .rtf";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'metaLog' | 'metaPerf' | 'google' | 'prevReports' | 'onboarding' | 'clarity' | 'diagnostic') => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      if (type === 'metaLog') setMetaFiles([...metaFiles, ...newFiles]);
      else if (type === 'metaPerf') setMetaPerformanceFiles([...metaPerformanceFiles, ...newFiles]);
      else if (type === 'prevReports') setPreviousReportsFiles([...previousReportsFiles, ...newFiles]);
      else if (type === 'onboarding') setOnboardingHistoryFiles([...onboardingHistoryFiles, ...newFiles]);
      else if (type === 'clarity') setClarityFiles([...clarityFiles, ...newFiles]);
      else if (type === 'diagnostic') setDiagnosticFiles && setDiagnosticFiles([...diagnosticFiles, ...newFiles]);
      else setGoogleFiles([...googleFiles, ...newFiles]);
    }
  };

  const removeFile = (index: number, type: 'metaLog' | 'metaPerf' | 'google' | 'prevReports' | 'onboarding' | 'clarity' | 'diagnostic') => {
    if (type === 'metaLog') { const nf = [...metaFiles]; nf.splice(index, 1); setMetaFiles(nf); }
    else if (type === 'metaPerf') { const nf = [...metaPerformanceFiles]; nf.splice(index, 1); setMetaPerformanceFiles(nf); }
    else if (type === 'prevReports') { const nf = [...previousReportsFiles]; nf.splice(index, 1); setPreviousReportsFiles(nf); }
    else if (type === 'onboarding') { const nf = [...onboardingHistoryFiles]; nf.splice(index, 1); setOnboardingHistoryFiles(nf); }
    else if (type === 'clarity') { const nf = [...clarityFiles]; nf.splice(index, 1); setClarityFiles(nf); }
    else if (type === 'diagnostic') { const nf = [...diagnosticFiles]; nf.splice(index, 1); setDiagnosticFiles && setDiagnosticFiles(nf); }
    else { const nf = [...googleFiles]; nf.splice(index, 1); setGoogleFiles(nf); }
  };

  const handleAutoGeneratePlan = async () => {
    if (!briefing.clientName) return alert("Preencha o nome do cliente.");
    setIsPlanning(true);
    try {
      const plan = await generateStrategicActionPlan(apiKey, briefing, aiProvider, { gemini: apiKey, openai: openaiKey, anthropic: anthropicKey });
      if (plan && plan.length > 0) {
        setActionPlan(plan);
      } else {
        alert("Não foi possível gerar o plano. Tente novamente.");
      }
    } catch (error) {
      console.error(error);
      alert("Erro ao gerar estratégia automática.");
    } finally {
      setIsPlanning(false);
    }
  };

  const addActionItem = () => { setActionPlan([...actionPlan, { id: Date.now().toString(), description: '', status: 'Pending', deadline: '' }]); };
  const removeActionItem = (index: number) => { const newPlan = [...actionPlan]; newPlan.splice(index, 1); setActionPlan(newPlan); };
  const updateActionItem = (index: number, field: keyof ActionPlanItem, value: any) => { const newPlan = [...actionPlan]; /* @ts-ignore */ newPlan[index][field] = value; setActionPlan(newPlan); };

  const fetchDiagnosticDoc = async () => {
      if (!diagnosticUrl || !setDiagnosticContent) return;
      setIsFetchingDiag(true);
      try {
          const response = await fetch(diagnosticUrl);
          if (!response.ok) throw new Error("Erro na rede");
          const text = await response.text();
          setDiagnosticContent(text);
      } catch (e) {
          alert("Erro ao buscar conteúdo. Certifique-se que o link está 'Publicado na Web'.");
      } finally {
          setIsFetchingDiag(false);
      }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Central de Comando</h2>
          <p className="text-slate-500">Configure parâmetros, integre plataformas e audite a performance.</p>
        </div>

        <div className="flex items-center gap-3">
             <button 
                type="button"
                onClick={onClearWorkspace} 
                className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 hover:text-red-500 hover:border-red-200 transition-colors shadow-sm" 
                title="Limpar todos os dados e começar do zero"
             >
                <RotateCcw className="w-4 h-4" />
                <span className="text-xs font-bold hidden sm:inline">Limpar Base</span>
             </button>
            <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="flex flex-col"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 mb-1"><Calendar className="w-3 h-3" /> Data Inicial</label><input type="date" value={reportPeriod.start} onChange={(e) => setReportPeriod({ ...reportPeriod, start: e.target.value })} className="text-sm font-semibold text-slate-700 bg-transparent outline-none cursor-pointer" /></div>
                <div className="h-8 w-px bg-slate-200"></div>
                <div className="flex flex-col"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 mb-1"><Calendar className="w-3 h-3" /> Data Final</label><input type="date" value={reportPeriod.end} onChange={(e) => setReportPeriod({ ...reportPeriod, end: e.target.value })} className="text-sm font-semibold text-slate-700 bg-transparent outline-none cursor-pointer" /></div>
            </div>
        </div>
      </div>

      {/* AI PROVIDER SELECTOR */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
              <div className="bg-purple-100 p-2 rounded-lg">
                  <BrainCircuit className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                  <h3 className="text-sm font-bold text-slate-800">Cérebro da IA</h3>
                  <p className="text-xs text-slate-500">Escolha o modelo de linguagem (LLM).</p>
              </div>
          </div>
          <div className="flex items-center gap-2">
              <button 
                onClick={() => setAiProvider('gemini')}
                className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${aiProvider === 'gemini' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                  Gemini 2.5 Flash
              </button>
              <button 
                onClick={() => { setAiProvider('openai'); setShowKeys(true); }}
                className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${aiProvider === 'openai' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                  GPT-4o (OpenAI)
              </button>
              <button 
                onClick={() => { setAiProvider('anthropic'); setShowKeys(true); }}
                className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${aiProvider === 'anthropic' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                  Claude 3.5 Sonnet
              </button>
              <button onClick={() => setShowKeys(!showKeys)} className="p-2 text-slate-400 hover:text-purple-600 bg-slate-50 rounded-lg border border-slate-200">
                  <Key className="w-4 h-4" />
              </button>
          </div>
      </div>

      {showKeys && (
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-2">
              <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">OpenAI API Key (GPT-4o)</label>
                  <input type="password" value={openaiKey} onChange={(e) => setOpenaiKey(e.target.value)} placeholder="sk-..." className="w-full text-xs p-2 rounded border border-slate-300 focus:ring-2 focus:ring-green-500 outline-none" />
              </div>
              <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Anthropic API Key (Claude)</label>
                  <input type="password" value={anthropicKey} onChange={(e) => setAnthropicKey(e.target.value)} placeholder="sk-ant-..." className="w-full text-xs p-2 rounded border border-slate-300 focus:ring-2 focus:ring-amber-500 outline-none" />
                  <p className="text-[10px] text-amber-600 mt-1">Atenção: Chamadas da Anthropic direto do navegador podem ser bloqueadas por CORS.</p>
              </div>
          </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Col */}
        <div className="space-y-6">
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
             <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-brand-500 rounded-full"></span>
              Briefing do Cliente
            </h3>
            <div className="space-y-4 pt-2">
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Nome do Cliente</label><input type="text" className="w-full p-2 border border-slate-300 rounded-md text-sm font-semibold" value={briefing.clientName} onChange={(e) => setBriefing({ ...briefing, clientName: e.target.value })} /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Objetivo</label><textarea className="w-full p-2 border border-slate-300 rounded-md text-sm" rows={2} value={briefing.objective} onChange={(e) => setBriefing({ ...briefing, objective: e.target.value })} /></div>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100">
                <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-3"><BookOpen className="w-4 h-4 text-brand-500" />Contexto Estratégico & Diagnósticos Anteriores</h4>
                <div className="space-y-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <p className="text-[10px] text-slate-500 mb-2">Suporta upload de Word (.docx), PDF e Texto. A IA lerá o conteúdo destes arquivos para entender o passado.</p>
                    <div className="flex items-center gap-2">
                      <input type="file" ref={diagnosticInputRef} hidden accept={DOC_TYPES} multiple onChange={(e) => handleFileChange(e, 'diagnostic')} />
                      <button onClick={() => diagnosticInputRef.current?.click()} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded text-xs text-slate-600 hover:bg-slate-100 w-full text-left transition-colors"><FileText className="w-4 h-4 text-slate-400" />Anexar Diagnóstico/Relatório Anterior (DOC/PDF)</button>
                    </div>
                    {diagnosticFiles.length > 0 && <div className="space-y-1">{diagnosticFiles.map((f, i) => (<div key={i} className="flex justify-between items-center text-xs bg-white p-2 border border-slate-200 rounded"><span className="truncate max-w-[200px]">{f.name}</span><button onClick={() => removeFile(i, 'diagnostic')} className="text-red-400 hover:text-red-600"><Trash2 className="w-3 h-3"/></button></div>))}</div>}
                </div>
            </div>
          </section>

          <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative overflow-hidden">
             <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2 relative z-10"><span className="w-1 h-6 bg-blue-600 rounded-full"></span>Meta Ads (Facebook & Instagram)</h3>
             <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 relative z-10">
                <div className="bg-white rounded-lg border border-slate-200 p-1 flex mb-4">
                    <button onClick={() => setMetaDataSourceMode && setMetaDataSourceMode('demo')} className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded transition-colors ${metaDataSourceMode === 'demo' ? 'bg-slate-100 text-slate-700' : 'text-slate-400 hover:text-slate-600'}`}><Sparkles className="w-3 h-3" /> Modo Demo</button>
                    <button onClick={() => setMetaDataSourceMode && setMetaDataSourceMode('csv')} className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded transition-colors ${metaDataSourceMode === 'csv' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'text-slate-400 hover:text-slate-600'}`}><FileSpreadsheet className="w-3 h-3" /> Upload CSV</button>
                    <button onClick={() => setMetaDataSourceMode && setMetaDataSourceMode('json_bridge')} className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded transition-colors ${metaDataSourceMode === 'json_bridge' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'text-slate-400 hover:text-slate-600'}`}><Code2 className="w-3 h-3" /> API Bridge</button>
                </div>

                {metaDataSourceMode === 'csv' && (
                  <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-2">
                      <input type="file" ref={metaPerfInputRef} hidden accept={DOC_TYPES} multiple onChange={(e) => handleFileChange(e, 'metaPerf')} />
                      <button onClick={() => metaPerfInputRef.current?.click()} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded text-xs text-slate-600 hover:bg-slate-50 w-full text-left"><FileSpreadsheet className="w-4 h-4 text-emerald-500" /> Adicionar Relatórios de Performance</button>
                    </div>
                    {metaPerformanceFiles.length > 0 && <div className="space-y-1">{metaPerformanceFiles.map((f, i) => (<div key={i} className="flex justify-between items-center text-xs bg-white p-2 border border-slate-200 rounded"><span className="truncate max-w-[200px]">{f.name}</span><button onClick={() => removeFile(i, 'metaPerf')} className="text-red-400 hover:text-red-600"><Trash2 className="w-3 h-3"/></button></div>))}</div>}
                    
                    <div className="pt-2 border-t border-slate-200">
                        <div className="flex items-center gap-2">
                            <input type="file" ref={metaDemoRef} hidden accept={DOC_TYPES} onChange={(e) => e.target.files && setMetaDemographicsFile && setMetaDemographicsFile(e.target.files[0])} />
                            <button onClick={() => metaDemoRef.current?.click()} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded text-xs text-slate-600 hover:bg-slate-50 w-full text-left">
                                <User className="w-4 h-4 text-pink-500" /> Relatório Demográfico (Idade/Gênero) [Opcional]
                            </button>
                            {metaDemographicsFile && <button onClick={() => setMetaDemographicsFile && setMetaDemographicsFile(null)} className="text-red-400"><Trash2 className="w-3 h-3"/></button>}
                        </div>
                    </div>
                  </div>
                )}
             </div>

             <div className="mt-4">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Logs de Alterações (Causa)</label>
                
                <div className="mb-3">
                    <label className="text-[10px] text-slate-400 mb-1 block">Cole o histórico aqui (Colunas: Atividade, Detalhes, Item, Alterado por, Data/Hora)</label>
                    <textarea 
                        className="w-full h-20 p-2 text-xs border border-slate-200 rounded bg-slate-50 focus:bg-white outline-none resize-none"
                        placeholder="Ex: Atualização do conjunto de anúncios | Alterou Orçamento... | Conjunto X | João | 25/10/2023 14:00"
                        value={metaHistoryText || ''}
                        onChange={(e) => setMetaHistoryText && setMetaHistoryText(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-2">
                  <input type="file" ref={metaInputRef} hidden accept={DOC_TYPES} multiple onChange={(e) => handleFileChange(e, 'metaLog')} />
                  <button onClick={() => metaInputRef.current?.click()} className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-600 hover:bg-slate-100 w-full text-left transition-colors"><History className="w-4 h-4 text-slate-400" /> Upload Arquivo de Histórico</button>
               </div>
                {metaFiles.length > 0 && <div className="space-y-1 mt-2">{metaFiles.map((f, i) => (<div key={i} className="flex justify-between items-center text-xs bg-slate-50 p-2 border border-slate-100 rounded"><span className="truncate max-w-[200px] text-slate-600">{f.name}</span><button onClick={() => removeFile(i, 'metaLog')} className="text-red-400 hover:text-red-600"><Trash2 className="w-3 h-3"/></button></div>))}</div>}
             </div>
          </section>

          <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative overflow-hidden transition-all duration-300">
             <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2 relative z-10"><span className="w-1 h-6 bg-blue-500 rounded-full"></span>Google Ads (Deep Dive)</h3>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 relative z-10">
                <div className="bg-white rounded-lg border border-slate-200 p-1 flex mb-4">
                    <button onClick={() => setDataSourceMode('demo')} className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded transition-colors ${dataSourceMode === 'demo' ? 'bg-slate-100 text-slate-700' : 'text-slate-400 hover:text-slate-600'}`}><Sparkles className="w-3 h-3" /> Modo Demo</button>
                    <button onClick={() => setDataSourceMode('real')} className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded transition-colors ${dataSourceMode === 'real' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'text-slate-400 hover:text-slate-600'}`}><Server className="w-3 h-3" /> Upload CSV/DOC</button>
                    <button onClick={() => setDataSourceMode('api_bridge')} className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded transition-colors ${dataSourceMode === 'api_bridge' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'text-slate-400 hover:text-slate-600'}`}><Code2 className="w-3 h-3" /> Script Google Ads</button>
                </div>

                {dataSourceMode === 'real' && (
                  <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                    <div className="grid grid-cols-1 gap-2">
                      <div className="flex items-center gap-2">
                        <input type="file" ref={kwInputRef} hidden accept={DOC_TYPES} onChange={(e) => e.target.files && setGoogleKeywordsFile(e.target.files[0])} />
                        <button onClick={() => kwInputRef.current?.click()} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded text-xs text-slate-600 hover:bg-slate-50 w-full text-left"><FileSpreadsheet className="w-4 h-4 text-emerald-500" /> {googleKeywordsFile ? googleKeywordsFile.name : "Upload Relatório Palavras-Chave"}</button>
                        {googleKeywordsFile && <button onClick={() => setGoogleKeywordsFile(null)} className="text-red-400"><Trash2 className="w-4 h-4"/></button>}
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="file" ref={stInputRef} hidden accept={DOC_TYPES} onChange={(e) => e.target.files && setGoogleSearchTermsFile(e.target.files[0])} />
                         <button onClick={() => stInputRef.current?.click()} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded text-xs text-slate-600 hover:bg-slate-50 w-full text-left"><FileSpreadsheet className="w-4 h-4 text-amber-500" /> {googleSearchTermsFile ? googleSearchTermsFile.name : "Upload Relatório Termos de Pesquisa"}</button>
                        {googleSearchTermsFile && <button onClick={() => setGoogleSearchTermsFile(null)} className="text-red-400"><Trash2 className="w-4 h-4"/></button>}
                      </div>
                       <div className="flex items-center gap-2">
                        <input type="file" ref={adInputRef} hidden accept={DOC_TYPES} onChange={(e) => e.target.files && setGoogleAdsFile(e.target.files[0])} />
                         <button onClick={() => adInputRef.current?.click()} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded text-xs text-slate-600 hover:bg-slate-50 w-full text-left"><FileSpreadsheet className="w-4 h-4 text-blue-500" /> {googleAdsFile ? googleAdsFile.name : "Upload Performance Anúncios"}</button>
                         {googleAdsFile && <button onClick={() => setGoogleAdsFile(null)} className="text-red-400"><Trash2 className="w-4 h-4"/></button>}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                         <div className="col-span-1 md:col-span-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Dados de Segmentação (Importante)</div>
                         <div className="flex items-center gap-2">
                           <input type="file" ref={auctionRef} hidden accept={DOC_TYPES} onChange={(e) => e.target.files && setGoogleAuctionInsightsFile && setGoogleAuctionInsightsFile(e.target.files[0])} />
                           <button onClick={() => auctionRef.current?.click()} className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-600 hover:bg-white w-full text-left truncate"><Target className="w-3 h-3 text-purple-500" /> {googleAuctionInsightsFile ? googleAuctionInsightsFile.name : "Leilão/Concorrência"}</button>
                           {googleAuctionInsightsFile && <button onClick={() => setGoogleAuctionInsightsFile && setGoogleAuctionInsightsFile(null)} className="text-red-400"><Trash2 className="w-3 h-3"/></button>}
                         </div>
                         <div className="flex items-center gap-2">
                           <input type="file" ref={devicesRef} hidden accept={DOC_TYPES} onChange={(e) => e.target.files && setGoogleDevicesFile && setGoogleDevicesFile(e.target.files[0])} />
                           <button onClick={() => devicesRef.current?.click()} className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-600 hover:bg-white w-full text-left truncate"><Smartphone className="w-3 h-3 text-slate-500" /> {googleDevicesFile ? googleDevicesFile.name : "Dispositivos"}</button>
                           {googleDevicesFile && <button onClick={() => setGoogleDevicesFile && setGoogleDevicesFile(null)} className="text-red-400"><Trash2 className="w-3 h-3"/></button>}
                         </div>
                         <div className="flex items-center gap-2">
                           <input type="file" ref={locationsRef} hidden accept={DOC_TYPES} onChange={(e) => e.target.files && setGoogleLocationsFile && setGoogleLocationsFile(e.target.files[0])} />
                           <button onClick={() => locationsRef.current?.click()} className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-600 hover:bg-white w-full text-left truncate"><MapPin className="w-3 h-3 text-red-500" /> {googleLocationsFile ? googleLocationsFile.name : "Locais/Geografia"}</button>
                           {googleLocationsFile && <button onClick={() => setGoogleLocationsFile && setGoogleLocationsFile(null)} className="text-red-400"><Trash2 className="w-3 h-3"/></button>}
                         </div>
                         <div className="flex items-center gap-2">
                           <input type="file" ref={schedRef} hidden accept={DOC_TYPES} onChange={(e) => e.target.files && setGoogleSchedulesFile && setGoogleSchedulesFile(e.target.files[0])} />
                           <button onClick={() => schedRef.current?.click()} className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-600 hover:bg-white w-full text-left truncate"><Clock className="w-3 h-3 text-orange-500" /> {googleSchedulesFile ? googleSchedulesFile.name : "Prog. de Horários"}</button>
                           {googleSchedulesFile && <button onClick={() => setGoogleSchedulesFile && setGoogleSchedulesFile(null)} className="text-red-400"><Trash2 className="w-3 h-3"/></button>}
                         </div>
                         <div className="flex items-center gap-2">
                           <input type="file" ref={ageRef} hidden accept={DOC_TYPES} onChange={(e) => e.target.files && setGoogleAgeFile && setGoogleAgeFile(e.target.files[0])} />
                           <button onClick={() => ageRef.current?.click()} className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-600 hover:bg-white w-full text-left truncate"><Users className="w-3 h-3 text-blue-500" /> {googleAgeFile ? googleAgeFile.name : "Idade"}</button>
                           {googleAgeFile && <button onClick={() => setGoogleAgeFile && setGoogleAgeFile(null)} className="text-red-400"><Trash2 className="w-3 h-3"/></button>}
                         </div>
                         <div className="flex items-center gap-2">
                           <input type="file" ref={genderRef} hidden accept={DOC_TYPES} onChange={(e) => e.target.files && setGoogleGenderFile && setGoogleGenderFile(e.target.files[0])} />
                           <button onClick={() => genderRef.current?.click()} className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-600 hover:bg-white w-full text-left truncate"><Users className="w-3 h-3 text-pink-500" /> {googleGenderFile ? googleGenderFile.name : "Gênero"}</button>
                           {googleGenderFile && <button onClick={() => setGoogleGenderFile && setGoogleGenderFile(null)} className="text-red-400"><Trash2 className="w-3 h-3"/></button>}
                         </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="mt-4 pt-4 border-t border-slate-200">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Logs de Alterações (Causa)</label>
                    <div className="flex items-center gap-2 mb-4">
                        <input type="file" ref={googleLogRef} hidden accept={DOC_TYPES} multiple onChange={(e) => handleFileChange(e, 'google')} />
                        <button onClick={() => googleLogRef.current?.click()} className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-600 hover:bg-white w-full text-left transition-colors">
                            <History className="w-4 h-4 text-slate-400" /> 
                            Histórico de Alterações (.csv)
                        </button>
                    </div>
                    {googleFiles.length > 0 && <div className="space-y-1 mb-4">{googleFiles.map((f, i) => (<div key={i} className="flex justify-between items-center text-xs bg-slate-50 p-2 border border-slate-100 rounded"><span className="truncate max-w-[200px] text-slate-600">{f.name}</span><button onClick={() => removeFile(i, 'google')} className="text-red-400 hover:text-red-600"><Trash2 className="w-3 h-3"/></button></div>))}</div>}

                    <button onClick={() => { if (dataSourceMode === 'api_bridge' && googleAdsData) { onRunAudit(); } else { onRunAudit(); } }} disabled={isGenerating} className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white text-xs font-semibold px-3 py-2.5 rounded shadow hover:bg-indigo-500 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                        {isGenerating ? <Loader2 className="w-3 h-3 animate-spin"/> : <BarChart3 className="w-3 h-3" />}
                        {dataSourceMode === 'demo' ? 'Rodar Auditoria Demo' : 'Auditar Dados'}
                    </button>
                </div>
            </div>
          </section>
        </div>

        {/* Right Col */}
        <div className="space-y-6">
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-full flex flex-col">
             <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
              <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2"><span className="w-1 h-6 bg-emerald-500 rounded-full"></span>Plano de Ação & Estratégia</h3>
              <div className="flex gap-2">
                <button 
                  onClick={handleAutoGeneratePlan} 
                  disabled={isPlanning} 
                  className="px-3 py-1.5 rounded-md bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200 text-xs font-medium flex items-center gap-2 transition-colors active:scale-95"
                >
                  {isPlanning ? <Loader2 className="w-3 h-3 animate-spin"/> : <Sparkles className="w-3 h-3" />} 
                  Auto-Estratégia
                </button>
                <button onClick={addActionItem} className="p-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200"><Plus className="w-4 h-4" /></button>
              </div>
            </div>
            
            <div className="flex-1 space-y-3 overflow-y-auto max-h-[600px] pr-2 mb-6 border-b border-slate-100 pb-6">
              {actionPlan.length === 0 && <div className="text-center py-10 text-slate-400"><p className="text-sm">Nenhuma ação planejada.</p></div>}
              {actionPlan.map((item, index) => (
                <div key={item.id} className="bg-slate-50 p-3 rounded-lg border border-slate-200 group relative animate-in fade-in slide-in-from-right-4">
                  <button onClick={() => removeActionItem(index)} className="absolute top-2 right-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3 h-3" /></button>
                  <textarea className="w-full bg-transparent text-sm mb-2 border-b border-transparent focus:border-slate-300 focus:outline-none resize-none" value={item.description} rows={2} onChange={(e) => updateActionItem(index, 'description', e.target.value)} />
                  <div className="flex gap-2">
                    <select className="text-xs p-1 rounded border border-slate-200 bg-white" value={item.status} onChange={(e) => updateActionItem(index, 'status', e.target.value as ActionPlanItem['status'])}><option value="Pending">Pendente</option><option value="In Progress">Em Progresso</option><option value="Completed">Concluído</option></select>
                    <input type="date" className="text-xs p-1 rounded border border-slate-200 bg-white" value={item.deadline} onChange={(e) => updateActionItem(index, 'deadline', e.target.value)} />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-auto">
               <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3"><Database className="w-4 h-4 text-slate-500" />Memória & Instruções Finais</h3>
               <div className="mb-4">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Observações para a IA (Opcional)</label>
                  <textarea className="w-full pl-8 pr-2 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none resize-none" rows={3} placeholder="Ex: Ignore a queda de impressões no Google..." value={reportCustomInstructions || ""} onChange={(e) => setReportCustomInstructions && setReportCustomInstructions(e.target.value)} />
               </div>
               <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Histórico no Banco de Dados ({dbHistoryReports.length})</label>
                  {dbHistoryAvailable && dbHistoryReports.length > 0 ? (
                      <div className="bg-slate-50 border border-slate-200 rounded-lg max-h-[200px] overflow-y-auto">
                          {dbHistoryReports.map((report) => (
                             <div key={report.id} className="flex justify-between items-center p-2 border-b border-slate-100 last:border-0 text-xs hover:bg-white group">
                                <div className="flex items-center gap-2 overflow-hidden"><FileText className="w-3 h-3 text-brand-500 shrink-0" /><div className="truncate"><span className="font-semibold block truncate">{report.title}</span><span className="text-[10px] text-slate-400">{new Date(report.created_at).toLocaleDateString()} • {report.type}</span></div></div>
                                <div className="flex items-center gap-1"><button onClick={() => onDeleteReport && onDeleteReport(report.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors" title="Apagar Relatório"><Trash2 className="w-3 h-3" /></button></div>
                             </div>
                          ))}
                      </div>
                  ) : (<div className="text-center py-4 bg-slate-50 rounded border border-slate-100 border-dashed text-xs text-slate-400">Nenhum relatório anterior encontrado.</div>)}
               </div>
            </div>
          </section>
        </div>
      </div>

      <div className="flex flex-wrap justify-end pt-4 border-t border-slate-200 gap-4">
        <button onClick={onGenerateCreative} disabled={isGenerating} className={`flex items-center gap-2 px-6 py-4 rounded-lg font-bold text-indigo-600 border border-indigo-200 bg-indigo-50 shadow-sm transition-all hover:bg-indigo-100 active:scale-95 disabled:opacity-50`}>{isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Palette className="w-5 h-5" />} Gerar Estratégia Criativa</button>
        
        <button 
            onClick={onGeneratePerformance} 
            disabled={isGenerating} 
            className={`flex items-center gap-2 px-6 py-4 rounded-lg font-bold text-emerald-700 border border-emerald-200 bg-emerald-50 shadow-sm transition-all hover:bg-emerald-100 active:scale-95 disabled:opacity-50`}
        >
            {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <TrendingUp className="w-5 h-5" />} 
            Gerar Análise de Performance
        </button>

        {/* Main Generation Button with Multi-Step Logic support via Parent */}
        <div className="relative group">
            <button 
              onClick={onGenerate} 
              disabled={isGenerating || (metaFiles.length === 0 && !metaSheetContent && metaPerformanceFiles.length === 0 && !metaAdsData && metaDataSourceMode !== 'demo')} 
              className={`flex items-center gap-2 px-8 py-4 rounded-lg font-bold text-white shadow-lg shadow-brand-500/30 transition-all ${isGenerating ? 'bg-slate-400 cursor-not-allowed' : 'bg-brand-600 hover:bg-brand-500 hover:scale-105 active:scale-95'}`}
            >
              {isGenerating ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Gerando Completo...</> : <><Zap className="w-5 h-5" />Gerar Diário de Bordo (Completo)</>}
            </button>
            <div className="absolute top-full right-0 mt-2 hidden group-hover:block z-50">
                <div className="bg-white rounded-lg shadow-xl border border-slate-200 p-2 min-w-[200px] space-y-1">
                    <p className="text-[10px] text-slate-400 uppercase font-bold px-2 py-1">Geração por Partes (Manual)</p>
                    {[1, 2, 3, 4, 5].map(part => (
                        <button 
                           key={part}
                           onClick={() => onGeneratePart && onGeneratePart(part)}
                           disabled={isGenerating}
                           className="w-full text-left text-xs text-slate-700 hover:bg-slate-100 px-2 py-1.5 rounded flex items-center gap-2"
                        >
                           <Layers className="w-3 h-3 text-slate-400" /> Gerar Parte {part}
                        </button>
                    ))}
                </div>
            </div>
        </div>
      </div>
      
      {showScriptModal && (<div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"> {/* ... content ... */} </div>)}
    </div>
  );
};
