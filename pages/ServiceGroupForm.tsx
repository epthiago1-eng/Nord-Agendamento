
import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ServiceGroupForm: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full bg-white">
      <header className="bg-[#1e3a8a] text-white px-4 py-3 flex items-center sticky top-0 z-10">
        <button onClick={() => navigate(-1)}><ChevronLeft size={24} className="mr-4" /></button>
        <h1 className="text-lg font-medium">Cadastro Grupo de Serviços</h1>
      </header>

      <div className="p-4 space-y-6">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Grupo de Serviço</label>
          <input 
            type="text" 
            placeholder="Digitar..." 
            className="w-full border border-gray-300 rounded-lg py-3 px-4 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <button className="w-full bg-blue-900 text-white font-bold py-4 rounded-lg shadow-md active:bg-blue-800 transition-colors">
            Salvar
        </button>
      </div>
    </div>
  );
};

export default ServiceGroupForm;
