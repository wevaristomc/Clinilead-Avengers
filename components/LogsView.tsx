
import React, { useState } from 'react';
import { SystemLog } from '../types';
import { Search, Filter, Trash2, Terminal, AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface LogsViewProps {
  logs: SystemLog[];
  onClearLogs: () => void;
}

export const LogsView: React.FC<LogsViewProps> = ({ logs, onClearLogs }) => {
  const [filterType, setFilterType] = useState<'all' | 'error' | 'success' | 'warning' | 'info'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLogs = logs.filter(log => {
    const matchesType = filterType === 'all' || log.type === filterType;
    const matchesSearch = log.message.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          log.details?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Terminal className="w-6 h-6 text-slate-600" />
            Logs do Sistema
          </h2>
          <p className="text-slate-500">Histórico de execução, erros e eventos do Avenger.</p>
        </div>
        <button 
          onClick={onClearLogs}
          className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-red-600 rounded-lg hover:bg-red-50 hover:border-red-200 transition-colors shadow-sm text-sm font-medium"
        >
          <Trash2 className="w-4 h-4" />
          Limpar Histórico
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="flex gap-2">
             {(['all', 'error', 'success', 'warning', 'info'] as const).map(type => (
               <button
                 key={type}
                 onClick={() => setFilterType(type)}
                 className={`px-3 py-1.5 rounded-full text-xs font-bold capitalize transition-all ${
                   filterType === type 
                    ? 'bg-slate-800 text-white shadow' 
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                 }`}
               >
                 {type === 'all' ? 'Todos' : type}
               </button>
             ))}
          </div>
          
          <div className="relative w-full md:w-64">
             <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
             <input 
               type="text" 
               placeholder="Buscar logs..." 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-500 outline-none"
             />
          </div>
        </div>

        {/* Logs List */}
        <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
           {filteredLogs.length === 0 ? (
             <div className="p-10 text-center text-slate-400">
                <Terminal className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p className="text-sm">Nenhum log encontrado com os filtros atuais.</p>
             </div>
           ) : (
             filteredLogs.map((log) => (
               <div key={log.id} className="p-4 hover:bg-slate-50 transition-colors flex gap-4 group">
                  <div className="mt-1">
                    {log.type === 'error' && <AlertTriangle className="w-5 h-5 text-red-500" />}
                    {log.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-500" />}
                    {log.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-500" />}
                    {log.type === 'info' && <Info className="w-5 h-5 text-blue-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                     <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm font-bold ${
                           log.type === 'error' ? 'text-red-700' :
                           log.type === 'success' ? 'text-emerald-700' :
                           log.type === 'warning' ? 'text-amber-700' :
                           'text-slate-700'
                        }`}>
                           {log.message}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">{log.timestamp}</span>
                     </div>
                     {log.details && (
                       <pre className="text-xs text-slate-500 bg-slate-100 p-2 rounded mt-2 overflow-x-auto whitespace-pre-wrap font-mono border border-slate-200">
                         {log.details}
                       </pre>
                     )}
                  </div>
               </div>
             ))
           )}
        </div>
      </div>
    </div>
  );
};
