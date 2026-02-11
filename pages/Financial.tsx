
import React from 'react';
import FinancialAdmin from './FinancialAdmin';
import CollaboratorFinancial from './CollaboratorFinancial';

const Financial: React.FC = () => {
  const userRole = localStorage.getItem('user_role') || 'ADMIN';

  if (userRole === 'COLLABORATOR') {
    return <CollaboratorFinancial />;
  }

  // Se for ADMIN, renderiza o novo painel de gestão completo
  return <FinancialAdmin />;
};

export default Financial;
