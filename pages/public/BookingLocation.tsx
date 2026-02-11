
import React from 'react';
import { ChevronLeft, Copy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const BookingLocation: React.FC = () => {
  const navigate = useNavigate();
  const address = "Rodovia Amaral Peixoto A, Br 106 (Tamoios) , 500 - Orla";
  const phone = "(22) 98133-3755";

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Endereço copiado!');
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      {/* Black Top Header */}
      <div className="bg-black h-16 w-full relative shrink-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-0 w-32 h-32 rounded-full border-4 border-white bg-white overflow-hidden shadow-xl z-10 translate-y-[-20%]">
          <img src="https://agendamento.igic.com.br/assets/logos/nord_barbershop_logo.png" alt="Nord Barbershop" className="w-full h-full object-contain p-1" />
        </div>
      </div>

      <div className="mt-20 px-4 space-y-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-900 font-bold text-sm">
            <ChevronLeft size={20} />
            Localização
        </button>

        <div className="space-y-5">
            <div>
                <label className="text-xs font-bold text-gray-500 block mb-1 tracking-tight">Endereço</label>
                <div className="relative">
                    <input 
                        type="text" 
                        readOnly 
                        value={address}
                        className="w-full border border-gray-200 rounded-lg py-3 px-4 pr-11 text-gray-700 text-xs font-medium outline-none"
                    />
                    <button onClick={() => copyToClipboard(address)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <Copy size={18} />
                    </button>
                </div>
            </div>

            <div>
                <label className="text-xs font-bold text-gray-500 block mb-1 tracking-tight">Telefone</label>
                <input 
                    type="text" 
                    readOnly 
                    value={phone}
                    className="w-full border border-gray-200 rounded-lg py-3 px-4 text-gray-700 text-xs font-medium outline-none"
                />
            </div>
        </div>
      </div>
    </div>
  );
};

export default BookingLocation;
