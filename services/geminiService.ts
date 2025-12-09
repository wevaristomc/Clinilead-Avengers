
import { GoogleGenAI } from "@google/genai";
import { SYSTEM_PROMPT, GOOGLE_ADS_AUDIT_PROMPT, CREATIVE_LAB_PROMPT, ONBOARDING_DIAGNOSTIC_PROMPT } from "../constants";
import { ClientBriefing, ActionPlanItem, GoogleAdsAPIData } from "../types";

// Helper to read file as text
const readFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
};

export const parseBriefingWithAI = async (
  apiKey: string,
  rawText: string
): Promise<Partial<ClientBriefing>> => {
  if (!apiKey) throw new Error("API Key required");

  const prompt = `
    Analise o texto abaixo (que é um briefing bruto de um cliente via WhatsApp/Email) e extraia os dados estruturados.
    
    TEXTO: "${rawText}"
    
    Retorne um JSON puro (sem markdown) com estas chaves:
    {
      "clientName": "nome do cliente/empresa identificado no texto ou vazio",
      "objective": "resumo do objetivo",
      "targetAudience": "descrição do público",
      "competitors": "lista de concorrentes",
      "priorities": "focos principais",
      "restrictions": "restrições mencionadas",
      "platforms": {
         "meta": { "enabled": boolean, "budget": "valor string sem R$", "targetCPA": "valor estimado se nao houver" },
         "google": { "enabled": boolean, "budget": "valor string sem R$", "targetCPA": "valor estimado se nao houver" },
         "linkedin": { "enabled": boolean, "budget": "valor string sem R$", "targetCPA": "valor estimado se nao houver" },
         "tiktok": { "enabled": boolean, "budget": "valor string sem R$", "targetCPA": "valor estimado se nao houver" }
      }
    }
    
    Regras: 
    1. Se o orçamento for total, tente dividir entre as plataformas mencionadas (ex: 60% Google, 40% Meta) ou coloque em uma só se especificado.
    2. Estime um CPA alvo razoável para o nicho se o cliente não falou (ex: Estética = 45.00, E-commerce = 20.00).
  `;

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: { responseMimeType: 'application/json' }
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Failed to parse AI briefing response", e);
    return {};
  }
};

export const generateReport = async (
  apiKey: string,
  briefing: ClientBriefing,
  actionPlan: ActionPlanItem[],
  reportPeriod: { start: string, end: string },
  metaActivityFiles: File[], // Changed from metaFiles to explicit Activity
  metaPerformanceFiles: File[], // New: Performance CSVs
  googleActivityFiles: File[], // Generic activity logs
  metaSheetContent: string | null,
  previousReportsFiles: File[], // Optional: Previous Reports for context
  // New: Specific Performance Files for Report Cross-Referencing
  googleRealFiles?: {
    keywords?: File | null;
    searchTerms?: File | null;
    ads?: File | null;
    apiData?: GoogleAdsAPIData | null;
  },
  databaseHistoryContext?: string // New: Context fetched from Supabase
): Promise<string> => {
  if (!apiKey) throw new Error("API Key is required");

  // 1. Read files
  // Meta Logs (Cause)
  const metaActivityContents = await Promise.all(metaActivityFiles.map(readFile));
  // Meta Performance (Effect)
  const metaPerformanceContents = await Promise.all(metaPerformanceFiles.map(readFile));
  
  // Google Logs (Cause)
  const googleActivityContents = await Promise.all(googleActivityFiles.map(readFile));

  // Previous Reports Context (Files)
  const previousReportsContents = await Promise.all(previousReportsFiles.map(readFile));

  // Build Google Performance Context (Effect)
  let googlePerformanceContext = "";
  if (googleRealFiles) {
    // Priority 1: API JSON Data
    if (googleRealFiles.apiData) {
       googlePerformanceContext = `
      ================================================================================
      DADOS DE PERFORMANCE (API LIVE) - GOOGLE ADS
      ================================================================================
      Dados estruturados extraídos via API Bridge. Estes dados mostram o "EFEITO" (Resultados).
      ${JSON.stringify(googleRealFiles.apiData, null, 2)}
      `;
    } else {
      // Priority 2: CSV Files
      const kwContent = googleRealFiles.keywords ? await readFile(googleRealFiles.keywords) : "";
      const stContent = googleRealFiles.searchTerms ? await readFile(googleRealFiles.searchTerms) : "";
      const adsContent = googleRealFiles.ads ? await readFile(googleRealFiles.ads) : "";

      if (kwContent || stContent || adsContent) {
        googlePerformanceContext = `
        ================================================================================
        DADOS DE PERFORMANCE (CSV UPLOADS) - GOOGLE ADS
        ================================================================================
        Estes dados mostram o "EFEITO" (Resultados). Use para confrontar os Logs.
        
        [RELATÓRIO DE PALAVRAS-CHAVE]: 
        ${kwContent.substring(0, 30000)}

        [RELATÓRIO DE TERMOS DE PESQUISA]: 
        ${stContent.substring(0, 30000)}

        [RELATÓRIO DE ANÚNCIOS]: 
        ${adsContent.substring(0, 20000)}
        `;
      }
    }
  }

  // Build Meta Performance Context (Effect)
  let metaPerformanceContext = "";
  if (metaSheetContent || metaPerformanceContents.length > 0) {
      metaPerformanceContext = `
      ================================================================================
      DADOS DE PERFORMANCE (EFEITO) - META ADS
      ================================================================================
      Estes dados mostram CPA, Custo, Resultados. Cruze isso com as ações do histórico.
      
      ${metaSheetContent ? `[GOOGLE SHEETS LIVE DATA]:\n${metaSheetContent.substring(0, 50000)}` : ''}
      ${metaPerformanceContents.length > 0 ? `[CSV PERFORMANCE UPLOADS]:\n${metaPerformanceContents.join('\n').substring(0, 50000)}` : ''}
      `;
  }

  // Calculate totals for context
  const totalBudget = 
    Number(briefing.platforms.meta.budget || 0) + 
    Number(briefing.platforms.google.budget || 0) +
    Number(briefing.platforms.linkedin.budget || 0) +
    Number(briefing.platforms.tiktok.budget || 0);

  const budgetBreakdown = `
    - Meta Ads: R$ ${briefing.platforms.meta.budget} (CPA Alvo: R$ ${briefing.platforms.meta.targetCPA}) [${briefing.platforms.meta.enabled ? 'ATIVO' : 'INATIVO'}]
    - Google Ads: R$ ${briefing.platforms.google.budget} (CPA Alvo: R$ ${briefing.platforms.google.targetCPA}) [${briefing.platforms.google.enabled ? 'ATIVO' : 'INATIVO'}]
    - LinkedIn Ads: R$ ${briefing.platforms.linkedin.budget} (CPA Alvo: R$ ${briefing.platforms.linkedin.targetCPA}) [${briefing.platforms.linkedin.enabled ? 'ATIVO' : 'INATIVO'}]
    - TikTok Ads: R$ ${briefing.platforms.tiktok.budget} (CPA Alvo: R$ ${briefing.platforms.tiktok.targetCPA}) [${briefing.platforms.tiktok.enabled ? 'ATIVO' : 'INATIVO'}]
    - TOTAL MENSAL: R$ ${totalBudget.toFixed(2)}
  `;

  // CALCULATE PACING TARGETS
  const daysInMonth = 30.4;
  const metaDailyTarget = briefing.platforms.meta.enabled ? (Number(briefing.platforms.meta.budget) / daysInMonth).toFixed(2) : "0.00";
  const googleDailyTarget = briefing.platforms.google.enabled ? (Number(briefing.platforms.google.budget) / daysInMonth).toFixed(2) : "0.00";

  // 2. Construct the prompt
  const userPrompt = `
    INICIE A ANÁLISE ESTRATÉGICA AGORA.
    
    --- PARÂMETROS DO RELATÓRIO ---
    CLIENTE: ${briefing.clientName || "NÃO IDENTIFICADO"}
    PERÍODO DE ANÁLISE (DATA INICIAL A FINAL): ${reportPeriod.start} até ${reportPeriod.end}
    FUSO HORÁRIO: São Paulo/Brasil (GMT-3). Se os logs estiverem em UTC, converta para BRT.

    --- CONTEXTO DO PROJETO ---
    Nome do Cliente: ${briefing.clientName}
    Objetivo: ${briefing.objective}
    Prioridades da Semana: ${briefing.priorities}
    Público Alvo: ${briefing.targetAudience}
    Concorrentes: ${briefing.competitors}
    Matriz de Investimento: ${budgetBreakdown}

    --- ANÁLISE DE PACING (METAS FINANCEIRAS) ---
    Use estes valores como ALVO ("Target Daily Spend") para calcular se há under-pacing ou over-pacing nos arquivos de performance.
    
    1. META ADS TARGET: R$ ${metaDailyTarget} / dia (aprox)
    2. GOOGLE ADS TARGET: R$ ${googleDailyTarget} / dia (aprox)
    
    Se o gasto médio diário encontrado nos CSVs divergir mais de 20% destes valores, ACIONE O ALERTA.
    
    **IMPORTANTE: GERE A SEÇÃO "MONITORAMENTO DE PACING" COM O SEGUINTE FORMATO ESTRITO PARA O FRONTEND LER:**
    (Exemplo)
    PACING_DATA:
    Meta Ads | Meta: R$ 50.00 | Realizado: R$ 45.00 | Status: Saudável
    Google Ads | Meta: R$ 80.00 | Realizado: R$ 20.00 | Status: Under-pacing

    --- PLANO DE AÇÃO (O que prometemos fazer) ---
    ${actionPlan.map(item => `- [${item.status}] ${item.description} (Prazo: ${item.deadline})`).join('\n')}

    --- CONTEXTO HISTÓRICO (RELATÓRIOS ANTERIORES) ---
    Use estes relatórios passados (Arquivos e Banco de Dados) para entender a evolução do projeto e não repetir recomendações já feitas.
    
    [HISTÓRICO DO BANCO DE DADOS SUPABASE]:
    ${databaseHistoryContext || "Sem histórico no banco de dados."}

    [ARQUIVOS ANEXADOS]:
    ${previousReportsContents.length > 0 ? previousReportsContents.join('\n\n').substring(0, 20000) : "Nenhum relatório anterior anexado via arquivo."}

    ================================================================================
    LOGS DE ATIVIDADE (CAUSA) - HISTÓRICO DE ALTERAÇÕES
    ================================================================================
    Estes arquivos contêm o registro do que FOI FEITO nas contas (Change History).
    Use estes dados OBRIGATORIAMENTE para montar o "Relatório Diário de Bordo".
    ATENÇÃO: FILTRE APENAS AS ATIVIDADES DENTRO DO PERÍODO: ${reportPeriod.start} a ${reportPeriod.end}.
    **IMPORTANTE: Use o formato exato [DD/MM/AAAA] no início da linha para o frontend criar a timeline.**
    
    >> GOOGLE ADS CHANGE HISTORY:
    ${googleActivityContents.length > 0 ? googleActivityContents.join('\n\n').substring(0, 30000) : "Nenhum arquivo de log (Change History) do Google Ads fornecido."}

    >> META ADS CHANGE HISTORY:
    ${metaActivityContents.length > 0 ? metaActivityContents.join('\n\n').substring(0, 30000) : "Nenhum arquivo de log (Change History) do Meta Ads fornecido."}

    ${googlePerformanceContext}

    ${metaPerformanceContext}

    GERE O RELATÓRIO AGORA SEGUINDO O FORMATO ESTRUTURADO DO SYSTEM PROMPT.
    LEMBRE-SE: 
    1. A SEÇÃO "RELATÓRIO DIÁRIO DE BORDO" É OBRIGATÓRIA E DEVE TER O "RESUMO EXECUTIVO" E "IMPACTO ESPERADO/REAL" DETALHADO.
    2. CONVERTA HORÁRIOS PARA BRASIL (GMT-3).
    3. CITE NÚMEROS DE PERFORMANCE PARA JUSTIFICAR SUA ANÁLISE DE IMPACTO EM CADA ITEM DA TIMELINE.
    4. VERIFIQUE O PACING FINANCEIRO E GERE ALERTAS.
    5. INCLUA O NOME DO CLIENTE NO TÍTULO.
  `;

  // 3. Call Gemini with Thinking Model
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', // Upgraded to Pro for complex reasoning
      config: {
        systemInstruction: SYSTEM_PROMPT,
        thinkingConfig: { thinkingBudget: 8192 }, // INCREASED BUDGET: Force deeper data cross-referencing
        temperature: 0.7, // Higher temp for more creative strategy
      },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }]
    });

    return response.text || "No response generated.";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error(`Failed to generate report: ${error.message || error}`);
  }
};

export const generateStrategicActionPlan = async (
  apiKey: string,
  briefing: ClientBriefing,
  // NEW: Accept all data files for high-complexity analysis
  metaPerformanceFiles: File[],
  metaSheetContent: string | null,
  previousReportsFiles: File[],
  googleRealFiles?: {
    keywords?: File | null;
    searchTerms?: File | null;
    ads?: File | null;
    apiData?: GoogleAdsAPIData | null;
  }
): Promise<ActionPlanItem[]> => {
  if (!apiKey) throw new Error("API Key is required");

  // Read context to ensure the plan is data-driven, not generic
  const metaPerfContents = await Promise.all(metaPerformanceFiles.map(readFile));
  const prevReportsContents = await Promise.all(previousReportsFiles.map(readFile));
  
  let googleDataStr = "";
  if (googleRealFiles?.apiData) {
    googleDataStr = JSON.stringify(googleRealFiles.apiData).substring(0, 15000);
  } else {
    const kws = googleRealFiles?.keywords ? await readFile(googleRealFiles.keywords) : "";
    const terms = googleRealFiles?.searchTerms ? await readFile(googleRealFiles.searchTerms) : "";
    googleDataStr = `KWs: ${kws.substring(0, 5000)}\nTerms: ${terms.substring(0, 5000)}`;
  }

  const activePlatforms = Object.entries(briefing.platforms)
    .filter(([_, config]) => config.enabled)
    .map(([key]) => key)
    .join(", ");

  const prompt = `
    Atue como um Estrategista de Tráfego Pago Sênior (Nível Expert).
    
    SUA MISSÃO: Criar um PLANO DE AÇÃO TÁTICO E CORRETIVO PARA O CLIENTE: ${briefing.clientName}.
    
    1. **FONTE EXTERNA (WEB):** Pesquise benchmarks e tendências para o nicho "${briefing.objective}".
    2. **FONTE INTERNA (DADOS EM ANEXO):** Analise os dados brutos abaixo. Seu plano NÃO pode ser genérico. Ele deve corrigir os problemas encontrados nos dados (ex: "Pausar palavra-chave X que gastou R$500 sem conversão").

    --- BRIEFING ---
    Cliente: ${briefing.clientName}
    Objetivo: ${briefing.objective}
    Público: ${briefing.targetAudience}
    Prioridades: ${briefing.priorities}
    Plataformas: ${activePlatforms}
    
    --- DADOS DE PERFORMANCE REAIS (ANALISE ISTO PARA CRIAR AÇÕES CORRETIVAS) ---
    [META ADS DATA]: ${metaSheetContent?.substring(0, 5000) || metaPerfContents.join('\n').substring(0, 5000) || "Sem dados Meta"}
    [GOOGLE ADS DATA]: ${googleDataStr || "Sem dados Google"}
    
    --- HISTÓRICO (O QUE JÁ FOI FEITO) ---
    [RELATÓRIOS ANTERIORES]: ${prevReportsContents.join('\n').substring(0, 5000) || "Nenhum histórico"}

    Gere 5 a 8 itens de ação ALTAMENTE ESPECÍFICOS. Misture "Correções de Dados" (ex: Pausar KW ruim) com "Estratégia de Crescimento" (ex: Testar novo criativo X).
    
    IMPORTANTE: Retorne APENAS um JSON array puro no seguinte formato:
    [
      {
        "description": "Descrição detalhada (cite dados se possível, ex: 'Pausar campanha X pois CPA está R$90')",
        "deadline": "YYYY-MM-DD",
        "status": "Pending"
      }
    ]
  `;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }], // Mix web grounding with internal data
        temperature: 0.3, // Low temp for precision
      },
    });

    const text = response.text || "";
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/\[[\s\S]*\]/);
    
    if (jsonMatch) {
      const jsonStr = jsonMatch[1] || jsonMatch[0];
      const items = JSON.parse(jsonStr);
      
      return items.map((item: any, index: number) => ({
        id: Date.now().toString() + index,
        description: item.description,
        deadline: item.deadline || new Date().toISOString().split('T')[0],
        status: 'Pending'
      }));
    }
    
    return [{
      id: Date.now().toString(),
      description: "Falha ao gerar plano estruturado. Tente novamente.",
      deadline: new Date().toISOString().split('T')[0],
      status: 'Pending'
    }];

  } catch (error: any) {
    console.error("Gemini Action Plan Error:", error);
    throw new Error("Failed to generate action plan.");
  }
};

export const generateOnboardingDiagnostic = async (
  apiKey: string,
  briefing: ClientBriefing,
  historyFiles: File[],
  hasHistory: boolean
): Promise<string> => {
  if (!apiKey) throw new Error("API Key is required");

  // Read history if available
  const historyContents = hasHistory 
    ? await Promise.all(historyFiles.map(readFile)) 
    : [];

  const historyContext = hasHistory
    ? `
    --- DADOS HISTÓRICOS BRUTOS ---
    Use estes dados para calcular: Total (Lifetime), Média 3 Meses, Média 30 Dias.
    ${historyContents.join('\n\n').substring(0, 60000)}
    `
    : "CLIENTE SEM HISTÓRICO. FOCO EM ESTRATÉGIA DE LANÇAMENTO (ZERO-TO-ONE).";

  const prompt = `
    GERAR DIAGNÓSTICO INICIAL (ONBOARDING) PARA: ${briefing.clientName}
    
    --- BRIEFING ---
    Objetivo: ${briefing.objective}
    Público: ${briefing.targetAudience}
    Competidores: ${briefing.competitors}
    Plataformas: ${Object.entries(briefing.platforms).filter(([_,c]) => c.enabled).map(([k])=>k).join(', ')}

    ${historyContext}

    SIGA O "ONBOARDING_DIAGNOSTIC_PROMPT" ESTRITAMENTE.
    SE HOUVER DADOS: CRUZE OS PERÍODOS.
    SE NÃO HOUVER: GERE O GUIDE DE PEÇAS E ESTRUTURA.
  `;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      config: {
        systemInstruction: ONBOARDING_DIAGNOSTIC_PROMPT,
        thinkingConfig: { thinkingBudget: 4096 }, // Moderate thinking for strategy
        temperature: 0.6,
      },
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });

    return response.text || "Failed to generate diagnostic.";
  } catch (error: any) {
    console.error("Gemini Onboarding Error:", error);
    throw new Error("Failed to generate diagnostic report.");
  }
};

/**
 * Simulates a comprehensive Google Ads API Fetch.
 * Returns structured data including AdGroups and Audiences.
 */
export const getMockGoogleAdsData = (): GoogleAdsAPIData => {
  return {
    accountInfo: {
      name: "Clinilead Conta Demo (MOCK)",
      id: "123-456-7890",
      currency: "BRL"
    },
    campaigns: [
      { id: "c1", name: "Pesquisa - Pós Operatório", status: "ENABLED", budget: 5000, spend: 4200, conversions: 35, cpa: 120.00, roas: 2.5 },
      { id: "c2", name: "Pesquisa - Institucional", status: "ENABLED", budget: 1000, spend: 200, conversions: 40, cpa: 5.00, roas: 15.0 },
      { id: "c3", name: "PMax - Conversão Geral", status: "LEARNING", budget: 2000, spend: 800, conversions: 8, cpa: 100.00, roas: 1.8 }
    ],
    adGroups: [
      { id: "ag1", campaignName: "Pesquisa - Pós Operatório", name: "Drenagem Linfática", status: "ENABLED", cpa: 85.00, spend: 1200 },
      { id: "ag2", campaignName: "Pesquisa - Pós Operatório", name: "Fibrose Zero", status: "PAUSED", cpa: 200.00, spend: 500 },
      { id: "ag3", campaignName: "Pesquisa - Institucional", name: "Nome da Clínica", status: "ENABLED", cpa: 4.50, spend: 150 }
    ],
    ads: [
      { id: "ad1", adGroupName: "Drenagem Linfática", headline: "Drenagem Pós-Op Especializada", strength: "EXCELLENT", clicks: 450, ctr: 0.12 },
      { id: "ad2", adGroupName: "Drenagem Linfática", headline: "Melhor Clínica SP", strength: "POOR", clicks: 50, ctr: 0.02 }
    ],
    keywords: [
      { text: "drenagem linfatica pós operatorio", matchType: "PHRASE", qualityScore: 7, spend: 1500, conversions: 18, cpa: 83.33, roas: 2.4 },
      { text: "clinica estetica centro", matchType: "EXACT", qualityScore: 9, spend: 800, conversions: 20, cpa: 40.00, roas: 5.0 },
      { text: "massagem modeladora preço", matchType: "BROAD", qualityScore: 3, spend: 1200, conversions: 2, cpa: 600.00, roas: 0.33 }
    ],
    searchTerms: [
      { text: "drenagem linfatica gratuita curso", campaignName: "Pesquisa - Pós Operatório", impressions: 500, clicks: 50, cost: 250, conversions: 0 },
      { text: "melhor clinica pos operatorio zona sul", campaignName: "Pesquisa - Pós Operatório", impressions: 120, clicks: 15, cost: 100, conversions: 4 }
    ],
    audiences: [
      { name: "In-Market: Beleza & Bem-Estar", type: "IN_MARKET", impressions: 5000, cpa: 45.00, roas: 4.5 },
      { name: "Affinity: Compradores de Luxo", type: "AFFINITY", impressions: 8000, cpa: 120.00, roas: 1.2 },
      { name: "Custom: Visitantes de Concorrentes", type: "CUSTOM", impressions: 1500, cpa: 55.00, roas: 3.8 }
    ]
  };
};

export const generateGoogleAdsAudit = async (
  apiKey: string,
  briefing: ClientBriefing,
  realFiles?: {
    keywords?: File | null;
    searchTerms?: File | null;
    ads?: File | null;
    apiData?: GoogleAdsAPIData | null; // New: API Data Priority
  }
): Promise<string> => {
  if (!apiKey) throw new Error("API Key is required");

  let dataContext = "";

  // Priority 1: API Data (JSON Bridge or Mock)
  if (realFiles?.apiData) {
     dataContext = `
    --- DADOS DA API GOOGLE ADS (LIVE/MOCK) ---
    Estrutura completa da conta extraída via API.
    ${JSON.stringify(realFiles.apiData, null, 2)}
    `;
  } 
  // Priority 2: CSV Files
  else if (realFiles && (realFiles.keywords || realFiles.searchTerms || realFiles.ads)) {
    const kwContent = realFiles.keywords ? await readFile(realFiles.keywords) : "Nenhum arquivo de palavras-chave fornecido.";
    const stContent = realFiles.searchTerms ? await readFile(realFiles.searchTerms) : "Nenhum arquivo de termos de pesquisa fornecido.";
    const adsContent = realFiles.ads ? await readFile(realFiles.ads) : "Nenhum arquivo de anúncios fornecido.";

    dataContext = `
    --- DADOS REAIS EXTRAÍDOS DA CONTA GOOGLE ADS (CSV) ---
    Use estes dados com prioridade total.
    
    >> RELATÓRIO DE PALAVRAS-CHAVE (Verifique colunas 'Quality Score' ou 'Índice de Qualidade'):
    ${kwContent}

    >> RELATÓRIO DE TERMOS DE PESQUISA:
    ${stContent}

    >> RELATÓRIO DE ANÚNCIOS:
    ${adsContent}
    `;
  } else {
    // Default Fallback
     dataContext = `
    --- SEM DADOS ---
    O usuário não forneceu dados. Gere um checklist genérico de auditoria.
    `;
  }

  const prompt = `
    Analise os seguintes DADOS DO GOOGLE ADS para o cliente abaixo.

    --- CLIENTE ---
    Nome: ${briefing.clientName}
    Objetivo: ${briefing.objective}
    Restrições: ${briefing.restrictions}
    
    --- ORÇAMENTO GOOGLE ADS ---
    Budget Mensal: R$ ${briefing.platforms.google.budget}
    CPA Alvo: R$ ${briefing.platforms.google.targetCPA}

    ${dataContext}

    Gere o relatório de auditoria e otimização seguindo estritamente o System Prompt definido.
    Se houver dados de Audiências e Grupos de Anúncio, analise a coesão temática e o desempenho por segmento.
    IMPORTANTE: Analise o Quality Score (Índice de Qualidade) das palavras-chave para sugerir otimizações de relevância (Ad Relevance, Landing Page Experience, Expected CTR).
  `;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', // Upgraded to Pro for Deep Audit
      config: {
        systemInstruction: GOOGLE_ADS_AUDIT_PROMPT,
        thinkingConfig: { thinkingBudget: 4096 }, // High thinking budget for deep audit
        temperature: 0.5,
      },
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });

    return response.text || "Audit generation failed.";
  } catch (error: any) {
    console.error("Gemini Audit Error:", error);
    throw new Error("Failed to generate audit.");
  }
};

export const generateCreativeStrategy = async (
  apiKey: string,
  briefing: ClientBriefing,
  metaPerformanceFiles: File[],
  metaSheetContent: string | null,
  googleRealFiles?: {
    keywords?: File | null;
    ads?: File | null;
  }
): Promise<string> => {
  if (!apiKey) throw new Error("API Key is required");

  // Read context data for data-driven creativity
  const metaPerfContents = await Promise.all(metaPerformanceFiles.map(readFile));
  const googleKwContent = googleRealFiles?.keywords ? await readFile(googleRealFiles.keywords) : "";
  const googleAdsContent = googleRealFiles?.ads ? await readFile(googleRealFiles.ads) : "";

  const dataContext = `
  --- PERFORMANCE DATA CONTEXT (FOR INSPIRATION) ---
  The following data shows what is currently running. Use it to identify winning angles or fatigued creatives.

  META ADS DATA:
  ${metaSheetContent ? metaSheetContent.substring(0, 10000) : ""}
  ${metaPerfContents.join('\n').substring(0, 10000)}

  GOOGLE ADS DATA:
  Keywords: ${googleKwContent.substring(0, 10000)}
  Ads: ${googleAdsContent.substring(0, 10000)}
  `;

  const prompt = `
  GENERATE A CREATIVE STRATEGY FOR:
  Client: ${briefing.clientName}
  Objective: ${briefing.objective}
  Target Audience: ${briefing.targetAudience}
  Competitors: ${briefing.competitors}
  Priorities: ${briefing.priorities}
  Restrictions: ${briefing.restrictions}

  ${dataContext}

  Follow the CREATIVE LAB SYSTEM PROMPT structure perfectly.
  `;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      config: {
        systemInstruction: CREATIVE_LAB_PROMPT,
        thinkingConfig: { thinkingBudget: 2048 },
        temperature: 0.8, // High creativity
      },
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });

    return response.text || "Creative generation failed.";
  } catch (error: any) {
    console.error("Gemini Creative Error:", error);
    throw new Error("Failed to generate creative strategy.");
  }
};
