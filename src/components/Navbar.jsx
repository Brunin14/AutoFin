import { useNavigate, NavLink } from "react-router-dom";
// 1. Importe os ícones que você quer
import { MdDashboard, MdAdd, MdAutorenew } from "react-icons/md"; 
import { IoDocumentTextOutline } from "react-icons/io5";
// 2. Garante que o CSS está sendo importado
import "./Navbar.css"; 

function Navbar({ onLogout }) {
  const navigate = useNavigate(); 
  
  const user = JSON.parse(localStorage.getItem("usuario")); 
  const handleLogoutClick = () => {
    onLogout(); 
  };
  const username = user?.nome ? user.nome.split(" ")[0] : "Usuário"; 

  // Função para adicionar a classe "active" (correta)
  const getNavLinkClass = ({ isActive }) => {
    return isActive ? "nav-link active" : "nav-link";
  };

  // Função para o botão de Registrar (correta)
  const getRegistrarLinkClass = ({ isActive }) => {
    const baseClasses = "nav-link btn-action";
    return isActive ? `${baseClasses} active` : baseClasses;
  };


  return (
    <nav className="app-navbar">
      
      {/* 1. Logo/Título do App (ATUALIZADO) */}
      <div className="navbar-brand" onClick={() => navigate("/home")}>
        
        {/* Adiciona a logo. 
            O arquivo SVG deve estar na pasta /public/logo.svg 
        */}
        <img 
          src="/Logo.svg" 
          alt="AutoFin Logo" 
          className="navbar-logo" 
        />
        
        <span className="logo-text">AutoFin</span>
      </div>

      {/* 2. Links Principais de Navegação */}
      <div className="navbar-links">
        
        <NavLink to="/home" className={getNavLinkClass}>
          <MdDashboard size={18} /> {/* Ícone */}
          <span>Dashboard</span>    {/* Texto */}
        </NavLink>
        
        <NavLink to="/registrar" className={getRegistrarLinkClass}>
          <MdAdd size={18} /> {/* 🎯 NOVO ÍCONE */}
          <span>Registrar Novo Gasto</span> {/* 🎯 NOVO SPAN */}
        </NavLink>

        <NavLink to="/relatorio" className={getNavLinkClass}>
          <IoDocumentTextOutline size={18} /> {/* 🎯 NOVO ÍCONE */}
          <span>Relatórios</span> {/* 🎯 NOVO SPAN */}
        </NavLink>

        <NavLink to="/gastosfixos" className={getNavLinkClass}>
          <MdAutorenew size={18} /> {/* 🎯 NOVO ÍCONE */}
          <span>Gastos Fixos</span> {/* 🎯 NOVO SPAN */}
        </NavLink>
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