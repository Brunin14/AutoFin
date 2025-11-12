import { useState } from "react";
import "./Login.css"; // 1. REUTILIZANDO O MESMO CSS!
import { Link } from "react-router-dom"; // 2. Usar Link para o rodapé

function CadastroPage({ onLogin }) { // Recebe onLogin para auto-login
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState(""); // Campo extra
  
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro("");

    // 3. Validação de cliente (antes de ir ao backend)
    if (senha !== confirmarSenha) {
      setErro("As senhas não conferem.");
      return;
    }
    
    // (Opcional: Validação de força da senha, ex: 6+ caracteres)
    if (senha.length < 6) {
      setErro("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setLoading(true);

    try {
      // 4. Chama a nova rota /register
      const response = await fetch("https://autofin-backend.onrender.com/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, email, senha }),
      });

      const data = await response.json();

      if (response.ok && data.success) { 
        // 5. SUCESSO! Chama o onLogin (do App.jsx) para auto-logar
        onLogin(data.user); 
      } else {
        setErro(data.message || "Erro ao criar conta.");
      }
    } catch {
      setErro("Erro ao conectar com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        
        <div className="app-logo">
          <span className="logo-text">Controle.App</span>
        </div>
        
        {/* Título alterado */}
        <h1 className="login-title">Crie sua Conta Gratuita</h1>

        <form onSubmit={handleSubmit} className="login-form">
          {/* Campo Novo: Nome */}
          <div className="form-group">
            <label htmlFor="nome">Nome Completo</label>
            <input
              id="nome" 
              type="text"
              placeholder="Seu nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email" 
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="senha">Senha</label>
            <input
              id="senha" 
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          
          {/* Campo Novo: Confirmar Senha */}
          <div className="form-group">
            <label htmlFor="confirmarSenha">Confirmar Senha</label>
            <input
              id="confirmarSenha" 
              type="password"
              placeholder="Repita sua senha"
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          {erro && <div className="erro-msg">{erro}</div>}

          <button 
            type="submit" 
            className="btn-login" 
            disabled={loading} 
          >
            {loading ? "Criando conta..." : "Criar Conta"}
          </button>
        </form>

        {/* Rodapé alterado */}
        <p className="login-footer">
          Já tem uma conta?{" "}
          <Link to="/login" className="link-recuperar">
            Faça Login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default CadastroPage;