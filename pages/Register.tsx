
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, ChevronRight, Loader2, User, AlertCircle, ArrowLeft } from 'lucide-react';
import { supabase, db } from '../supabase';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.');
      setLoading(false);
      return;
    }

    try {
      // 1. Cria o usuário no Auth COM METADADOS
      // Isso garante que a role apareça no JSON do usuário no painel do Supabase
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            role: 'ADMIN' // Define explicitamente como ADMIN nos metadados
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // 2. Cria o perfil na tabela 'profiles' para uso da aplicação
        // REMOVIDO: email, pois a coluna não existe na tabela profiles
        const { error: profileError } = await db.profiles().insert({
          id: authData.user.id,
          full_name: name,
          role: 'ADMIN'
        });

        if (profileError) {
          console.error('Erro ao criar perfil:', profileError);
          // Não bloqueamos o fluxo aqui, pois o login pode tentar recuperar via metadata depois
        }

        alert('Conta criada com sucesso! Faça login para continuar.');
        navigate('/login');
      }

    } catch (err: any) {
      setError(err.message || 'Erro ao realizar cadastro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-blue-900/20 rounded-full blur-3xl"></div>
      
      <div className="w-full max-w-md z-10 space-y-6">
        <button 
            onClick={() => navigate('/login')}
            className="text-gray-400 hover:text-white flex items-center gap-2 text-sm font-bold uppercase tracking-wider mb-4"
        >
            <ArrowLeft size={16} /> Voltar para Login
        </button>

        <div className="flex flex-col items-center space-y-2">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-2xl border-4 border-blue-900/30">
             <img 
              src="https://agendamento.igic.com.br/assets/logos/nord_barbershop_logo.png" 
              alt="Nord" 
              className="w-12 h-12 object-contain"
            />
          </div>
          <h1 className="text-white text-xl font-black uppercase tracking-widest">Nova Conta</h1>
          <p className="text-blue-400 text-[10px] font-bold uppercase tracking-[0.2em]">Cadastrar Barbearia (Admin)</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4 bg-white/5 p-8 rounded-[2.5rem] border border-white/10 backdrop-blur-md">
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 p-4 rounded-2xl text-red-200 text-xs flex items-center gap-3 animate-shake">
              <AlertCircle size={18} />
              <span className="font-bold">{error}</span>
            </div>
          )}
          
          <div className="space-y-4">
             <div className="relative">
              <input 
                type="text" 
                placeholder="Nome da Barbearia ou Dono"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-white/10 border border-white/10 rounded-2xl py-4 px-12 text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium"
              />
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            </div>

            <div className="relative">
              <input 
                type="email" 
                placeholder="E-mail de Acesso"
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
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-white/10 border border-white/10 rounded-2xl py-4 px-12 text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium"
              />
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            </div>

             <div className="relative">
              <input 
                type="password" 
                placeholder="Confirmar Senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full bg-white/10 border border-white/10 rounded-2xl py-4 px-12 text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium"
              />
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white font-black py-4.5 rounded-2xl shadow-xl active:scale-95 transition-transform uppercase tracking-[0.2em] text-sm flex items-center justify-center gap-2 disabled:opacity-50 mt-6"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : (
              <>
                Criar Conta
                <ChevronRight size={18} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Register;
