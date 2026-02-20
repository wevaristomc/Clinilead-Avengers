
import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { AppState, Client, ClientBriefing, ActionPlanItem, HistoricalReport, MetaAdsAPIData, GoogleAdsAPIData, SystemLog, UserProfile, AIProvider } from './types';
import { DEFAULT_BRIEFING } from './constants';
import { generateReport, generateGoogleAdsAudit, getMockMetaAdsData, generatePerformanceAnalysis, generateCreativeStrategy } from './services/geminiService';
import { getCurrentUser, logoutUser, verifySupabaseConnection, fetchClientReports, deleteReport as dbDeleteReport, saveReportToDb } from './services/databaseService';
import { Sidebar } from './components/Sidebar';
import { InputSection } from './components/InputSection';
import { ReportView } from './components/ReportView';
import { LogsView } from './components/LogsView';
import { ClientDashboard } from './components/ClientDashboard';
import { LoginView } from './components/LoginView';

const App: React.FC = () => {
  const navigate = useNavigate();

  // App State
  const [user, setUser] = useState<UserProfile | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  
  // Workspace Key for Hard Reset
  const [workspaceKey, setWorkspaceKey] = useState(0);

  const [activeTab, setActiveTab] = useState<'input' | 'report' | 'settings' | 'logs'>('input');
  const [briefing, setBriefing] = useState<ClientBriefing>(DEFAULT_BRIEFING);
  const [actionPlan, setActionPlan] = useState<ActionPlanItem[]>([]);
  const [reportPeriod, setReportPeriod] = useState({ start: '', end: '' });
  const [reportCustomInstructions, setReportCustomInstructions] = useState('');
  const [currentReportType, setCurrentReportType] = useState<string>('');
  
  const [metaFiles, setMetaFiles] = useState<File[]>([]);
  const [metaHistoryText, setMetaHistoryText] = useState<string>('');
  const [metaPerformanceFiles, setMetaPerformanceFiles] = useState<File[]>([]);
  const [metaSheetUrl, setMetaSheetUrl] = useState<string>('');
  const [metaSheetContent, setMetaSheetContent] = useState<string | null>(null);
  const [metaAdsData, setMetaAdsData] = useState<MetaAdsAPIData | null>(null);
  const [metaDemographicsFile, setMetaDemographicsFile] = useState<File | null>(null);

  const [googleFiles, setGoogleFiles] = useState<File[]>([]);
  const [previousReportsFiles, setPreviousReportsFiles] = useState<File[]>([]);
  const [clarityFiles, setClarityFiles] = useState<File[]>([]);

  const [diagnosticFiles, setDiagnosticFiles] = useState<File[]>([]);
  const [diagnosticUrl, setDiagnosticUrl] = useState<string>('');
  const [diagnosticContent, setDiagnosticContent] = useState<string | null>(null);

  const [googleKeywordsFile, setGoogleKeywordsFile] = useState<File | null>(null);
  const [googleSearchTermsFile, setGoogleSearchTermsFile] = useState<File | null>(null);
  const [googleAdsFile, setGoogleAdsFile] = useState<File | null>(null);
  
  const [googleAuctionInsightsFile, setGoogleAuctionInsightsFile] = useState<File | null>(null);
  const [googleDevicesFile, setGoogleDevicesFile] = useState<File | null>(null);
  const [googleAgeFile, setGoogleAgeFile] = useState<File | null>(null);
  const [googleGenderFile, setGoogleGenderFile] = useState<File | null>(null);
  const [googleLocationsFile, setGoogleLocationsFile] = useState<File | null>(null);
  const [googleSchedulesFile, setGoogleSchedulesFile] = useState<File | null>(null);

  const [googleAdsData, setGoogleAdsData] = useState<GoogleAdsAPIData | null>(null);
  const [dataSourceMode, setDataSourceMode] = useState<'demo' | 'real' | 'api_bridge'>('demo');
  const [metaDataSourceMode, setMetaDataSourceMode] = useState<'demo' | 'csv' | 'json_bridge'>('demo');

  const [clientHasHistory, setClientHasHistory] = useState(false);
  const [onboardingHistoryFiles, setOnboardingHistoryFiles] = useState<File[]>([]);
  const [dbHistoryReports, setDbHistoryReports] = useState<HistoricalReport[]>([]);
  const [dbHistoryAvailable, setDbHistoryAvailable] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<string | null>(null);
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  
  const [dbStatus, setDbStatus] = useState({ connected: false, error: '' });

  // NEW: AI Provider State
  const [aiProvider, setAiProvider] = useState<AIProvider>('gemini');
  const [openaiKey, setOpenaiKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');

  useEffect(() => {
    checkAuth();
    checkDbConnection();
  }, []);

  const checkDbConnection = async () => {
    const status = await verifySupabaseConnection();
    setDbStatus({ connected: status.success, error: status.message });
  };

  const checkAuth = async () => {
    const currentUser = await getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      if (window.location.hash === '' || window.location.hash === '#/') {
          navigate('/dashboard');
      }
    } else {
      navigate('/');
    }
  };

  const handleLoginSuccess = (user: UserProfile) => {
    setUser(user);
    navigate('/dashboard');
  };

  const handleLogout = async () => {
    await logoutUser();
    setUser(null);
    navigate('/');
  };

  const handleSelectClient = async (client: Client) => {
    setSelectedClient(client);
    setBriefing(client.briefing_data || DEFAULT_BRIEFING);
    setMetaHistoryText(''); 
    setGeneratedReport(null);
    
    // Reset Key to ensure fresh start for new client
    setWorkspaceKey(prev => prev + 1);

    const history = await fetchClientReports(client.id);
    setDbHistoryReports(history);
    setDbHistoryAvailable(history.length > 0);
    
    addLog('info', `Cliente selecionado: ${client.name}`, 'Workspace carregado com sucesso.');
    navigate('/workspace');
  };

  const handleBackToDashboard = () => {
    setSelectedClient(null);
    navigate('/dashboard');
  };

  const addLog = (type: SystemLog['type'], message: string, details?: string) => {
    setSystemLogs(prev => [{ id: Date.now().toString(), type, message, details, timestamp: new Date().toLocaleTimeString() }, ...prev]);
  };

  const handleClearWorkspace = () => {
    try {
        if(!window.confirm("Tem certeza que deseja limpar todos os dados do workspace atual? (Isso não apaga os relatórios salvos)")) return;
        
        // 1. Reset Briefing to Client Default
        if (selectedClient && selectedClient.briefing_data) {
            setBriefing(selectedClient.briefing_data);
        }

        // 2. Reset All File States
        setMetaFiles([]); 
        setMetaHistoryText(''); 
        setMetaPerformanceFiles([]); 
        setMetaSheetUrl('');
        setMetaSheetContent(null);
        setMetaAdsData(null);
        setMetaDemographicsFile(null);

        setGoogleFiles([]); 
        setGoogleKeywordsFile(null); 
        setGoogleSearchTermsFile(null); 
        setGoogleAdsFile(null);
        setGoogleAuctionInsightsFile(null); 
        setGoogleDevicesFile(null); 
        setGoogleAgeFile(null); 
        setGoogleGenderFile(null); 
        setGoogleLocationsFile(null); 
        setGoogleSchedulesFile(null);
        setGoogleAdsData(null);

        setClarityFiles([]); 
        setPreviousReportsFiles([]); 
        setDiagnosticFiles([]); 
        setDiagnosticUrl('');
        setDiagnosticContent(null);

        // 3. Reset Text/Logic States
        setGeneratedReport(null); 
        setActionPlan([]); 
        setReportCustomInstructions("");
        setReportPeriod({ start: '', end: '' });
        
        // 4. Reset Modes
        setDataSourceMode('demo');
        setMetaDataSourceMode('demo');
        
        // 5. Force UI Remount (Clears HTML Input elements)
        setWorkspaceKey(prev => prev + 1);

        addLog('info', 'Workspace reiniciado', 'Todos os arquivos e dados temporários foram limpos.');
    } catch (e: any) {
        console.error("Error clearing workspace:", e);
        addLog('error', 'Erro ao limpar workspace', e.message);
    }
  };

  const apiKeys = { gemini: user?.id, openai: openaiKey, anthropic: anthropicKey };

  // --- NEW: Handle Multi-Part Generation ---
  const handleGenerate = async (partNumber?: number) => {
    setIsGenerating(true);
    const dbContextString = dbHistoryReports.map(r => `[RELATÓRIO ${r.created_at}]: ${r.content_snippet}`).join('\n\n');
    
    const callGenerate = async (p?: number) => {
      return await generateReport(
        briefing, actionPlan, reportPeriod, metaFiles, metaPerformanceFiles, googleFiles, metaSheetContent, previousReportsFiles, 
        {
          keywords: googleKeywordsFile, searchTerms: googleSearchTermsFile, ads: googleAdsFile,
          auctionInsights: googleAuctionInsightsFile, devices: googleDevicesFile, age: googleAgeFile, gender: googleGenderFile, locations: googleLocationsFile, schedules: googleSchedulesFile,
          apiData: dataSourceMode === 'api_bridge' ? googleAdsData : null
        },
        dbContextString, clarityFiles, metaDataSourceMode === 'json_bridge' ? metaAdsData : null, reportCustomInstructions, 
        { files: diagnosticFiles, content: diagnosticContent, metaDemographics: metaDemographicsFile }, 
        metaHistoryText,
        p, // Pass Part Number
        aiProvider,
        apiKeys
      );
    };

    try {
      // FIX: Change to Report Tab IMMEDIATELY so user can see parts arriving
      setActiveTab('report');

      if (partNumber) {
        // Generate Single Part
        addLog('info', `Gerando Parte ${partNumber}...`, `Modo: ${aiProvider.toUpperCase()}`);
        
        // Show loading state if empty
        if (!generatedReport) setGeneratedReport("Inicializando geração da parte " + partNumber + "...");

        const report = await callGenerate(partNumber);
        
        setGeneratedReport(prev => {
            const separator = `\n\n--- PARTE ${partNumber} (GERADO MANUALMENTE) ---\n\n`;
            // If prev is just the loading message, replace it
            if (prev?.includes("Inicializando")) return report;
            return prev + separator + report;
        });
        
        addLog('success', `Parte ${partNumber} gerada!`);
      } else {
        // Generate ALL Parts Sequentially (1 to 5)
        addLog('info', `Iniciando Diário Completo (${aiProvider.toUpperCase()})...`, 'As partes aparecerão na tela assim que forem geradas.');
        
        setGeneratedReport("🚀 Inicializando protocolos de IA...\n⏳ Analisando dados de Causa e Efeito...\n\n(Aguarde, o relatório será construído em 5 etapas abaixo)");
        setCurrentReportType('Diário de Bordo (Gerando...)');
        
        let fullReportBuffer = "";
        
        for (let i = 1; i <= 5; i++) {
           addLog('info', `Processando Parte ${i} de 5...`, 'Isso pode levar alguns segundos.');
           
           const partText = await callGenerate(i);
           
           // Visual Separator
           const header = i > 1 ? `\n\n--- FIM DA PARTE ${i-1} / INÍCIO DA PARTE ${i} ---\n\n` : "";
           
           // If first part, replace the "Initializing" text
           if (i === 1) {
               fullReportBuffer = partText;
           } else {
               fullReportBuffer += header + partText;
           }
           
           // UPDATE UI IN REAL TIME
           setGeneratedReport(fullReportBuffer); 
        }
        
        setCurrentReportType('Diário de Bordo (Completo)');
        addLog('success', 'Relatório Completo gerado com sucesso!');
      }
    } catch (error: any) {
      addLog('error', 'Falha na geração', error.message);
      setGeneratedReport(prev => prev + `\n\n❌ ERRO NA GERAÇÃO: ${error.message}\nTente novamente a parte específica.`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGeneratePerformance = async () => {
    setIsGenerating(true);
    setActiveTab('report'); // Switch to view
    setGeneratedReport("Gerando Análise de Performance...");
    addLog('info', 'Iniciando Análise de Performance...');
    try {
      const dbContextString = dbHistoryReports.map(r => `[CTX]: ${r.content_snippet}`).join('\n');
      const report = await generatePerformanceAnalysis(
        briefing, reportPeriod, metaPerformanceFiles, metaSheetContent, metaHistoryText, 
        { keywords: googleKeywordsFile, ads: googleAdsFile, searchTerms: googleSearchTermsFile }, 
        dbContextString, reportCustomInstructions, aiProvider, apiKeys
      );
      setGeneratedReport(report); setCurrentReportType('Análise de Performance');
      addLog('success', 'Análise gerada!');
    } catch (error: any) { 
        addLog('error', 'Falha', error.message);
        setGeneratedReport(`Erro: ${error.message}`);
    } finally { setIsGenerating(false); }
  };

  const handleGenerateCreative = async () => {
    setIsGenerating(true);
    setActiveTab('report'); // Switch to view
    setGeneratedReport("Criando Estratégia Criativa...");
    addLog('info', 'Iniciando Creative Lab...');
    try {
      const report = await generateCreativeStrategy(briefing, metaPerformanceFiles, metaSheetContent, { keywords: googleKeywordsFile, ads: googleAdsFile, searchTerms: googleSearchTermsFile }, clarityFiles, aiProvider, apiKeys);
      setGeneratedReport(report); setCurrentReportType('Creative Lab');
      addLog('success', 'Estratégia gerada!');
    } catch (error: any) { 
        addLog('error', 'Falha', error.message);
        setGeneratedReport(`Erro: ${error.message}`);
    } finally { setIsGenerating(false); }
  };

  const handleRunAudit = async () => {
    setIsGenerating(true);
    setActiveTab('report'); // Switch to view
    setGeneratedReport("Rodando Auditoria de Conta...");
    addLog('info', 'Auditando...');
    try {
      const report = await generateGoogleAdsAudit(briefing, { keywords: googleKeywordsFile, searchTerms: googleSearchTermsFile, ads: googleAdsFile, auctionInsights: googleAuctionInsightsFile, devices: googleDevicesFile, age: googleAgeFile, gender: googleGenderFile, locations: googleLocationsFile, schedules: googleSchedulesFile }, aiProvider, apiKeys);
      setGeneratedReport(report); setCurrentReportType('Auditoria');
      addLog('success', 'Auditoria pronta!');
    } catch (e: any) { 
        addLog('error', 'Falha', e.message); 
        setGeneratedReport(`Erro: ${e.message}`);
    } finally { setIsGenerating(false); }
  };

  const handleSaveReport = async () => {
    if (!selectedClient || !generatedReport) return;
    try {
      await saveReportToDb(selectedClient.id, currentReportType || 'Relatório', generatedReport, reportPeriod.start, reportPeriod.end);
      const history = await fetchClientReports(selectedClient.id);
      setDbHistoryReports(history); setDbHistoryAvailable(true);
      addLog('success', 'Salvo no histórico.');
    } catch (e: any) { addLog('error', 'Erro ao salvar', e.message); }
  };

  const handleDeleteReport = async (reportId: string) => {
    try { await dbDeleteReport(reportId); setDbHistoryReports(prev => prev.filter(r => r.id !== reportId)); addLog('success', 'Apagado.'); } catch (e: any) { addLog('error', 'Erro', e.message); }
  };

  return (
    <Routes>
      <Route path="/" element={<LoginView onLoginSuccess={handleLoginSuccess} dbConnectionStatus={dbStatus} />} />
      <Route path="/dashboard" element={user ? <ClientDashboard onSelectClient={handleSelectClient} onLogout={handleLogout} userEmail={user?.email} /> : <Navigate to="/" />} />
      <Route path="/workspace" element={user && selectedClient ? (
          <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
             <Sidebar activeTab={activeTab} onTabChange={setActiveTab} clientName={selectedClient?.name} onBackToDashboard={handleBackToDashboard} />
             <div className="flex-1 flex flex-col h-full overflow-hidden relative md:ml-64 transition-all">
                <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
                  {activeTab === 'input' && (
                    <InputSection 
                      key={workspaceKey} // Forces complete re-render when clearing workspace
                      briefing={briefing} setBriefing={setBriefing} actionPlan={actionPlan} setActionPlan={setActionPlan}
                      reportPeriod={reportPeriod} setReportPeriod={setReportPeriod}
                      previousReportsFiles={previousReportsFiles} setPreviousReportsFiles={setPreviousReportsFiles}
                      dbHistoryAvailable={dbHistoryAvailable} dbHistoryReports={dbHistoryReports} onDeleteReport={handleDeleteReport}
                      reportCustomInstructions={reportCustomInstructions} setReportCustomInstructions={setReportCustomInstructions}
                      metaFiles={metaFiles} setMetaFiles={setMetaFiles} metaHistoryText={metaHistoryText} setMetaHistoryText={setMetaHistoryText}
                      metaPerformanceFiles={metaPerformanceFiles} setMetaPerformanceFiles={setMetaPerformanceFiles}
                      metaSheetUrl={metaSheetUrl} setMetaSheetUrl={setMetaSheetUrl} metaSheetContent={metaSheetContent} setMetaSheetContent={setMetaSheetContent}
                      metaDemographicsFile={metaDemographicsFile} setMetaDemographicsFile={setMetaDemographicsFile}
                      metaAdsData={metaAdsData} setMetaAdsData={setMetaAdsData}
                      googleAdsData={googleAdsData} 
                      googleFiles={googleFiles} setGoogleFiles={setGoogleFiles}
                      googleKeywordsFile={googleKeywordsFile} setGoogleKeywordsFile={setGoogleKeywordsFile}
                      googleSearchTermsFile={googleSearchTermsFile} setGoogleSearchTermsFile={setGoogleSearchTermsFile}
                      googleAdsFile={googleAdsFile} setGoogleAdsFile={setGoogleAdsFile}
                      googleAuctionInsightsFile={googleAuctionInsightsFile} setGoogleAuctionInsightsFile={setGoogleAuctionInsightsFile}
                      googleDevicesFile={googleDevicesFile} setGoogleDevicesFile={setGoogleDevicesFile}
                      googleAgeFile={googleAgeFile} setGoogleAgeFile={setGoogleAgeFile}
                      googleGenderFile={googleGenderFile} setGoogleGenderFile={setGoogleGenderFile}
                      googleLocationsFile={googleLocationsFile} setGoogleLocationsFile={setGoogleLocationsFile}
                      googleSchedulesFile={googleSchedulesFile} setGoogleSchedulesFile={setGoogleSchedulesFile}
                      diagnosticFiles={diagnosticFiles} setDiagnosticFiles={setDiagnosticFiles} diagnosticUrl={diagnosticUrl} setDiagnosticUrl={setDiagnosticUrl} diagnosticContent={diagnosticContent} setDiagnosticContent={setDiagnosticContent}
                      clarityFiles={clarityFiles} setClarityFiles={setClarityFiles}
                      clientHasHistory={clientHasHistory} setClientHasHistory={setClientHasHistory} onboardingHistoryFiles={onboardingHistoryFiles} setOnboardingHistoryFiles={setOnboardingHistoryFiles} onRunOnboarding={() => {}} 
                      
                      // PASS BOTH FUNCTIONS
                      onClearWorkspace={handleClearWorkspace}
                      onGenerate={() => handleGenerate()} 
                      onGeneratePart={handleGenerate} 

                      onGeneratePerformance={handleGeneratePerformance} onRunAudit={handleRunAudit} onGenerateCreative={handleGenerateCreative} onAnalyzeCompetitors={() => {}} 
                      isGenerating={isGenerating} isConnected={false} onConnect={() => {}} dataSourceMode={dataSourceMode} setDataSourceMode={setDataSourceMode} metaDataSourceMode={metaDataSourceMode} setMetaDataSourceMode={setMetaDataSourceMode} systemLogs={systemLogs} 
                      apiKey={user?.id}

                      // NEW: AI PROVIDER PROPS
                      aiProvider={aiProvider} setAiProvider={setAiProvider}
                      openaiKey={openaiKey} setOpenaiKey={setOpenaiKey}
                      anthropicKey={anthropicKey} setAnthropicKey={setAnthropicKey}
                    />
                  )}
                  {activeTab === 'report' && <ReportView report={generatedReport} clientName={selectedClient?.name} onSave={handleSaveReport} />}
                  {activeTab === 'logs' && <LogsView logs={systemLogs} onClearLogs={() => setSystemLogs([])} />}
                  {activeTab === 'settings' && <div className="p-10 text-center text-slate-400"><h2 className="text-xl">Configurações</h2></div>}
                </main>
             </div>
          </div>
        ) : <Navigate to="/dashboard" />} />
    </Routes>
  );
};

export default App;
