
import React, { useState, useEffect } from 'react';
import { ChevronLeft, Loader2, ShieldCheck, AlertCircle, User, LayoutDashboard, CheckCircle2 } from 'lucide-react';
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
    confirmPassword: '',
    role: 'COLLABORATOR' as 'ADMIN' | 'COLLABORATOR'
  });
  
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [existingProfileId, setExistingProfileId] = useState<string | null>(null);

  // Carregar dados de acesso existentes se houver
  useEffect(() => {
    const fetchExistingAccess = async () => {
        if (!id) {
            setInitialLoading(false);
            return;
        }
        try {
            // Verifica se já existe um perfil vinculado a este profissional
            const { data: profile } = await db.profiles()
                .select('*')
                .eq('professional_id', id)
                .single();

            if (profile) {
                setExistingProfileId(profile.id);
                // Correção: Usando callback seguro para atualizar estado
                setFormData(currentForm => {
                    const newForm = {
                        ...currentForm,
                        role: profile.role || 'COLLABORATOR'
                    };
                    if (!newForm.email && proData?.email) {
                         newForm.email = proData.email;
                    }
                    return newForm;
                });
            }
        } catch (err) {
            console.log('Nenhum acesso prévio encontrado ou erro ao buscar.');
        } finally {
            setInitialLoading(false);
        }
    };
    fetchExistingAccess();
  }, [id, proData]);

  const handleSave = async () => {
    setError(null);
    
    // Validações básicas
    if (!formData.email) {
      setError('Por favor, preencha o e-mail.');
      return;
    }
    
    // Se for criação ou se o usuário decidiu mudar a senha
    if (formData.password || formData.confirmPassword) {
        if (formData.password !== formData.confirmPassword) {
            setError('As senhas não coincidem!');
            return;
        }
        if (formData.password.length < 6) {
            setError('A senha deve ter no mínimo 6 caracteres.');
            return;
        }
    } else if (!existingProfileId) {
        // Se não existe perfil, a senha é obrigatória
        setError('Defina uma senha para o primeiro acesso.');
        return;
    }

    setLoading(true);

    try {
      let authUserId = existingProfileId;

      // 1. Tentar Criar/Atualizar Auth (Se houver senha ou for novo)
      if (!existingProfileId || formData.password) {
          const tempSupabase = createClient(supabaseUrl, supabaseAnonKey);
          
          const { data: authData, error: authError } = await tempSupabase.auth.signUp({
            email: formData.email,
            password: formData.password, // Se estiver vazio, o Supabase ignora em alguns casos ou falha, mas validamos antes
            options: {
              data: {
                full_name: proData?.name || 'Profissional',
                role: formData.role, // Salva Role nos metadados
                professional_id: id
              }
            }
          });

          if (authError) {
              // Se o erro for "User already registered", e temos o existingProfileId,
              // significa que estamos apenas editando permissões/email sem mudar senha via Auth API 
              // (o que requereria login). Prosseguimos para atualizar a tabela profiles.
              if (!authError.message.includes('already registered')) {
                  throw authError;
              }
          }
          
          if (authData.user) {
              authUserId = authData.user.id;
          }
      }

      // 2. Atualizar Tabela de Perfis (A fonte da verdade para a Role no App)
      // Se tivermos um ID de usuário (novo ou existente), atualizamos a role
      if (authUserId || existingProfileId) {
          const targetId = authUserId || existingProfileId;
          
          const { error: profileError } = await db.profiles().upsert({
            id: targetId,
            full_name: proData?.name,
            role: formData.role, // Atualiza a Role
            professional_id: id 
          });

          if (profileError) throw new Error(`Erro ao salvar perfil: ${profileError.message}`);
      }

      // 3. Atualizar o email na tabela professionals para manter sincronia
      if (proData && proData.email !== formData.email) {
          await db.professionals().update({ email: formData.email }).eq('id', id);
      }

      alert(`Acesso ${existingProfileId ? 'atualizado' : 'criado'} com sucesso!`);
      navigate('/professionals');

    } catch (err: any) {
      console.error(err);
      let msg = err.message || 'Erro ao processar.';
      
      if (msg.includes('rate limit')) msg = 'Muitas tentativas. Aguarde um momento.';
      if (msg.includes('weak password')) msg = 'Senha muito fraca.';
      
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
          {existingProfileId ? 'Editar Acesso' : 'Criar Acesso'}
        </h1>
      </header>

      {initialLoading ? (
          <div className="flex-1 flex items-center justify-center">
              <Loader2 className="animate-spin text-blue-900" />
          </div>
      ) : (
        <div className="p-4 space-y-6 flex-1 overflow-y-auto pt-6">
            
            {/* SELETOR DE ROLE (CARGO) */}
            <div>
                <label className="text-sm font-medium text-gray-800 block mb-3 px-1">Nível de Acesso</label>
                <div className="grid grid-cols-2 gap-3">
                    <button 
                        onClick={() => setFormData({...formData, role: 'COLLABORATOR'})}
                        className={`p-4 rounded-2xl border-2 flex flex-col gap-2 transition-all relative ${
                            formData.role === 'COLLABORATOR' 
                            ? 'border-blue-600 bg-blue-50' 
                            : 'border-gray-100 bg-white opacity-60'
                        }`}
                    >
                        {formData.role === 'COLLABORATOR' && (
                            <div className="absolute top-2 right-2 text-blue-600"><CheckCircle2 size={18} /></div>
                        )}
                        <div className={`p-2 rounded-xl w-fit ${formData.role === 'COLLABORATOR' ? 'bg-blue-200 text-blue-800' : 'bg-gray-100 text-gray-400'}`}>
                            <User size={20} />
                        </div>
                        <div className="text-left">
                            <span className={`block font-black text-sm ${formData.role === 'COLLABORATOR' ? 'text-blue-900' : 'text-gray-600'}`}>Colaborador</span>
                            <span className="text-[10px] text-gray-500 leading-tight block mt-1">
                                Acesso restrito à agenda própria e comissões.
                            </span>
                        </div>
                    </button>

                    <button 
                        onClick={() => setFormData({...formData, role: 'ADMIN'})}
                        className={`p-4 rounded-2xl border-2 flex flex-col gap-2 transition-all relative ${
                            formData.role === 'ADMIN' 
                            ? 'border-orange-500 bg-orange-50' 
                            : 'border-gray-100 bg-white opacity-60'
                        }`}
                    >
                        {formData.role === 'ADMIN' && (
                            <div className="absolute top-2 right-2 text-orange-500"><CheckCircle2 size={18} /></div>
                        )}
                        <div className={`p-2 rounded-xl w-fit ${formData.role === 'ADMIN' ? 'bg-orange-200 text-orange-800' : 'bg-gray-100 text-gray-400'}`}>
                            <ShieldCheck size={20} />
                        </div>
                        <div className="text-left">
                            <span className={`block font-black text-sm ${formData.role === 'ADMIN' ? 'text-orange-900' : 'text-gray-600'}`}>Administrador</span>
                            <span className="text-[10px] text-gray-500 leading-tight block mt-1">
                                Acesso total: Financeiro, Configurações e Equipe.
                            </span>
                        </div>
                    </button>
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
                className="w-full bg-white border border-gray-300 rounded-lg py-3.5 px-4 outline-none focus:ring-1 focus:ring-blue-900 text-gray-700 shadow-sm font-medium"
            />
            </div>

            {/* Senha de acesso */}
            <div className="pt-2">
            <div className="flex justify-between px-1 mb-2">
                <label className="text-sm font-medium text-gray-800">Senha de Acesso</label>
                {existingProfileId && <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Deixe vazio para manter</span>}
            </div>
            <input 
                type="password" 
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                placeholder={existingProfileId ? "********" : "Mínimo 6 caracteres"} 
                className="w-full bg-white border border-gray-300 rounded-lg py-3.5 px-4 outline-none focus:ring-1 focus:ring-blue-900 text-gray-700 shadow-sm"
            />
            </div>

            {/* Confirme sua nova senha */}
            {formData.password.length > 0 && (
                <div className="animate-in fade-in slide-in-from-top-2">
                <label className="text-sm font-medium text-gray-800 block mb-2 px-1">Confirme a Senha</label>
                <input 
                    type="password" 
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                    placeholder="Repita a senha" 
                    className="w-full bg-white border border-gray-300 rounded-lg py-3.5 px-4 outline-none focus:ring-1 focus:ring-blue-900 text-gray-700 shadow-sm"
                />
                </div>
            )}

            <div className="pt-6 pb-8">
            <button 
                onClick={handleSave}
                disabled={loading}
                className="w-full bg-[#1e3a8a] text-white font-black py-4 rounded-xl shadow-xl active:scale-[0.98] transition-all uppercase tracking-widest text-sm flex items-center justify-center gap-2 disabled:opacity-70"
            >
                {loading ? <Loader2 className="animate-spin" size={20} /> : existingProfileId ? 'Atualizar Permissões' : 'Criar Acesso'}
            </button>
            </div>
        </div>
      )}
    </div>
  );
};

export default ProfessionalAccessForm;
