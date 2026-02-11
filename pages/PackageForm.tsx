
import React, { useState } from 'react';
import { ChevronLeft, Plus, BellRing, Info, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

const PackageForm: React.FC = () => {
  const navigate = useNavigate();
  const [activeDays, setActiveDays] = useState<string[]>([]);
  const [reminders, setReminders] = useState('0');
  const [showPreview, setShowPreview] = useState(false);
  const [packageName, setPackageName] = useState('');

  const toggleDay = (day: string) => {
    setActiveDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <header className="bg-[#1e3a8a] text-white px-4 py-3 flex items-center sticky top-0 z-10 shadow-md">
        <button onClick={() => navigate(-1)}><ChevronLeft size={24} className="mr-4" /></button>
        <h1 className="text-lg font-medium">Cadastro Pacote</h1>
      </header>

      <div className="p-4 space-y-4 overflow-y-auto flex-1">
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Nome</label>
          <input 
            type="text" 
            value={packageName}
            onChange={(e) => setPackageName(e.target.value)}
            placeholder="Ex: Combo Mensal" 
            className="w-full border border-gray-300 rounded-lg py-3 px-4 focus:ring-2 focus:ring-blue-500 outline-none font-bold" 
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Valor</label>
            <input type="text" defaultValue="R$ 0,00" className="w-full border border-gray-300 rounded-lg py-3 px-4 focus:ring-2 focus:ring-blue-500 outline-none font-bold" />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Duração (dias)</label>
            <input type="number" defaultValue="30" className="w-full border border-gray-300 rounded-lg py-3 px-4 focus:ring-2 focus:ring-blue-500 outline-none font-bold" />
          </div>
        </div>

        {/* Reminders Section for Packages */}
        <div className="bg-orange-50/50 p-4 rounded-2xl border border-orange-100 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-orange-900">
              <BellRing size={18} />
              <label className="text-sm font-black uppercase tracking-wider">Lembrete Automático</label>
            </div>
            <button 
              onClick={() => setShowPreview(!showPreview)}
              className="text-[10px] font-bold text-orange-600 uppercase underline"
            >
              {showPreview ? 'Ocultar' : 'Ver Prévia'}
            </button>
          </div>
          
          <div className="relative">
            <input 
              type="number" 
              value={reminders}
              onChange={(e) => setReminders(e.target.value)}
              placeholder="0" 
              className="w-full bg-white border border-orange-200 rounded-xl py-3 px-4 pl-11 outline-none focus:ring-1 focus:ring-orange-500 shadow-sm transition-all text-gray-700 font-bold"
            />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs uppercase">Dias</span>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 group">
               <Info size={16} className="text-gray-300" />
               <div className="hidden group-hover:block absolute bottom-full right-0 mb-2 w-48 p-2 bg-gray-900 text-white text-[10px] rounded-lg shadow-xl z-10">
                 Quantos dias antes do vencimento do pacote o sistema deve avisar o cliente.
               </div>
            </div>
          </div>

          {showPreview && (
            <div className="bg-white p-3 rounded-xl border border-orange-100 shadow-inner animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2 mb-2 text-green-600">
                <MessageSquare size={12} />
                <span className="text-[9px] font-black uppercase tracking-widest">Aviso de Renovação</span>
              </div>
              <p className="text-[11px] text-gray-600 leading-relaxed italic">
                "Olá [Cliente]! Seu pacote <b>{packageName || 'Pacote'}</b> vence em breve. Vamos renovar para garantir seus horários preferidos? 💈"
              </p>
            </div>
          )}
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">ID de Venda</label>
          <input type="text" defaultValue="0" className="w-full border border-gray-300 rounded-lg py-3 px-4 focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Procedimentos Inclusos</label>
            <button className="bg-blue-900 text-white p-2 rounded-lg active:scale-95 transition-transform"><Plus size={20} /></button>
          </div>
          <div className="p-4 bg-gray-50 border border-dashed border-gray-200 rounded-xl text-center text-xs text-gray-400 font-medium">
             Clique no botão "+" para adicionar procedimentos ao pacote.
          </div>
        </div>

        <div className="pt-4 text-center">
            <p className="text-gray-700 font-bold mb-1 text-sm uppercase tracking-widest">Dias válidos</p>
            <p className="text-red-500 text-[9px] uppercase font-black">Selecione pelo menos um dia válido</p>
        </div>

        <div className="space-y-3">
          {days.map((day) => (
            <div key={day} className="flex items-center justify-between py-2 border-b border-gray-50 px-2">
              <span className="text-gray-700 font-medium text-sm">{day}</span>
              <button 
                onClick={() => toggleDay(day)}
                className={`w-12 h-6 rounded-full relative transition-colors ${activeDays.includes(day) ? 'bg-green-500' : 'bg-gray-200'}`}
              >
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${activeDays.includes(day) ? 'translate-x-6' : ''}`} />
              </button>
            </div>
          ))}
        </div>

        <button 
          onClick={() => { alert('Pacote salvo!'); navigate(-1); }}
          className="w-full bg-[#1e3a8a] text-white font-bold py-4 rounded-xl shadow-lg active:scale-95 transition-transform mt-6 mb-8 uppercase tracking-widest text-sm"
        >
            Salvar Pacote
        </button>
      </div>
    </div>
  );
};

export default PackageForm;
