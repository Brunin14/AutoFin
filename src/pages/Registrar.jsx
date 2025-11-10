import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar'; 
import './Registrar.css'; 

// ======================================================================
// FUNÇÕES AUXILIARES DE MOEDA (Sem mudanças)
// ======================================================================
const formatCurrencyForDisplay = (value) => {
    const numericValue = parseFloat(value); 
    if (isNaN(numericValue)) return 'R$ 0,00';
    return numericValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};
const getCurrencyValues = (value) => {
    const numericString = value.replace(/\D/g, '');
    if (numericString === '' || numericString === '0') {
      return { valorPuro: 0, valorExibicao: '' };
    }
    const numericValue = parseFloat(numericString) / 100;
    const formattedDisplay = numericValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    return { valorPuro: numericValue, valorExibicao: formattedDisplay };
};
// ======================================================================


// 1. Recebe 'showNotification' como prop
function Registrar({ onLogout, user, showNotification }) { 
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState(''); // Erro do formulário
  const [transactionType, setTransactionType] = useState('expense'); // 'expense' ou 'income'
  
  const [categorias, setCategorias] = useState([]);
  
  const [gastosRegistrados, setGastosRegistrados] = useState([]);
  
  const [gastosFiltrados, setGastosFiltrados] = useState([]);
  const [loadingFiltro, setLoadingFiltro] = useState(false); 
  
  const [novoGasto, setNovoGasto] = useState({
    categoria: '', 
    descricao: '', 
    valorExibicao: '',
    valorPuro: 0, 
  });
  
  const [novaCategoriaInput, setNovaCategoriaInput] = useState('');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  
  // Variáveis dinâmicas para a UI
  const isExpense = transactionType === 'expense';
  const pageTitle = isExpense ? "Registrar Novo Gasto" : "Registrar Nova Receita";
  const buttonText = isExpense ? "Registrar Despesa" : "Registrar Receita";
  const descPlaceholder = isExpense ? "Ex: Livro de Python" : "Ex: Freelance Website";

  // UseEffect para BUSCAR as categorias do backend
  useEffect(() => {
    const fetchCategories = async () => {
        if (!user?._id) return;
        
        try {
            const response = await fetch("http://localhost:3001/user/categories", {
                headers: { 'X-User-ID': user._id }
            });
            if (!response.ok) throw new Error("Falha ao carregar categorias.");
            
            const data = await response.json();
            setCategorias(data); // Preenche o estado com as categorias do usuário
            
            // Se o usuário tiver categorias, seleciona a primeira por padrão
            if (data.length > 0) {
                setNovoGasto(prev => ({...prev, categoria: data[0]}));
            }

        } catch (err) {
            // Usa o state 'erro' do formulário em vez de 'showNotification'
            // para erros de carregamento
            setErro(err.message);
        }
    };
    
    fetchCategories();
  }, [user]); // Roda sempre que o 'user' for carregado


  // Função para ADICIONAR uma nova categoria (usa 'showNotification')
  const handleAddCategory = async (e) => {
    e.preventDefault();
    const newCategory = novaCategoriaInput.trim();
    if (!newCategory) return;
    
    // 1. Checagem local (rápida)
    if (categorias.map(c => c.toLowerCase()).includes(newCategory.toLowerCase())) {
      showNotification("Esta categoria já existe.", "error");
      return;
    }
    
    // 2. Atualização Otimista
    const categoriasAnteriores = categorias; 
    setCategorias(prevCategorias => [...prevCategorias, newCategory]);
    setNovoGasto(prevGasto => ({...prevGasto, categoria: newCategory}));
    setNovaCategoriaInput('');
    setShowCategoryModal(false);

    // 3. Sincroniza com o Backend
    try {
        const response = await fetch("http://localhost:3001/user/categories", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-User-ID': user._id },
            body: JSON.stringify({ newCategory: newCategory })
        });
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || "Erro ao salvar no servidor.");
        }
        const data = await response.json();
        setCategorias(data.categories);
        // Sucesso
        showNotification("Categoria salva!", "success");

    } catch (err) {
        // Erro
        showNotification(`Erro ao salvar: ${err.message}`, "error");
        setCategorias(categoriasAnteriores);
        setNovoGasto(prev => ({...prev, categoria: categoriasAnteriores[0] || ''}));
    }
  };

  // Função para manipular o input do valor (Corrigida)
  const handleValueChange = (e) => {
    const { valorPuro, valorExibicao } = getCurrencyValues(e.target.value);
    setNovoGasto({
      ...novoGasto,
      valorPuro: valorPuro,
      valorExibicao: valorExibicao,
    });
  };


  // Função de REGISTRO (Gasto ou Receita) (usa 'showNotification')
  const handleAddTransaction = async (e) => {
    e.preventDefault();
    setErro('');
    
    if ((isExpense && !novoGasto.categoria) || !novoGasto.descricao.trim() || novoGasto.valorPuro <= 0) {
      setErro("Por favor, preencha todos os campos e um valor válido.");
      return;
    }
    if (!user || !user._id) {
         setErro("Erro: ID do usuário não encontrado.");
         return;
    }
    
    const payload = {
      userId: user._id, 
      categoria: isExpense ? novoGasto.categoria : 'Receita',
      descricao: novoGasto.descricao.trim(),
      valor: novoGasto.valorPuro,
      data: new Date().toISOString().slice(0, 10), 
      tipo: transactionType, 
    };

    setLoading(true);
    try {
      const response = await fetch("http://localhost:3001/gasto", { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (response.ok && data.success) { 
        
        // Sucesso
        const successMessage = isExpense ? "Gasto registrado!" : "Receita registrada!";
        showNotification(successMessage, "success");
        
        if (isExpense) {
            const novoGastoRegistrado = { ...payload, id: data.gasto._id };
            setGastosRegistrados([...gastosRegistrados, novoGastoRegistrado]);
            if (novoGasto.categoria) {
                fetchGastosPorCategoria(novoGasto.categoria, user._id, isExpense); 
            }
        }
        // Limpa o formulário
        setNovoGasto({
          ...novoGasto, 
          categoria: isExpense ? novoGasto.categoria : '',
          descricao: '', 
          valorExibicao: '', 
          valorPuro: 0,
        });
      } else {
        setErro(data.message || "Erro ao registrar.");
      }
    } catch (error) {
      setErro("Erro de conexão com o servidor.");
    } finally {
        setLoading(false);
    }
  };
  
  
  // Função auxiliar para o useEffect
  const fetchGastosPorCategoria = async (categoriaSelecionada, userId, isExpense) => {
      if (!categoriaSelecionada || !userId || !isExpense) {
          setGastosFiltrados([]);
          return;
      }
      
      setLoadingFiltro(true);
      setErro('');
      
      const url = `http://localhost:3001/gasto/filtrar?categoria=${encodeURIComponent(categoriaSelecionada)}`;
      
      try {
          const response = await fetch(url, {
              method: 'GET',
              headers: { 'X-User-ID': userId },
          });

          if (!response.ok) throw new Error('Falha ao carregar o histórico.');
          
          const data = await response.json();
          setGastosFiltrados(data);
          
      } catch (err) {
          // Não usamos showNotification aqui para não poluir a tela
          setErro("Erro ao carregar o histórico da categoria.");
          setGastosFiltrados([]); 
      } finally {
          setLoadingFiltro(false);
      }
  };
  
  // Roda o fetch QUANDO A CATEGORIA MUDA
  useEffect(() => {
      fetchGastosPorCategoria(novoGasto.categoria, user?._id, isExpense);
  }, [novoGasto.categoria, user, isExpense]);


  // Função de DELETAR GASTO (usa 'showNotification' para confirmar)
   const handleDeleteExpense = async (gastoId) => {
      if (!user?._id || !gastoId) {
          showNotification("ID de usuário ou gasto inválido.", "error");
          return;
      }
      
      // 1. Mostra a confirmação
      showNotification(
        "Tem certeza que deseja excluir este gasto?",
        "confirm",
        async () => { // 2. O que fazer se o usuário clicar "Sim"
            setLoadingFiltro(true);
            setErro('');
            try {
                const response = await fetch(`http://localhost:3001/gasto/${gastoId}`, {
                    method: 'DELETE',
                    headers: { 'X-User-ID': user._id }
                });
                const data = await response.json();
                if (response.ok && data.success) {
                    // 3. Sucesso
                    showNotification("Gasto deletado com sucesso!", "success");
                    setGastosFiltrados(prevGastos => prevGastos.filter(gasto => gasto._id !== gastoId));
                    setGastosRegistrados(prevGastos => prevGastos.filter(gasto => gasto._id !== gastoId));
                } else {
                    throw new Error(data.message || "Falha ao deletar.");
                }
            } catch (err) {
                // 4. Erro
                showNotification(err.message, "error");
            } finally {
                setLoadingFiltro(false);
            }
        }
      );
  };
  // ======================================================================


  return (
    <>
      <Navbar onLogout={onLogout} />
      
      <div className="register-container">
        
        <h1 className="register-title">{pageTitle}</h1>




        <div className="form-wrapper">
          
          {/* Seção de Categoria (Condicional) */}
          {isExpense && (
            <div className="category-section card">
              <h2>1. Selecione a Categoria (Nicho)</h2>
              <div className="category-select-group">
                <select
                  className="category-select"
                  value={novoGasto.categoria}
                  onChange={(e) => setNovoGasto({...novoGasto, categoria: e.target.value})}
                >
                  <option value="">Selecione...</option>
                  {categorias.map(cat => (
                    <option key={cat} value={cat}>{cat}</option> 
                  ))}
                </select>
                <button 
                  type="button" 
                  className="btn-add-category"
                  onClick={() => setShowCategoryModal(true)}
                >
                  + Nova Categoria
                </button>
              </div>
              {novoGasto.categoria && (
                <p className="selected-category-display">
                  Categoria Atual: <strong>{novoGasto.categoria}</strong>
                </p>
              )}
            </div>
          )}

          {/* Formulário de Gasto / Receita */}
          <form onSubmit={handleAddTransaction} className="expense-form card">
            <h2>{isExpense ? "2. Detalhes do Gasto" : "1. Detalhes da Receita"}</h2>
            
            <div className="form-group">
              <label htmlFor="descricao">Descrição</label>
              <input
                id="descricao"
                type="text"
                value={novoGasto.descricao}
                onChange={(e) => setNovoGasto({...novoGasto, descricao: e.target.value})}
                placeholder={descPlaceholder}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="valor">Valor (R$)</label>
              <input
                id="valor"
                type="text"
                value={novoGasto.valorExibicao} 
                onChange={handleValueChange} 
                placeholder="R$ 100,00"
                required
              />
            </div>
            
            {erro && <div className="erro-msg">{erro}</div>}

            <button 
                type="submit" 
                className="btn-register" 
                disabled={ (isExpense && !novoGasto.categoria) || novoGasto.valorPuro <= 0 || loading}
            >
              {loading ? "Salvando..." : buttonText}
            </button>
          </form>
          
          {/* Histórico Semanal (Condicional) */}
          {isExpense && (
            <div className="recent-expenses-section card">
              <h2>3. Histórico Semanal ({novoGasto.categoria || 'Selecione Categoria'})</h2>
              
              {!novoGasto.categoria ? (
                  <p className="no-data">Selecione uma categoria para ver o histórico.</p>
              ) : loadingFiltro ? (
                  <p className="loading-data">Carregando...</p>
              ) : (
                  gastosFiltrados.length > 0 ? (
                      <ul className="expense-list-preview">
                          {gastosFiltrados.map(gasto => (
                              <li key={gasto._id} className="expense-preview-item"> 
                                  <span className="preview-desc">
                                      <strong className="preview-cat-tag">{gasto.categoria}</strong>
                                      - {gasto.descricao}
                                  </span>
                                  <div className="preview-details-right">
                                      <span className="preview-value negative-value">
                                          {formatCurrencyForDisplay(gasto.valor)}
                                      </span>
                                      <span className="preview-date">
                                          ({new Date(gasto.data).toLocaleDateString('pt-BR', {timeZone: 'UTC'})})
                                      </span>
                                      <button 
                                          className="btn-delete-gasto"
                                          title="Excluir gasto"
                                          onClick={() => handleDeleteExpense(gasto._id)}
                                      >
                                          &times;
                                      </button>
                                  </div>
                              </li>
                          ))}
                      </ul>
                  ) : (
                      <p className="no-data">Nenhum gasto encontrado nos últimos 7 dias.</p>
                  )
              )}
            </div>
          )}

          {/* Espaço reservado para quando "Receita" está selecionada */}
          {!isExpense && (
            <div className="card" style={{textAlign: 'center', padding: '40px', gridColumn: 'span 1'}}>
                <h2 style={{color: 'var(--primary-color)'}}>Registrando Receita</h2>
                <p>Receitas registradas (como "Freelance") serão somadas ao seu "Saldo Restante" na página Dashboard (Home).</p>
            </div>
          )}

        </div>
        
        {/* MODAL PARA NOVA CATEGORIA */}
        {showCategoryModal && (
           <div className="modal-backdrop">
            <div className="modal-content">
              <h3>Criar Nova Categoria</h3>
              <form onSubmit={handleAddCategory}>
                <input
                  type="text"
                  placeholder="Ex: Saúde, Viagens, Investimentos"
                  value={novaCategoriaInput}
                  onChange={(e) => setNovaCategoriaInput(e.target.value)} 
                  required
                />
                <div className="modal-actions">
                  <button type="submit" className="btn-modal-primary" disabled={loading}>
                    {loading ? "Salvando..." : "Salvar"}
                  </button>
                  <button 
                    type="button" 
                    className="btn-modal-secondary" 
                    onClick={() => {
                        setShowCategoryModal(false);
                        setNovaCategoriaInput('');
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}



export default Registrar;