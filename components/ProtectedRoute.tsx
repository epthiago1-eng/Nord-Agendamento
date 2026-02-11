
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute: React.FC = () => {
  const isLoggedIn = localStorage.getItem('is_logged_in') === 'true';

  if (!isLoggedIn) {
    // Se não estiver logado, redireciona para o login
    return <Navigate to="/login" replace />;
  }

  // Se estiver logado, renderiza as rotas filhas (Outlet)
  return <Outlet />;
};

export default ProtectedRoute;
