
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// Páginas Administrativas e Gerais
import Agenda from './pages/Agenda';
import AgendaBlockForm from './pages/AgendaBlockForm';
import Clients from './pages/Clients';
import ClientHistory from './pages/ClientHistory';
import Menu from './pages/Menu';
import Notifications from './pages/Notifications';
import Financial from './pages/Financial'; 
import FinancialForm from './pages/FinancialForm';
import FinancialLog from './pages/FinancialLog';
import CommissionAudit from './pages/CommissionAudit'; 
import BillManagement from './pages/BillManagement';
import BillForm from './pages/BillForm';
import ProfessionalList from './pages/ProfessionalList';
import ProfessionalForm from './pages/ProfessionalForm';
import ProfessionalAccessForm from './pages/ProfessionalAccessForm';
import ProfessionalServices from './pages/ProfessionalServices';
import ProfessionalCommissionForm from './pages/ProfessionalCommissionForm';
import ProfessionalPerformanceDetails from './pages/ProfessionalPerformanceDetails'; 
import ServiceList from './pages/ServiceList';
import ServiceForm from './pages/ServiceForm';
import ServiceGroups from './pages/ServiceGroups';
import ServiceGroupForm from './pages/ServiceGroupForm';
import ProductList from './pages/ProductList';
import ProductForm from './pages/ProductForm';
import Reports from './pages/Reports';
import AppointmentForm from './pages/AppointmentForm';
import AppointmentCheckout from './pages/AppointmentCheckout';
import Establishment from './pages/Establishment';
import Packages from './pages/Packages';
import PackageForm from './pages/PackageForm';
import SalesHome from './pages/SalesHome';
import SaleForm from './pages/SaleForm';
import Birthdays from './pages/Birthdays';
import AbsentClients from './pages/AbsentClients';
import CostCenterList from './pages/CostCenterList';
import CostCenterForm from './pages/CostCenterForm';
import Settings from './pages/Settings';
import AccountOptions from './pages/AccountOptions';
import ServiceRooms from './pages/ServiceRooms';
import AttendanceHours from './pages/AttendanceHours';
import PaymentMethodList from './pages/PaymentMethodList';
import PaymentMethodForm from './pages/PaymentMethodForm';
import ReportProfessionalPerformance from './pages/ReportProfessionalPerformance';
import ReportFinancialSummary from './pages/ReportFinancialSummary';
import ReportExpenseDetails from './pages/ReportExpenseDetails';

// Páginas do Colaborador
import CollaboratorFinancial from './pages/CollaboratorFinancial';
import CollaboratorAttendanceLog from './pages/CollaboratorAttendanceLog';
import CollaboratorCommissions from './pages/CollaboratorCommissions';
import CollaboratorExpenseForm from './pages/CollaboratorExpenseForm';

// Autenticação
import Login from './pages/Login';
import Register from './pages/Register';

// Agendamento Público
import BookingServices from './pages/public/BookingServices';
import BookingSchedule from './pages/public/BookingSchedule';
import BookingForm from './pages/public/BookingForm';
import BookingConsult from './pages/public/BookingConsult';
import BookingLocation from './pages/public/BookingLocation';
import BookingConfirmation from './pages/public/BookingConfirmation';

const App: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Rotas Protegidas (Painel Interno) */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="agenda" element={<Agenda />} />
            <Route path="agenda/block" element={<AgendaBlockForm />} />
            <Route path="clients" element={<Clients />} />
            <Route path="client-history/:id" element={<ClientHistory />} />
            <Route path="menu" element={<Menu />} />
            <Route path="notifications" element={<Notifications />} />
            
            <Route path="financial" element={<Financial />} />
            <Route path="financial/colaborador" element={<CollaboratorFinancial />} />
            <Route path="financial/my-attendance" element={<CollaboratorAttendanceLog />} />
            <Route path="financial/my-commissions" element={<CollaboratorCommissions />} />
            <Route path="financial/expense/new" element={<CollaboratorExpenseForm />} />
            <Route path="financial/log" element={<FinancialLog />} />
            <Route path="financial/commissions/:proName" element={<CommissionAudit />} />
            <Route path="financial/performance/:id" element={<ProfessionalPerformanceDetails />} />
            <Route path="financial/new" element={<FinancialForm />} />
            <Route path="financial/edit/:id" element={<FinancialForm />} />
            
            <Route path="bills" element={<BillManagement />} />
            <Route path="bills/new" element={<BillForm />} />
            <Route path="bills/edit/:id" element={<BillForm />} />
            
            <Route path="professionals" element={<ProfessionalList />} />
            <Route path="professionals/new" element={<ProfessionalForm />} />
            <Route path="professionals/edit/:id" element={<ProfessionalForm />} />
            <Route path="professionals/access/:id" element={<ProfessionalAccessForm />} />
            <Route path="professionals/hours/:id" element={<AttendanceHours />} />
            <Route path="professionals/services/:id" element={<ProfessionalServices />} />
            <Route path="professionals/commission/:proId/:serviceId" element={<ProfessionalCommissionForm />} />
            
            <Route path="services" element={<ServiceList />} />
            <Route path="services/new" element={<ServiceForm />} />
            <Route path="service-groups" element={<ServiceGroups />} />
            <Route path="service-groups/new" element={<ServiceGroupForm />} />
            
            <Route path="products" element={<ProductList />} />
            <Route path="products/new" element={<ProductForm />} />
            <Route path="products/edit/:id" element={<ProductForm />} />
            
            <Route path="packages" element={<Packages />} />
            <Route path="packages/new" element={<PackageForm />} />
            
            <Route path="sales" element={<SalesHome />} />
            <Route path="sales/new/:type" element={<SaleForm />} />
            
            <Route path="reports" element={<Reports />} />
            <Route path="reports/birthdays" element={<Birthdays />} />
            <Route path="reports/absent" element={<AbsentClients />} />
            <Route path="reports/professionals" element={<ReportProfessionalPerformance />} />
            <Route path="reports/financial-summary" element={<ReportFinancialSummary />} />
            <Route path="reports/expenses" element={<ReportExpenseDetails />} />
            
            <Route path="cost-centers" element={<CostCenterList />} />
            <Route path="cost-centers/new" element={<CostCenterForm />} />

            <Route path="payment-methods" element={<PaymentMethodList />} />
            <Route path="payment-methods/new" element={<PaymentMethodForm />} />
            <Route path="payment-methods/edit/:id" element={<PaymentMethodForm />} />
            
            <Route path="new-appointment" element={<AppointmentForm />} />
            <Route path="appointment-checkout/:id" element={<AppointmentCheckout />} />
            <Route path="establishment" element={<Establishment />} />
            <Route path="settings" element={<Settings />} />
            <Route path="account-options" element={<AccountOptions />} />
            <Route path="rooms" element={<ServiceRooms />} />
          </Route>
        </Route>

        {/* Rotas de Agendamento Público (Sem Layout de APP) */}
        <Route path="/booking/:slug" element={<BookingServices />} />
        <Route path="/booking" element={<BookingServices />} />
        <Route path="/booking/schedule" element={<BookingSchedule />} />
        <Route path="/booking/form" element={<BookingForm />} />
        <Route path="/booking/consult" element={<BookingConsult />} />
        <Route path="/booking/location" element={<BookingLocation />} />
        <Route path="/booking/confirmation" element={<BookingConfirmation />} />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </HashRouter>
  );
};

export default App;
