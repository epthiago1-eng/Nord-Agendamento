
import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Calendar, Menu as MenuIcon, DollarSign, Receipt, PlusCircle, Users, Bell } from 'lucide-react';

const Layout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Obtém o cargo do usuário para controle de visibilidade
  const userRole = localStorage.getItem('user_role') || 'ADMIN';

  // Configuração do Menu para ADMIN
  const adminNavItems = [
    { label: 'Agenda', icon: Calendar, path: '/agenda' },
    { label: 'Menu', icon: MenuIcon, path: '/menu' },
    { label: 'Lançar', icon: PlusCircle, path: '/financial/new', highlight: true }, // Centralizado (Atalho)
    { label: 'Contas', icon: Receipt, path: '/bills' },
    { label: 'Financeiro', icon: DollarSign, path: '/financial' },
  ];

  // Configuração do Menu para COLABORADOR
  const collaboratorNavItems = [
    { label: 'Agenda', icon: Calendar, path: '/agenda' },
    { label: 'Clientes', icon: Users, path: '/clients' },
    { label: 'Menu', icon: MenuIcon, path: '/menu', highlight: true }, // Centralizado
    { label: 'Notificações', icon: Bell, path: '/notifications' },
    { label: 'Financeiro', icon: DollarSign, path: '/financial' },
  ];

  // Seleciona os itens baseados no cargo
  const visibleNavItems = userRole === 'COLLABORATOR' ? collaboratorNavItems : adminNavItems;

  return (
    <div className="flex flex-col h-screen bg-[#fcfaff] overflow-hidden">
      {/* Content Area */}
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#f0f0f5] border-t border-gray-200 flex justify-around items-center px-2 py-1 safe-bottom z-50">
        {visibleNavItems.map((item) => {
          const isActive = location.pathname === item.path; // Exact match para o highlight funcionar bem
          
          if (item.highlight) {
             return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className="flex flex-col items-center justify-center -mt-6"
                >
                  <div className="bg-[#1e3a8a] text-white p-4 rounded-full shadow-lg border-4 border-[#fcfaff] active:scale-95 transition-transform">
                    <item.icon size={28} />
                  </div>
                  <span className="text-[10px] font-bold text-blue-900 mt-1">{item.label}</span>
                </button>
             );
          }

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center py-1 flex-1 transition-colors ${
                isActive ? 'text-blue-900 font-semibold' : 'text-gray-500'
              }`}
            >
              <div className={`p-1 px-4 rounded-full ${isActive ? 'bg-[#e0e0f0]' : ''} relative`}>
                <item.icon size={22} />
              </div>
              <span className="text-[11px] mt-0.5">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default Layout;
