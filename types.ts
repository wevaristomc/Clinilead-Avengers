
export interface UserProfile {
  id: string;
  email: string;
}

export interface PlatformConfig {
  enabled: boolean;
  budget: string;
  targetCPA: string;
}

export interface ClientBriefing {
  clientName: string;
  objective: string;
  priorities: string;
  restrictions: string;
  targetAudience: string;
  competitors: string;
  platforms: {
    meta: PlatformConfig;
    google: PlatformConfig;
    linkedin: PlatformConfig;
    tiktok: PlatformConfig;
  };
}

export interface ActionPlanItem {
  id: string;
  description: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  deadline: string;
}

export interface Client {
  id: string;
  name: string;
  industry: string;
  briefing_data?: ClientBriefing;
  created_at: string;
  email?: string;
  phone?: string;
}

export interface HistoricalReport {
  id: string;
  title: string;
  type: string;
  created_at: string;
  period_start: string;
  period_end: string;
  content_snippet?: string;
}

export interface SystemLog {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  details?: string;
  timestamp: string;
}

export interface GoogleAdsAPIData {
  accountInfo: any;
  investments: any;
  campaigns: any[];
  adGroups: any[];
  keywords: any[];
  negativeKeywords: any[];
  searchTerms: any[];
  ads: any[];
  demographics: any;
}

export interface MetaAdsAPIData {
  insights: any;
  campaigns: any[];
  adSets: any[];
  ads: any[];
}

export type AIProvider = 'gemini' | 'openai' | 'anthropic';

export interface AppState {
  apiKey: string; // Gemini Key (Legacy name)
  
  // NEW: Multi-Model Support
  aiProvider: AIProvider;
  openaiKey: string;
  anthropicKey: string;

  // Supabase Config (Legacy/Replaced by Firebase)
  supabaseUrl: string;
  supabaseKey: string;
  
  // Auth State
  user: UserProfile | null;
  viewMode: 'auth' | 'dashboard' | 'workspace';
  selectedClient: Client | null;

  briefing: ClientBriefing;
  actionPlan: ActionPlanItem[];
  
  // New: Report Configuration
  reportPeriod: {
    start: string;
    end: string;
  };
  previousReportsFiles: File[];
  
  // Database History (fetched from Firestore)
  dbHistoryAvailable: boolean;
  dbHistoryReports: HistoricalReport[]; 
  reportCustomInstructions: string; 

  // Meta Ads Data Sources
  metaFiles: File[]; 
  metaHistoryText: string; // NEW: Pasted History Text
  metaPerformanceFiles: File[]; 
  metaSheetUrl: string; 
  metaSheetContent: string | null;
  metaAdsData: MetaAdsAPIData | null;
  // NEW: Meta Demographics
  metaDemographicsFile: File | null;

  googleFiles: File[]; 
  
  // Specific Real Data Files for Audit (Legacy CSV Mode)
  googleKeywordsFile: File | null;
  googleSearchTermsFile: File | null;
  googleAdsFile: File | null;
  
  // NEW: Expanded Google Ads Files (Separated)
  googleAuctionInsightsFile: File | null;
  googleDevicesFile: File | null;
  googleAgeFile: File | null; // Age separate
  googleGenderFile: File | null; // Gender separate
  googleLocationsFile: File | null;
  googleSchedulesFile: File | null;
  
  // NEW: Strategic Context / Previous Diagnostics
  diagnosticFiles: File[];
  diagnosticUrl: string;
  diagnosticContent: string | null;

  // NEW: Website Behavior Data (Clarity/Analytics Prints)
  clarityFiles: File[];

  // API Data Mode
  googleAdsData: GoogleAdsAPIData | null;
  googleAdsJsonInput: string; 

  // Onboarding / Diagnostic Mode
  clientHasHistory: boolean;
  onboardingHistoryFiles: File[];

  isGenerating: boolean;
  generatedReport: string | null;
  activeTab: 'input' | 'report' | 'settings' | 'logs';
  googleAdsConnected: boolean;
  dataSourceMode: 'demo' | 'real' | 'api_bridge';
  metaDataSourceMode: 'demo' | 'csv' | 'json_bridge'; 
  
  // System Logs
  systemLogs: SystemLog[];
}
