
import React from 'react';
import { ChevronLeft, CheckCircle2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

const ClientHistory: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  // Mock data for a specific client (e.g., Diego)
  const history = [
    { 
      id: 'h1',
      pro: 'Diego', 
      date: '06-02-2026', 
      time: '10:15', 
      status: 'Confirmado', 
      services: ['Corte na Máquina', 'Barba'],
      bookedBy: 'Cliente'
    },
    { 
      id: 'h2',
      pro: 'Diego', 
      date: '29-01-2026', 
      time: '17:00', 
      status: 'Confirmado', 
      services: ['Corte na Máquina', 'Barba'],
      bookedBy: 'Cliente'
    },
  ];

  const handleViewDetails = (item: any) => {
    navigate('/new-appointment', { 
      state: { 
        isView: true,
        apt: {
          client: 'Igor Apollonio', // Mocking client for the view
          date: item.date,
          start: item.time,
          duration: 70,
          status: item.status,
          service: item.services.join(' + ')
        } 
      } 
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#fcfaff]">
      <header className="bg-[#1e3a8a] text-white px-4 py-3 flex items-center sticky top-0 z-50">
        <button onClick={() => navigate(-1)}><ChevronLeft size={24} className="mr-4" /></button>
        <h1 className="text-lg font-medium">Histórico do Cliente</h1>
      </header>

      <div className="p-4 space-y-6 overflow-y-auto pb-24">
        {history.map((h) => (
          <div key={h.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Card Header */}
            <div className="px-5 py-4 flex justify-between items-start border-b border-gray-50 bg-white">
                <div>
                    <span className="text-[11px] font-bold text-gray-800 block mb-0.5">Profissional:</span>
                    <span className="text-[13px] font-bold text-gray-900 uppercase">{h.pro}</span>
                </div>
                <span className="text-[11px] text-gray-400 font-medium">{h.date}</span>
            </div>

            {/* Timeline Body */}
            <div className="px-5 py-6 flex gap-6">
                <div className="flex flex-col items-center">
                    {/* Top Circle */}
                    <div className="w-6 h-6 rounded-full border-2 border-gray-300 bg-white z-10 shrink-0" />
                    
                    {/* Connecting Line */}
                    <div className="w-[3px] flex-1 bg-green-500 relative">
                        {/* Service Bullets */}
                        <div className="absolute top-[25px] left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-gray-300 border border-white" />
                        <div className="absolute top-[45px] left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-gray-300 border border-white" />
                    </div>

                    {/* Checkmark Circle */}
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shrink-0 z-10">
                        <CheckCircle2 className="text-white" size={14} strokeWidth={3} />
                    </div>
                </div>

                <div className="flex-1 space-y-4">
                    <h4 className="text-gray-900 font-medium text-lg tracking-tight">
                        {h.time}-{h.status}
                    </h4>
                    
                    <div className="space-y-4">
                        {h.services.map((s, idx) => (
                            <span key={idx} className="block text-gray-400 text-sm font-medium leading-none">
                                {s}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 bg-gray-50/50 flex justify-between items-center border-t border-gray-100">
                <button 
                  onClick={() => handleViewDetails(h)}
                  className="bg-[#6ad18a] hover:bg-[#5bc079] text-white px-9 py-2 rounded-full font-bold text-[13px] shadow-sm transition-colors active:scale-95"
                >
                    Ver
                </button>
                <div className="text-right">
                    <p className="text-[10px] text-gray-400 font-medium mb-0.5 italic">Agendado por:</p>
                    <p className="text-[12px] font-bold text-gray-700">{h.bookedBy}</p>
                </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ClientHistory;
