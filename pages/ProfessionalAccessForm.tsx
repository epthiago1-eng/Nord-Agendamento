
import React, { useState, useEffect } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';

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

  const handleSave = () => {
    if (!formData.email || !formData.password) {
      alert('Por favor, preencha o e-mail e a senha.');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      alert('As senhas não coincidem!');
      return;
    }
    
    // Simulação de salvamento
    alert(`Acesso configurado com sucesso para ${proData?.name || 'o colaborador'}!`);
    navigate('/professionals');
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header seguindo o estilo da imagem */}
      <header className="bg-[#1e3a8a] text-white px-4 py-4 flex items-center sticky top-0 z-50 shadow-md">
        <button onClick={() => navigate(-1)} className="p-1 active:scale-90 transition-transform">
          <ChevronLeft size={28} />
        </button>
        <h1 className="flex-1 text-center text-lg font-medium tracking-tight pr-8">
          Dados de Acesso
        </h1>
      </header>

      <div className="p-4 space-y-6 flex-1 overflow-y-auto pt-8">
        {/* E-mail de acesso */}
        <div>
          <label className="text-sm font-medium text-gray-800 block mb-2 px-1">E-mail de acesso</label>
          <input 
            type="email" 
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            placeholder="Ex: seu@email.com" 
            className="w-full bg-white border border-gray-300 rounded-lg py-3.5 px-4 outline-none focus:ring-1 focus:ring-blue-900 text-gray-700 shadow-sm"
          />
        </div>

        {/* Senha de acesso */}
        <div>
          <label className="text-sm font-medium text-gray-800 block mb-2 px-1">Senha de acesso</label>
          <input 
            type="password" 
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
            placeholder="Digitar..." 
            className="w-full bg-white border border-gray-300 rounded-lg py-3.5 px-4 outline-none focus:ring-1 focus:ring-blue-900 text-gray-700 shadow-sm"
          />
        </div>

        {/* Confirme sua nova senha */}
        <div>
          <label className="text-sm font-medium text-gray-800 block mb-2 px-1">Confirme sua nova senha</label>
          <input 
            type="password" 
            value={formData.confirmPassword}
            onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
            placeholder="Digitar..." 
            className="w-full bg-white border border-gray-300 rounded-lg py-3.5 px-4 outline-none focus:ring-1 focus:ring-blue-900 text-gray-700 shadow-sm"
          />
        </div>

        {/* Botão Salvar estilizado como na imagem */}
        <div className="pt-4">
          <button 
            onClick={handleSave}
            className="w-full bg-[#1e3a8a] text-white font-bold py-4 rounded-lg shadow-md active:scale-[0.98] transition-all uppercase tracking-widest text-sm"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfessionalAccessForm;
