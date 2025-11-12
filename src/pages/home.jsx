import React, { useState, useEffect, useMemo, useRef } from 'react';
import Navbar from "../components/Navbar";
import ReactECharts from 'echarts-for-react'; 
import "./Home.css";
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { ptBR } from 'date-fns/locale';

// ======================================================================
// FUNÇÕES AUXILIARES
// ======================================================================
const formatCurrency = (value) => {
    const numericValue = parseFloat(value);
    if (isNaN(numericValue)) return 'R$ 0,00';
    return numericValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

const ExpenseItem = ({ expense }) => (
  <div className="expense-item">
    <span className={`category-tag category-${expense.categoria.toLowerCase().replace(/\s/g, '-')}`}>
      {expense.categoria}
    </span>
    <span className="expense-description">{expense.descricao}</span>
    <span className="expense-value expense-value-red">{formatCurrency(expense.valor)}</span>
  </div>
);

const TopExpensesCard = ({ title, expenses, loading }) => {
  if (loading) {
      return (
          <div className="card top-expenses-card loading-card">
              <h2 className="card-title">{title}</h2>
              <p>Carregando dados...</p>
          </div>
      );
  }
  const topThree = expenses.sort((a, b) => b.valor - a.valor).slice(0, 3);
  return (
    <div className="card top-expenses-card">
      <h2 className="card-title">{title}</h2>
      <div className="expense-list">
        {topThree.length > 0 ? (
          topThree.map((exp) => <ExpenseItem key={exp._id} expense={exp} />) 
        ) : (
          <p className="no-data">Nenhum gasto registrado neste período.</p>
        )}
      </div>
    </div>
  );
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


function Home({ user, onLogout }) {
  // --- ESTADOS ---
  const [transacoes, setTransacoes] = useState([]); 
  const [userConfig, setUserConfig] = useState(null); 
  const [currentBalance, setCurrentBalance] = useState(0); 
  const [receitas, setReceitas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const datePickerRef = useRef(null);
  
  // O período ATIVO (que é enviado para a API)
  const [startDate, setStartDate] = useState(() => {
      const today = new Date();
      return toISO_YYYY_MM_DD(new Date(today.getFullYear(), today.getMonth(), 1));
  });
  const [endDate, setEndDate] = useState(() => {
      const today = new Date();
      return toISO_YYYY_MM_DD(new Date(today.getFullYear(), today.getMonth() + 1, 0));
  });
  
  // O período SELECIONADO no calendário (antes de clicar "Aplicar")
  const [selectedRange, setSelectedRange] = useState({
      from: parseLocalYMD(startDate),
      to: parseLocalYMD(endDate),
  });
  
  const [isCustomFilter, setIsCustomFilter] = useState(false);

  
  const userId = user?._id; 

  // --- HOOK DE FETCH ---
  useEffect(() => {
    const fetchData = async () => {
        if (!userId) { setLoading(false); return; }
        setLoading(true);
        setError(null);
        try {
            const urlParams = `?startDate=${startDate}&endDate=${endDate}`;
            const [transacoesResponse, configResponse] = await Promise.all([
                fetch(`http://localhost:3001/gasto/all${urlParams}`, { headers: { 'X-User-ID': userId } }),
                fetch(`http://localhost:3001/user/${userId}/config`),
            ]);
            if (!transacoesResponse.ok) throw new Error('Falha ao carregar transações.');
            if (!configResponse.ok) throw new Error('Falha ao carregar configurações.');
            const transacoesData = await transacoesResponse.json();
            const configData = await configResponse.json();
            const expensesOnly = transacoesData.filter(t => t.tipo !== 'income'); 
            const incomeOnly = transacoesData.filter(t => t.tipo === 'income');
            setTransacoes(expensesOnly);
            setReceitas(incomeOnly);     
            setUserConfig(configData);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };
    fetchData();
  }, [userId, startDate, endDate]); 

  // --- Efeito para fechar o calendário ---
  useEffect(() => {
    const handleClickOutside = (event) => {
        if (datePickerRef.current && !datePickerRef.current.contains(event.target)) {
            setShowDatePicker(false);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => { document.removeEventListener("mousedown", handleClickOutside); };
  }, [datePickerRef]);


  // --- LÓGICA DE FILTROS ---
  const weeklyExpenses = useMemo(() => {
      if (loading) return [];
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - 7); 
      return transacoes.filter(exp => {
          const parts = exp.data.split('-').map(Number);
          const expenseDate = new Date(parts[0], parts[1] - 1, parts[2]);
          return expenseDate >= startOfWeek && expenseDate <= today;
      });
  }, [transacoes, loading]);
  
  const monthlyExpenses = transacoes;

  // Lógica do Salário movida para 'useMemo'
  const lastPaycheckInfo = useMemo(() => {
    if (!userConfig) {
      return { lastPaycheckDate: new Date(), totalIncomeThisCycle: 0 };
    }

    const today = new Date();
    const day = today.getDate();
    const month = today.getMonth();
    const year = today.getFullYear();
    let lastPaycheckDate = new Date(year, month, 1);
    let lastPaycheckAmount = 0;
    const { salarioTipo, salarioInteiro, salarioDia15, salarioDia30, metaRecebimento } = userConfig;

    if (salarioTipo === 'inteiro') {
        lastPaycheckAmount = salarioInteiro;
        if (day < 30) { lastPaycheckDate = new Date(year, month - 1, 30); } 
        else { lastPaycheckDate = new Date(year, month, 30); }
    } else if (salarioTipo === 'dividido') {
        if (day < 15) {
            lastPaycheckDate = new Date(year, month - 1, 30);
            lastPaycheckAmount = salarioDia30;
        } else if (day < 30) {
            lastPaycheckDate = new Date(year, month, 15);
            lastPaycheckAmount = salarioDia15;
        } else {
            lastPaycheckDate = new Date(year, month, 30);
            lastPaycheckAmount = salarioDia30;
        }
    }
    
    const totalIncomeThisCycle = lastPaycheckAmount + (metaRecebimento || 0);
    return { lastPaycheckDate, totalIncomeThisCycle };

  }, [userConfig]);


  // --- HOOK DE CÁLCULO DE SALDO ---
  useEffect(() => {
    if (loading || !userConfig || !transacoes || !receitas) {
        return;
    }

    if (isCustomFilter) {
        // Se for um filtro customizado (Mês Passado, etc.), calcula o balanço simples.
        const totalReceitas = receitas.reduce((sum, r) => sum + r.valor, 0);
        const totalGastos = transacoes.reduce((sum, exp) => sum + exp.valor, 0);
        const balancoPeriodo = totalReceitas - totalGastos;
        setCurrentBalance(balancoPeriodo);
    
    } else {
        // Se for o Mês Atual, roda a lógica de "Saldo Restante"
        const today = new Date();
        const { lastPaycheckDate, totalIncomeThisCycle } = lastPaycheckInfo;
        
        const totalReceitasManuais = receitas
            .filter(r => {
                const parts = r.data.split('-').map(Number);
                const expenseDate = new Date(parts[0], parts[1] - 1, parts[2]);
                return expenseDate >= lastPaycheckDate && expenseDate <= today;
            })
            .reduce((sum, r) => sum + r.valor, 0);

        const expensesSinceLastPaycheck = transacoes.filter(exp => {
            const parts = exp.data.split('-').map(Number);
            const expenseDate = new Date(parts[0], parts[1] - 1, parts[2]);
            return expenseDate >= lastPaycheckDate && expenseDate <= today;
        });
        const totalGastoSinceLastPaycheck = expensesSinceLastPaycheck.reduce((sum, exp) => sum + exp.valor, 0);

        const balance = (totalIncomeThisCycle + totalReceitasManuais) - totalGastoSinceLastPaycheck;
        setCurrentBalance(balance);
    }
  }, [transacoes, userConfig, loading, receitas, isCustomFilter, lastPaycheckInfo]);

  
  // --- GRÁFICOS ---
  const pieChartOptions = useMemo(() => {
    const gastosAgregados = monthlyExpenses.reduce((acc, gasto) => {
        const { categoria, valor } = gasto;
        if (!acc[categoria]) { acc[categoria] = 0; }
        acc[categoria] += valor;
        return acc;
    }, {});
    const chartData = Object.keys(gastosAgregados).map(categoria => ({
        value: gastosAgregados[categoria],
        name: categoria
    }));
    return {
      title: { text: 'Gastos por Categoria', subtext: 'Período Selecionado', left: 'center' },
      tooltip: { trigger: 'item', formatter: '{a} <br/>{b}: {c} ({d}%)' },
      legend: { orient: 'vertical', left: 'left', top: 'middle', data: chartData.map(item => item.name) },
      series: [{
          name: 'Gastos', type: 'pie', radius: '60%', center: ['60%', '50%'],
          data: chartData,
          emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0, 0, 0, 0.5)' } }
      }]
    };
  }, [monthlyExpenses]);

  const barChartOptions = useMemo(() => {
      const [year, month] = startDate.split('-').map(Number);
      const diasNoMes = new Date(year, month, 0).getDate(); 
      
      const labelsDosDias = Array.from({ length: diasNoMes }, (_, i) => (i + 1).toString());
      const dadosDosDias = new Array(diasNoMes).fill(0);

      monthlyExpenses.forEach(gasto => {
          const parts = gasto.data.split('-').map(Number);
          const expenseDate = new Date(parts[0], parts[1] - 1, parts[2]);
          const dia = expenseDate.getDate(); 
          dadosDosDias[dia - 1] += gasto.valor; 
      });

      return {
          title: { text: 'Gastos Diários', subtext: 'Período Selecionado', left: 'center' },
          tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
          grid: { left: '10%', right: '4%', bottom: '10%', },
          xAxis: { type: 'category', data: labelsDosDias, axisLabel: { interval: 2 } },
          yAxis: { type: 'value', axisLabel: { formatter: 'R$ {value}' } },
          series: [{
              name: 'Total Gasto', type: 'bar',
              data: dadosDosDias.map(val => val.toFixed(2)), 
              itemStyle: { color: '#10B981' }
          }]
      };
  }, [monthlyExpenses, startDate]);

  // Mini-Gráfico (Sparkline) para o Card de Saldo
  const sparklineOptions = useMemo(() => {
    const [year, month] = startDate.split('-').map(Number);
    const diasNoMes = new Date(year, month, 0).getDate(); 
    const labelsDosDias = Array.from({ length: diasNoMes }, (_, i) => (i + 1).toString());
    const dailyDeltas = new Array(diasNoMes).fill(0);
    
    receitas.forEach(gasto => {
        const parts = gasto.data.split('-').map(Number);
        const expenseDate = new Date(parts[0], parts[1] - 1, parts[2]);
        const dia = expenseDate.getDate(); 
        dailyDeltas[dia - 1] += gasto.valor; 
    });
    transacoes.forEach(gasto => {
        const parts = gasto.data.split('-').map(Number);
        const expenseDate = new Date(parts[0], parts[1] - 1, parts[2]);
        const dia = expenseDate.getDate(); 
        dailyDeltas[dia - 1] -= gasto.valor; 
    });

    let startingBalance = 0;
    if (!isCustomFilter) {
      startingBalance = lastPaycheckInfo.totalIncomeThisCycle;
    } 

    const cumulativeData = [];
    let runningBalance = startingBalance;
    for (let i = 0; i < diasNoMes; i++) {
        runningBalance += dailyDeltas[i];
        cumulativeData.push(runningBalance.toFixed(2));
    }
    
    const endColor = '#FFFFFF'; // 🎯 MUDANÇA: Linha do gráfico branca

    return {
        grid: { left: 0, right: 0, top: 10, bottom: 10 },
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'line' },
            formatter: (params) => `Dia ${params[0].name}: ${formatCurrency(params[0].value)}`
        },
        xAxis: {
            type: 'category',
            data: labelsDosDias,
            show: false
        },
        yAxis: {
            type: 'value',
            show: false
        },
        series: [{
            name: 'Balanço',
            type: 'line',
            data: cumulativeData,
            showSymbol: false,
            lineStyle: {
                color: endColor,
                width: 2
            },
            areaStyle: {
                color: {
                  type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                  colorStops: [
                    { offset: 0, color: endColor + '4D' }, // Branco com 30% opacidade
                    { offset: 1, color: endColor + '00' }  // Branco com 0% opacidade
                  ]
                }
            }
        }]
    };
  }, [monthlyExpenses, startDate, receitas, transacoes, isCustomFilter, lastPaycheckInfo]);


  // --- FUNÇÕES DO CALENDÁRIO ---
  const handleApplyDateRange = () => {
      if (selectedRange.from && selectedRange.to) {
          setStartDate(toISO_YYYY_MM_DD(selectedRange.from));
          setEndDate(toISO_YYYY_MM_DD(selectedRange.to));
          
          const today = new Date();
          const inicioMesAtual = new Date(today.getFullYear(), today.getMonth(), 1);
          const fimMesAtual = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          
          if (toISO_YYYY_MM_DD(selectedRange.from) === toISO_YYYY_MM_DD(inicioMesAtual) &&
              toISO_YYYY_MM_DD(selectedRange.to) === toISO_YYYY_MM_DD(fimMesAtual)) {
              setIsCustomFilter(false);
          } else {
              setIsCustomFilter(true);
          }
          setShowDatePicker(false);
      } else {
          // (Assumindo que showNotification não foi passada do App.js para Home)
          alert("Por favor, selecione um período de início e fim.");
      }
  };


  // --- RENDERIZAÇÃO ---
  if (loading || !userConfig) {
    return (
        <>
            <Navbar onLogout={onLogout} />
            <div className="home-container" style={{ textAlign: 'center', marginTop: '50px' }}>
                <h1 className="home-title">Carregando Dashboard...</h1>
            </div>
        </>
    );
  }

  if (error) {
    return (
        <>
            <Navbar onLogout={onLogout} />
            <div className="home-container" style={{ textAlign: 'center', marginTop: '50px', color: 'red' }}>
                <h1 className="home-title">Erro ao carregar dados</h1>
                <p>{error}</p>
            </div>
        </>
    );
  }

  return (
    <>
      <Navbar onLogout={onLogout} />
      
      <div className="home-container">
        
        <h1 className="main-title">Olá, {user?.nome.split(" ")[0] || 'Usuário'}!</h1>
        
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

        {/* Seção principal de Destaques */}
        <section className="highlights-grid">
          
          <TopExpensesCard 
            title="💰 Maiores Gastos da Semana (Top 3)" 
            expenses={weeklyExpenses}
          />
          
          <TopExpensesCard 
            title="📅 Maiores Gastos do Período (Top 3)" 
            expenses={monthlyExpenses} // 'monthlyExpenses' agora significa 'gastos do período'
          />
          
          <div className="card quick-balance-card">
            <div>
              <h2 className="card-title">
                  {isCustomFilter ? "Balanço do Período" : "Saldo Restante"}
              </h2>
              <p className={`balance-value ${currentBalance >= 0 ? 'positive' : 'negative'}`}>
                {formatCurrency(currentBalance)}
              </p>
            </div>
            
            <div className="sparkline-chart-container">
                <ReactECharts
                    option={sparklineOptions}
                    style={{ height: '100%', width: '100%' }}
                    notMerge={true}
                    lazyUpdate={true}
                />
            </div>
            
            <p className="balance-info">
              {isCustomFilter 
                ? "(Receitas - Despesas) no período"
                : "Saldo desde o último pagamento"
              }
              <br/>
              <a href="/relatorio" className="link-detail">Ver extrato completo →</a>
            </p>
          </div>
        </section>
        
        {/* Seção de Gráficos */}
        <section className="chart-section">
            
            <div className="card chart-card">
                {monthlyExpenses.length > 0 ? (
                    <ReactECharts
                      option={pieChartOptions}
                      style={{ height: '350px', width: '100%' }}
                      notMerge={true}
                      lazyUpdate={true}
                    />
                ) : (
                    <>
                      <h2 className="card-title">Visão Geral</h2>
                      <p className="no-data" style={{paddingTop: '50px'}}>Nenhum dado de despesa neste período.</p>
                    </>
                )}
            </div>

            <div className="card chart-card">
                {monthlyExpenses.length > 0 ? (
                    <ReactECharts
                      option={barChartOptions}
                      style={{ height: '350px', width: '100%' }}
                      notMerge={true}
                      lazyUpdate={true}
                    />
                ) : (
                    <>
                      <h2 className="card-title">Atividade</h2>
                      <p className="no-data" style={{paddingTop: '50px'}}>Nenhum dado de despesa neste período.</p>
                    </>
                )}
            </div>

        </section>

      </div>
    </>
  );
}

export default React.memo(Home);