
import React from 'react';
import { ChevronLeft, MessageCircle, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AbsentClients: React.FC = () => {
  const navigate = useNavigate();
  const list = [
    { name: 'João Vitor Lamego', date: '4 de Julho de 2025', phone: '(22) 9 8143-3498', days: 'há 3 dias' },
    { name: 'Thaynan', date: '4 de Julho de 2025', phone: '(22) 9 7400-7594', days: 'há 3 dias' },
    { name: 'Henry', date: '19 de Junho de 2025', phone: '(22) 9 9920-6742', days: 'há 18 dias' },
    { name: 'João Alfradique', date: '19 de Junho de 2025', phone: '(22) 9 9864-6771', days: 'há 18 dias' },
  ];

  return (
    <div className="flex flex-col h-full bg-[#fcfaff]">
      <header className="bg-[#1e3a8a] text-white px-4 py-3 flex items-center sticky top-0 z-10">
        <button onClick={() => navigate(-1)}><ChevronLeft size={24} className="mr-4" /></button>
        <h1 className="text-lg font-medium">Clientes ausentes</h1>
      </header>

      <div className="p-4 space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Tempo de ausência</label>
          <div className="flex gap-2">
            <input type="text" placeholder="Informe quantos dias!" className="flex-1 border border-gray-300 rounded-lg py-3 px-4 outline-none" />
            <button className="bg-white border border-gray-300 px-4 rounded-lg flex items-center gap-2 text-blue-900 font-medium">
              <Search size={20} /> Buscar
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {list.map((c, idx) => (
            <div key={idx} className="bg-white p-4 rounded-xl border border-gray-100 flex items-center justify-between">
              <div className="text-[10px] text-gray-800 font-bold w-20 leading-tight uppercase">{c.date}</div>
              <div className="flex-1 px-4">
                <h4 className="text-gray-900 font-bold text-sm">{c.name}</h4>
                <p className="text-gray-500 text-xs">{c.phone}</p>
              </div>
              <div className="text-right flex items-center gap-3">
                <span className="text-[10px] text-gray-400 font-medium italic">{c.days}</span>
                <MessageCircle className="text-green-500" size={22} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AbsentClients;
