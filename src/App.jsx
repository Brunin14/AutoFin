import { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

// 1. Importação das páginas (PascalCase)
import LoginPage from "./pages/Login"; 
import Home from "./pages/home";
import CadastroPage from "./pages/CadastroPage";
import Relatorio from "./pages/Relatorio";
import GastosFixos from "./pages/GastosFixos";
import Registrar from "./pages/Registrar";

// 2. Importa o popup
import NotificationPopup from "./components/NotificationPopup";

function App() {
  
  // Estado do Usuário (correto)
  const [user, setUser] = useState(() => {
    try {
      const storedUser = localStorage.getItem("usuario");
      return storedUser ? JSON.parse(storedUser) : null;
    } catch (error) {
      console.error("Erro ao carregar usuário do localStorage:", error);
      return null;
    }
  });

  // 3. Estado para o popup
  const [notification, setNotification] = useState({
    isOpen: false,
    message: '',
    type: 'success', // 'success', 'error', 'confirm'
    onConfirm: null,
  });

  // 4. Função para MOSTRAR o popup
  const showNotification = (message, type = 'success', onConfirm = null) => {
    setNotification({
      isOpen: true,
      message,
      type,
      onConfirm: onConfirm, // Callback para o botão "Sim"
    });
  };

  // 5. Função para FECHAR o popup
  const closeNotification = () => {
    setNotification({
      isOpen: false,
      message: '',
      type: 'success',
      onConfirm: null,
    });
  };

  // Funções de Login/Logout (corretas)
  const handleLogin = (userData) => {
    localStorage.setItem("usuario", JSON.stringify(userData));
    setUser(userData);
  };
  
  const handleLogout = () => {
    localStorage.removeItem("usuario");
    setUser(null);
  };

  /**
   * Componente auxiliar para proteger rotas.
   * 6. ATUALIZADO: Agora passa a prop 'showNotification'
   */
  const ProtectedRoute = ({ element: Component, ...rest }) => {
    return user ? (
      <Component 
        {...rest} 
        user={user} 
        onLogout={handleLogout}
        showNotification={showNotification} // <-- AQUI ESTÁ A CORREÇÃO
      />
    ) : (
      <Navigate to="/" replace />
    );
  };

  return (
    <Router>
      
      {/* 7. Renderiza o popup (ele fica invisível até ser ativado) */}
      <NotificationPopup config={notification} onClose={closeNotification} />

      <Routes>
        
        {/* Rota Raiz (Login) */}
        <Route
          path="/"
          element={
            user ? (
              <Navigate to="/home" replace />
            ) : (
              <LoginPage onLogin={handleLogin} showNotification={showNotification} />
            )
          }
        />
        
        {/* Rota de Cadastro */}
        <Route
          path="/cadastro"
          element={
            user ? (
              <Navigate to="/home" replace /> 
            ) : (
              <CadastroPage onLogin={handleLogin} showNotification={showNotification} />
            )
          }
        />
        
        {/* --- ROTAS PROTEGIDAS --- */}
        
        <Route
          path="/home"
          element={<ProtectedRoute element={Home} />} 
        />
        
        <Route
          path="/registrar"
          element={<ProtectedRoute element={Registrar} />}
        />

        <Route
          path="/relatorio"
          element={<ProtectedRoute element={Relatorio} />}
        />

        <Route
          path="/gastosfixos"
          element={<ProtectedRoute element={GastosFixos} />}
        />
        
        {/* Tratamento de rotas não encontradas */}
        <Route path="*" element={<Navigate to={user ? "/home" : "/"} replace />} />
        
      </Routes>
    </Router>
  );
}

export default App;