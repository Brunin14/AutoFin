import React, { useState, useEffect, useMemo, useRef } from 'react';
import Navbar from '../components/Navbar';
import './Relatorio.css';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { ptBR } from 'date-fns/locale';

// ======================================================================
// 🎯 URL Centralizada do Backend
// ======================================================================
const API_URL = "https://autofin-backend.onrender.com";
// ======================================================================

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
  if (!date) return null;
  return date.toISOString().slice(0, 10);
};
const parseLocalYMD = (s) => {
  if (!s) return undefined;
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const formatDateForButton = (date) => {
    if (!date) return "Selecione...";
    return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
};
// ======================================================================


function Relatorio({ onLogout, user, showNotification }) {
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState(''); // Erro do formulário

  // --- Estados de Configuração (Salário) ---
  const [salarioTipo, setSalarioTipo] = useState('inteiro');
  const [salarioInteiro, setSalarioInteiro] = useState(0);
  const [salarioDia15, setSalarioDia15] = useState(0);
  const [salarioDia30, setSalarioDia30] = useState(0);
  const [displaySalarioInteiro, setDisplaySalarioInteiro] = useState('');
  const [displaySalarioDia15, setDisplaySalarioDia15] = useState('');
  const [displaySalarioDia30, setDisplaySalarioDia30] = useState('');

  // --- Estados do Relatório de Gastos ---
  const [gastosPorDia, setGastosPorDia] = useState([]);
  const [loadingGastos, setLoadingGastos] = useState(true);
  
  // 🎯 NOVOS ESTADOS: Rendas Fixas
  const [rendasFixas, setRendasFixas] = useState([]);
  const [loadingRendas, setLoadingRendas] = useState(true);
  const [novaRendaForm, setNovaRendaForm] = useState({
      nome: '',
      valorPuro: 0,
      valorExibicao: '',
      diaRecebimento: 1, // Padrão dia 1
  });

  // --- Estados do Filtro de Data ---
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

  
  // 1. CARREGA AS CONFIGURAÇÕES (Salário e Rendas Fixas)
  useEffect(() => {
    const carregarConfiguracoes = async () => {
        if (!user?._id) return;
        setLoading(true);
        setLoadingRendas(true);
        console.log("Debug: Buscando configurações (Salário e Rendas)...");
        try {
            const [salarioResponse, rendasResponse] = await Promise.all([
                fetch(`${API_URL}/user/${user._id}/config`, { headers: { 'X-User-ID': user._id } }),
                fetch(`${API_URL}/renda-fixa`, { headers: { 'X-User-ID': user._id } })
            ]);

            if (!salarioResponse.ok) throw new Error("Falha ao carregar configurações de salário.");
            if (!rendasResponse.ok) throw new Error("Falha ao carregar rendas fixas.");

            const salarioData = await salarioResponse.json();
            const rendasData = await rendasResponse.json();
            
            console.log("Debug: Salários recebidos:", salarioData);
            console.log("Debug: Rendas recebidas:", rendasData);

            // Popula Salário
            setSalarioTipo(salarioData.salarioTipo);
            setSalarioInteiro(salarioData.salarioInteiro);
            setSalarioDia15(salarioData.salarioDia15);
            setSalarioDia30(salarioData.salarioDia30);
            
            setDisplaySalarioInteiro(salarioData.salarioInteiro > 0 ? formatCurrencyForDisplay(salarioData.salarioInteiro) : '');
            setDisplaySalarioDia15(salarioData.salarioDia15 > 0 ? formatCurrencyForDisplay(salarioData.salarioDia15) : '');
            setDisplaySalarioDia30(salarioData.salarioDia30 > 0 ? formatCurrencyForDisplay(salarioData.salarioDia30) : '');
            
            // Popula Rendas Fixas
            setRendasFixas(rendasData);

        } catch (err) {
            console.error("Debug Erro [carregarConfiguracoes]:", err);
            setErro("Erro ao carregar suas configurações: " + err.message);
        } finally {
            setLoading(false);
            setLoadingRendas(false);
        }
    };
    carregarConfiguracoes();
  }, [user]);
  
  // 2. CARREGA O RELATÓRIO DE GASTOS (com filtro)
  useEffect(() => {
    const carregarGastos = async () => {
      if (!user?._id) return;
      setLoadingGastos(true);
      console.log(`Debug: Buscando gastos de ${startDate} a ${endDate}`);
      try {
        const urlParams = `?startDate=${startDate}&endDate=${endDate}`;
        const response = await fetch(`${API_URL}/gasto/relatorio-diario${urlParams}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json', 'X-User-ID': user._id },
        });
        if (!response.ok) throw new Error("Falha ao carregar relatório de gastos.");
        const data = await response.json();
        console.log("Debug: Gastos diários recebidos:", data);
        setGastosPorDia(data);
      } catch (err) {
        console.error("Debug Erro [carregarGastos]:", err);
        setErro("Erro ao carregar seu histórico de gastos.");
      } finally {
        setLoadingGastos(false);
      }
    };
    carregarGastos();
  }, [user, startDate, endDate]);

  // Efeito para fechar o calendário
  useEffect(() => {
    const handleClickOutside = (event) => {
        if (datePickerRef.current && !datePickerRef.current.contains(event.target)) {
            setShowDatePicker(false);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [datePickerRef]);


  // 3. SALVAR configurações de SALÁRIO
  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErro(''); 
    
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
    };
    
    console.log("Debug: Salvando Salário...", configPayload);
    try {
        const response = await fetch(`${API_URL}/user/config`, {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(configPayload)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Erro do servidor");
        
        console.log("Debug: Salário salvo com sucesso.");
        showNotification("Salário salvo com sucesso!", "success");
    } catch (err) {
        console.error("Debug Erro [handleSaveConfig]:", err);
        showNotification(err.message || "Erro ao salvar salário.", "error");
    } finally {
        setLoading(false);
    }
  };

  // 4. 🎯 NOVA FUNÇÃO: SALVAR a nova RENDA FIXA
  const handleSaveRendaFixa = async (e) => {
      e.preventDefault();
      setErro('');
      if (novaRendaForm.valorPuro <= 0 || !novaRendaForm.nome.trim()) {
          setErro("Preencha o nome e o valor da renda.");
          return;
      }

      const payload = {
          nome: novaRendaForm.nome.trim(),
          valor: novaRendaForm.valorPuro,
          diaRecebimento: novaRendaForm.diaRecebimento,
      };
      
      console.log("Debug: Salvando Renda Fixa...", payload);
      setLoadingRendas(true);
      
      try {
          const response = await fetch(`${API_URL}/renda-fixa`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'X-User-ID': user._id },
              body: JSON.stringify(payload)
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.message || "Erro ao salvar.");

          console.log("Debug: Renda Fixa salva:", data.rendaFixa);
          setRendasFixas([...rendasFixas, data.rendaFixa]);
          setNovaRendaForm({ nome: '', valorPuro: 0, valorExibicao: '', diaRecebimento: 1 });
          showNotification("Renda fixa salva!", "success");

      } catch (err) {
          console.error("Debug Erro [handleSaveRendaFixa]:", err);
          showNotification(err.message, "error");
      } finally {
          setLoadingRendas(false);
      }
  };

  // 5. 🎯 NOVA FUNÇÃO: DELETAR RENDA FIXA
  const handleDeleteRendaFixa = (rendaId) => {
      if (!user?._id) return;
      
      console.log("Debug: Solicitando confirmação para deletar Renda ID:", rendaId);
      showNotification(
          "Tem certeza que quer deletar esta renda?",
          "confirm",
          async () => { // O que fazer se o usuário clicar "Sim"
              console.log("Debug: Confirmado, deletando Renda ID:", rendaId);
              setLoadingRendas(true);
              try {
                  const response = await fetch(`${API_URL}/renda-fixa/${rendaId}`, {
                      method: 'DELETE',
                      headers: { 'X-User-ID': user._id }
                  });
                  const data = await response.json();
                  if (!response.ok) throw new Error(data.message || "Erro ao deletar.");

                  setRendasFixas(rendasFixas.filter(r => r._id !== rendaId));
                  showNotification("Renda deletada.", "success");
                  console.log("Debug: Renda deletada com sucesso.");
              } catch (err) {
                  console.error("Debug Erro [handleDeleteRendaFixa]:", err);
                  showNotification(err.message, "error");
              } finally {
                  setLoadingRendas(false);
              }
          }
      );
  };
  
  // 6. DELETAR GASTO (da lista)
  const handleDeleteExpense = (gastoId) => {
      if (!user?._id) return;
      console.log("Debug: Solicitando confirmação para deletar Gasto ID:", gastoId);
      showNotification(
        "Tem certeza que deseja excluir este gasto?",
        "confirm",
        async () => {
            console.log("Debug: Confirmado, deletando Gasto ID:", gastoId);
            setLoadingGastos(true);
            try {
                const response = await fetch(`${API_URL}/gasto/${gastoId}`, {
                    method: 'DELETE',
                    headers: { 'X-User-ID': user._id },
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.message || "Falha ao deletar.");

                showNotification("Gasto deletado!", "success");
                console.log("Debug: Gasto deletado com sucesso.");
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
                console.error("Debug Erro [handleDeleteExpense]:", err);
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
          console.log("Debug: Aplicando novo range de data");
          setStartDate(toISO_YYYY_MM_DD(selectedRange.from));
          setEndDate(toISO_YYYY_MM_DD(selectedRange.to));
          setShowDatePicker(false);
      } else {
          showNotification("Por favor, selecione um período de início e fim.", "error");
      }
  };


  return (
    <>
      <Navbar onLogout={onLogout} />
      
      <div className="relatorio-container">
        <h1 className="relatorio-title">Salário e Rendas</h1>
        {erro && <div className="erro-msg">{erro}</div>}

        {/* === 1. CARDS DE CONFIGURAÇÃO (TOPO) === */}
        {/* 🎯 CORREÇÃO: <form> trocado por <div> para evitar aninhamento */}
        <div className="config-wrapper">
          
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

            {salarioTipo === 'inteiro' && (
              <div className="form-group">
                <label htmlFor="salarioInteiro">Valor Total (R$)</label>
                <input
                  id="salarioInteiro" type="text" placeholder="R$ 3.000,00"
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
                    id="salarioDia15" type="text" placeholder="R$ 1.500,00"
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
                    id="salarioDia30" type="text" placeholder="R$ 1.500,00"
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
            
            {/* Botão para salvar salário (type="button" é importante) */}
            <button type="button" className="btn-save" disabled={loading} onClick={handleSaveConfig}>
              {loading ? "Salvando..." : "Salvar Salário"}
            </button>
          </div>
          
          {/* --- Card Rendas Fixas --- */}
          <div className="card config-card">
            <h2>Rendas Fixas Recorrentes</h2>
            
            {/* Lista de Rendas Fixas */}
            <div className="renda-fixa-list">
                {loadingRendas && <p>Carregando rendas...</p>}
                {!loadingRendas && rendasFixas.length === 0 && (
                    <p className="no-data-small">Nenhuma renda fixa cadastrada.</p>
                )}
                {rendasFixas.map(renda => (
                    <div key={renda._id} className="renda-fixa-item">
                        <span>{renda.nome} (Todo dia {renda.diaRecebimento})</span>
                        <span>{formatCurrencyForDisplay(renda.valor)}</span>
                        <button 
                            className="btn-delete-fixo-renda" 
                            onClick={() => handleDeleteRendaFixa(renda._id)}
                            disabled={loadingRendas}
                        >
                            &times;
                        </button>
                    </div>
                ))}
            </div>

            {/* Formulário para adicionar nova renda (este <form> está correto) */}
            <form className="renda-fixa-form" onSubmit={handleSaveRendaFixa}>
                <input
                    type="text"
                    placeholder="Nome da Renda (ex: Carros)"
                    value={novaRendaForm.nome}
                    onChange={(e) => setNovaRendaForm({...novaRendaForm, nome: e.target.value})}
                />
                <input
                    type="text"
                    placeholder="R$ 0,00"
                    value={novaRendaForm.valorExibicao}
                    onChange={(e) => {
                      const { valorPuro, valorExibicao } = getCurrencyValues(e.target.value);
                      setNovaRendaForm({...novaRendaForm, valorPuro, valorExibicao});
                    }}
                />
                <input
                    type="number"
                    min="1" max="31"
                    value={novaRendaForm.diaRecebimento}
                    onChange={(e) => setNovaRendaForm({...novaRendaForm, diaRecebimento: e.target.value})}
                />
                <button type="submit" className="btn-add-renda" disabled={loadingRendas}>
                    +
                </button>
            </form>
          </div>
          
        </div>
        {/* 🎯 CORREÇÃO: Fechamento da <div> */}

        {/* === 2. RELATÓRIO DE GASTOS (EMBAIXO) === */}
        <div className="card report-section">
          <h2>Histórico de Gastos</h2>
          
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
                        locale={ptBR}
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