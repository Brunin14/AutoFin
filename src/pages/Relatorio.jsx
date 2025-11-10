import React, { useState, useEffect, useMemo, useRef } from 'react';
import Navbar from '../components/Navbar';
import './Relatorio.css';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { ptBR } from 'date-fns/locale';

// ======================================================================
// FUNÇÕES AUXILIARES DE MOEDA E DATA
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
const toISO_YYYY_MM_DD = (date) => {
  return date.toISOString().slice(0, 10);
};
const parseLocalYMD = (s) => {
  if (!s) return undefined;
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const formatDateForButton = (date) => {
    return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
};
// ======================================================================


// 1. Recebe 'showNotification'
function Relatorio({ onLogout, user, showNotification }) {
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState(''); // Erro do formulário

  // Estados de Configuração (Salário e Meta)
  const [salarioTipo, setSalarioTipo] = useState('inteiro');
  const [salarioInteiro, setSalarioInteiro] = useState(0);
  const [salarioDia15, setSalarioDia15] = useState(0);
  const [salarioDia30, setSalarioDia30] = useState(0);
  const [metaRecebimento, setMetaRecebimento] = useState(0);
  const [displaySalarioInteiro, setDisplaySalarioInteiro] = useState('');
  const [displaySalarioDia15, setDisplaySalarioDia15] = useState('');
  const [displaySalarioDia30, setDisplaySalarioDia30] = useState('');
  const [displayMeta, setDisplayMeta] = useState('');

  // Estados do Relatório de Gastos
  const [gastosPorDia, setGastosPorDia] = useState([]);
  const [loadingGastos, setLoadingGastos] = useState(true);
  
  // Estados para o filtro de data
  const [showDatePicker, setShowDatePicker] = useState(false);
  const datePickerRef = useRef(null);
  
  const [startDate, setStartDate] = useState(() => {
      const today = new Date();
      return toISO_YYYY_MM_DD(new Date(today.getFullYear(), today.getMonth(), 1));
  });
  const [endDate, setEndDate] = useState(() => {
      const today = new Date();
      return toISO_YYYY_MM_DD(new Date(today.getFullYear(), today.getMonth() + 1, 0));
  });
  
  const [selectedRange, setSelectedRange] = useState({
      from: parseLocalYMD(startDate),
      to: parseLocalYMD(endDate),
  });

  
  // 1. CARREGA AS CONFIGURAÇÕES (Salário/Meta)
  useEffect(() => {
    const carregarConfiguracoes = async () => {
        if (!user?._id) return;
        setLoading(true);
        try {
            const response = await fetch(`http://localhost:3001/user/${user._id}/config`);
            if (!response.ok) throw new Error("Falha ao carregar configurações.");
            
            const data = await response.json();
            
            setSalarioTipo(data.salarioTipo);
            setSalarioInteiro(data.salarioInteiro);
            setSalarioDia15(data.salarioDia15);
            setSalarioDia30(data.salarioDia30);
            setMetaRecebimento(data.metaRecebimento);
            
            setDisplaySalarioInteiro(data.salarioInteiro > 0 ? formatCurrencyForDisplay(data.salarioInteiro) : '');
            setDisplaySalarioDia15(data.salarioDia15 > 0 ? formatCurrencyForDisplay(data.salarioDia15) : '');
            setDisplaySalarioDia30(data.salarioDia30 > 0 ? formatCurrencyForDisplay(data.salarioDia30) : '');
            setDisplayMeta(data.metaRecebimento > 0 ? formatCurrencyForDisplay(data.metaRecebimento) : '');
            
        } catch (err) {
            console.error(err);
            setErro("Erro ao carregar suas configurações.");
        } finally {
            setLoading(false);
        }
    };
    carregarConfiguracoes();
  }, [user]);
  
  // 2. CARREGA O RELATÓRIO DE GASTOS (com filtro)
  useEffect(() => {
    const carregarGastos = async () => {
      if (!user?._id) return;
      
      setLoadingGastos(true);
      try {
        const urlParams = `?startDate=${startDate}&endDate=${endDate}`;
        
        const response = await fetch(`http://localhost:3001/gasto/relatorio-diario${urlParams}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-User-ID': user._id, 
            },
        });
        if (!response.ok) throw new Error("Falha ao carregar relatório de gastos.");
        
        const data = await response.json();
        setGastosPorDia(data);
        
      } catch (err) {
        // Não usamos showNotification aqui para não poluir
        setErro("Erro ao carregar seu histórico de gastos.");
      } finally {
        setLoadingGastos(false);
      }
    };
    carregarGastos();
  }, [user, startDate, endDate]);

  // Efeito para fechar o calendário ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
        if (datePickerRef.current && !datePickerRef.current.contains(event.target)) {
            setShowDatePicker(false);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
        document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [datePickerRef]);


  // 3. FUNÇÃO PARA SALVAR as configurações (usa 'showNotification')
  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErro(''); // Limpa erros de formulário
    
    if (!user?._id) {
         showNotification("Erro: ID do usuário não encontrado.", "error");
         setLoading(false);
         return;
    }
    const configPayload = {
        userId: user._id,
        salarioTipo,
        salarioInteiro: salarioInteiro,
        salarioDia15: salarioDia15,
        salarioDia30: salarioDia30,
        metaRecebimento: metaRecebimento
    };
    
    try {
        const response = await fetch(`http://localhost:3001/user/config`, {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(configPayload)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Erro do servidor");
        
        showNotification("Configurações salvas com sucesso!", "success");

    } catch (err) {
        showNotification(err.message || "Erro ao salvar configurações.", "error");
    } finally {
        setLoading(false);
    }
  };
  
  // 4. FUNÇÃO PARA DELETAR GASTO (usa 'showNotification')
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
            setLoadingGastos(true);
            setErro('');
            try {
                const response = await fetch(`http://localhost:3001/gasto/${gastoId}`, {
                    method: 'DELETE',
                    headers: { 'X-User-ID': user._id },
                });
                const data = await response.json();
                if (!response.ok || !data.success) {
                    throw new Error(data.message || "Falha ao deletar o gasto.");
                }

                showNotification("Gasto deletado com sucesso!", "success");

                // Remove o item da lista localmente
                setGastosPorDia(prevGrupos => {
                    const novosGrupos = prevGrupos.map(grupo => {
                        const gastoOriginal = grupo.gastos.find(g => g._id === gastoId);
                        if (!gastoOriginal) return grupo; 
                        const novosGastos = grupo.gastos.filter(g => g._id !== gastoId);
                        const novoTotalDia = grupo.totalDia - gastoOriginal.valor;
                        return { ...grupo, gastos: novosGastos, totalDia: novoTotalDia };
                    });
                    return novosGrupos.filter(grupo => grupo.gastos.length > 0);
                });

            } catch (err) {
                showNotification(err.message, "error");
            } finally {
                setLoadingGastos(false);
            }
        }
      );
  };

  // Funções para controlar o calendário
  const handleApplyDateRange = () => {
      if (selectedRange.from && selectedRange.to) {
          setStartDate(toISO_YYYY_MM_DD(selectedRange.from));
          setEndDate(toISO_YYYY_MM_DD(selectedRange.to));
          setShowDatePicker(false); // Fecha o popup
      } else {
          showNotification("Por favor, selecione um período de início e fim.", "error");
      }
  };


  return (
    <>
      <Navbar onLogout={onLogout} />
      
      <div className="relatorio-container">
        <h1 className="relatorio-title">Receita e Renda Extra</h1>

        {erro && <div className="erro-msg">{erro}</div>}

        {/* === 1. CARDS DE CONFIGURAÇÃO (TOPO) === */}
        <form className="config-wrapper" onSubmit={handleSaveConfig}>
          
          {/* --- Card Salário --- */}
          <div className="card config-card">
            <h2>Salário Mensal</h2>
            
            <div className="salario-tipo-group">
              <label className="salario-tipo-option">
                <input 
                  type="radio" 
                  name="salarioTipo" 
                  value="inteiro"
                  checked={salarioTipo === 'inteiro'}
                  onChange={(e) => setSalarioTipo(e.target.value)}
                />
                <span>Salário Inteiro</span>
              </label>
              <label className="salario-tipo-option">
                <input 
                  type="radio" 
                  name="salarioTipo" 
                  value="dividido"
                  checked={salarioTipo === 'dividido'}
                  onChange={(e) => setSalarioTipo(e.target.value)}
                />
                <span>Salário Dividido</span>
              </label>
            </div>

            {/* Inputs Condicionais (Corrigido) */}
            {salarioTipo === 'inteiro' && (
              <div className="form-group">
                <label htmlFor="salarioInteiro">Valor Total (R$)</label>
                <input
                  id="salarioInteiro"
                  type="text"
                  placeholder="R$ 3.000,00"
                  value={displaySalarioInteiro}
                  onChange={(e) => {
                      const { valorPuro, valorExibicao } = getCurrencyValues(e.target.value);
                      setSalarioInteiro(valorPuro);
                      setDisplaySalarioInteiro(valorExibicao);
                  }}
                />
              </div>
            )}
            
            {salarioTipo === 'dividido' && (
              <div className="salario-dividido-inputs">
                <div className="form-group">
                  <label htmlFor="salarioDia15">Pagamento Dia 15 (R$)</label>
                  <input
                    id="salarioDia15"
                    type="text"
                    placeholder="R$ 1.500,00"
                    value={displaySalarioDia15}
                    onChange={(e) => {
                      const { valorPuro, valorExibicao } = getCurrencyValues(e.target.value);
                      setSalarioDia15(valorPuro);
                      setDisplaySalarioDia15(valorExibicao);
                    }}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="salarioDia30">Pagamento Dia 30 (R$)</label>
                  <input
                    id="salarioDia30"
                    type="text"
                    placeholder="R$ 1.500,00"
                    value={displaySalarioDia30}
                    onChange={(e) => {
                      const { valorPuro, valorExibicao } = getCurrencyValues(e.target.value);
                      setSalarioDia30(valorPuro);
                      setDisplaySalarioDia30(valorExibicao);
                    }}
                  />
                </div>
              </div>
            )}
          </div>
          
          {/* --- Card Meta --- */}
          <div className="card config-card">
            <h2>Renda Extra (Outros Recebimentos)</h2>
             <div className="form-group">
                <label htmlFor="meta">Valor da Renda Extra(R$)</label>
                <input
                  id="meta"
                  type="text"
                  placeholder="R$ 500,00"
                  value={displayMeta}
                  onChange={(e) => {
                      const { valorPuro, valorExibicao } = getCurrencyValues(e.target.value);
                      setMetaRecebimento(valorPuro);
                      setDisplayMeta(valorExibicao);
                  }}
                />
              </div>
          </div>
          
          {/* --- Botão Salvar (Centralizado) --- */}
          <div className="save-button-wrapper">
             <button type="submit" className="btn-save" disabled={loading}>
                {loading ? "Salvando..." : "Salvar Configurações"}
            </button>
          </div>
        </form>

        {/* === 2. RELATÓRIO DE GASTOS (EMBAIXO) === */}
        <div className="card report-section">
          <h2>Gastos por Dia</h2>
          
          {/* Botão do Calendário */}
          <div style={{ position: 'relative' }} ref={datePickerRef}>
            <button
                className="date-picker-button"
                onClick={() => setShowDatePicker(s => !s)}
            >
                📅 Período: 
                <span>
                    {formatDateForButton(parseLocalYMD(startDate))} — {formatDateForButton(parseLocalYMD(endDate))}
                </span>
            </button>
            
            {showDatePicker && (
                <div className="date-picker-popover">
                    <DayPicker
                        mode="range"
                        numberOfMonths={2}
                        selected={selectedRange}
                        onSelect={setSelectedRange}
                        defaultMonth={selectedRange.from || parseLocalYMD(startDate)}
                        locale={ptBR} // Usa o idioma importado
                    />
                    <div className="date-picker-actions">
                        <button 
                            className="btn-clear-date"
                            onClick={() => setSelectedRange({from: undefined, to: undefined})}
                        >
                            Limpar
                        </button>
                        <button 
                            className="btn-apply-date"
                            onClick={handleApplyDateRange}
                            disabled={!selectedRange.from || !selectedRange.to}
                        >
                            Aplicar
                        </button>
                    </div>
                </div>
            )}
          </div>
          
          
          {loadingGastos ? (
            <p className="loading-data">Carregando histórico...</p>
          ) : gastosPorDia.length === 0 ? (
            <p className="no-data">Nenhum gasto registrado neste período.</p>
          ) : (
            <div className="report-list">
              {gastosPorDia.map(grupo => (
                <div key={grupo.data} className="dia-grupo">
                  
                  <div className="dia-header">
                    <span className="dia-data">
                      {new Date(grupo.data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', timeZone: 'UTC' })}
                    </span>
                    <span className="dia-total">
                      Total: {formatCurrencyForDisplay(grupo.totalDia)}
                    </span>
                  </div>
                  
                  <ul className="gasto-lista">
                    {grupo.gastos.map(gasto => (
                      <li key={gasto._id} className="gasto-item">
                        <span className="gasto-desc">
                            <strong className="gasto-cat-tag">[{gasto.categoria}]</strong>
                            {gasto.descricao}
                        </span>
                        
                        <div className="gasto-item-right">
                          <span className="gasto-valor">
                              {formatCurrencyForDisplay(gasto.valor)}
                          </span>
                          
                          <button
                            className="btn-delete-gasto-relatorio"
                            title="Excluir gasto"
                            onClick={() => handleDeleteExpense(gasto._id)}
                          >
                            &times;
                          </button>
                        </div>
                        
                      </li>
                    ))}
                  </ul>
                  
                </div>
              ))}
            </div>
          )}
        </div>
        
      </div>
    </>
  );
}

export default Relatorio;