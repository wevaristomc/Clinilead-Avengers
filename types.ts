
export interface PlatformConfig {
  enabled: boolean;
  budget: string; // Keeping as string for input handling, converted to number for calc
  targetCPA: string;
}

export interface ClientBriefing {
  clientName: string; // New field for personalization
  objective: string;
  priorities: string;
  restrictions: string;
  targetAudience: string;
  competitors: string;
  rawInput?: string;
  
  // New Granular Budget Structure
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

// Detailed API Data Structure
export interface GoogleAdsAPIData {
  accountInfo: {
    id: string;
    name: string;
    currency: string;
  };
  campaigns: Array<{
    id: string;
    name: string;
    status: string;
    budget: number;
    spend: number;
    conversions: number;
    cpa: number;
    roas: number;
  }>;
  adGroups: Array<{
    id: string;
    campaignName: string;
    name: string;
    status: string;
    cpa: number;
    spend: number;
  }>;
  ads: Array<{
    id: string;
    adGroupName: string;
    headline: string;
    strength: string; // POOR, AVERAGE, EXCELLENT
    clicks: number;
    ctr: number;
  }>;
  keywords: Array<{
    text: string;
    matchType: string;
    qualityScore: number;
    spend: number;
    conversions: number;
    cpa: number;
    roas: number;
  }>;
  searchTerms: Array<{
    text: string;
    campaignName: string;
    impressions: number;
    clicks: number;
    cost: number;
    conversions: number;
  }>;
  audiences: Array<{
    name: string;
    type: string; // AFFINITY, IN_MARKET, CUSTOM
    impressions: number;
    cpa: number;
    roas: number;
  }>;
}

// Auth & Client Management Types
export interface UserProfile {
  id: string;
  email: string;
}

export interface Client {
  id: string;
  name: string;
  industry?: string;
  briefing_data?: Partial<ClientBriefing>;
  created_at?: string;
}

export interface AppState {
  apiKey: string;
  // Supabase Config
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
  
  // Database History (fetched from Supabase)
  dbHistoryAvailable: boolean;
  dbHistoryContext: string;

  // Meta Ads Data Sources
  metaFiles: File[]; // Activity Logs (History)
  metaPerformanceFiles: File[]; // Performance Data (CSV)
  metaSheetUrl: string; // Performance Data (Sheets)
  metaSheetContent: string | null;

  googleFiles: File[]; // Activity Logs (History)
  
  // Specific Real Data Files for Audit (Legacy CSV Mode)
  googleKeywordsFile: File | null;
  googleSearchTermsFile: File | null;
  googleAdsFile: File | null;
  
  // API Data Mode
  googleAdsData: GoogleAdsAPIData | null;
  googleAdsJsonInput: string; // For pasting raw JSON from API scripts

  // Onboarding / Diagnostic Mode
  clientHasHistory: boolean;
  onboardingHistoryFiles: File[];

  isGenerating: boolean;
  generatedReport: string | null;
  activeTab: 'input' | 'report' | 'settings';
  googleAdsConnected: boolean;
  dataSourceMode: 'demo' | 'real' | 'api_bridge';
}

export enum ReportType {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  CREATIVE = 'CREATIVE',
  STRUCTURE = 'STRUCTURE',
  GOOGLE_AUDIT = 'GOOGLE_AUDIT',
  ONBOARDING = 'ONBOARDING'
}
