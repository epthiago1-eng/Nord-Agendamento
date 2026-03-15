import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../supabase';

interface Announcement {
  id: string;
  title: string;
  message: string;
  image_url: string | null;
}

interface AnnouncementPopupProps {
  targetAudience: 'PUBLIC' | 'ADMIN';
}

const AnnouncementPopup: React.FC<AnnouncementPopupProps> = ({ targetAudience }) => {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const fetchActiveAnnouncement = async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .in('target_audience', [targetAudience, 'ALL'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!error && data) {
        // Check if user has dismissed this specific announcement
        const dismissed = localStorage.getItem(`dismissed_announcement_${data.id}`);
        if (!dismissed) {
          setAnnouncement(data);
          setIsVisible(true);
        }
      }
    };

    fetchActiveAnnouncement();
  }, [targetAudience]);

  const handleDismiss = () => {
    setIsVisible(false);
  };

  const handleDontShowAgain = () => {
    if (announcement) {
      localStorage.setItem(`dismissed_announcement_${announcement.id}`, 'true');
      setIsVisible(false);
    }
  };

  if (!isVisible || !announcement) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95">
        
        {announcement.image_url && (
          <div className="w-full h-48 sm:h-64 bg-gray-100 relative">
            <img 
              src={announcement.image_url} 
              alt={announcement.title} 
              className="w-full h-full object-cover"
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
            <button 
              onClick={handleDismiss}
              className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors backdrop-blur-md"
            >
              <X size={20} />
            </button>
          </div>
        )}

        <div className="p-6 sm:p-8 flex flex-col flex-1 overflow-y-auto">
          {!announcement.image_url && (
             <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-black text-gray-800 leading-tight">{announcement.title}</h2>
                <button onClick={handleDismiss} className="p-2 text-gray-400 hover:text-gray-600 bg-gray-50 rounded-full">
                  <X size={20} />
                </button>
             </div>
          )}
          
          {announcement.image_url && (
            <h2 className="text-2xl font-black text-gray-800 leading-tight mb-4">{announcement.title}</h2>
          )}

          <div className="text-gray-600 whitespace-pre-wrap mb-8 text-sm sm:text-base leading-relaxed">
            {announcement.message}
          </div>

          <div className="mt-auto flex flex-col gap-3">
            <button 
              onClick={handleDismiss}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
            >
              Entendi
            </button>
            <button 
              onClick={handleDontShowAgain}
              className="w-full py-3 text-gray-400 font-bold text-xs uppercase tracking-widest hover:text-gray-600 transition-colors"
            >
              Não mostrar novamente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementPopup;
