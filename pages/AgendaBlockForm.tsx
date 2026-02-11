
import React, { useState } from 'react';
import { ChevronLeft, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { saveBlock } from '../data/agendaData';

const AgendaBlockForm: React.FC = () => {
  const navigate = useNavigate();
  const userRole = localStorage.getItem('user_role') || 'ADMIN';
  const proId = userRole === 'COLLABORATOR' ? '2' : '1'; // Simulação de ID do profissional logado

  const [formData, setFormData] = useState({
    startDate: new Date().toISOString().split('T')[0],
    startTime: '08:00',
    endDate: new Date().toISOString().split('T')[0],
    endTime: '10:00',
    description: ''
  });

  const handleSave = () => {
    try {
      const startIso = `${formData.startDate}T${formData.startTime}`;
      const endIso = `${formData.endDate}T${formData.endTime}`;

      if (new Date(endIso) <= new Date(startIso)) {
        alert('A data final deve ser posterior à data inicial.');
        return;
      }

      // Fix: Use correct field names from AgendaBlock interface
      saveBlock({
        professional_id: proId,
        start_at: startIso,
        end_at: endIso,
        description: formData.description
      });

      alert('Agenda bloqueada com sucesso!');
      navigate('/agenda');
    } catch (error: any) {
      alert(error.message);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      <header className="bg-[#1e3a8a] text-white px-4 py-4 flex items-center sticky top-0 z-50 shadow-md">
        <button onClick={() => navigate(-1)} className="p-1 active:scale-90 transition-transform">
          <ChevronLeft size={28} />
        </button>
        <h1 className="flex-1 text-center text-lg font-medium tracking-tight pr-8">
          Bloqueio de Agenda
        </h1>
      </header>

      <div className="p-4 space-y-6 flex-1 overflow-y-auto pt-8">
        <div>
          <label className="text-sm font-medium text-gray-800 block mb-2 px-1">Data e Horário Inicial</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
                <input 
                    type="date" 
                    value={formData.startDate}
                    onChange={e => setFormData({...formData, startDate: e.target.value})}
                    className="w-full bg-white border border-gray-200 rounded-lg py-3.5 px-4 outline-none focus:ring-1 focus:ring-blue-900 text-gray-400 font-medium"
                />
            </div>
            <div className="relative w-32">
                <input 
                    type="time" 
                    value={formData.startTime}
                    onChange={e => setFormData({...formData, startTime: e.target.value})}
                    className="w-full bg-white border border-gray-200 rounded-lg py-3.5 px-4 outline-none focus:ring-1 focus:ring-blue-900 text-gray-400 font-medium"
                />
            </div>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-800 block mb-2 px-1">Data e Horário Final</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
                <input 
                    type="date" 
                    value={formData.endDate}
                    onChange={e => setFormData({...formData, endDate: e.target.value})}
                    className="w-full bg-white border border-gray-200 rounded-lg py-3.5 px-4 outline-none focus:ring-1 focus:ring-blue-900 text-gray-400 font-medium"
                />
            </div>
            <div className="relative w-32">
                <input 
                    type="time" 
                    value={formData.endTime}
                    onChange={e => setFormData({...formData, endTime: e.target.value})}
                    className="w-full bg-white border border-gray-200 rounded-lg py-3.5 px-4 outline-none focus:ring-1 focus:ring-blue-900 text-gray-400 font-medium"
                />
            </div>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-800 block mb-2 px-1">Descrição</label>
          <input 
            type="text" 
            value={formData.description}
            onChange={e => setFormData({...formData, description: e.target.value})}
            placeholder="Digitar..." 
            className="w-full bg-white border border-gray-200 rounded-lg py-3.5 px-4 outline-none focus:ring-1 focus:ring-blue-900 text-gray-400 font-medium shadow-sm"
          />
        </div>

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

export default AgendaBlockForm;
