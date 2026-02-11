
import React, { useState, useMemo } from 'react';
import { ChevronLeft, Search, Trash2, DollarSign } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

const allServices = [
  { id: '1', name: 'Sobrancelha', category: 'Serviço prestado' },
  { id: '2', name: 'Barba', category: 'Serviço prestado' },
  { id: '3', name: 'Corte na Tesoura', category: 'Serviço prestado' },
  { id: '4', name: 'Corte na Máquina', category: 'Serviço prestado' },
  { id: '5', name: 'Corte Máquina + Barba', category: 'Serviço prestado' },
  { id: '6', name: 'Corte Tesoura + Barba', category: 'Serviço prestado' },
  { id: '7', name: 'Pezinho', category: 'Serviço prestado' },
  { id: '8', name: 'Pintar Cabelo Platinado', category: 'Serviço prestado' },
];

const ProfessionalServices: React.FC = () => {
  const navigate = useNavigate();
  const { id: proId } = useParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [swipedServiceId, setSwipedServiceId] = useState<string | null>(null);

  const filteredServices = useMemo(() => {
    return allServices.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [searchTerm]);

  const handleToggleSwipe = (id: string) => {
    setSwipedServiceId(swipedServiceId === id ? null : id);
  };

  const handleSave = () => {
    alert('Vínculos de serviços salvos com sucesso!');
    navigate('/professionals');
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header seguindo as imagens 2 e 3 */}
      <header className="bg-[#1e3a8a] text-white px-4 py-4 flex items-center sticky top-0 z-50 shadow-md">
        <button onClick={() => navigate(-1)} className="p-1 active:scale-90 transition-transform">
          <ChevronLeft size={28} />
        </button>
        <h1 className="flex-1 text-center text-lg font-medium tracking-tight pr-8">
          Serviços Prestados
        </h1>
      </header>

      <div className="p-4 space-y-4 flex-1 overflow-y-auto">
        {/* Label e Barra de Busca */}
        <div>
          <label className="text-sm font-medium text-gray-800 block mb-2 px-1 tracking-tight">Serviços</label>
          <div className="relative">
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar..." 
              className="w-full bg-white border border-gray-200 rounded-lg py-3 px-4 pr-10 outline-none focus:ring-1 focus:ring-blue-900 text-gray-700 shadow-sm"
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          </div>
        </div>

        {/* Botão Salvar Primário */}
        <button 
          onClick={handleSave}
          className="w-full bg-[#1e3a8a] text-white font-bold py-4 rounded-lg shadow-md active:scale-[0.98] transition-all uppercase tracking-widest text-sm"
        >
          Salvar
        </button>

        {/* Lista de Serviços */}
        <div className="pt-4 divide-y divide-gray-100">
          {filteredServices.map((service) => (
            <div key={service.id} className="relative overflow-hidden bg-white min-h-[70px]">
              {/* Actions revealed on swipe (Image 2 style) */}
              <div 
                className={`absolute right-0 top-0 bottom-0 flex transition-transform duration-300 ease-in-out ${
                  swipedServiceId === service.id ? 'translate-x-0' : 'translate-x-full'
                }`}
              >
                <button 
                  onClick={() => navigate(`/professionals/commission/${proId}/${service.id}`)}
                  className="w-24 bg-[#ffa500] text-white flex flex-col items-center justify-center gap-1 active:opacity-80"
                >
                  <DollarSign size={20} />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-center">Comissões</span>
                </button>
                <button 
                  onClick={() => alert('Serviço removido para este profissional')}
                  className="w-24 bg-[#f44336] text-white flex flex-col items-center justify-center gap-1 active:opacity-80"
                >
                  <Trash2 size={20} />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-center">Excluir</span>
                </button>
              </div>

              {/* Card principal */}
              <div 
                onClick={() => handleToggleSwipe(service.id)}
                className={`p-4 transition-transform duration-300 ease-in-out bg-white cursor-pointer active:bg-gray-50 flex flex-col justify-center ${
                  swipedServiceId === service.id ? '-translate-x-48' : 'translate-x-0'
                }`}
              >
                <h4 className="text-gray-900 font-medium text-base leading-tight tracking-tight">{service.name}</h4>
                <p className="text-gray-400 text-xs mt-0.5">{service.category}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProfessionalServices;
