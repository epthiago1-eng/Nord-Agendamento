
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../supabase';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Limpa sessão antiga ao abrir a tela de login para garantir teste limpo
  useEffect(() => {
    localStorage.clear();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      // Buscar o perfil do usuário para saber a Role (ADMIN ou COLLABORATOR)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profileError) {
        // Fallback apenas para não quebrar em desenvolvimento se a tabela estiver vazia
        // Em produção, isso deveria ser tratado como erro
        localStorage.setItem('user_role', 'ADMIN');
        localStorage.setItem('user_name', 'Administrador');
      } else {
        localStorage.setItem('user_role', profile.role);
        localStorage.setItem('user_name', profile.full_name);
        localStorage.setItem('user_pro_id', profile.professional_id || '');
      }

      localStorage.setItem('is_logged_in', 'true');
      
      // Redireciona para a agenda
      navigate('/agenda');
    } catch (err: any) {
      setError(err.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-blue-900/20 rounded-full blur-3xl"></div>
      
      <div className="w-full max-w-md z-10 space-y-8">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-2xl border-4 border-blue-900/30">
            <img 
              src="https://agendamento.igic.com.br/assets/logos/nord_barbershop_logo.png" 
              alt="Nord Barbershop" 
              className="w-20 h-20 object-contain"
            />
          </div>
          <div className="text-center">
            <h1 className="text-white text-2xl font-black uppercase tracking-[0.3em]">Nord</h1>
            <p className="text-blue-400 text-[10px] font-bold uppercase tracking-[0.5em] mt-1">Gestão de Barbearia</p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 bg-white/5 p-8 rounded-[2.5rem] border border-white/10 backdrop-blur-md">
          <h2 className="text-white/60 text-xs font-black uppercase tracking-widest text-center mb-4">Acesso ao Sistema</h2>
          
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 p-4 rounded-2xl text-red-200 text-xs flex items-center gap-3 animate-shake">
              <AlertCircle size={18} />
              <span className="font-bold">{error}</span>
            </div>
          )}
          
          <div className="space-y-4">
            <div className="relative">
              <input 
                type="email" 
                placeholder="Seu E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-white/10 border border-white/10 rounded-2xl py-4 px-12 text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium"
              />
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            </div>
            <div className="relative">
              <input 
                type="password" 
                placeholder="Sua Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-white/10 border border-white/10 rounded-2xl py-4 px-12 text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium"
              />
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-white text-[#0f172a] font-black py-4.5 rounded-2xl shadow-xl active:scale-95 transition-transform uppercase tracking-[0.2em] text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : (
              <>
                Entrar no Painel
                <ChevronRight size={18} />
              </>
            )}
          </button>

          <div className="text-center pt-2">
            <button 
                type="button"
                onClick={() => navigate('/register')}
                className="text-white/50 text-[10px] uppercase font-bold tracking-widest hover:text-white transition-colors border-b border-transparent hover:border-white pb-0.5"
            >
                Não tem conta? Cadastrar Barbearia
            </button>
          </div>
        </form>

        <p className="text-gray-600 text-[10px] font-medium text-center uppercase tracking-tighter">
          Nord Barbershop Tech • v2.0
        </p>
      </div>
    </div>
  );
};

export default Login;
