
import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Calendar, Users, Menu as MenuIcon, DollarSign, Receipt } from 'lucide-react';

const Layout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Obtém o cargo do usuário para controle de visibilidade
  const userRole = localStorage.getItem('user_role') || 'ADMIN';

  const navItems = [
    { label: 'Agenda', icon: Calendar, path: '/agenda' },
    { label: 'Clientes', icon: Users, path: '/clients' },
    { label: 'Menu', icon: MenuIcon, path: '/menu' },
    { label: 'Contas', icon: Receipt, path: '/bills', adminOnly: true },
    { label: 'Financeiro', icon: DollarSign, path: '/financial' },
  ];

  // Filtra os itens de navegação baseando-se no cargo
  const visibleNavItems = navItems.filter(item => {
    if (item.adminOnly && userRole !== 'ADMIN') return false;
    return true;
  });

  return (
    <div className="flex flex-col h-screen bg-[#fcfaff] overflow-hidden">
      {/* Content Area */}
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#f0f0f5] border-t border-gray-200 flex justify-around items-center px-2 py-1 safe-bottom z-50">
        {visibleNavItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
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
