
import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { InputSection } from './components/InputSection';
import { ReportView } from './components/ReportView';
import { LoginView } from './components/LoginView';
import { ClientDashboard } from './components/ClientDashboard';
import { AppState, ClientBriefing, ActionPlanItem, GoogleAdsAPIData, Client } from './types';
import { generateReport, generateGoogleAdsAudit, getMockGoogleAdsData, generateCreativeStrategy, generateOnboardingDiagnostic } from './services/geminiService';
import { saveReportToDb, fetchClientHistory, getCurrentUser, logoutUser, updateClientBriefing, verifySupabaseConnection } from './services/databaseService';
import { DEFAULT_BRIEFING } from './constants';
import { Menu, X, Database, AlertOctagon } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppState['activeTab']>('input');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // --- AUTH & NAVIGATION STATE ---
  const [user, setUser] = useState<AppState['user']>(null);
  const [viewMode, setViewMode] = useState<AppState['viewMode']>('auth');
  const [selectedClient, setSelectedClient] = useState<AppState['selectedClient']>(null);
  
  // Connection Status
  const [dbConnectionStatus, setDbConnectionStatus] = useState<{connected: boolean, error?: string, missingTables?: boolean}>({ connected: false });

  // State
  const [apiKey, setApiKey] = useState<string>(process.env.API_KEY || '');
  
  const [briefing, setBriefing] = useState<ClientBriefing>(DEFAULT_BRIEFING);
  const [actionPlan, setActionPlan] = useState<ActionPlanItem[]>([]);
  
  // Report Configuration
  const [reportPeriod, setReportPeriod] = useState<AppState['reportPeriod']>({
    start: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0], // Last 7 days default
    end: new Date().toISOString().split('T')[0]
  });
  const [previousReportsFiles, setPreviousReportsFiles] = useState<File[]>([]);

  // Database History
  const [dbHistoryAvailable, setDbHistoryAvailable] = useState(false);
  const [dbHistoryContext, setDbHistoryContext] = useState("");

  // Meta Ads States
  const [metaFiles, setMetaFiles] = useState<File[]>([]); // Activity Logs
  const [metaPerformanceFiles, setMetaPerformanceFiles] = useState<File[]>([]); // Performance CSVs
  const [metaSheetUrl, setMetaSheetUrl] = useState<string>('');
  const [metaSheetContent, setMetaSheetContent] = useState<string | null>(null);

  const [googleFiles, setGoogleFiles] = useState<File[]>([]);
  const [googleAdsConnected, setGoogleAdsConnected] = useState(false);
  const [dataSourceMode, setDataSourceMode] = useState<'demo' | 'real' | 'api_bridge'>('demo');
  
  // Real Data State
  const [googleKeywordsFile, setGoogleKeywordsFile] = useState<File | null>(null);
  const [googleSearchTermsFile, setGoogleSearchTermsFile] = useState<File | null>(null);
  const [googleAdsFile, setGoogleAdsFile] = useState<File | null>(null);

  // API Bridge Data
  const [googleAdsData, setGoogleAdsData] = useState<GoogleAdsAPIData | null>(null);

  // Onboarding
  const [clientHasHistory, setClientHasHistory] = useState(false);
  const [onboardingHistoryFiles, setOnboardingHistoryFiles] = useState<File[]>([]);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<string | null>(null);

  // Initialize Supabase Check & BYPASS LOGIN
  useEffect(() => {
    const checkConnection = async () => {
      const result = await verifySupabaseConnection();
      
      if (result.success) {
        setDbConnectionStatus({ connected: true });
        
        // --- BYPASS LOGIN LOGIC ---
        // Se conectado, define usuário mock e vai direto para dashboard
        setUser({ id: 'mock-admin', email: 'admin@clinilead.com' });
        setViewMode('dashboard'); 
        
      } else {
        // Se falhar conexão (ex: falta tabelas), mantém na tela de "Login" que mostra o erro
        setDbConnectionStatus({ 
            connected: false, 
            error: result.message,
            missingTables: result.message.includes('Check Tables') || result.message.includes('relation "clients" does not exist')
        });
      }
    };
    checkConnection();
  }, []);

  // Update DB when briefing changes (Debounced)
  useEffect(() => {
    if (selectedClient && dbConnectionStatus.connected) {
        const timeoutId = setTimeout(() => {
            updateClientBriefing(selectedClient.id, briefing);
        }, 2000); // Auto-save briefing to client record after 2s
        return () => clearTimeout(timeoutId);
    }
  }, [briefing, selectedClient, dbConnectionStatus.connected]);


  // --- HANDLERS ---

  const handleLoginSuccess = (userData: any) => {
      setUser({ id: userData.id, email: userData.email });
      setViewMode('dashboard');
  };

  const handleLogout = async () => {
      // Como estamos em modo bypass, "logout" apenas recarrega ou volta pra seleção
      if (dbConnectionStatus.connected) {
          window.location.reload(); 
      } else {
          await logoutUser();
          setUser(null);
          setSelectedClient(null);
          setViewMode('auth');
      }
  };

  const handleClientSelect = (client: Client) => {
      setSelectedClient(client);
      
      // Load client specific data
      if (client.briefing_data) {
          setBriefing({ ...DEFAULT_BRIEFING, ...client.briefing_data, clientName: client.name });
      } else {
          setBriefing({ ...DEFAULT_BRIEFING, clientName: client.name });
      }
      
      // Reset workspace state for new client context
      setActionPlan([]);
      setGeneratedReport(null);
      setDbHistoryAvailable(false);
      
      setViewMode('workspace');
  };

  const handleBackToDashboard = () => {
      setViewMode('dashboard');
      setSelectedClient(null);
  };


  const SettingsView = () => (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Configurações da Aplicação</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Gemini API Key</label>
            <input 
              type="password" 
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full p-2 border border-slate-300 rounded-md text-sm"
            />
          </div>

          <div className="pt-4 border-t border-slate-100">
             <div className="flex items-center gap-2 mb-2">
                <div className={`w-2 h-2 rounded-full ${dbConnectionStatus.connected ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  Status da Conexão Database
                </h3>
             </div>
             {dbConnectionStatus.connected ? (
                <p className="text-xs text-emerald-600">Sistema Conectado ao Supabase com Sucesso.</p>
             ) : (
                <p className="text-xs text-red-500 font-bold">Erro: {dbConnectionStatus.error}</p>
             )}
          </div>
        </div>
      </div>
    </div>
  );

  const handleGenerate = async () => {
    if (!apiKey) {
      alert("Por favor, configure sua API Key nas Configurações.");
      setActiveTab('settings');
      return;
    }
    
    setIsGenerating(true);
    try {
      // 1. Fetch History from DB before generation
      let dbContext = "";
      if (dbConnectionStatus.connected && briefing.clientName) {
         try {
           dbContext = await fetchClientHistory(briefing.clientName);
           if (dbContext) {
             setDbHistoryAvailable(true);
             setDbHistoryContext(dbContext);
             console.log("Histórico do cliente recuperado do Supabase.");
           }
         } catch (e) {
           console.error("Erro ao buscar histórico no DB", e);
         }
      }

      // 2. Generate Report
      const report = await generateReport(
        apiKey, 
        briefing, 
        actionPlan,
        reportPeriod,
        metaFiles, 
        metaPerformanceFiles, 
        googleFiles, 
        metaSheetContent, 
        previousReportsFiles, 
        {
          keywords: googleKeywordsFile,
          searchTerms: googleSearchTermsFile,
          ads: googleAdsFile,
          apiData: dataSourceMode === 'api_bridge' ? googleAdsData : null
        },
        dbContext 
      );
      setGeneratedReport(report);
      setActiveTab('report');

      // 3. Save to DB automatically
      if (dbConnectionStatus.connected && briefing.clientName) {
        saveReportToDb(
          briefing.clientName, 
          'DAILY_LOG', 
          report, 
          reportPeriod.start, 
          reportPeriod.end
        ).then(() => console.log("Relatório salvo no Supabase"))
         .catch(err => console.error("Erro ao salvar no DB", err));
      }

    } catch (error) {
      console.error(error);
      alert("Erro ao gerar relatório. Verifique o console.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRunAudit = async () => {
    if (!apiKey) {
        alert("Por favor, configure sua API Key nas Configurações.");
        setActiveTab('settings');
        return;
    }

    setIsGenerating(true);
    try {
        let apiDataToUse = null;
        if (dataSourceMode === 'demo') {
            apiDataToUse = getMockGoogleAdsData();
        } else if (dataSourceMode === 'api_bridge') {
             apiDataToUse = googleAdsData || getMockGoogleAdsData();
        }

        const report = await generateGoogleAdsAudit(
          apiKey, 
          briefing,
          {
            keywords: dataSourceMode === 'real' ? googleKeywordsFile : null,
            searchTerms: dataSourceMode === 'real' ? googleSearchTermsFile : null,
            ads: dataSourceMode === 'real' ? googleAdsFile : null,
            apiData: apiDataToUse
          }
        );
        setGeneratedReport(report);
        setActiveTab('report');
    } catch (error) {
        alert("Erro ao rodar auditoria. Verifique o console.");
    } finally {
        setIsGenerating(false);
    }
  };

  const handleRunOnboarding = async () => {
    if (!apiKey) {
      alert("Por favor, configure sua API Key nas Configurações.");
      setActiveTab('settings');
      return;
    }

    setIsGenerating(true);
    try {
      const report = await generateOnboardingDiagnostic(
        apiKey,
        briefing,
        onboardingHistoryFiles,
        clientHasHistory
      );
      setGeneratedReport(report);
      setActiveTab('report');
    } catch (error) {
      console.error(error);
      alert("Erro ao gerar diagnóstico inicial.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateCreative = async () => {
    if (!apiKey) {
      alert("Por favor, configure sua API Key nas Configurações.");
      setActiveTab('settings');
      return;
    }

    setIsGenerating(true);
    try {
      const report = await generateCreativeStrategy(
        apiKey,
        briefing,
        metaPerformanceFiles,
        metaSheetContent,
        {
          keywords: dataSourceMode === 'real' ? googleKeywordsFile : null,
          ads: dataSourceMode === 'real' ? googleAdsFile : null,
        }
      );
      setGeneratedReport(report);
      setActiveTab('report');
    } catch (error) {
      console.error(error);
      alert("Erro ao gerar estratégia criativa.");
    } finally {
      setIsGenerating(false);
    }
  };

  // --- VIEW RENDERING ---

  if (viewMode === 'auth') {
      return (
          <LoginView 
              onLoginSuccess={handleLoginSuccess} 
              dbConnectionStatus={dbConnectionStatus}
          />
      );
  }

  if (viewMode === 'dashboard') {
      return (
          <ClientDashboard 
              onSelectClient={handleClientSelect}
              onLogout={handleLogout}
              userEmail={user?.email}
          />
      );
  }

  // Workspace View (Original App)
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex">
      {/* Mobile Menu Toggle */}
      <button 
        className="md:hidden fixed top-4 right-4 z-50 bg-white p-2 rounded-lg shadow-md border border-slate-200"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Sidebar (Desktop & Mobile) */}
      <div className={`
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0 transition-transform duration-300 fixed md:static z-40 h-full
      `}>
        <Sidebar 
            activeTab={activeTab} 
            onTabChange={(t) => { setActiveTab(t); setMobileMenuOpen(false); }} 
            clientName={selectedClient?.name}
            onBackToDashboard={handleBackToDashboard}
        />
      </div>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 ml-0 md:ml-64 w-full md:w-auto">
        {activeTab === 'input' && (
          <InputSection 
            briefing={briefing}
            setBriefing={setBriefing}
            actionPlan={actionPlan}
            setActionPlan={setActionPlan}
            
            reportPeriod={reportPeriod}
            setReportPeriod={setReportPeriod}
            previousReportsFiles={previousReportsFiles}
            setPreviousReportsFiles={setPreviousReportsFiles}
            
            dbHistoryAvailable={dbHistoryAvailable}

            metaFiles={metaFiles}
            setMetaFiles={setMetaFiles}
            metaPerformanceFiles={metaPerformanceFiles}
            setMetaPerformanceFiles={setMetaPerformanceFiles}
            metaSheetUrl={metaSheetUrl}
            setMetaSheetUrl={setMetaSheetUrl}
            metaSheetContent={metaSheetContent}
            setMetaSheetContent={setMetaSheetContent}

            googleFiles={googleFiles}
            setGoogleFiles={setGoogleFiles}
            
            googleKeywordsFile={googleKeywordsFile}
            setGoogleKeywordsFile={setGoogleKeywordsFile}
            googleSearchTermsFile={googleSearchTermsFile}
            setGoogleSearchTermsFile={setGoogleSearchTermsFile}
            googleAdsFile={googleAdsFile}
            setGoogleAdsFile={setGoogleAdsFile}

            clientHasHistory={clientHasHistory}
            setClientHasHistory={setClientHasHistory}
            onboardingHistoryFiles={onboardingHistoryFiles}
            setOnboardingHistoryFiles={setOnboardingHistoryFiles}
            onRunOnboarding={handleRunOnboarding}

            onGenerate={handleGenerate}
            onRunAudit={handleRunAudit}
            onGenerateCreative={handleGenerateCreative}
            isGenerating={isGenerating}
            isConnected={googleAdsConnected}
            onConnect={() => setGoogleAdsConnected(true)}
            dataSourceMode={dataSourceMode}
            setDataSourceMode={setDataSourceMode}
          />
        )}
        {activeTab === 'report' && <ReportView report={generatedReport} clientName={briefing.clientName} />}
        {activeTab === 'settings' && <SettingsView />}
      </main>
    </div>
  );
};

export default App;
