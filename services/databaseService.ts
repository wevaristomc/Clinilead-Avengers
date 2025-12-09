
import { createClient as createSupabaseClient, SupabaseClient, User } from '@supabase/supabase-js';
import { Client, ClientBriefing } from '../types';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants';

let supabase: SupabaseClient | null = null;

// Initialize automatically using constants
if (SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL !== "https://your-project.supabase.co") {
  try {
    supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (e) {
    console.error("Critical Supabase Init Error:", e);
  }
}

/**
 * Checks if Supabase is connected and reachable.
 */
export const verifySupabaseConnection = async (): Promise<{ success: boolean; message: string }> => {
  if (!supabase) {
    return { success: false, message: "Supabase client not initialized. Check constants.ts." };
  }

  try {
    // Attempt a lightweight query (e.g., check health or count clients)
    // Using count on clients table, assuming public access or auth works
    const { count, error } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error("Supabase Connection Error:", error);
      // Connection reached Supabase but query failed (likely RLS or Table missing)
      // We consider this "connected" but maybe not fully set up. 
      // Ideally, a 401/403 means it's connected. Network error means it's not.
      return { success: true, message: "Connected, but query failed (Check Tables/RLS)." }; 
    }
    
    return { success: true, message: "Connection Successful" };
  } catch (err: any) {
    console.error("Supabase Network Error:", err);
    return { success: false, message: `Network Error: ${err.message}` };
  }
};


// --- AUTHENTICATION ---

export const loginUser = async (email: string, pass: string) => {
  if (!supabase) throw new Error("Supabase não configurado. Verifique constants.ts");
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: pass,
  });

  if (error) throw error;
  return data.user;
};

export const resetPassword = async (email: string) => {
  if (!supabase) throw new Error("Supabase não configurado.");

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin, // Redireciona de volta para o app
  });

  if (error) throw error;
  return true;
};

export const logoutUser = async () => {
  if (!supabase) return;
  await supabase.auth.signOut();
};

export const getCurrentUser = async (): Promise<User | null> => {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

// --- CLIENT MANAGEMENT ---

export const getClients = async (): Promise<Client[]> => {
  if (!supabase) return [];
  
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching clients", error);
    return [];
  }
  return data as Client[];
};

export const createClient = async (name: string, industry: string, briefing?: Partial<ClientBriefing>): Promise<Client | null> => {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('clients')
    .insert([{
      name,
      industry,
      briefing_data: briefing
    }])
    .select()
    .single();

  if (error) throw error;
  return data as Client;
};

export const updateClientBriefing = async (clientId: string, briefing: ClientBriefing) => {
  if (!supabase) return;
  
  const { error } = await supabase
    .from('clients')
    .update({ briefing_data: briefing })
    .eq('id', clientId);
    
  if (error) console.error("Error updating client briefing", error);
};

export const deleteClient = async (clientId: string) => {
    if (!supabase) return;
    const { error } = await supabase.from('clients').delete().eq('id', clientId);
    if (error) throw error;
};

// --- REPORTING ---

export const saveReportToDb = async (
  clientName: string,
  reportType: string,
  content: string,
  periodStart: string,
  periodEnd: string
) => {
  if (!supabase) return;

  const { error } = await supabase
    .from('reports')
    .insert([
      {
        client_name: clientName,
        report_type: reportType,
        content: content,
        period_start: periodStart,
        period_end: periodEnd,
      },
    ]);

  if (error) {
    console.error('Error saving report to DB:', error);
    throw error;
  }
};

export const fetchClientHistory = async (clientName: string): Promise<string> => {
  if (!supabase || !clientName) return "";

  // Fetch last 5 reports for this client
  const { data, error } = await supabase
    .from('reports')
    .select('created_at, report_type, content, period_start, period_end')
    .ilike('client_name', `%${clientName}%`) // Fuzzy search
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error fetching history:', error);
    return "";
  }

  if (!data || data.length === 0) return "";

  return data.map((report: any) => `
    --- REGISTRO DE BANCO DE DADOS [${new Date(report.created_at).toLocaleDateString()}] ---
    Tipo: ${report.report_type}
    Período: ${report.period_start} a ${report.period_end}
    Conteúdo Resumido:
    ${report.content.substring(0, 3000)}... (truncado)
  `).join('\n\n');
};
