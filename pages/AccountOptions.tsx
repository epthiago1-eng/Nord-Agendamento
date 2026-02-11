
import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AccountOptions: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full bg-white">
      <header className="bg-[#1e3a8a] text-white px-4 py-3 flex items-center sticky top-0 z-10">
        <button onClick={() => navigate(-1)}><ChevronLeft size={24} className="mr-4" /></button>
        <h1 className="text-lg font-medium">Conta</h1>
      </header>

      <div className="p-6 space-y-6">
        <p className="text-gray-700 text-sm">Informe o email abaixo para cancelar seu plano.</p>
        
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">E-mail</label>
          <input 
            type="email" 
            placeholder="Digitar..." 
            className="w-full border border-gray-300 rounded-lg py-3 px-4 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <button className="w-full bg-blue-900 text-white font-bold py-4 rounded-lg shadow-md active:bg-blue-800 transition-colors uppercase tracking-widest text-sm">
            Excluir conta
        </button>
      </div>
    </div>
  );
};

export default AccountOptions;
