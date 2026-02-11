
import React from 'react';
import { ChevronLeft, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Packages: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full bg-[#fcfaff]">
      <header className="bg-[#1e3a8a] text-white px-4 py-3 flex items-center sticky top-0 z-10">
        <button onClick={() => navigate(-1)}><ChevronLeft size={24} className="mr-4" /></button>
        <h1 className="text-lg font-medium">Pacotes</h1>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <p className="text-gray-500 font-medium">Não há pacotes cadastrados.</p>
      </div>

      <div className="p-4 safe-bottom">
        <button className="w-full bg-[#1e3a8a] text-white py-4 rounded-lg font-bold text-sm tracking-wide">
          Carregar mais
        </button>
      </div>

      <button 
        onClick={() => navigate('/packages/new')}
        className="fixed bottom-24 right-6 bg-blue-900 text-white p-4 rounded-xl shadow-xl"
      >
        <Plus size={28} />
      </button>
    </div>
  );
};

export default Packages;
