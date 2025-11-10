import { Navigate } from 'react-router-dom';

function ProtectedRoute({ children }) {
  // 1. Verifica se o item 'usuario' existe no localStorage
  const isAuthenticated = localStorage.getItem('usuario');

  if (isAuthenticated) {
    // 2. Se estiver logado, renderiza os componentes filhos (ex: Home, Relatórios)
    return children;
  } else {
    // 3. Se NÃO estiver logado, redireciona para a página de login ('/')
    // O 'replace: true' garante que o usuário não possa usar o botão de voltar do navegador para acessar a página protegida.
    return <Navigate to="/" replace />;
  }
}

export default ProtectedRoute;