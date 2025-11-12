import React, { useState } from 'react'; // 1. Importa o useState
import { useNavigate, NavLink } from "react-router-dom";
// 2. Importa os ícones do menu
import { MdDashboard, MdAdd, MdAutorenew, MdMenu, MdClose } from "react-icons/md"; 
import { IoDocumentTextOutline } from "react-icons/io5";
import "./Navbar.css"; 

function Navbar({ onLogout }) {
  const navigate = useNavigate(); 
  
  // 3. Estado para controlar o menu mobile
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const user = JSON.parse(localStorage.getItem("usuario")); 
  const handleLogoutClick = () => {
    onLogout(); 
  };
  const username = user?.nome ? user.nome.split(" ")[0] : "Usuário"; 

  const getNavLinkClass = ({ isActive }) => {
    return isActive ? "nav-link active" : "nav-link";
  };
  const getRegistrarLinkClass = ({ isActive }) => {
    const baseClasses = "nav-link btn-action";
    return isActive ? `${baseClasses} active` : baseClasses;
  };

  // 4. Função para fechar o menu ao clicar em um link
  const handleLinkClick = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    // 5. Adiciona a classe 'mobile-menu-open' quando o estado for true
    <nav className={`app-navbar ${isMobileMenuOpen ? 'mobile-menu-open' : ''}`}>
      
      <div className="navbar-brand" onClick={() => navigate("/home")}>
        <img 
          src="/Logo.svg" 
          alt="AutoFin Logo" 
          className="navbar-logo" 
        />
        <span className="logo-text">AutoFin</span>
      </div>

      {/* 6. Botão Hambúrguer (só aparece no mobile) */}
      <button 
        className="navbar-toggle-btn" 
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        aria-label="Toggle navigation"
      >
        {/* Muda o ícone dependendo do estado */}
        {isMobileMenuOpen ? <MdClose size={28} /> : <MdMenu size={28} />}
      </button>

      {/* 7. Wrapper para os links (que será escondido no mobile) */}
      <div className="navbar-collapse">
        <div className="navbar-links">
          
          <NavLink to="/home" className={getNavLinkClass} onClick={handleLinkClick}>
            <MdDashboard size={18} /> <span>Dashboard</span>
          </NavLink>
          
          <NavLink to="/registrar" className={getRegistrarLinkClass} onClick={handleLinkClick}>
            <MdAdd size={18} /> <span>Registrar Novo Gasto</span>
          </NavLink>

          <NavLink to="/relatorio" className={getNavLinkClass} onClick={handleLinkClick}>
            <IoDocumentTextOutline size={18} /> <span>Relatórios</span>
          </NavLink>

          <NavLink to="/gastosfixos" className={getNavLinkClass} onClick={handleLinkClick}>
            <MdAutorenew size={18} /> <span>Gastos Fixos</span>
          </NavLink>
        </div>

        <div className="navbar-user-actions">
          <span className="user-greeting">Bem vindo(a), {username} 👋</span>
          <button onClick={() => {
            handleLogoutClick();
            handleLinkClick(); // Fecha o menu também
          }} className="btn-logout-nav">
            Sair
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;