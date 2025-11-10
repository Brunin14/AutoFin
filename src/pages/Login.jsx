import { useState } from "react";
import "./Login.css"; // Usa o mesmo CSS da página de cadastro
import { Link } from "react-router-dom"; // Importa o Link para o rodapé

function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false); // Adiciona estado de loading

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro("");
    setLoading(true); // Ativa o loading

    try {
      const response = await fetch("http://localhost:3001/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });

      const data = await response.json();

      if (response.ok && data.success) { 
        // Chama a função handleLogin do App.jsx
        onLogin(data.user); 
      } else {
        // Se a requisição falhar ou o backend retornar success: false
        setErro(data.message || "Email ou senha incorretos.");
      }
    } catch {
      setErro("Erro ao conectar com o servidor.");
    } finally {
      setLoading(false); // Desativa o loading
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        
        {/* Logo/Ícone do App */}
        <div className="app-logo">
          <span className="logo-text">Controle.App</span>
        </div>
        
        <h1 className="login-title">Acesso à sua Organização Financeira</h1>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email" 
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading} // Desabilita o input durante o loading
            />
          </div>

          <div className="form-group">
            <label htmlFor="senha">Senha</label>
            <input
              id="senha" 
              type="password"
              placeholder="••••••••"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              disabled={loading} // Desabilita o input durante o loading
            />
          </div>

          {erro && <div className="erro-msg">{erro}</div>}

          <button 
            type="submit" 
            className="btn-login" 
            disabled={loading} // Desabilita o botão durante o loading
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        {/* Rodapé atualizado com o link para Cadastro */}
        <p className="login-footer">
          Não tem uma conta?{" "}
          <Link to="/cadastro" className="link-recuperar">
            Crie uma agora
          </Link>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;