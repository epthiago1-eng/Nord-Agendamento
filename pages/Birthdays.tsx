
import React from 'react';
import { ChevronLeft, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Birthdays: React.FC = () => {
  const navigate = useNavigate();
  const birthdays = [
    { name: 'Thiago', date: '11 de fev. de 2025', phone: '(22) 9 8154-4410' },
    { name: 'João Alfradique', date: '19 de fev. de 2025', phone: '(22) 9 9864-6771' },
  ];

  return (
    <div className="flex flex-col h-full bg-[#fcfaff]">
      <header className="bg-[#1e3a8a] text-white px-4 py-3 flex items-center sticky top-0 z-10">
        <button onClick={() => navigate(-1)}><ChevronLeft size={24} className="mr-4" /></button>
        <h1 className="text-lg font-medium">Aniversariantes</h1>
      </header>

      <div className="p-4 flex justify-center">
        <button className="bg-[#fdf0f7] text-[#c026d3] px-4 py-1.5 rounded-full text-sm font-semibold border border-[#f5d0fe]">
          Escolha o mês
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4">
        {birthdays.map((b, idx) => (
          <div key={idx} className="flex items-center justify-between py-5 border-b border-gray-100">
            <div className="text-[10px] text-gray-500 font-medium w-24 leading-tight">{b.date}</div>
            <div className="flex-1 px-4">
              <h4 className="text-gray-900 font-semibold">{b.name}</h4>
              <p className="text-gray-500 text-xs">{b.phone}</p>
            </div>
            <button className="text-green-500 p-2"><MessageCircle size={22} /></button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Birthdays;
