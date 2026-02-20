
import React from 'react';
import { LayoutDashboard, FileText, Settings, Activity, ArrowLeft, Terminal } from 'lucide-react';
import { AppState } from '../types';

interface SidebarProps {
  activeTab: AppState['activeTab'];
  onTabChange: (tab: AppState['activeTab']) => void;
  clientName?: string;
  onBackToDashboard: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, clientName, onBackToDashboard }) => {
  const navItems = [
    { id: 'input', label: 'Painel de Controle', icon: LayoutDashboard },
    { id: 'report', label: 'Ver Relatório', icon: FileText },
    { id: 'logs', label: 'Logs do Sistema', icon: Terminal },
    { id: 'settings', label: 'Configurações', icon: Settings },
  ] as const;

  return (
    <div className="w-64 bg-slate-900 text-white flex flex-col h-full fixed left-0 top-0 z-10 hidden md:flex">
      {/* Header Context */}
      <div className="p-4 bg-slate-950 border-b border-slate-800">
         <button 
           onClick={onBackToDashboard}
           className="flex items-center gap-2 text-xs text-slate-400 hover:text-white mb-4 transition-colors"
         >
           <ArrowLeft className="w-3 h-3" /> Voltar à Seleção
         </button>
         <div className="flex items-center gap-3">
            <div className="bg-brand-500 p-2 rounded-lg shadow-lg shadow-brand-500/20">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div className="overflow-hidden">
              <h1 className="font-bold text-sm leading-tight truncate">{clientName || 'Clinilead'}</h1>
              <span className="text-[10px] text-slate-400 font-medium tracking-widest block mt-0.5">AVENGER CORE</span>
            </div>
         </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm font-medium ${
              activeTab === item.id
                ? 'bg-brand-600 text-white shadow-md'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="bg-slate-800 rounded-lg p-3">
          <p className="text-xs text-slate-400 mb-1">Status do Modelo</p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-xs font-semibold text-emerald-400">Gemini 2.5 Flash</span>
          </div>
        </div>
      </div>
    </div>
  );
};
