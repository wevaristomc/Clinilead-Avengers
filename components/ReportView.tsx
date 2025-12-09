
import React, { useRef, useState } from 'react';
import { Copy, Check, Download, Activity, FileText, Printer, FileType } from 'lucide-react';

interface ReportViewProps {
  report: string | null;
  clientName?: string;
}

// Helper to extract Pacing Data from the AI Text for the Chart
const extractPacingData = (text: string) => {
  const pacingBlock = text.match(/PACING_DATA:([\s\S]*?)(---|$)/);
  if (!pacingBlock) return [];
  
  const lines = pacingBlock[1].trim().split('\n');
  return lines.map(line => {
    // Example: Meta Ads | Meta: R$ 50.00 | Realizado: R$ 45.00 | Status: Saudável
    const parts = line.split('|').map(s => s.trim());
    if (parts.length < 4) return null;

    const platform = parts[0];
    const target = parseFloat(parts[1].replace(/[^0-9.]/g, ''));
    const actual = parseFloat(parts[2].replace(/[^0-9.]/g, ''));
    const status = parts[3].replace('Status:', '').trim();

    return { platform, target, actual, status };
  }).filter(x => x !== null);
};

export const ReportView: React.FC<ReportViewProps> = ({ report, clientName }) => {
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  if (!report) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-400 py-20">
        <div className="bg-slate-100 p-6 rounded-full mb-4 animate-pulse">
          <FileText className="w-12 h-12 text-slate-300" />
        </div>
        <h3 className="text-xl font-medium text-slate-700">Aguardando Análise...</h3>
        <p className="max-w-md text-center mt-2 text-sm">Configure seus dados no Painel de Controle e clique em "Gerar Relatório Diário".</p>
      </div>
    );
  }

  // COPY RICH TEXT (HTML) - Best for Word/Docs
  const handleCopyRichText = async () => {
    if (!reportRef.current) return;

    try {
      const htmlContent = reportRef.current.innerHTML;
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const textBlob = new Blob([reportRef.current.innerText], { type: 'text/plain' });
      
      const data = [new ClipboardItem({ 
        'text/html': blob,
        'text/plain': textBlob 
      })];
      
      await navigator.clipboard.write(data);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy rich text: ', err);
      // Fallback
      navigator.clipboard.writeText(report);
      alert("Cópia rica falhou, texto simples copiado.");
    }
  };

  // GENERATE PDF using html2pdf.js
  const handleDownloadPDF = () => {
    if (!reportRef.current) return;
    setIsDownloading(true);

    const element = reportRef.current;
    const fileName = `Clinilead_${clientName ? clientName.replace(/\s+/g, '_') : 'Relatorio'}_${new Date().toISOString().split('T')[0]}.pdf`;

    const opt = {
      margin: [10, 10, 10, 10], // top, left, bottom, right in mm
      filename: fileName,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    // @ts-ignore - html2pdf is loaded via script tag
    window.html2pdf().set(opt).from(element).save().then(() => {
      setIsDownloading(false);
    });
  };

  const pacingData = extractPacingData(report);

  return (
    <div className="max-w-6xl mx-auto pb-20 space-y-6">
      
      {/* Header Actions (Not Printed) */}
      <div className="flex flex-col md:flex-row items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-200 sticky top-4 z-20 gap-4">
         <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="p-2 bg-brand-100 rounded-lg">
               <Activity className="w-5 h-5 text-brand-600" />
            </div>
            <div>
               <h2 className="text-sm font-bold text-slate-800">Relatório de Inteligência: {clientName || 'Geral'}</h2>
               <p className="text-xs text-slate-500">{new Date().toLocaleDateString('pt-BR')} • Pronto para Exportação</p>
            </div>
         </div>
         <div className="flex gap-2 w-full md:w-auto justify-end">
            <button 
              onClick={handleCopyRichText}
              className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors shadow-sm"
              title="Copia formatado para colar no Word/Docs"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copiado!' : 'Copiar para Docs'}
            </button>
            <button 
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-slate-900 rounded hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20 disabled:opacity-70"
            >
              {isDownloading ? <Printer className="w-3 h-3 animate-pulse" /> : <FileType className="w-3 h-3" />}
              {isDownloading ? 'Gerando PDF...' : 'Baixar PDF'}
            </button>
          </div>
      </div>

      {/* DOCUMENT PREVIEW CONTAINER (A4 Simulation) */}
      <div className="flex justify-center bg-slate-100 p-4 md:p-8 rounded-xl overflow-auto">
        <div 
          id="report-print-container"
          ref={reportRef}
          className="bg-white shadow-2xl w-full max-w-[210mm] min-h-[297mm] p-[15mm] md:p-[20mm] text-slate-800"
          style={{ fontFamily: '"Inter", sans-serif' }}
        >
          {/* PDF HEADER */}
          <div className="border-b-2 border-slate-800 pb-4 mb-8 flex justify-between items-end">
            <div>
               <h1 className="text-3xl font-bold text-slate-900 leading-none mb-2">RELATÓRIO DE INTELIGÊNCIA</h1>
               <p className="text-sm text-slate-500 font-medium tracking-widest uppercase">CLINILEAD AVENGER • PERFORMANCE</p>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-brand-600">{clientName || 'Cliente'}</div>
              <div className="text-xs text-slate-400">{new Date().toLocaleDateString('pt-BR')}</div>
            </div>
          </div>

          {/* DASHBOARD SECTION (Always Visible if Data Exists) */}
          {pacingData.length > 0 && (
            <div className="mb-8 p-4 bg-slate-50 rounded-lg border border-slate-200 break-inside-avoid">
               <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">
                 Monitoramento de Pacing
               </h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pacingData.map((data: any, idx) => {
                      const percentage = Math.min((data.actual / (data.target || 1)) * 100, 100);
                      const isOver = data.actual > data.target * 1.1;
                      const isUnder = data.actual < data.target * 0.8;
                      
                      return (
                        <div key={idx} className="bg-white p-3 rounded border border-slate-200">
                          <div className="flex justify-between items-center mb-2">
                              <span className="text-xs font-bold text-slate-700">{data.platform}</span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                isOver ? 'bg-red-100 text-red-700' : isUnder ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                              }`}>
                                {data.status.replace('Status:', '')}
                              </span>
                          </div>
                          <div className="flex justify-between items-end mb-1">
                             <span className="text-lg font-mono font-bold text-slate-900">R$ {data.actual.toFixed(2)}</span>
                             <span className="text-[10px] text-slate-400 mb-1">Meta: R$ {data.target.toFixed(2)}</span>
                          </div>
                           <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${isOver ? 'bg-red-500' : isUnder ? 'bg-amber-400' : 'bg-emerald-500'}`}
                                style={{ width: `${percentage}%` }} // Inline style needed for PDF generation
                              ></div>
                           </div>
                        </div>
                      );
                  })}
               </div>
            </div>
          )}

          {/* MAIN CONTENT PARSED */}
          <div className="prose prose-slate max-w-none prose-h2:text-brand-700 prose-h2:border-b prose-h2:border-slate-100 prose-h2:pb-2 prose-table:text-sm">
             <MarkdownRenderer content={report} />
          </div>

          {/* PDF FOOTER */}
          <div className="mt-12 pt-4 border-t border-slate-200 text-center">
             <p className="text-[10px] text-slate-400">
               Gerado por Inteligência Artificial (Clinilead Avenger) • {new Date().getFullYear()} • Confidencial
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Custom Markdown Renderer to make the text look Professional
const MarkdownRenderer = ({ content }: { content: string }) => {
  const lines = content.split('\n');
  const rendered = [];
  
  let inTable = false;
  let tableRows = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Headers
    if (line.startsWith('# ')) {
       // Skip H1 as we added a custom header
    } else if (line.startsWith('## ')) {
       rendered.push(<h2 key={i} className="text-xl font-bold text-brand-800 mt-8 mb-4 flex items-center gap-2 break-after-avoid"><span className="w-1.5 h-6 bg-brand-500 rounded-sm inline-block"></span>{line.replace('## ', '')}</h2>);
    } else if (line.startsWith('### ')) {
       rendered.push(<h3 key={i} className="text-lg font-semibold text-slate-800 mt-6 mb-2 break-after-avoid">{line.replace('### ', '')}</h3>);
    } 
    // Timeline Entry Detection [DD/MM/YYYY]
    else if (line.trim().match(/^\[\d{2}\/\d{2}\/\d{4}\]/)) {
       const datePart = line.match(/^\[(.*?)\]/)?.[1];
       const rest = line.replace(/^\[.*?\]/, '');
       rendered.push(
         <div key={i} className="flex gap-4 items-start py-2 border-b border-slate-100 break-inside-avoid">
            <div className="min-w-[85px] text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded text-center border border-slate-200">{datePart}</div>
            <div className="text-sm text-slate-700 leading-snug pt-0.5">{rest}</div>
         </div>
       );
    }
    // Lists
    else if (line.trim().startsWith('- ')) {
       rendered.push(<li key={i} className="ml-5 text-slate-700 list-disc marker:text-brand-500 pl-1 py-0.5 text-sm">{line.replace('- ', '')}</li>);
    }
    // Tables (Markdown style)
    else if (line.trim().startsWith('|')) {
        if (!inTable) inTable = true;
        const cells = line.split('|').filter(c => c.trim() !== '').map(c => c.trim());
        const isHeader = lines[i+1]?.includes('---');
        
        if (!line.includes('---')) { // Skip separator lines
           tableRows.push(
             <tr key={i} className={isHeader ? "bg-slate-100 text-slate-700 font-bold uppercase text-xs" : "border-b border-slate-100 hover:bg-slate-50"}>
                {cells.map((cell, cIdx) => (
                  <td key={cIdx} className="p-2 text-xs text-left border-r border-slate-200 last:border-0 align-top">
                    {cell.includes('❌') ? <span className="text-red-600 font-bold flex items-center gap-1">❌ <span className="hidden print:inline">DESVIO</span></span> : 
                     cell.includes('✅') ? <span className="text-emerald-600 font-bold flex items-center gap-1">✅ <span className="hidden print:inline">OK</span></span> : 
                     cell}
                  </td>
                ))}
             </tr>
           );
        }
    } 
    else {
        // End of table check
        if (inTable && !line.trim().startsWith('|')) {
            inTable = false;
            rendered.push(
               <div key={`table-${i}`} className="overflow-hidden rounded border border-slate-300 my-4 break-inside-avoid shadow-sm">
                  <table className="w-full border-collapse">{tableRows}</table>
               </div>
            );
            tableRows = [];
        }
        
        // Regular Text
        if (line.trim() !== '' && !line.includes('---') && !line.includes('PACING_DATA:')) {
            // Bold Parsing
            const parts = line.split(/(\*\*.*?\*\*)/g);
            rendered.push(
              <p key={i} className="mb-2 text-slate-600 text-sm leading-relaxed text-justify">
                {parts.map((part, pIdx) => 
                  part.startsWith('**') ? <strong key={pIdx} className="text-slate-900 font-bold">{part.replace(/\*\*/g, '')}</strong> : part
                )}
              </p>
            );
        }
    }
  }

  // Flush remaining table if exists at end
  if (tableRows.length > 0) {
      rendered.push(
        <div key="table-end" className="overflow-hidden rounded border border-slate-300 my-4 break-inside-avoid shadow-sm">
           <table className="w-full border-collapse">{tableRows}</table>
        </div>
     );
  }

  return <div>{rendered}</div>;
};
