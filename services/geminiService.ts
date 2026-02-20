
import { GoogleGenAI } from "@google/genai";
import { ClientBriefing, ActionPlanItem, GoogleAdsAPIData, MetaAdsAPIData, AIProvider } from '../types';
import { SYSTEM_PROMPT, GOOGLE_ADS_AUDIT_PROMPT, CREATIVE_LAB_PROMPT } from '../constants';

// --- CONFIGURAÇÃO DE MODELOS ---
const OPENAI_MODEL = "gpt-4o"; 
const ANTHROPIC_MODEL = "claude-3-5-sonnet-20240620";

// --- HELPERS PARA CONVERSÃO DE ARQUIVOS ---

const fileToBase64 = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove o prefixo data:image/png;base64, para enviar apenas os bytes
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const getMimeType = (file: File) => file.type || 'application/octet-stream';

// --- IMPLEMENTAÇÃO DAS CHAMADAS DE API ---

// 1. GEMINI (Nativo via SDK)
const callGemini = async (apiKey: string, systemInstruction: string, promptParts: any[]) => {
    const ai = new GoogleGenAI({ apiKey });
    
    // Converter formato interno para formato do SDK Gemini (Parts)
    const geminiParts = promptParts.map(p => {
        if (p.image) return { inlineData: { data: p.image, mimeType: p.mimeType } };
        if (p.text) return { text: p.text };
        return { text: JSON.stringify(p) };
    });

    try {
        // Correct usage of @google/genai SDK
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash', 
            contents: {
                role: 'user',
                parts: geminiParts
            },
            config: {
                systemInstruction: systemInstruction,
            }
        });

        // The text property is a getter that returns string | undefined
        if (response.text) {
            return response.text;
        } else {
             // Fallback/Log if text is empty (e.g. strict safety filters)
             console.warn("Gemini response.text is empty. Candidates:", response.candidates);
             throw new Error("A IA não retornou texto (possível bloqueio de segurança ou erro interno).");
        }

    } catch (e: any) {
        console.error("Gemini API Error:", e);
        throw new Error(`Erro na API Gemini: ${e.message}`);
    }
};

// 2. OPENAI (GPT-4o via Fetch)
const callOpenAI = async (apiKey: string, systemInstruction: string, promptParts: any[]) => {
    // Formatar mensagens para OpenAI
    // OpenAI espera content como array de objetos { type: "text" | "image_url", ... }
    const contentPayload = promptParts.map(p => {
        if (p.image) {
            return {
                type: "image_url",
                image_url: {
                    url: `data:${p.mimeType};base64,${p.image}`,
                    detail: "high"
                }
            };
        }
        return { type: "text", text: p.text };
    });

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: OPENAI_MODEL,
            messages: [
                { role: "system", content: systemInstruction },
                { role: "user", content: contentPayload }
            ],
            temperature: 0.7
        })
    });

    const data = await response.json();
    if (data.error) throw new Error(`OpenAI Error: ${data.error.message}`);
    return data.choices[0].message.content;
};

// 3. ANTHROPIC (Claude 3.5 Sonnet via Fetch)
const callAnthropic = async (apiKey: string, systemInstruction: string, promptParts: any[]) => {
    // Formatar para Claude
    // Claude espera content array. Imagens são { type: "image", source: { type: "base64", media_type, data } }
    const contentPayload = promptParts.map(p => {
        if (p.image) {
            return {
                type: "image",
                source: {
                    type: "base64",
                    media_type: p.mimeType,
                    data: p.image
                }
            };
        }
        return { type: "text", text: p.text };
    });

    // Claude API requer header x-api-key e anthropic-version
    // NOTA: Chamadas do Browser direto para Anthropic podem dar erro de CORS. 
    // Em produção, isso deve passar por um proxy. Aqui tentamos direto.
    const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
            "dangerously-allow-browser": "true" // Flag necessária para requests client-side (demo only)
        },
        body: JSON.stringify({
            model: ANTHROPIC_MODEL,
            system: systemInstruction,
            messages: [
                { role: "user", content: contentPayload }
            ],
            max_tokens: 4096
        })
    });

    const data = await response.json();
    if (data.error) throw new Error(`Anthropic Error: ${data.error.message}`);
    return data.content[0].text;
};

// --- FUNÇÃO CENTRAL DE DESPACHO ---
const callLLM = async (
    provider: AIProvider, 
    keys: { gemini?: string; openai?: string; anthropic?: string }, 
    systemPrompt: string, 
    parts: any[]
) => {
    try {
        if (provider === 'openai') {
            if (!keys.openai) throw new Error("Chave OpenAI não fornecida.");
            return await callOpenAI(keys.openai, systemPrompt, parts);
        } else if (provider === 'anthropic') {
            if (!keys.anthropic) throw new Error("Chave Anthropic não fornecida.");
            return await callAnthropic(keys.anthropic, systemPrompt, parts);
        } else {
            // Default Gemini
            if (!keys.gemini) throw new Error("Chave Gemini não fornecida.");
            return await callGemini(keys.gemini, systemPrompt, parts);
        }
    } catch (error: any) {
        console.error("LLM Call Error:", error);
        throw new Error(`Falha no modelo (${provider}): ${error.message}`);
    }
};

// --- GERAÇÃO DE RELATÓRIO (DIÁRIO DE BORDO) ---

export const generateReport = async (
  briefing: ClientBriefing,
  actionPlan: ActionPlanItem[],
  reportPeriod: { start: string; end: string },
  metaFiles: File[],
  metaPerformanceFiles: File[],
  googleFiles: File[],
  metaSheetContent: string | null,
  previousReportsFiles: File[],
  googleData: { 
     keywords?: File | null, searchTerms?: File | null, ads?: File | null,
     auctionInsights?: File | null, devices?: File | null, age?: File | null, gender?: File | null, locations?: File | null, schedules?: File | null,
     apiData?: GoogleAdsAPIData | null 
  },
  dbContextString: string,
  clarityFiles: File[],
  metaApiData: MetaAdsAPIData | null,
  customInstructions: string,
  diagnosticData: { files: File[], content: string | null, metaDemographics: File | null },
  metaHistoryText: string,
  partNumber: number | undefined,
  aiProvider: AIProvider,
  apiKeys: any
) => {
  const parts: any[] = [];

  // 1. Construir Contexto de Texto
  let textPrompt = `
  PERÍODO DO RELATÓRIO: ${reportPeriod.start} até ${reportPeriod.end}
  CLIENTE: ${briefing.clientName}
  OBJETIVO: ${briefing.objective}
  
  DADOS DE PLANO DE AÇÃO (Contexto):
  ${actionPlan.map(a => `- ${a.description} (${a.status})`).join('\n')}

  ${metaHistoryText ? `\nHISTÓRICO META ADS (Texto colado):\n${metaHistoryText}` : ''}
  
  ${metaSheetContent ? `\nDADOS DE PERFORMANCE META (Planilha):\n${metaSheetContent}` : ''}
  
  ${diagnosticData.content ? `\nDIAGNÓSTICO ANTERIOR (URL): ${diagnosticData.content}` : ''}

  ${dbContextString ? `\nHISTÓRICO DO BANCO DE DADOS:\n${dbContextString}` : ''}

  INSTRUÇÕES EXTRAS DO USUÁRIO: ${customInstructions}
  `;

  // Lógica de Particionamento Estrito
  let systemPromptToUse = SYSTEM_PROMPT;
  
  if (partNumber) {
      // Modificar o prompt baseado na parte para forçar foco e evitar cortes
      textPrompt += `\n\n--- INSTRUÇÃO DE GERAÇÃO PARCIAL (PARTE ${partNumber} DE 5) ---\n`;
      
      if (partNumber === 1) {
          textPrompt += `
          FOCO: Apenas o CAPÍTULO 1 (DIAGNÓSTICO ESTRATÉGICO) e CAPÍTULO 2 (PACING FINANCEIRO).
          NÃO gere o diário de bordo dia-a-dia ainda.
          Analise os dados macro: CPA Geral, Gasto Total vs Meta, e Grandes Tendências.
          `;
      } else if (partNumber >= 2 && partNumber <= 4) {
          // Dividir o período em blocos para evitar alucinação ou corte
          const totalDays = 30; // assumindo mensal
          const daysPerPart = 10;
          const startDay = (partNumber - 2) * daysPerPart + 1;
          const endDay = startDay + daysPerPart;
          
          textPrompt += `
          FOCO: Apenas o CAPÍTULO 3 (DIÁRIO DE BORDO - CRONOLOGIA).
          Analise EXCLUSIVAMENTE os eventos ocorridos entre o DIA ${startDay} e o DIA ${endDay} do período selecionado.
          Se não houver eventos nestes dias, diga "Sem alterações manuais registradas neste intervalo.".
          NÃO repita a introdução. NÃO faça a conclusão ainda.
          Liste data por data cronologicamente.
          `;
      } else if (partNumber === 5) {
          textPrompt += `
          FOCO: Apenas o CAPÍTULO 4 (CONFRONTO PLANO VS REAL) e CAPÍTULO 5 (PRÓXIMOS PASSOS).
          Faça a tabela de confronto e o plano de ataque final.
          Encerre com uma conclusão profissional.
          `;
      }
  } else {
      textPrompt += `\n\nGERAR RELATÓRIO COMPLETO (Tente ser conciso para não estourar o limite de tokens).`;
  }

  parts.push({ text: textPrompt });

  // 2. Processar Imagens/Arquivos (Limitado a 15 para não estourar payload)
  const processFiles = async (files: File[], label: string) => {
    for (const file of files.slice(0, 15)) { 
      const base64 = await fileToBase64(file);
      const mimeType = getMimeType(file);
      
      // OpenAI/Claude suportam apenas imagens reais. Arquivos de texto/csv devem ser lidos como texto.
      if (mimeType.startsWith('image/')) {
           parts.push({ image: base64, mimeType });
           parts.push({ text: `[Arquivo Imagem: ${file.name} - Tipo: ${label}]` });
      } else {
           // Se for CSV/TXT e pequeno, tentar ler como texto. Se for PDF/DOC, ignorar ou avisar (frontend deve ter convertido se possível)
           if (file.size < 50000 && (mimeType.includes('text') || file.name.endsWith('.csv') || file.name.endsWith('.json'))) {
               const textContent = await file.text();
               parts.push({ text: `[Arquivo Texto ${file.name}]:\n${textContent}` });
           }
      }
    }
  };

  await processFiles(metaFiles, 'Log Meta Ads');
  await processFiles(metaPerformanceFiles, 'Performance Meta');
  await processFiles(googleFiles, 'Log Google Ads');
  await processFiles(clarityFiles, 'Print Clarity/Analytics');
  if (diagnosticData.files) await processFiles(diagnosticData.files, 'Diagnóstico Anterior');

  // Adicionar arquivos específicos do Google se existirem
  const googleSpecifics = [
      googleData.keywords, googleData.searchTerms, googleData.ads, 
      googleData.auctionInsights, googleData.devices, googleData.locations
  ];
  
  for (const f of googleSpecifics) {
      if (f) await processFiles([f], 'Dados Google Ads');
  }

  // Chamar o Modelo
  return await callLLM(aiProvider, apiKeys, systemPromptToUse, parts);
};

// --- OUTRAS FUNÇÕES (AUDITORIA, PERFORMANCE, CRIATIVO) ---

export const generateGoogleAdsAudit = async (
    briefing: ClientBriefing,
    files: any,
    aiProvider: AIProvider,
    apiKeys: any
) => {
    const parts: any[] = [];
    parts.push({ text: `AUDITORIA GOOGLE ADS PARA: ${briefing.clientName}\nUse o prompt de auditoria abaixo.` });
    
    // Process files logic similar to generateReport...
    // Simplificado para brevidade:
    if (files.keywords) {
        const b64 = await fileToBase64(files.keywords);
        parts.push({ image: b64, mimeType: files.keywords.type });
        parts.push({ text: "Relatório Palavras-Chave" });
    }
    // ... outros arquivos ...

    return await callLLM(aiProvider, apiKeys, GOOGLE_ADS_AUDIT_PROMPT, parts);
};

export const generatePerformanceAnalysis = async (
    briefing: ClientBriefing,
    period: { start: string, end: string },
    metaFiles: File[],
    sheetContent: string | null,
    historyText: string,
    googleFiles: any,
    dbContext: string,
    instructions: string,
    aiProvider: AIProvider,
    apiKeys: any
) => {
    const parts: any[] = [];
    parts.push({ text: `ANÁLISE DE PERFORMANCE (${period.start} - ${period.end})\nCliente: ${briefing.clientName}\nContexto: ${dbContext}\nInstruções: ${instructions}` });
    
    if (sheetContent) parts.push({ text: `DADOS CSV META:\n${sheetContent}` });
    if (historyText) parts.push({ text: `HISTÓRICO TEXTO:\n${historyText}` });

    // Process Images
    for (const f of metaFiles) {
        if(f.type.startsWith('image/')) {
            parts.push({ image: await fileToBase64(f), mimeType: f.type });
        }
    }

    return await callLLM(aiProvider, apiKeys, SYSTEM_PROMPT + "\nFOCO: Apenas Análise de KPIs e Causa-Efeito.", parts);
};

export const generateCreativeStrategy = async (
    briefing: ClientBriefing,
    metaFiles: File[],
    sheetContent: string | null,
    googleFiles: any,
    clarityFiles: File[],
    aiProvider: AIProvider,
    apiKeys: any
) => {
    const parts: any[] = [];
    parts.push({ text: `ESTRATÉGIA CRIATIVA\nCliente: ${briefing.clientName}\nBriefing: ${JSON.stringify(briefing)}` });
    
    // Process Clarity/Ad Images
    for (const f of clarityFiles) {
        if(f.type.startsWith('image/')) {
             parts.push({ image: await fileToBase64(f), mimeType: f.type });
        }
    }

    return await callLLM(aiProvider, apiKeys, CREATIVE_LAB_PROMPT, parts);
};

// --- MOCK SERVICES ---
export const parseBriefingWithAI = async (text: string, provider: AIProvider, keys: any) => { return null; }
export const generateStrategicActionPlan = async (apiKey: string | undefined, briefing: ClientBriefing, provider: AIProvider, keys: any) => { return []; }
export const getMockMetaAdsData = () => null;
export const getMockGoogleAdsData = () => null;
