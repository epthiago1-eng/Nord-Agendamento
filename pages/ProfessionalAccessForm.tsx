
import React, { useState } from 'react';
import { ChevronLeft, Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { db, supabaseUrl, supabaseAnonKey } from '../supabase';

const ProfessionalAccessForm: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const proData = location.state?.pro;

  const [formData, setFormData] = useState({
    email: proData?.email || '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setError(null);
    if (!formData.email || !formData.password) {
      setError('Por favor, preencha o e-mail e a senha.');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não coincidem!');
      return;
    }
    if (formData.password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    setLoading(true);

    try {
      // Cliente temporário para criar usuário sem deslogar o admin
      const tempSupabase = createClient(supabaseUrl, supabaseAnonKey);

      // 1. Criar o usuário no Auth COM METADADOS
      // A role COLLABORATOR fica salva no user_metadata
      const { data: authData, error: authError } = await tempSupabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: proData?.name || 'Colaborador',
            role: 'COLLABORATOR',
            professional_id: id // Vincula ao ID da tabela professionals
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // 2. Criar ou Atualizar o perfil na tabela 'profiles' vinculado ao ID do profissional
        // Usamos UPSERT para evitar erro se houver um Trigger no banco que cria o perfil automaticamente
        // IMPORTANTE: Não enviamos o campo 'email' aqui pois ele não existe na tabela profiles (fica no auth.users)
        const { error: profileError } = await db.profiles().upsert({
          id: authData.user.id,
          full_name: proData?.name,
          role: 'COLLABORATOR',
          professional_id: id 
        });

        if (profileError) {
          console.error('Erro detalhado:', profileError);
          // Se for erro de RLS, tenta logar
          if (profileError.code === '42501') {
             throw new Error('Permissão negada. Verifique as políticas RLS da tabela profiles.');
          }
          throw new Error(`Falha ao vincular perfil: ${profileError.message}`);
        }

        // 3. Atualizar o email na tabela professionals
        if (proData && proData.email !== formData.email) {
            await db.professionals().update({ email: formData.email }).eq('id', id);
        }

        alert(`Acesso configurado com sucesso para ${proData?.name || 'o colaborador'}!`);
        navigate('/professionals');
      }

    } catch (err: any) {
      console.error(err);
      let msg = err.message || 'Erro ao criar acesso.';
      
      // Traduções de erros comuns do Supabase
      if (msg.includes('rate limit exceeded')) {
        msg = 'Muitas tentativas recentes. O servidor bloqueou temporariamente o envio de e-mails. Aguarde alguns minutos e tente novamente.';
      } else if (msg.includes('User already registered')) {
        msg = 'Este e-mail já possui um cadastro no sistema.';
      } else if (msg.includes('Password should be')) {
        msg = 'A senha é muito fraca. Escolha uma senha mais forte.';
      }

      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      <header className="bg-[#1e3a8a] text-white px-4 py-4 flex items-center sticky top-0 z-50 shadow-md">
        <button onClick={() => navigate(-1)} className="p-1 active:scale-90 transition-transform">
          <ChevronLeft size={28} />
        </button>
        <h1 className="flex-1 text-center text-lg font-medium tracking-tight pr-8">
          Criar Acesso Barbeiro
        </h1>
      </header>

      <div className="p-4 space-y-6 flex-1 overflow-y-auto pt-8">
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-start gap-3">
           <ShieldCheck className="text-blue-900 shrink-0 mt-0.5" size={20} />
           <div>
             <h3 className="text-blue-900 font-bold text-sm">Acesso Restrito (Colaborador)</h3>
             <p className="text-blue-700 text-xs mt-1">
               Este usuário terá acesso limitado (Agenda Própria, Meus Clientes e Meu Financeiro). Ele não verá dados administrativos.
             </p>
           </div>
        </div>

        {error && (
            <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex items-start gap-3 text-red-600 text-sm font-bold animate-in slide-in-from-top-2">
                <AlertCircle size={20} className="shrink-0 mt-0.5" />
                <span className="leading-snug">{error}</span>
            </div>
        )}

        {/* E-mail de acesso */}
        <div>
          <label className="text-sm font-medium text-gray-800 block mb-2 px-1">E-mail de Login</label>
          <input 
            type="email" 
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            placeholder="Ex: barbeiro@nord.com" 
            className="w-full bg-white border border-gray-300 rounded-lg py-3.5 px-4 outline-none focus:ring-1 focus:ring-blue-900 text-gray-700 shadow-sm"
          />
        </div>

        {/* Senha de acesso */}
        <div>
          <label className="text-sm font-medium text-gray-800 block mb-2 px-1">Senha Provisória</label>
          <input 
            type="password" 
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
            placeholder="Mínimo 6 caracteres" 
            className="w-full bg-white border border-gray-300 rounded-lg py-3.5 px-4 outline-none focus:ring-1 focus:ring-blue-900 text-gray-700 shadow-sm"
          />
        </div>

        {/* Confirme sua nova senha */}
        <div>
          <label className="text-sm font-medium text-gray-800 block mb-2 px-1">Confirme a Senha</label>
          <input 
            type="password" 
            value={formData.confirmPassword}
            onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
            placeholder="Repita a senha" 
            className="w-full bg-white border border-gray-300 rounded-lg py-3.5 px-4 outline-none focus:ring-1 focus:ring-blue-900 text-gray-700 shadow-sm"
          />
        </div>

        <div className="pt-4">
          <button 
            onClick={handleSave}
            disabled={loading}
            className="w-full bg-[#1e3a8a] text-white font-bold py-4 rounded-lg shadow-md active:scale-[0.98] transition-all uppercase tracking-widest text-sm flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Criar Acesso'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfessionalAccessForm;
