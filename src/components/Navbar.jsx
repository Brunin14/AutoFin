import { useNavigate } from "react-router-dom";
import "./Navbar.css"; // Assumindo que o CSS está na mesma pasta do componente Navbar

// A Navbar deve receber a função onLogout do App.jsx como prop
function Navbar({ onLogout }) {
  const navigate = useNavigate();
  // Se o App.jsx está passando o user via prop, esta linha seria desnecessária, 
  // mas vamos manter o padrão de leitura direta para simplificar a vida da Navbar
  const user = JSON.parse(localStorage.getItem("usuario"));

  // Função de logout simplificada: apenas chama a função do App.jsx (onLogout)
  const handleLogoutClick = () => {
    // A função onLogout (que veio do App.jsx) remove o item do localStorage e
    // zera o estado 'user', o que acionará o redirecionamento no App.jsx.
    onLogout(); 
  };

  const username = user?.nome ? user.nome.split(" ")[0] : "Usuário"; 

  return (
    <nav className="app-navbar">
      {/* 1. Logo/Título do App */}
      <div className="navbar-brand" onClick={() => navigate("/home")}>
        <span className="logo-text">Controle de Financas</span>
      </div>

      {/* 2. Links Principais de Navegação */}
      <div className="navbar-links">
        {/* Usar navigate() em vez de <a> href para o React Router funcionar corretamente */}
        <button 
          className="nav-link active" 
          onClick={() => navigate("/home")} 
        >
          Dashboard
        </button>
        
        <button 
          className="nav-link btn-action" 
          onClick={() => navigate("/registrar")} // Corrigido para /registrar (minúsculo)
        >
          Registrar Novo Gasto
        </button>

        <button 
          className="nav-link" 
          onClick={() => navigate("/relatorio")} // Exemplo de outra rota
        >
          Receita
        </button>

        <button 
          className="nav-link" 
          onClick={() => navigate("/gastosfixos")} // Exemplo de outra rota
        >
          Gastos Fixos
        </button>
      </div>

      {/* 3. Área do Usuário e Logout (Sempre à direita) */}
      <div className="navbar-user-actions">
        <span className="user-greeting">Bem vindo(a), {username} 👋</span>
        <button onClick={handleLogoutClick} className="btn-logout-nav">
          Sair
        </button>
      </div>
    </nav>
  );
}

export default Navbar;