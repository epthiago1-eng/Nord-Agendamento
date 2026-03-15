import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Megaphone, ArrowLeft } from 'lucide-react';
import { supabase } from '../supabase';

interface Announcement {
  id: string;
  title: string;
  message: string;
  target_audience: 'PUBLIC' | 'ADMIN' | 'ALL';
  is_active: boolean;
  created_at: string;
}

const Announcements: React.FC = () => {
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAnnouncements = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setAnnouncements(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este aviso?')) {
      const { error } = await supabase.from('announcements').delete().eq('id', id);
      if (!error) {
        fetchAnnouncements();
      } else {
        alert('Erro ao excluir aviso.');
      }
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('announcements')
      .update({ is_active: !currentStatus })
      .eq('id', id);
    if (!error) {
      fetchAnnouncements();
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto pb-24">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/menu')} className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-50">
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2">
            <Megaphone className="text-blue-600" />
            Avisos e Campanhas
          </h1>
        </div>
        <button
          onClick={() => navigate('/announcements/new')}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus size={20} />
          <span className="hidden sm:inline">Novo Aviso</span>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-500">Carregando avisos...</div>
      ) : announcements.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl shadow-sm text-center border border-gray-100">
          <Megaphone size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium">Nenhum aviso cadastrado.</p>
          <p className="text-sm text-gray-400 mt-1">Crie um novo aviso para seus clientes ou equipe.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {announcements.map((announcement) => (
            <div key={announcement.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-gray-800 text-lg">{announcement.title}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    announcement.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {announcement.is_active ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                <p className="text-sm text-gray-500 line-clamp-2">{announcement.message}</p>
                <div className="flex items-center gap-4 mt-3 text-xs font-medium text-gray-400">
                  <span className="flex items-center gap-1">
                    Público: <strong className="text-gray-600">{
                      announcement.target_audience === 'ALL' ? 'Todos' :
                      announcement.target_audience === 'PUBLIC' ? 'Site Público' : 'App Admin'
                    }</strong>
                  </span>
                  <span>Criado em: {new Date(announcement.created_at).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  onClick={() => toggleActive(announcement.id, announcement.is_active)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    announcement.is_active 
                      ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' 
                      : 'bg-green-50 text-green-600 hover:bg-green-100'
                  }`}
                >
                  {announcement.is_active ? 'Desativar' : 'Ativar'}
                </button>
                <button
                  onClick={() => navigate(`/announcements/edit/${announcement.id}`)}
                  className="p-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                  title="Editar"
                >
                  <Edit2 size={18} />
                </button>
                <button
                  onClick={() => handleDelete(announcement.id)}
                  className="p-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                  title="Excluir"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Announcements;
