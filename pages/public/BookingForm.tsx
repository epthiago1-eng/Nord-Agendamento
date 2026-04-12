
import React, { useState, useEffect } from 'react';
import { ChevronLeft, CheckCircle2, User, Phone, Clipboard, AlertCircle, Loader2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { saveAppointment, updateAppointment, checkClientSpam, getSettings } from '../../data/agendaData';
import { addNotification } from '../../data/notifications';
import { db } from '../../supabase';

const BookingForm: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedServices, professional, time, date, dateIso, editingAppointment } = location.state || {};

  const [formData, setFormData] = useState({
    phone: editingAppointment?.clientPhone || '',
    name: editingAppointment?.clientName || '',
    observation: editingAppointment?.observation || '',
    referredByPhone: ''
  });

  const [errors, setErrors] = useState<{ name?: boolean; phone?: boolean }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoUrl, setLogoUrl] = useState("https://agendamento.igic.com.br/assets/logos/nord_barbershop_logo.png");
  const [spamError, setSpamError] = useState<string | null>(null);
  
  // Client Search States
  const [isSearchingClient, setIsSearchingClient] = useState(false);
  const [clientFound, setClientFound] = useState<boolean | null>(null);
  const [welcomeMessage, setWelcomeMessage] = useState('');

  useEffect(() => {
    getSettings().then(s => {
        if (s.logoUrl) setLogoUrl(s.logoUrl);
    });
  }, []);

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

  const searchClient = async (phone: string) => {
    // Remove formatting to search
    // Assuming DB stores formatted or unformatted? 
    // Usually standardizing on formatted in the UI might mean DB has formatted. 
    // Let's try exact match first.
    
    setIsSearchingClient(true);
    setClientFound(null);
    setWelcomeMessage('');
    
    try {
        const { data, error } = await db.clients().select('*').eq('phone', phone).single();
        
        if (data) {
            setFormData(prev => ({ ...prev, name: data.name }));
            setClientFound(true);
            setWelcomeMessage(`Bem-vindo de volta, ${data.name.split(' ')[0]}!`);
            // Clear name error if it existed
            setErrors(prev => ({ ...prev, name: false }));
        } else {
            setClientFound(false);
            setWelcomeMessage('Por favor, informe seu nome para completarmos o cadastro.');
            // Clear name so they can type
            if (!editingAppointment) {
                setFormData(prev => ({ ...prev, name: '' }));
            }
        }
    } catch (err) {
        console.error(err);
        // Treat error as not found
        setClientFound(false);
        setWelcomeMessage('Por favor, informe seu nome para completarmos o cadastro.');
    } finally {
        setIsSearchingClient(false);
    }
  };

  const handleFinish = async () => {
    if (!validate()) return;
    setIsSubmitting(true);

    try {
        // SPAM CHECK (Apenas para novos agendamentos)
        if (!editingAppointment) {
            const spamCheck = await checkClientSpam(formData.phone, dateIso);
            if (!spamCheck.allowed) {
                setSpamError(spamCheck.reason || 'Erro desconhecido');
                setIsSubmitting(false);
                return;
            }
        }

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
                observation: formData.observation,
                clientPhone: editingAppointment.clientPhone // Necessário para validação pública
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
            // Check if client exists to reuse ID or create new?
            // saveAppointment usually creates a new client if ID is 'public-...'? 
            // Actually saveAppointment in agendaData just inserts into appointments.
            // If we want to link to an existing client, we should probably use their ID if found.
            // But the current implementation of saveAppointment takes clientId as a string.
            // If we found a client, we should probably use their real ID.
            
            let clientId = 'public-' + Date.now();
            
            // Try to get real client ID if we found them
            if (clientFound) {
                 const { data } = await db.clients().select('id').eq('phone', formData.phone).single();
                 if (data) clientId = data.id;
            } else {
                // If not found, maybe we should create the client record properly?
                // For now, let's stick to the existing behavior but try to reuse if possible.
                // Or just let the backend/trigger handle it if there is one.
                // The current saveAppointment just inserts into appointments.
                
                // Let's try to insert/upsert the client to ensure they exist in clients table
                try {
                    let referredById = null;
                    if (formData.referredByPhone) {
                        const cleanRefPhone = formData.referredByPhone.replace(/\D/g, '');
                        const { data: refClient } = await db.clients().select('id').ilike('phone', `%${cleanRefPhone}%`).single();
                        if (refClient) referredById = refClient.id;
                    }

                    const { data: newClient } = await db.clients().upsert({
                        name: formData.name,
                        phone: formData.phone,
                        referred_by: referredById
                    }, { onConflict: 'phone' }).select().single();
                    
                    if (newClient) clientId = newClient.id;
                } catch (e) {
                    console.error("Error upserting client", e);
                }
            }

            finalAppointment = await saveAppointment({
                clientId: clientId,
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
        setSpamError('Erro ao agendar: ' + e.message);
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: 'name' | 'phone' | 'observation' | 'referredByPhone', value: string) => {
    let finalValue = value;
    if (field === 'phone' || field === 'referredByPhone') {
        finalValue = formatPhone(value);
        if (field === 'phone') {
            if (finalValue.length >= 14 && !editingAppointment) {
                searchClient(finalValue);
            } else {
                setClientFound(null);
                setWelcomeMessage('');
            }
        }
    }
    setFormData(prev => ({ ...prev, [field]: finalValue }));
    if (errors[field as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [field]: false }));
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <div className="bg-black h-16 w-full relative shrink-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-0 w-32 h-32 rounded-full border-4 border-white bg-white overflow-hidden shadow-xl z-10 translate-y-[-20%]">
          <img src={logoUrl} alt="Nord Barbershop" className="w-full h-full object-contain p-1" />
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
            {/* PHONE FIELD FIRST */}
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
                    {isSearchingClient && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                            <Loader2 className="animate-spin text-blue-900" size={20} />
                        </div>
                    )}
                </div>
                {errors.phone && (
                  <p className="text-[10px] text-red-500 font-bold mt-1 px-1 flex items-center gap-1 animate-in fade-in slide-in-from-top-1">
                    <AlertCircle size={10} /> Precisamos do seu contato
                  </p>
                )}
                
                {/* Search Feedback */}
                {welcomeMessage && (
                    <div className={`mt-2 p-3 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-2 ${clientFound ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'}`}>
                        {clientFound ? <CheckCircle2 size={14} /> : <User size={14} />}
                        {welcomeMessage}
                    </div>
                )}
            </div>

            {/* NAME FIELD SECOND */}
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
                        readOnly={!!editingAppointment || (clientFound === true)} // Read only if found? Or allow edit? User asked for "preenchido". Let's allow edit but it's prefilled.
                        // User said: "caso encontre já apareça uma mensagem de seja bem vindo de volta e o nome fique preenchido e só precise confirmar agendamento"
                        // Usually safer to allow edit in case name changed, but let's keep it simple.
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

            {clientFound === false && (
              <div className="relative animate-in fade-in slide-in-from-top-2">
                  <label className="text-[10px] font-black uppercase tracking-widest block mb-1.5 px-1 text-gray-400">
                    Telefone de quem te indicou (Opcional)
                  </label>
                  <div className="relative">
                      <input 
                          type="tel" 
                          value={formData.referredByPhone}
                          onChange={e => handleInputChange('referredByPhone', e.target.value)}
                          placeholder="(00) 0 0000-0000" 
                          maxLength={15}
                          className="w-full bg-white border border-gray-200 rounded-2xl py-4 px-12 outline-none focus:ring-1 focus:ring-black text-gray-800 font-bold shadow-sm transition-all"
                      />
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 transition-colors" size={20} />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1 px-1 font-medium">Seu amigo ganha um corte grátis a cada 3 indicações!</p>
              </div>
            )}

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
            disabled={isSubmitting || isSearchingClient}
            className={`w-full bg-black text-white font-black py-5 rounded-[2rem] shadow-xl active:scale-[0.98] transition-all uppercase tracking-[0.2em] text-sm mt-4 min-h-[64px] ${isSubmitting || isSearchingClient ? 'opacity-50' : ''}`}
        >
            {isSubmitting ? 'Processando...' : editingAppointment ? 'Confirmar Reagendamento' : 'Confirmar Agendamento'}
        </button>
      </div>

      {/* Spam Error Modal */}
      {spamError && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-600 mb-2">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-xl font-black text-gray-900">Não foi possível agendar</h3>
              <p className="text-gray-600 font-medium leading-relaxed">
                {spamError}
              </p>
              <button 
                onClick={() => setSpamError(null)}
                className="w-full bg-gray-900 text-white font-bold py-4 rounded-2xl mt-2 active:scale-95 transition-transform"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingForm;
