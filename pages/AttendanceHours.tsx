
import React, { useState } from 'react';
import { ChevronLeft, Clock, Trash2, X } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

interface TimeSlot {
  id: string;
  day: string;
  start: string;
  end: string;
}

const AttendanceHours: React.FC = () => {
  const navigate = useNavigate();
  const { id: professionalId } = useParams();

  // Estados do Formulário
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('13:00');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  
  // Lista de horários cadastrados (Mock inicial)
  const [hoursList, setHoursList] = useState<TimeSlot[]>([
    { id: '1', day: 'Terça', start: '09:00', end: '13:00' },
    { id: '2', day: 'Quarta', start: '09:00', end: '13:00' },
    { id: '3', day: 'Quinta', start: '09:00', end: '13:00' },
    { id: '4', day: 'Sábado', start: '09:00', end: '13:00' },
    { id: '5', day: 'Segunda', start: '14:00', end: '19:00' },
  ]);

  // Estado para controle de exclusão (ID do item que está mostrando o botão excluir)
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const daysOfWeek = [
    'Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'
  ];

  const toggleDay = (day: string) => {
    setSelectedDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleSave = () => {
    if (selectedDays.length === 0) {
      alert('Selecione pelo menos um dia da semana.');
      return;
    }

    const newSlots: TimeSlot[] = selectedDays.map(day => ({
      id: Math.random().toString(36).substr(2, 9),
      day,
      start: startTime,
      end: endTime
    }));

    setHoursList(prev => [...prev, ...newSlots]);
    setSelectedDays([]); // Limpa seleção após salvar
    alert('Horários salvos com sucesso!');
  };

  const handleDelete = (id: string) => {
    setHoursList(prev => prev.filter(item => item.id !== id));
    setDeletingId(null);
  };

  return (
    <div className="flex flex-col h-full bg-[#fcfaff]">
      {/* Header */}
      <header className="bg-[#1e3a8a] text-white px-4 py-3 flex items-center sticky top-0 z-50">
        <button onClick={() => navigate(-1)} className="p-1 active:scale-90 transition-transform">
          <ChevronLeft size={24} />
        </button>
        <h1 className="flex-1 text-center text-lg font-medium mr-8 tracking-tight">Horários de Atendimento</h1>
      </header>

      <div className="flex-1 overflow-y-auto">
        {/* Formulario de Cadastro */}
        <div className="p-4 bg-white border-b border-gray-100 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Inicia às:</label>
              <div className="relative">
                <input 
                  type="time" 
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg py-3 px-4 outline-none focus:ring-1 focus:ring-blue-500 bg-gray-50/30 font-medium text-gray-700" 
                />
                <Clock className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Termina às:</label>
              <div className="relative">
                <input 
                  type="time" 
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg py-3 px-4 outline-none focus:ring-1 focus:ring-blue-500 bg-gray-50/30 font-medium text-gray-700" 
                />
                <Clock className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
              </div>
            </div>
          </div>

          {/* Seleção de Dias */}
          <div className="space-y-3">
            <div className="flex flex-wrap gap-x-4 gap-y-3 justify-center">
              {daysOfWeek.slice(0, 6).map(day => (
                <div key={day} className="flex flex-col items-center gap-1.5">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">{day}</span>
                  <button 
                    onClick={() => toggleDay(day)}
                    className={`w-12 h-7 rounded-full relative transition-colors duration-200 ${selectedDays.includes(day) ? 'bg-[#56d683]' : 'bg-gray-300'}`}
                  >
                    <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform duration-200 shadow-sm ${selectedDays.includes(day) ? 'translate-x-5' : ''}`} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">Sábado</span>
              <button 
                onClick={() => toggleDay('Sábado')}
                className={`w-12 h-7 rounded-full relative transition-colors duration-200 ${selectedDays.includes('Sábado') ? 'bg-[#56d683]' : 'bg-gray-300'}`}
              >
                <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform duration-200 shadow-sm ${selectedDays.includes('Sábado') ? 'translate-x-5' : ''}`} />
              </button>
            </div>
          </div>

          {/* Botão Salvar */}
          <button 
            onClick={handleSave}
            className="w-full bg-[#1e3a8a] text-white font-bold py-4 rounded-xl shadow-lg active:scale-95 transition-transform uppercase tracking-widest text-sm"
          >
            Salvar
          </button>
        </div>

        {/* Lista de Horários Cadastrados */}
        <div className="divide-y divide-gray-50 pb-20">
          {hoursList.map((item) => (
            <div key={item.id} className="relative bg-white overflow-hidden min-h-[70px]">
              {/* Card Normal */}
              <div 
                onClick={() => setDeletingId(deletingId === item.id ? null : item.id)}
                className={`p-5 transition-transform duration-300 ease-in-out cursor-pointer active:bg-gray-50 flex flex-col gap-0.5 ${
                  deletingId === item.id ? '-translate-x-full' : 'translate-x-0'
                }`}
              >
                <span className="text-gray-800 font-medium text-[15px]">{item.day}</span>
                <span className="text-gray-500 text-[15px]">{item.start} - {item.end}</span>
              </div>

              {/* Botão Excluir (Aparece ao clicar no card) */}
              <button 
                onClick={() => handleDelete(item.id)}
                className={`absolute inset-0 bg-[#f44336] text-white flex flex-col items-center justify-center gap-1 transition-transform duration-300 ease-in-out ${
                  deletingId === item.id ? 'translate-x-0' : 'translate-x-full'
                }`}
              >
                <Trash2 size={24} />
                <span className="font-bold text-sm">Excluir</span>
              </button>
              
              {/* Botão de Cancelar Exclusão (opcional, clicando fora já cancela) */}
              {deletingId === item.id && (
                <button 
                  onClick={(e) => { e.stopPropagation(); setDeletingId(null); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 p-2"
                >
                  <X size={20} />
                </button>
              )}
            </div>
          ))}

          {hoursList.length === 0 && (
            <div className="p-12 text-center text-gray-400 italic">
              Nenhum horário cadastrado para este profissional.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttendanceHours;
