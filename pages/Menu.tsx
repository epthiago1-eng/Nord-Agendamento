
import React from 'react';
import { 
  Users, UserCheck, ClipboardList, FolderOpen, 
  ShoppingBag, Package, Box, 
  CreditCard, FileText, BarChart3, 
  Building2, Settings, LifeBuoy, LogOut, Zap, History, Receipt
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Menu: React.FC = () => {
  const navigate = useNavigate();
  const role = localStorage.getItem('user_role') || 'ADMIN';

  const handleLogout = () => {
    localStorage.removeItem('is_logged_in');
    localStorage.removeItem('user_role');
    navigate('/login');
  };

  const adminItems = [
    { id: 'clients', label: 'Clientes', icon: Users, path: '/clients' },
    { id: 'professionals', label: 'Profissional', icon: UserCheck, path: '/professionals' },
    { id: 'services', label: 'Serviços', icon: ClipboardList, path: '/services' },
    { id: 'service-groups', label: 'Grupo de Serviços', icon: FolderOpen, path: '/service-groups' },
    { id: 'sales', label: 'Vendas', icon: ShoppingBag, path: '/sales' },
    { id: 'products', label: 'Produtos', icon: Box, path: '/products' },
    { id: 'packages', label: 'Pacotes', icon: Package, path: '/packages' },
    { id: 'bills', label: 'Contas e Despesas', icon: Receipt, path: '/bills' },
    { id: 'payments', label: 'Formas de Pagamento', icon: CreditCard, path: '/payment-methods' },
    { id: 'financial-log', label: 'Movimentações', icon: History, path: '/financial/log' },
    { id: 'reports', label: 'Relatórios', icon: BarChart3, path: '/reports' },
    { id: 'establishment', label: 'Estabelecimento', icon: Building2, path: '/establishment' },
    { id: 'settings', label: 'Configurações', icon: Settings, path: '/settings' },
  ];

  const collaboratorItems = [
    { id: 'my-clients', label: 'Meus Clientes', icon: Users, path: '/clients' },
    { id: 'my-performance', label: 'Meu Financeiro', icon: Zap, path: '/financial' },
    { id: 'my-schedule', label: 'Minha Agenda', icon: FileText, path: '/agenda' },
    { id: 'new-expense', label: 'Lançar Despesa', icon: Receipt, path: '/financial/expense/new' },
    { id: 'support', label: 'Suporte', icon: LifeBuoy, path: '/menu' },
  ];

  const currentItems = role === 'ADMIN' ? adminItems : collaboratorItems;

  return (
    <div className="p-4 bg-[#fcfaff] h-full overflow-y-auto pb-24">
      <div className="mb-6 flex flex-col items-center">
        <h2 className="text-[#1e3a8a] font-black uppercase tracking-widest text-sm mt-4">Menu do Sistema</h2>
        <div className="w-10 h-1 bg-blue-900 rounded-full mt-2"></div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {currentItems.map((item) => (
          <button
            key={item.id}
            onClick={() => navigate(item.path)}
            className="bg-white p-6 rounded-[2rem] border border-gray-50 shadow-sm flex flex-col items-center justify-center gap-3 active:scale-95 transition-all h-36"
          >
            <div className="p-1 text-blue-900">
              <item.icon size={36} strokeWidth={1.5} />
            </div>
            <span className="text-[11px] font-black text-gray-600 text-center leading-tight uppercase tracking-wider">
              {item.label}
            </span>
          </button>
        ))}
        
        <button 
          onClick={handleLogout}
          className="bg-red-50 p-6 rounded-[2rem] border border-red-100 flex flex-col items-center justify-center gap-3 active:scale-95 transition-all h-36"
        >
            <LogOut size={36} className="text-red-500" strokeWidth={1.5} />
            <span className="text-[11px] font-black text-red-500 uppercase tracking-wider">Sair</span>
        </button>
      </div>
    </div>
  );
};

export default Menu;
