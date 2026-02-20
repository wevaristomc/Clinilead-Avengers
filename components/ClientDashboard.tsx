
import React, { useEffect, useState } from 'react';
import { Plus, Search, Building2, ChevronRight, MoreVertical, Trash2, Users, Loader2, LogOut } from 'lucide-react';
import { Client } from '../types';
import { getClients, createClient, deleteClient, logoutUser } from '../services/databaseService';
import { DEFAULT_BRIEFING } from '../constants';

interface ClientDashboardProps {
  onSelectClient: (client: Client) => void;
  onLogout: () => void;
  userEmail?: string;
}

export const ClientDashboard: React.FC<ClientDashboardProps> = ({ onSelectClient, onLogout, userEmail }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientIndustry, setNewClientIndustry] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    const data = await getClients();
    setClients(data);
    setLoading(false);
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault(); // Previne o reload da página
    
    if (!newClientName.trim() || !newClientIndustry.trim()) {
        alert("Por favor, preencha todos os campos.");
        return;
    }

    setIsCreating(true);
    try {
      const newClient = await createClient(newClientName, newClientIndustry, {
        ...DEFAULT_BRIEFING,
        clientName: newClientName // Override default name
      });
      
      if (newClient) {
        setClients([newClient, ...clients]);
        setIsModalOpen(false);
        // Reset form
        setNewClientName('');
        setNewClientIndustry('');
      }
    } catch (error) {
      console.error(error);
      alert("Erro ao criar cliente. Tente novamente.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if(confirm("Tem certeza? Isso apagará o histórico deste cliente.")) {
          await deleteClient(id);
          setClients(clients.filter(c => c.id !== id));
      }
  };

  const filteredClients = clients.filter(client => 
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    client.industry?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation */}
      <nav className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-md">
        <div className="flex items-center gap-3">
          <div className="bg-brand-500 p-1.5 rounded-lg">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-none">Clinilead</h1>
            <span className="text-[10px] text-slate-400 tracking-widest uppercase">Gestão de Clientes</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
           <div className="hidden md:flex flex-col text-right">
             <span className="text-xs font-bold text-slate-200">{userEmail}</span>
             <span className="text-[10px] text-slate-500 uppercase">Administrador</span>
           </div>
           <button onClick={onLogout} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
             <LogOut className="w-5 h-5" />
           </button>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto p-6 md:p-10">
        
        {/* Header Actions */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Meus Clientes</h2>
            <p className="text-slate-500 text-sm">Selecione um cliente para acessar o workspace de inteligência.</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white px-5 py-2.5 rounded-lg shadow-lg shadow-brand-500/20 transition-all active:scale-95 font-medium text-sm"
          >
            <Plus className="w-4 h-4" /> Novo Cliente
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative mb-8 max-w-md">
           <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
           <input 
             type="text" 
             placeholder="Buscar clientes por nome ou nicho..."
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
             className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm shadow-sm"
           />
        </div>

        {/* Clients Grid */}
        {loading ? (
            <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            </div>
        ) : filteredClients.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-xl border border-slate-200 border-dashed">
                <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-slate-700">Nenhum cliente encontrado</h3>
                <p className="text-slate-500 text-sm mb-4">Cadastre seu primeiro cliente para começar.</p>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="text-brand-600 font-semibold text-sm hover:underline"
                >
                    Criar Novo Cliente
                </button>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClients.map((client) => (
                <div 
                  key={client.id}
                  onClick={() => onSelectClient(client)}
                  className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-xl hover:border-brand-200 transition-all cursor-pointer group relative overflow-hidden"
                >
                   <div className="absolute top-0 left-0 w-1 h-full bg-slate-200 group-hover:bg-brand-500 transition-colors"></div>
                   
                   <div className="flex justify-between items-start mb-4">
                      <div className="bg-slate-100 p-3 rounded-lg group-hover:bg-brand-50 transition-colors">
                        <Building2 className="w-6 h-6 text-slate-600 group-hover:text-brand-600" />
                      </div>
                      <button onClick={(e) => handleDelete(e, client.id)} className="text-slate-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 className="w-4 h-4" />
                      </button>
                   </div>
                   
                   <h3 className="text-lg font-bold text-slate-800 mb-1 group-hover:text-brand-700 transition-colors">{client.name}</h3>
                   <p className="text-sm text-slate-500 mb-6">{client.industry || 'Nicho não informado'}</p>
                   
                   <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-50">
                      <span className="text-[10px] text-slate-400 font-medium">ID: {client.id.substring(0,8)}</span>
                      <div className="flex items-center gap-1 text-xs font-bold text-brand-600">
                          Acessar <ChevronRight className="w-3 h-3" />
                      </div>
                   </div>
                </div>
            ))}
            </div>
        )}
      </main>

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
                <h3 className="text-xl font-bold text-slate-800 mb-4">Novo Cliente</h3>
                
                {/* FORMULÁRIO ENCAPSULADO PARA GARANTIR SUBMISSÃO */}
                <form onSubmit={handleCreateClient} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Empresa</label>
                        <input 
                            type="text" 
                            required
                            value={newClientName}
                            onChange={e => setNewClientName(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-brand-500 outline-none"
                            placeholder="Ex: Clínica Saúde Total"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nicho / Indústria</label>
                        <input 
                            type="text" 
                            required
                            value={newClientIndustry}
                            onChange={e => setNewClientIndustry(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-brand-500 outline-none"
                            placeholder="Ex: Odontologia"
                        />
                    </div>
                    <div className="flex gap-3 pt-4">
                        <button 
                            type="button" 
                            onClick={() => setIsModalOpen(false)}
                            className="flex-1 py-2 text-slate-600 bg-slate-100 rounded hover:bg-slate-200 font-medium text-sm"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit"
                            disabled={isCreating}
                            className="flex-1 py-2 text-white bg-brand-600 rounded hover:bg-brand-500 font-medium text-sm flex justify-center items-center gap-2"
                        >
                            {isCreating ? <Loader2 className="w-4 h-4 animate-spin"/> : "Criar Cliente"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};
