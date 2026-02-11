
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Settings as SettingsIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const [isAgendaMode, setIsAgendaMode] = useState(false);

  return (
    <div className="flex flex-col h-full bg-[#fcfaff]">
      <header className="bg-[#1e3a8a] text-white px-4 py-3 flex items-center sticky top-0 z-10">
        <button onClick={() => navigate(-1)}><ChevronLeft size={24} className="mr-4" /></button>
        <h1 className="text-lg font-medium">Configurações</h1>
      </header>

      <div className="p-4 space-y-6">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div 
                    onClick={() => setIsAgendaMode(!isAgendaMode)}
                    className={`w-12 h-6 rounded-full relative transition-colors cursor-pointer ${isAgendaMode ? 'bg-blue-900' : 'bg-gray-300'}`}
                >
                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${isAgendaMode ? 'translate-x-6' : ''}`} />
                </div>
                <span className="text-gray-700 font-medium">Modo agenda</span>
            </div>
        </div>

        <button 
            onClick={() => navigate('/account-options')}
            className="w-full bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between active:bg-gray-50"
        >
            <div className="flex items-center gap-4">
                <SettingsIcon size={22} className="text-gray-600" />
                <span className="text-gray-700 font-medium">Opções da Conta</span>
            </div>
            <ChevronRight className="text-gray-300" size={20} />
        </button>
      </div>
    </div>
  );
};

export default Settings;
