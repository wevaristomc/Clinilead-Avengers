import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { Client, ClientBriefing, HistoricalReport } from '../types';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants';

// --- MOCK DATABASE (IN-MEMORY) ---
// Used when no API Key is provided so the app doesn't crash
let mockClients: Client[] = [];
let mockReports: Record<string, any[]> = {};

let supabase: any = null;
let isMockMode = true;

const isPlaceholder = (str: string) => {
  return str.includes("seu-projeto") || str.includes("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...");
};

try {
  // Check if Keys are valid AND NOT placeholders
  if (
      SUPABASE_URL && 
      SUPABASE_URL.startsWith("http") && 
      !isPlaceholder(SUPABASE_URL) &&
      SUPABASE_ANON_KEY && 
      SUPABASE_ANON_KEY.length > 20 &&
      !isPlaceholder(SUPABASE_ANON_KEY)
  ) {
    supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    isMockMode = false;
    console.log("⚡ Supabase initialized in REAL MODE");
  } else {
    console.warn("⚠️ Supabase Credentials missing or detected as placeholders. Switching to MOCK/OFFLINE MODE.");
    isMockMode = true;
  }
} catch (e) {
  console.error("Supabase Initialization Error:", e);
  isMockMode = true;
}

/**
 * Checks if Supabase is reachable.
 */
export const verifySupabaseConnection = async (): Promise<{ success: boolean; message: string; mode: 'real' | 'mock' }> => {
  if (isMockMode || !supabase) {
    return { success: true, message: "Modo Offline / Demonstração (Dados em Memória)", mode: 'mock' };
  }

  try {
    // Attempt a real lightweight query to check connection
    const { error } = await supabase.from('clients').select('id').limit(1);
    
    if (error) {
       console.warn("Supabase connect check warning:", error.message);
       
       // If authorization failed or resource not found (likely bad config despite passing format check)
       // we should fallback to mock mode to prevent app breakage.
       if (error.code === '401' || error.code === 'PGRST301' || error.message.includes('FetchError') || error.message.includes('Failed to fetch')) {
           isMockMode = true;
           return { success: true, message: `Falha de conexão (${error.message}). Revertendo para Modo Offline.`, mode: 'mock' };
       }

       // Otherwise (e.g. table missing but connected), assume Real Mode
       return { success: true, message: `Conectado ao Supabase (Tabela vazia ou restrita)`, mode: 'real' };
    }
    
    return { success: true, message: "Conectado ao Supabase PostgreSQL", mode: 'real' };
  } catch (err: any) {
    console.error("Supabase Network Error:", err);
    isMockMode = true;
    return { success: true, message: "Erro de Rede - Mudando para Modo Offline", mode: 'mock' };
  }
};


// --- AUTHENTICATION ---

export const loginUser = async (email: string, pass: string) => {
  if (isMockMode) {
      if (email === 'admin@clinilead.com' && pass === 'admin') {
        return { id: 'admin-123', email };
      }
      throw new Error("Credenciais Inválidas (Mock: admin@clinilead.com / admin)");
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: pass,
  });

  if (error) throw new Error(error.message);
  return { id: data.user.id, email: data.user.email };
};

export const resetPassword = async (email: string) => {
  if (isMockMode) return true;
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw new Error(error.message);
  return true;
};

export const logoutUser = async () => {
  if (!isMockMode) {
      await supabase.auth.signOut();
  }
};

export const getCurrentUser = async () => {
  if (isMockMode) return { id: 'admin-123', email: 'admin@clinilead.com' };
  
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return { id: user.id, email: user.email };
  return null;
};

// --- CLIENT MANAGEMENT ---

export const getClients = async (): Promise<Client[]> => {
  // MOCK MODE
  if (isMockMode) {
    return [...mockClients];
  }
  
  // REAL MODE (Supabase)
  try {
    const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;

    // Map snake_case database columns to camelCase Client interface
    return data.map((d: any) => ({
      id: d.id,
      name: d.name, // Assuming column name is 'name'
      industry: d.industry,
      briefing_data: d.briefing_data, // JSONB column
      created_at: d.created_at,
      email: d.email,
      phone: d.phone
    })) as Client[];

  } catch (error) {
    console.error("Error fetching clients", error);
    // Fallback to empty array instead of crashing if table is missing
    return [];
  }
};

export const createClient = async (name: string, industry: string, briefing?: ClientBriefing): Promise<Client | null> => {
  // MOCK MODE
  if (isMockMode) {
    const newClient: Client = {
      id: `mock-${Date.now()}`,
      name,
      industry,
      briefing_data: briefing,
      created_at: new Date().toISOString()
    };
    mockClients.unshift(newClient);
    return newClient;
  }

  // REAL MODE
  try {
    // Assuming table 'clients' with columns: name, industry, briefing_data
    const { data, error } = await supabase
        .from('clients')
        .insert([
            { name, industry, briefing_data: briefing }
        ])
        .select()
        .single();

    if (error) throw error;

    return {
      id: data.id,
      name: data.name,
      industry: data.industry,
      briefing_data: data.briefing_data,
      created_at: data.created_at
    };
  } catch (error) {
    console.error("Error creating client", error);
    throw error;
  }
};

export const updateClientBriefing = async (clientId: string, briefing: ClientBriefing) => {
  // MOCK MODE
  if (isMockMode) {
    const client = mockClients.find(c => c.id === clientId);
    if (client) {
      client.briefing_data = briefing;
    }
    return;
  }
  
  // REAL MODE
  try {
    const { error } = await supabase
        .from('clients')
        .update({ briefing_data: briefing })
        .eq('id', clientId);
        
    if (error) throw error;
  } catch (error) {
    console.error("Error updating client briefing", error);
  }
};

export const deleteClient = async (clientId: string) => {
    // MOCK MODE
    if (isMockMode) {
      mockClients = mockClients.filter(c => c.id !== clientId);
      delete mockReports[clientId];
      return;
    }

    // REAL MODE
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId);
        
      if (error) throw error;
    } catch (error) {
      console.error("Error deleting client", error);
      throw error;
    }
};

// --- REPORTING ---

export const saveReportToDb = async (
  clientId: string,
  reportType: string,
  content: string,
  periodStart: string,
  periodEnd: string,
  clientNameForLegacy?: string
) => {
  // MOCK MODE
  if (isMockMode) {
    if (!mockReports[clientId]) mockReports[clientId] = [];
    mockReports[clientId].unshift({
      id: `rep-${Date.now()}`,
      title: `${reportType} - ${periodStart}`,
      content: content,
      type: reportType,
      period_start: periodStart, 
      period_end: periodEnd,
      created_at: new Date().toISOString()
    });
    console.log("Saved report to Mock DB");
    return;
  }

  // REAL MODE
  try {
    // Assuming table 'reports' with columns: client_id, title, content, type, period_start, period_end
    const { error } = await supabase
        .from('reports')
        .insert([{
            client_id: clientId,
            title: `${reportType} - ${periodStart}`,
            content: content,
            type: reportType,
            period_start: periodStart,
            period_end: periodEnd
        }]);
    
    if (error) throw error;
    
  } catch (error) {
    console.error('Error saving report to DB:', error);
    throw error;
  }
};

export const fetchClientReports = async (clientIdOrName: string): Promise<HistoricalReport[]> => {
    // MOCK MODE
    if (isMockMode) {
        const rawReports = mockReports[clientIdOrName] || [];
        return rawReports.map((r: any) => ({
            id: r.id,
            title: r.title,
            type: r.type,
            created_at: r.created_at,
            period_start: r.period_start,
            period_end: r.period_end,
            content_snippet: r.content ? r.content.substring(0, 1000) : ''
        }));
    }

    // REAL MODE
    try {
        const { data: reports, error } = await supabase
            .from('reports')
            .select('*')
            .eq('client_id', clientIdOrName)
            .order('created_at', { ascending: false })
            .limit(10); // Limit 10 for list

        if (error) throw error;

        if (!reports || reports.length === 0) return [];

        return reports.map((report: any) => ({
            id: report.id,
            title: report.title,
            type: report.type || 'Geral',
            created_at: report.created_at,
            period_start: report.period_start,
            period_end: report.period_end,
            content_snippet: report.content ? report.content.substring(0, 1000) : ''
        }));
    } catch (error) {
        console.error('Error fetching history:', error);
        return [];
    }
}

// Deprecated alias for compatibility if needed, but we should use fetchClientReports
export const fetchClientHistory = async (clientIdOrName: string): Promise<string> => {
   const reports = await fetchClientReports(clientIdOrName);
   if (reports.length === 0) return "";
   
   return reports.slice(0, 5).map(report => `
      --- RELATÓRIO ANTERIOR [${new Date(report.created_at).toLocaleDateString()}] ---
      Tipo: ${report.type}
      Período: ${report.period_start} a ${report.period_end}
      Conteúdo Resumido:
      ${report.content_snippet}...
    `).join('\n\n');
};

export const deleteReport = async (reportId: string) => {
    // MOCK MODE
    if (isMockMode) {
        // Find owner to delete from array
        for (const clientId in mockReports) {
            mockReports[clientId] = mockReports[clientId].filter(r => r.id !== reportId);
        }
        return;
    }

    // REAL MODE
    try {
        const { error } = await supabase
            .from('reports')
            .delete()
            .eq('id', reportId);

        if (error) throw error;
    } catch (error) {
        console.error("Error deleting report", error);
        throw error;
    }
}