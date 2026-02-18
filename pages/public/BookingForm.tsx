
import React, { useState } from 'react';
import { ChevronLeft, CheckCircle2, User, Phone, Clipboard, AlertCircle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { saveAppointment, updateAppointment } from '../../data/agendaData';
import { addNotification } from '../../data/notifications';

const BookingForm: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedServices, professional, time, date, dateIso, editingAppointment } = location.state || {};

  const [formData, setFormData] = useState({
    phone: editingAppointment?.clientPhone || '',
    name: editingAppointment?.clientName || '',
    observation: editingAppointment?.observation || ''
  });

  const [errors, setErrors] = useState<{ name?: boolean; phone?: boolean }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    const newErrors: { name?: boolean; phone?: boolean } = {};
    if (!formData.name.trim()) newErrors.name = true;
    if (!formData.phone.trim()) newErrors.phone = true;
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '').substring(0, 11);
    if (numbers.length > 10) return numbers.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
    if (numbers.length > 6) return numbers.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
    if (numbers.length > 2) return numbers.replace(/^(\d{2})(\d{0,5}).*/, '($1) $2');
    if (numbers.length > 0) return numbers.replace(/^(\d{0,2})/, '($1');
    return numbers;
  };

  const handleFinish = async () => {
    if (!validate()) return;
    setIsSubmitting(true);

    try {
        const totalDuration = selectedServices?.reduce((acc: number, s: any) => {
            const mins = parseInt(String(s.duration || '30').split(' ')[0]);
            return acc + mins;
        }, 0) || 30;

        let finalAppointment;

        if (editingAppointment) {
            // FLUXO DE EDIÇÃO (ATUALIZAÇÃO)
            await updateAppointment(editingAppointment.id, {
                professionalId: professional?.id || '1',
                professionalName: professional?.name || 'Diego',
                date: dateIso,
                time: time,
                duration: totalDuration,
                status: 'Confirmado', // Reseta status se estava cancelado
                observation: formData.observation
            });

            // Notifica Profissional
            await addNotification({
                type: 'AGENDAMENTO',
                title: '🔄 Agendamento Remarcado',
                message: `O cliente ${formData.name} reagendou para ${date} às ${time}.`,
                link: '/agenda',
                recipient_pro_id: professional?.id 
            });

            // Mock do objeto para a confirmação
            finalAppointment = { 
                ...editingAppointment, 
                date: dateIso, 
                time, 
                professionalName: professional?.name,
                duration: totalDuration 
            };

        } else {
            // FLUXO DE NOVO AGENDAMENTO
            finalAppointment = await saveAppointment({
                clientId: 'public-' + Date.now(),
                clientName: formData.name,
                clientPhone: formData.phone,
                professionalId: professional?.id || '1',
                professionalName: professional?.name || 'Diego',
                date: dateIso, 
                time: time,
                duration: totalDuration,
                status: 'Confirmado',
                services: selectedServices?.map((s: any) => s.name) || [],
                observation: formData.observation
            });

            // Notifica Profissional
            await addNotification({
                type: 'AGENDAMENTO',
                title: '💈 Novo Agendamento Online',
                message: `Cliente ${formData.name} reservou ${selectedServices?.map((s:any) => s.name).join(', ')} para ${date} às ${time} com ${professional?.name}.`,
                link: '/agenda',
                recipient_pro_id: professional?.id 
            });
        }

        navigate('/booking/confirmation', { 
            state: { 
                appointment: finalAppointment,
                dateDisplay: date, 
                address: "Rodovia Amaral Peixoto A, Br 106 (Tamoios) , 500 - Orla" 
            } 
        });
    } catch (e: any) {
        console.error(e);
        alert('Erro ao agendar: ' + e.message);
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: 'name' | 'phone' | 'observation', value: string) => {
    let finalValue = value;
    if (field === 'phone') {
        finalValue = formatPhone(value);
    }
    setFormData({ ...formData, [field]: finalValue });
    if (errors[field as keyof typeof errors]) {
      setErrors({ ...errors, [field]: false });
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <div className="bg-black h-16 w-full relative shrink-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-0 w-32 h-32 rounded-full border-4 border-white bg-white overflow-hidden shadow-xl z-10 translate-y-[-20%]">
          <img src="https://agendamento.igic.com.br/assets/logos/nord_barbershop_logo.png" alt="Nord Barbershop" className="w-full h-full object-contain p-1" />
        </div>
      </div>

      <div className="mt-20 px-4 space-y-6 pb-12">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-900 font-bold text-sm">
            <ChevronLeft size={20} />
            Dados do Agendamento
        </button>

        <div className="bg-gray-50 border border-gray-100 rounded-3xl p-6 space-y-4 shadow-inner">
            <div className="flex items-center justify-center gap-2 text-blue-900 font-black uppercase text-[10px] tracking-widest">
                <CheckCircle2 size={14} /> {editingAppointment ? 'Nova Escolha' : 'Resumo'}
            </div>
            <p className="font-bold text-gray-800 text-center text-sm">
                Dia {date} às {time}<br/>
                com <span className="text-blue-900">{professional?.name}</span>
            </p>
            <div className="space-y-1">
                {selectedServices?.map((s: any) => (
                    <div key={s.id} className="flex justify-between items-center text-xs font-medium text-gray-500">
                        <span>• {s.name}</span>
                        <span className="font-bold text-gray-700">R$ {s.price.toFixed(2).replace('.', ',')}</span>
                    </div>
                ))}
            </div>
        </div>

        <div className="space-y-5">
            <div className="relative">
                <label className={`text-[10px] font-black uppercase tracking-widest block mb-1.5 px-1 ${errors.name ? 'text-red-500' : 'text-gray-400'}`}>
                  Nome Completo *
                </label>
                <div className="relative">
                    <input 
                        type="text" 
                        value={formData.name}
                        onChange={e => handleInputChange('name', e.target.value)}
                        placeholder="Como devemos te chamar?" 
                        readOnly={!!editingAppointment} // Nome não muda na edição para simplificar
                        className={`w-full bg-white border rounded-2xl py-4 px-12 outline-none focus:ring-1 text-gray-800 font-bold shadow-sm transition-all ${
                          errors.name ? 'border-red-500 ring-red-100 ring-1' : 'border-gray-200 focus:ring-black'
                        } ${editingAppointment ? 'bg-gray-50 text-gray-500' : ''}`}
                    />
                    <User className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${errors.name ? 'text-red-400' : 'text-gray-300'}`} size={20} />
                </div>
                {errors.name && (
                  <p className="text-[10px] text-red-500 font-bold mt-1 px-1 flex items-center gap-1 animate-in fade-in slide-in-from-top-1">
                    <AlertCircle size={10} /> Informe seu nome para continuar
                  </p>
                )}
            </div>

            <div className="relative">
                <label className={`text-[10px] font-black uppercase tracking-widest block mb-1.5 px-1 ${errors.phone ? 'text-red-500' : 'text-gray-400'}`}>
                  Seu WhatsApp *
                </label>
                <div className="relative">
                    <input 
                        type="tel" 
                        value={formData.phone}
                        onChange={e => handleInputChange('phone', e.target.value)}
                        placeholder="(00) 0 0000-0000" 
                        maxLength={15}
                        readOnly={!!editingAppointment} // Telefone é chave de busca, não muda na edição pública
                        className={`w-full bg-white border rounded-2xl py-4 px-12 outline-none focus:ring-1 text-gray-800 font-bold shadow-sm transition-all ${
                          errors.phone ? 'border-red-500 ring-red-100 ring-1' : 'border-gray-200 focus:ring-black'
                        } ${editingAppointment ? 'bg-gray-50 text-gray-500' : ''}`}
                    />
                    <Phone className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${errors.phone ? 'text-red-400' : 'text-gray-300'}`} size={20} />
                </div>
                {errors.phone && (
                  <p className="text-[10px] text-red-500 font-bold mt-1 px-1 flex items-center gap-1 animate-in fade-in slide-in-from-top-1">
                    <AlertCircle size={10} /> Precisamos do seu contato
                  </p>
                )}
            </div>

            <div className="relative">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 px-1">Alguma Observação?</label>
                <div className="relative">
                    <textarea 
                        value={formData.observation}
                        onChange={e => handleInputChange('observation', e.target.value)}
                        placeholder="Ex: Tive um imprevisto, chegarei 5 min antes." 
                        className="w-full bg-white border border-gray-200 rounded-2xl py-4 px-12 outline-none focus:ring-1 focus:ring-black text-gray-800 font-medium shadow-sm h-28 resize-none"
                    />
                    <Clipboard className="absolute left-4 top-5 text-gray-300" size={20} />
                </div>
            </div>
        </div>

        <button 
            onClick={handleFinish}
            disabled={isSubmitting}
            className={`w-full bg-black text-white font-black py-5 rounded-[2rem] shadow-xl active:scale-[0.98] transition-all uppercase tracking-[0.2em] text-sm mt-4 min-h-[64px] ${isSubmitting ? 'opacity-50' : ''}`}
        >
            {isSubmitting ? 'Processando...' : editingAppointment ? 'Confirmar Reagendamento' : 'Confirmar Agendamento'}
        </button>
      </div>
    </div>
  );
};

export default BookingForm;
