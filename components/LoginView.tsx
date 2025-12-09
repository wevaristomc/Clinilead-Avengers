
import React, { useState } from 'react';
import { ShieldCheck, Lock, Mail, Loader2, KeyRound, AlertOctagon } from 'lucide-react';
import { loginUser, resetPassword } from '../services/databaseService';

interface LoginViewProps {
  onLoginSuccess: (user: any) => void;
  dbConnectionStatus: { connected: boolean; error?: string };
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess, dbConnectionStatus }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [mode, setMode] = useState<'login' | 'forgot'>('login');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const user = await loginUser(email, password);
      onLoginSuccess(user);
    } catch (err: any) {
      setError(err.message || 'Falha na autenticação');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setError('');
      setSuccessMsg('');

      try {
          await resetPassword(email);
          setSuccessMsg(`Email de redefinição enviado para ${email}`);
          setTimeout(() => setMode('login'), 3000);
      } catch (err: any) {
          setError(err.message || "Erro ao enviar email de recuperação.");
      } finally {
          setLoading(false);
      }
  };

  if (!dbConnectionStatus.connected) {
     return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
             <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl max-w-md w-full text-center">
                 <div className="bg-red-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                    <AlertOctagon className="w-8 h-8 text-red-500" />
                 </div>
                 <h1 className="text-xl font-bold text-white mb-2">Erro de Conexão com Supabase</h1>
                 <p className="text-slate-400 text-sm mb-4">
                    Não foi possível conectar ao banco de dados. 
                 </p>
                 <div className="bg-slate-950 p-3 rounded text-left border border-slate-800">
                    <p className="text-[10px] text-red-400 font-mono break-all">{dbConnectionStatus.error}</p>
                 </div>
                 <div className="mt-6 text-xs text-slate-500">
                    Por favor, edite o arquivo <code>constants.ts</code> e adicione sua URL e Chave do Supabase corretamente.
                 </div>
             </div>
        </div>
     );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-20 pointer-events-none">
         <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-brand-500 rounded-full blur-[128px]"></div>
         <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-purple-500 rounded-full blur-[96px]"></div>
      </div>

      <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-8 rounded-2xl shadow-2xl max-w-sm w-full relative z-10">
        <div className="text-center mb-8">
          <div className="bg-brand-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-brand-500/20">
            <ShieldCheck className="w-8 h-8 text-brand-500" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Clinilead Avenger</h1>
          <p className="text-slate-400 text-sm mt-2">
              {mode === 'login' ? 'Acesso Administrativo' : 'Recuperar Acesso'}
          </p>
        </div>

        {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-400 ml-1">Email</label>
                <div className="relative">
                  <Mail className="w-5 h-5 text-slate-500 absolute left-3 top-3" />
                  <input 
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all placeholder:text-slate-600"
                    placeholder="admin@clinilead.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                    <label className="text-xs font-medium text-slate-400 ml-1">Senha</label>
                    <button type="button" onClick={() => setMode('forgot')} className="text-[10px] text-brand-400 hover:text-brand-300">Esqueceu?</button>
                </div>
                <div className="relative">
                  <Lock className="w-5 h-5 text-slate-500 absolute left-3 top-3" />
                  <input 
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all placeholder:text-slate-600"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded p-3 text-xs text-red-400 text-center">
                  {error}
                </div>
              )}

              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-3 rounded-lg shadow-lg shadow-brand-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin"/> : "Entrar no Sistema"}
              </button>
            </form>
        ) : (
             <form onSubmit={handleResetPassword} className="space-y-4 animate-in fade-in slide-in-from-left-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-400 ml-1">Email Cadastrado</label>
                <div className="relative">
                  <Mail className="w-5 h-5 text-slate-500 absolute left-3 top-3" />
                  <input 
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all placeholder:text-slate-600"
                    placeholder="weverton@prooven.com.br"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded p-3 text-xs text-red-400 text-center">
                  {error}
                </div>
              )}

              {successMsg && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded p-3 text-xs text-emerald-400 text-center">
                  {successMsg}
                </div>
              )}

              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin"/> : "Enviar Link de Recuperação"}
              </button>
              
               <button 
                type="button"
                onClick={() => setMode('login')}
                className="w-full text-xs text-slate-500 hover:text-white py-2"
              >
                Voltar para Login
              </button>
            </form>
        )}

        <div className="mt-8 text-center">
          <p className="text-[10px] text-slate-600">
            Acesso restrito. Todas as atividades são monitoradas.
            <br/>Clinilead Avenger v2.5
          </p>
        </div>
      </div>
    </div>
  );
};
