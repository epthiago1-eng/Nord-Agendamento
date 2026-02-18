
import React, { useState, useEffect } from 'react';
import { ChevronLeft, Clock, Trash2, X, Loader2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../supabase';

interface TimeSlot {
  id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
}

const AttendanceHours: React.FC = () => {
  const navigate = useNavigate();
  const { id: proId } = useParams();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hoursList, setHoursList] = useState<TimeSlot[]>([]);
  
  // Estados do Formulário
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  
  const daysOfWeek = [
    'Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'
  ];

  const fetchHours = async () => {
    if (!proId) return;
    setLoading(true);
    try {
      const { data, error } = await db.professionalHours()
        .select('*')
        .eq('professional_id', proId)
        .order('day_of_week');
      
      if (error) throw error;
      setHoursList(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHours();
  }, [proId]);

  const toggleDay = (day: string) => {
    setSelectedDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleSave = async () => {
    if (selectedDays.length === 0) {
      alert('Selecione pelo menos um dia da semana.');
      return;
    }

    setSaving(true);
    try {
      const newSlots = selectedDays.map(day => ({
        professional_id: proId,
        day_of_week: day,
        start_time: startTime,
        end_time: endTime
      }));

      const { error } = await db.professionalHours().insert(newSlots);
      if (error) throw error;

      alert('Horários adicionados com sucesso!');
      setSelectedDays([]);
      fetchHours();
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar horários.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este horário de atendimento?')) return;
    try {
      const { error } = await db.professionalHours().delete().eq('id', id);
      if (error) throw error;
      setHoursList(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      alert('Erro ao excluir.');
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#fcfaff]">
      <header className="bg-[#1e3a8a] text-white px-4 py-4 flex items-center sticky top-0 z-50 shadow-md">
        <button onClick={() => navigate(-1)} className="p-1 active:scale-90 transition-transform">
          <ChevronLeft size={28} />
        </button>
        <h1 className="flex-1 text-center text-lg font-bold tracking-tight pr-8">Horários de Atendimento</h1>
      </header>

      <div className="flex-1 overflow-y-auto">
        {/* Formulario de Cadastro conforme a imagem */}
        <div className="p-5 bg-white border-b border-gray-100 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest px-1">Inicia às:</label>
              <div className="relative">
                <input 
                  type="time" 
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full border-2 border-gray-100 rounded-xl py-4 px-4 outline-none focus:border-blue-500 bg-gray-50/30 font-black text-gray-700 shadow-inner" 
                />
                <Clock className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest px-1">Termina às:</label>
              <div className="relative">
                <input 
                  type="time" 
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full border-2 border-gray-100 rounded-xl py-4 px-4 outline-none focus:border-blue-500 bg-gray-50/30 font-black text-gray-700 shadow-inner" 
                />
                <Clock className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
              </div>
            </div>
          </div>

          {/* Seleção de Dias (Style Toggle conforme imagem) */}
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-y-4 gap-x-2">
              {daysOfWeek.map(day => (
                <div key={day} className="flex flex-col items-center gap-2">
                  <span className="text-[10px] text-gray-500 font-black uppercase tracking-tighter">{day}</span>
                  <button 
                    onClick={() => toggleDay(day)}
                    className={`w-14 h-8 rounded-full relative transition-all duration-300 shadow-inner ${selectedDays.includes(day) ? 'bg-blue-600' : 'bg-gray-200'}`}
                  >
                    <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform duration-300 shadow-md ${selectedDays.includes(day) ? 'translate-x-6' : ''}`} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button 
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-[#1e3a8a] text-white font-black py-4.5 rounded-2xl shadow-xl active:scale-95 transition-transform uppercase tracking-[0.2em] text-sm flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="animate-spin" size={20} /> : 'Salvar'}
          </button>
        </div>

        {/* Lista de Horários Cadastrados */}
        <div className="pb-24">
          <div className="px-5 py-4">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Meus Horários Ativos</h3>
          </div>

          {loading ? (
            <div className="flex justify-center p-12"><Loader2 className="animate-spin text-blue-900" size={32} /></div>
          ) : hoursList.length === 0 ? (
            <div className="p-12 text-center text-gray-300 italic flex flex-col items-center gap-2">
               <Clock size={40} className="opacity-20" />
               <p className="text-xs font-bold uppercase tracking-widest">Nenhum horário definido</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 bg-white">
              {hoursList.map((item) => (
                <div key={item.id} className="p-5 flex justify-between items-center group">
                  <div>
                    <h4 className="text-sm font-black text-gray-800 uppercase tracking-tight">{item.day_of_week}</h4>
                    <p className="text-blue-900 font-bold text-lg">{item.start_time} - {item.end_time}</p>
                  </div>
                  <button 
                    onClick={() => handleDelete(item.id)}
                    className="p-3 bg-red-50 text-red-500 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity active:scale-90"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttendanceHours;
