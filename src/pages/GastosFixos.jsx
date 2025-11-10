import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import './GastosFixos.css'; 

// ======================================================================
// FUNÇÕES AUXILIARES DE MOEDA
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

// 1. Recebe 'showNotification'
function GastosFixos({ onLogout, user, showNotification }) {
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState(''); // Erro do formulário
  
  const [gastosFixos, setGastosFixos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  
  const [cardForm, setCardForm] = useState({
      valorPuro: 0,
      valorExibicao: '',
      dataFim: '',
      categoria: 'Contas', 
  });
  const [recurringForm, setRecurringForm] = useState({
      descricao: '',
      valorPuro: 0,
      valorExibicao: '',
      diaVencimento: 10,
      categoria: 'Contas',
  });

  // Busca Gastos Fixos E Categorias
  useEffect(() => {
    if (!user?._id) return;
    
    const fetchData = async () => {
        setLoading(true);
        try {
            const [gastosResponse, catResponse] = await Promise.all([
                fetch('http://localhost:3001/gasto-fixo', { headers: { 'X-User-ID': user._id } }),
                fetch('http://localhost:3001/user/categories', { headers: { 'X-User-ID': user._id } })
            ]);

            if (!gastosResponse.ok) throw new Error("Falha ao buscar gastos fixos.");
            if (!catResponse.ok) throw new Error("Falha ao buscar categorias.");

            const gastosData = await gastosResponse.json();
            const catData = await catResponse.json();
            
            setGastosFixos(gastosData);
            setCategorias(catData); 

            if (catData.length > 0) {
                setCardForm(prev => ({...prev, categoria: catData[0]}));
                setRecurringForm(prev => ({...prev, categoria: catData[0]}));
            }

        } catch (err) {
            setErro(err.message);
        } finally {
            setLoading(false);
        }
    };
    
    fetchData();
  }, [user]);

  // handleSaveCard (usa 'showNotification' via saveGastoFixo)
  const handleSaveCard = async (e) => {
    e.preventDefault();
    setErro('');
    if (cardForm.valorPuro <= 0 || !cardForm.dataFim) {
        setErro("Preencha o valor e a data final do cartão.");
        return;
    }
    const payload = {
        descricao: "Cartão de Crédito",
        valor: cardForm.valorPuro,
        categoria: cardForm.categoria,
        tipo: 'parcelado',
        dataFim: cardForm.dataFim,
    };
    await saveGastoFixo(payload); 
    setCardForm({ valorPuro: 0, valorExibicao: '', dataFim: '', categoria: cardForm.categoria });
  };

  // handleSaveRecurring (usa 'showNotification' via saveGastoFixo)
  const handleSaveRecurring = async (e) => {
    e.preventDefault();
    setErro('');
    if (recurringForm.valorPuro <= 0 || !recurringForm.descricao.trim()) {
        setErro("Preencha a descrição e o valor.");
        return;
    }
    const payload = {
        descricao: recurringForm.descricao.trim(),
        valor: recurringForm.valorPuro,
        categoria: recurringForm.categoria,
        tipo: 'recorrente',
        diaVencimento: recurringForm.diaVencimento,
    };
    await saveGastoFixo(payload);
    setRecurringForm({ descricao: '', valorPuro: 0, valorExibicao: '', diaVencimento: 10, categoria: recurringForm.categoria });
  };
  
  // 4. saveGastoFixo (usa 'showNotification')
  const saveGastoFixo = async (payload) => {
      setLoading(true);
      try {
          const response = await fetch('http://localhost:3001/gasto-fixo', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'X-User-ID': user._id },
              body: JSON.stringify(payload),
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.message || "Erro ao salvar.");
          
          setGastosFixos([...gastosFixos, data.gastoFixo]);
          showNotification("Gasto Fixo salvo com sucesso!", "success");

      } catch (err) {
          showNotification(err.message, "error");
      } finally {
          setLoading(false);
      }
  };

  // 6. handleDelete (usa 'showNotification')
  const handleDelete = async (gastoFixoId) => {
    
    showNotification(
        "Tem certeza que quer deletar este gasto fixo?",
        "confirm",
        async () => { // O que fazer se o usuário clicar "Sim"
            setLoading(true);
            setErro('');
            try {
                const response = await fetch(`http://localhost:3001/gasto-fixo/${gastoFixoId}`, {
                    method: 'DELETE',
                    headers: { 'X-User-ID': user._id }
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.message || "Erro ao deletar.");

                setGastosFixos(gastosFixos.filter(g => g._id !== gastoFixoId));
                showNotification("Deletado com sucesso.", "success");

            } catch (err) {
                showNotification(err.message, "error");
            } finally {
                setLoading(false);
            }
        }
    );
  };

  // (Renderização JSX - Sem mudanças)
  return (
    <>
      <Navbar onLogout={onLogout} />
      <div className="gastos-fixos-container">
        
        <h1 className="gastos-fixos-title">Configurar Gastos Fixos</h1>
        {erro && <div className="erro-msg">{erro}</div>}

        <div className="forms-wrapper">
          {/* Coluna 1: Cartão de Crédito */}
          <form className="card form-card" onSubmit={handleSaveCard}>
            <h2>Cartão de Crédito</h2>
            <p className="form-description">
              Configure o valor fixo (parcela ou fatura) que você paga e quando termina.
            </p>
            
            <div className="form-group">
              <label htmlFor="card-valor">Valor Mensal (R$)</label>
              <input
                id="card-valor"
                type="text"
                placeholder="R$ 150,00"
                value={cardForm.valorExibicao}
                onChange={(e) => {
                    const { valorPuro, valorExibicao } = getCurrencyValues(e.target.value);
                    setCardForm({ ...cardForm, valorPuro, valorExibicao });
                }}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="card-datafim">Dia que paro de pagar (Data Final)</label>
              <input
                id="card-datafim"
                type="date"
                value={cardForm.dataFim}
                onChange={(e) => setCardForm({...cardForm, dataFim: e.target.value})}
              />
            </div>
            
             <div className="form-group">
              <label htmlFor="card-cat">Categoria</label>
              <select
                id="card-cat"
                value={cardForm.categoria}
                onChange={(e) => setCardForm({...cardForm, categoria: e.target.value})}
              >
                {/* Lista de categorias dinâmica */}
                {categorias.map(cat => (<option key={cat} value={cat}>{cat}</option>))}
              </select>
            </div>
            
            <button type="submit" className="btn-save" disabled={loading}>
              {loading ? "Salvando..." : "Salvar Cartão"}
            </button>
          </form>
          
          {/* Coluna 2: Gastos Recorrentes */}
          <form className="card form-card" onSubmit={handleSaveRecurring}>
            <h2>Gastos Recorrentes</h2>
            <p className="form-description">
              Adicione gastos que se repetem todo mês (ex: Faculdade, Aluguel).
            </p>
            
            <div className="form-group">
              <label htmlFor="rec-desc">Descrição</label>
              <input
                id="rec-desc"
                type="text"
                placeholder="Ex: Faculdade"
                value={recurringForm.descricao}
                onChange={(e) => setRecurringForm({...recurringForm, descricao: e.target.value})}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="rec-valor">Valor Mensal (R$)</label>
              <input
                id="rec-valor"
                type="text"
                placeholder="R$ 300,00"
                value={recurringForm.valorExibicao}
                onChange={(e) => {
                    const { valorPuro, valorExibicao } = getCurrencyValues(e.target.value);
                    setRecurringForm({ ...recurringForm, valorPuro, valorExibicao });
                }}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="rec-dia">Dia do Pagamento (1-31)</label>
              <input
                id="rec-dia"
                type="number"
                min="1"
                max="31"
                value={recurringForm.diaVencimento}
                onChange={(e) => setRecurringForm({...recurringForm, diaVencimento: e.target.value})}
              />
            </div>
            
             <div className="form-group">
              <label htmlFor="rec-cat">Categoria</label>
              <select
                id="rec-cat"
                value={recurringForm.categoria}
                onChange={(e) => setRecurringForm({...recurringForm, categoria: e.target.value})}
              >
                {/* Lista de categorias dinâmica */}
                {categorias.map(cat => (<option key={cat} value={cat}>{cat}</option>))}
              </select>
            </div>
            
            <button type="submit" className="btn-save" disabled={loading}>
              {loading ? "Salvando..." : "Adicionar Gasto"}
            </button>
          </form>
        </div>
        
        {/* Lista de Gastos Fixos Salvos */}
        <div className="card list-section">
            <h2>Meus Lançamentos Fixos</h2>
            {loading && gastosFixos.length === 0 && <p>Carregando...</p>}
            {!loading && gastosFixos.length === 0 && <p className="no-data">Nenhum gasto fixo configurado ainda.</p>}
            
            <ul className="gastos-fixos-list">
                {gastosFixos.map(gasto => (
                    <li key={gasto._id} className="gasto-fixo-item">
                        <div className="item-info">
                            <span className="item-desc">{gasto.descricao}</span>
                            <span className="item-valor">{formatCurrencyForDisplay(gasto.valor)}</span>
                            <span className="item-cat-tag">[{gasto.categoria}]</span>
                        </div>
                        <div className="item-details">
                            <span className="item-vencimento">
                                {gasto.tipo === 'recorrente' 
                                    ? `Todo dia ${gasto.diaVencimento}`
                                    : `Até ${new Date(gasto.dataFim).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}`
                                }
                            </span>
                            <button className="btn-delete-fixo" onClick={() => handleDelete(gasto._id)}>
                                &times;
                            </button>
                        </div>
                    </li>
                ))}
            </ul>
        </div>

      </div>
    </>
  );
}

export default GastosFixos;