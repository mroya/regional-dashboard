'use client';

import React, { useState, useEffect } from 'react';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { useDashboardData } from './hooks/useDashboardData';
import { useWeather } from './hooks/useWeather';
import LoginPage from './components/LoginPage';
import Sidebar from './components/Sidebar';
import RegionalStats from './components/RegionalStats';
import BranchDetail from './components/BranchDetail';
import FiliaisDailyTable from './components/FiliaisDailyTable';
import dynamic from 'next/dynamic';
import { Brain, CheckCircle2, FileText, Loader2, Receipt, TrendingUp, TrendingDown, Pill, Package, ShoppingBag, Tag, Ticket, PieChart, Heart, HelpCircle, Zap, Sparkles } from 'lucide-react';



function getProcessingStep(status) {
  const text = (status || '').toLowerCase();
  if (text.includes('gemini') || text.includes('ia')) return 2;
  if (text.includes('atualizando') || text.includes('concl')) return 3;
  return 1;
}

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState('LOGIN');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [selectedFilial, setSelectedFilial] = useState('REGIONAL');
  const [filterMeta, setFilterMeta] = useState('ALL');
  const [sortConfig, setSortConfig] = useState({ key: 'percProj', direction: 'desc' });

  const getYesterdayStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
  };

  const [referenceDate, setReferenceDate] = useState(getYesterdayStr());
  const { data: enrichedData, loading, uploadStatus, error, updatedAt, handleFileUpload, handleClearData } = useDashboardData(user, referenceDate, setReferenceDate);
  const { clock, weather, weatherIcon } = useWeather();
  const processingStep = getProcessingStep(uploadStatus);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) return;
    
    // Find the latest report uploaded
    const fetchLatestReportDate = async () => {
      try {
        const { collection, query, orderBy, limit, getDocs } = await import('firebase/firestore');
        const q = query(collection(db, 'reports'), orderBy('timestamp', 'desc'), limit(1));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const latestDoc = snapshot.docs[0];
          console.log('[Firebase] Data mais recente encontrada:', latestDoc.id);
          setReferenceDate(latestDoc.id);
        }
      } catch (err) {
        console.error('[Firebase] Erro ao buscar data mais recente:', err);
      }
    };
    
    fetchLatestReportDate();
  }, [user]);

  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      if (authMode === 'LOGIN') await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      else await createUserWithEmailAndPassword(auth, loginEmail, loginPassword);
    } catch (err) { setAuthError(err.message); }
  };

  const shareFilialWhatsApp = (f) => {
    if (!f) return;
    
    // Build emojis securely from percent-encoded strings to avoid any source code or OS encoding mangling.
    const e_wave = decodeURIComponent('%F0%9F%91%8B');
    const e_green = decodeURIComponent('%F0%9F%9F%A2');
    const e_rocket = decodeURIComponent('%F0%9F%9A%80');
    const e_red = decodeURIComponent('%F0%9F%94%B4');
    const e_muscle = decodeURIComponent('%F0%9F%92%AA');
    const e_bar = decodeURIComponent('%F0%9F%93%8A');
    const e_target = decodeURIComponent('%F0%9F%8E%AF');
    const e_trophy = decodeURIComponent('%F0%9F%8F%86');

    const textStr = `Olá, gerente da Filial ${f.id}! ${e_wave}
Aqui está o nosso farol de desempenho atualizado:

${e_bar} *Resumo Acumulado*
- Venda Atual: *${f.vdaEft || '0'}*
- Meta Acumulada: *${f.alvo || '0'}*
- Desvio: *${f.desvioPerc || '0%'}*
- Venda Ontem: *${f.vdaOnt || '0'}*

${e_target} *Projeção*
- Projeção de Fechamento: *${f.percProj?.toFixed(1) || 0}%*

${f.dentroMeta 
  ? `${e_green} *ESTAMOS NA META!* Parabéns pelo resultado até aqui. Vamos manter a pegada! ${e_rocket}`
  : `${e_red} *ATENÇÃO À META!* Precisamos de um esforço extra para buscar o resultado. Conto com a liderança de vocês! ${e_muscle}`}

Vamos com tudo entregar esse resultado! ${e_trophy}`;

    // Use api.whatsapp.com which is more stable with complex encodings on Windows than wa.me
    const finalUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(textStr)}`;
    window.open(finalUrl, '_blank', 'noopener,noreferrer');
  };

  if (authLoading) return <div className="loading-screen">Carregando...</div>;
  if (!user) return <LoginPage {...{ authMode, setAuthMode, loginEmail, setLoginEmail, loginPassword, setLoginPassword, handleAuth, authError }} />;

  return (
    <div className={`dashboard-container ${darkMode ? 'dark' : 'light'}`}>
      {/* Botão Hambúrguer (Visível quando a sidebar está fechada) */}
      {!sidebarOpen && (
        <button className="mobile-menu-btn" onClick={() => setSidebarOpen(true)}>
          <div className="hamburger-line"></div>
          <div className="hamburger-line"></div>
          <div className="hamburger-line"></div>
        </button>
      )}

      {loading && (
        <div className="pdf-loading-overlay">
          <div className="processing-card">
            <div className="processing-orbit" aria-hidden="true">
              <div className="processing-ring"></div>
              <div className="processing-core">
                <Loader2 size={28} />
              </div>
            </div>

            <div className="processing-copy">
              <span className="processing-eyebrow">Atualizando relatorio</span>
              <h2>{uploadStatus || 'Processando dados...'}</h2>
              <p>Estamos lendo o PDF, organizando os indicadores e salvando a nova visao do painel.</p>
            </div>

            <div className="processing-steps">
              <div className={`processing-step ${processingStep >= 1 ? 'active' : ''}`}>
                {processingStep > 1 ? <CheckCircle2 size={18} /> : <FileText size={18} />}
                <span>Extrair PDF</span>
              </div>
              <div className={`processing-step ${processingStep >= 2 ? 'active' : ''}`}>
                {processingStep > 2 ? <CheckCircle2 size={18} /> : <Brain size={18} />}
                <span>Organizar dados</span>
              </div>
              <div className={`processing-step ${processingStep >= 3 ? 'active' : ''}`}>
                <CheckCircle2 size={18} />
                <span>Atualizar painel</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)} 
          className="sidebar-backdrop"
        />
      )}

      <Sidebar 
        {...{ 
          user, sidebarOpen, setSidebarOpen, darkMode, setDarkMode, clock, weather, weatherIcon,
          referenceDate, setReferenceDate, defaultDate: getYesterdayStr(), 
          elapsedDays: enrichedData?.geral?.diasDecorridos || 0,
          selectedFilial, setSelectedFilial, 
          enrichedData, updatedAt, handleFileUpload, handleClearData, 
          handleLogout: () => signOut(auth) 
        }} 
      />

      <main className="main-content">
        {error && <div className="error-banner">{error}</div>}

        {enrichedData ? (
          selectedFilial === 'REGIONAL' ? (
            <div className="animate-fade-in">
              <header className="main-header glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem', padding: '1.5rem 2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {/* Logo Icon */}
                  <div className="relative flex items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 shadow-md shrink-0" style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, #2563eb, #4f46e5)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(255, 255, 255, 0.15)', borderRadius: '12px', filter: 'blur(0.5px)' }}></div>
                    <Zap size={20} className="text-white relative z-10" fill="currentColor" style={{ color: '#ffffff', position: 'relative', zIndex: 10 }} />
                    <Sparkles size={8} className="absolute text-yellow-400 animate-pulse" style={{ color: '#facc15', position: 'absolute', top: '4px', right: '4px', zIndex: 10 }} />
                  </div>
                  
                  {/* Logo Text */}
                  <div className="flex flex-col">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', lineHeight: 1 }}>
                      <h2 style={{ fontSize: '1.25rem', fontStyle: 'italic', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.05em', color: 'var(--text-primary)', margin: 0, lineHeight: 1 }}>
                        NEXUS <span style={{ color: '#2563eb' }}>AI</span> <span style={{ color: '#3b82f6', fontWeight: 900, fontSize: '0.9rem', marginLeft: '0.2rem' }}>REGIONAL</span>
                      </h2>
                      <span style={{ fontSize: '8px', padding: '0.15rem 0.45rem', borderRadius: '999px', border: '1px solid rgba(59, 130, 246, 0.3)', background: 'rgba(59, 130, 246, 0.08)', color: '#60a5fa', fontWeight: 'bold', textTransform: 'uppercase', fontStyle: 'italic' }}>
                        V1.3.4
                      </span>
                    </div>
                    <span style={{ fontSize: '8px', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.15em', fontStyle: 'italic', marginTop: '0.25rem', lineHeight: 1 }}>
                      MR Labs
                    </span>
                  </div>
                </div>

                <div className="header-info" style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                  <div className="status-badge success" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', width: 'fit-content' }}>
                    <span className="dot" style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', marginRight: '4px' }}></span> NA META
                  </div>
                  <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>Visão Do Coordenador</h1>
                  <p className="subtitle" style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Área 02 Sul POA • {new Date(referenceDate + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</p>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.6rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                      background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)',
                      borderRadius: '20px', padding: '0.3rem 0.85rem', fontSize: '0.8rem', fontWeight: 600, color: '#818cf8'
                    }}>
                      📅 Dados de: {new Date(referenceDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </div>
                    {updatedAt && (
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                        background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
                        borderRadius: '20px', padding: '0.3rem 0.85rem', fontSize: '0.75rem', fontWeight: 500, color: '#6ee7b7'
                      }}>
                        🕐 Atualizado: {updatedAt}
                      </div>
                    )}
                  </div>
                </div>
                <div className="header-metrics">
                  <div className="metric-main" style={{ cursor: 'help' }} title="Performance Acumulada: Percentual da meta acumulada atingido até o momento (Venda Efetiva acumulada dividida pelo Alvo acumulado).">
                    <span className="label" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      Performance Acumulada <HelpCircle size={12} style={{ opacity: 0.7 }} />
                    </span>
                    <span className="value">{enrichedData.geral?.performanceGeral || '0%'}</span>
                  </div>
                </div>
              </header>

              {(() => {
                const mainDept = (enrichedData.departamentos || []).find(d => d.departamento?.toUpperCase() === 'GERAL' && (!d.id || d.id === 'SUMMARY')) || 
                                 (enrichedData.departamentos || []).find(d => d.departamento?.toUpperCase().includes('MED') && (!d.id || d.id === 'SUMMARY')) || {};
                const mainVdaEft = parseNum(mainDept.vdaEft);
                const mainAlvo = parseNum(mainDept.alvo) || parseNum(mainDept.metaDia);
                const diasDecorridos = enrichedData.geral?.diasDecorridos || 1;
                const diasRestantes = enrichedData.geral?.diasRestantes || 1;
                
                const mainVendaDiaria = diasDecorridos > 0 ? mainVdaEft / diasDecorridos : 0;
                const diasUteis = parseInt(enrichedData.geral?.diasUteis, 10) || 31;
                const mainMetaDiaria = diasUteis > 0 ? mainAlvo / diasUteis : 0;
                
                const ritmoDiff = mainVendaDiaria - mainMetaDiaria;
                
                // Alvo / dias q falta: The remaining target divided by remaining days
                const mainAlvoPorDiaRestante = diasRestantes > 0 ? Math.max(0, mainAlvo - mainVdaEft) / diasRestantes : 0;

                return (
              <div className="metrics-grid">
                <div className="glass-panel metric-card blue" style={{ cursor: 'help' }} title="Dias Úteis do Mês: Total de dias com operação de vendas no mês atual.&#10;Decorridos: Quantos dias já passaram.">
                  <span className="icon">📅</span>
                  <h3>Dias Úteis do Mês</h3>
                  <div className="big-value">{enrichedData.geral?.diasUteis}</div>
                  <p>Decorridos: {enrichedData.geral?.diasDecorridos}</p>
                </div>
                <div className="glass-panel metric-card orange" style={{ cursor: 'help' }} title="Dias Restantes: Quantidade de dias úteis que ainda faltam para o fechamento do mês e alcance da meta total.">
                  <span className="icon">⏳</span>
                  <h3>Dias Restantes</h3>
                  <div className="big-value">{enrichedData.geral?.diasRestantes}</div>
                  <p>Para bater a meta</p>
                </div>
                <div className="glass-panel metric-card purple" style={{ cursor: 'help' }} title={`Média Dia: Valor faturado dividido pelos dias decorridos (${diasDecorridos}).\nMeta Diária: Ritmo médio exigido (${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(mainMetaDiaria)}).`}>
                  <span className="icon">💰</span>
                  <h3>Média Dia</h3>
                  <div className="big-value">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(mainVendaDiaria)}
                  </div>
                  <p>Meta Diária: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(mainMetaDiaria)} | <span style={{ color: ritmoDiff >= 0 ? '#10b981' : '#ef4444', fontWeight: 600 }}>{ritmoDiff >= 0 ? '+' : ''}{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(ritmoDiff)}</span></p>
                </div>
                <div className="glass-panel metric-card blue" style={{ cursor: 'help' }} title={`Vda Eft: Faturamento total acumulado até o momento.\nDiária: Média real de faturamento por dia decorrido (Venda Total / ${diasDecorridos} dias).`}>
                  <span className="icon">V</span>
                  <h3>Vda Eft</h3>
                  <div className="big-value">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(mainVdaEft)}
                  </div>
                  <p>Diária: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(mainVendaDiaria)}</p>
                </div>
                <div className="glass-panel metric-card blue" style={{ cursor: 'help' }} title={`Alvo: Meta total estabelecida para a regional no mês inteiro.\nNec/Dia Rest.: Venda exigida por dia útil restante para suprir exatamente a lacuna da meta (O que falta / ${diasRestantes} dias).`}>
                  <span className="icon">A</span>
                  <h3>Alvo (Meta do Mês)</h3>
                  <div className="big-value">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(mainAlvo)}
                  </div>
                  <p>Nec/Dia Rest.: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(mainAlvoPorDiaRestante)}</p>
                </div>
                <div className="glass-panel metric-card orange" style={{ cursor: 'help' }} title="Desvio de Meta: Mostra o percentual e o valor financeiro (VlrDesv) da diferença entre a Venda Efetiva alcançada e o Alvo proporcional até ontem.">
                  <span className="icon">%</span>
                  <h3>% Desv</h3>
                  <div className="big-value">{mainDept.desvioPerc || '0%'}</div>
                  <p>VlrDesv: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(parseNum(mainDept.vlrDesvio || mainDept.vlrDesv || '0'))}</p>
                </div>
              </div>
                );
              })()}

              {enrichedData.participacao && (
                <div className="glass-panel" style={{ padding: '1.5rem', marginTop: '2rem' }}>
                  <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>
                    % Participação Venda Efetiva sobre a Venda
                  </h3>
                  <div className="participacao-grid">
                    <div className="stats-mini-card" style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Med</p>
                      <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-primary)' }}>{enrichedData.participacao.med || '0%'}</p>
                    </div>
                    <div className="stats-mini-card" style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>HB (N-Med)</p>
                      <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-primary)' }}>{enrichedData.participacao.hb || '0%'}</p>
                    </div>
                    <div className="stats-mini-card" style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Gen</p>
                      <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-primary)' }}>{enrichedData.participacao.gen || '0%'}</p>
                    </div>
                    <div className="stats-mini-card" style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>PP</p>
                      <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-primary)' }}>{enrichedData.participacao.pp || '0%'}</p>
                    </div>
                  </div>
                </div>
              )}

              {enrichedData.filiais.length > 1 && (
                <>
                  <div className="glass-panel" style={{ padding: '1.5rem', marginTop: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ background: 'rgba(255,255,255,0.1)', padding: '0.75rem', borderRadius: '10px' }}>
                        <Receipt size={24} color="var(--accent-primary)" />
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-secondary)' }}>Ticket Médio (Total Regional)</h3>
                        <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                          {enrichedData.geral?.tktMed || '-'}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Evolução de Ticket</p>
                      <div style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '6px',
                        background: parseNum(enrichedData.geral?.evTkt || '0') >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        color: parseNum(enrichedData.geral?.evTkt || '0') >= 0 ? '#10b981' : '#ef4444',
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontWeight: '700',
                        fontSize: '1.1rem'
                      }}>
                        {parseNum(enrichedData.geral?.evTkt || '0') >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                        {enrichedData.geral?.evTkt || '0%'}
                      </div>
                    </div>
                  </div>

                  <div className="glass-panel" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
                    <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>
                      Desempenho por Departamento (Total Regional)
                    </h3>
                    <div className="depts-grid-scroll">
                      
                      {/* Medicamento Total */}
                      <div className="stats-mini-card" style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
                          <Pill size={16} color="#3b82f6" />
                          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, fontWeight: 600 }}>Medicamento</p>
                        </div>
                        <p style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{enrichedData.geral?.medDesv || '-'} <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Desv</span></p>
                        <div style={{ fontSize: '0.85rem', color: parseNum(enrichedData.geral?.medEvlVda || '0') >= 0 ? '#10b981' : '#ef4444', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px', fontWeight: 600 }}>
                          {parseNum(enrichedData.geral?.medEvlVda || '0') >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                          {enrichedData.geral?.medEvlVda || '0%'} Evol
                        </div>
                      </div>

                      {/* Genérico */}
                      <div className="stats-mini-card" style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
                          <Package size={16} color="#8b5cf6" />
                          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, fontWeight: 600 }}>Genérico</p>
                        </div>
                        <p style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{enrichedData.geral?.genDesv || '-'} <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Desv</span></p>
                        <div style={{ fontSize: '0.85rem', color: parseNum(enrichedData.geral?.genEvlVda || '0') >= 0 ? '#10b981' : '#ef4444', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px', fontWeight: 600 }}>
                          {parseNum(enrichedData.geral?.genEvlVda || '0') >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                          {enrichedData.geral?.genEvlVda || '0%'} Evol
                        </div>
                      </div>

                      {/* HB */}
                      <div className="stats-mini-card" style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
                          <ShoppingBag size={16} color="#f43f5e" />
                          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, fontWeight: 600 }}>HB (Não Med)</p>
                        </div>
                        <p style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{enrichedData.geral?.hbDesv || '-'} <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Desv</span></p>
                        <div style={{ fontSize: '0.85rem', color: parseNum(enrichedData.geral?.hbEvlVda || '0') >= 0 ? '#10b981' : '#ef4444', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px', fontWeight: 600 }}>
                          {parseNum(enrichedData.geral?.hbEvlVda || '0') >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                          {enrichedData.geral?.hbEvlVda || '0%'} Evol
                        </div>
                      </div>

                      {/* Produtos Panvel */}
                      <div className="stats-mini-card" style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
                          <Tag size={16} color="#f59e0b" />
                          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, fontWeight: 600 }}>Prod Panvel</p>
                        </div>
                        <p style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{enrichedData.geral?.ppDesv || '-'} <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Desv</span></p>
                        <div style={{ fontSize: '0.85rem', color: parseNum(enrichedData.geral?.ppEvlVda || '0') >= 0 ? '#10b981' : '#ef4444', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px', fontWeight: 600 }}>
                          {parseNum(enrichedData.geral?.ppEvlVda || '0') >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                          {enrichedData.geral?.ppEvlVda || '0%'} Evol
                        </div>
                      </div>

                      {/* Cupom Bem Panvel */}
                      <div className="stats-mini-card" style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
                          <Ticket size={16} color="#10b981" />
                          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, fontWeight: 600 }}>Cupom Bem</p>
                        </div>
                        <p style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{enrichedData.geral?.cupomSVda || '-'} <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>%S/Vda</span></p>
                      </div>

                      {/* PBM */}
                      <div className="stats-mini-card" style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
                          <PieChart size={16} color="#0ea5e9" />
                          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, fontWeight: 600 }}>PBM</p>
                        </div>
                        <p style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{enrichedData.geral?.pbmRepr || '-'} <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>%Repr 80/20</span></p>
                      </div>

                      {/* Troco Amigo */}
                      <div className="stats-mini-card" style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
                          <Heart size={16} color="#ec4899" />
                          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, fontWeight: 600 }}>Troco Amigo</p>
                        </div>
                        <p style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{enrichedData.geral?.taVlr || '-'} <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Vlr</span></p>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px', fontWeight: 600 }}>
                          Ontem: {enrichedData.geral?.taVlrOntem || '-'}
                        </div>
                      </div>

                    </div>
                  </div>

                  <FiliaisDailyTable filiais={enrichedData.filiais} onFilialClick={setSelectedFilial} />
                </>
              )}
            </div>
          ) : (
            <BranchDetail 
              f={enrichedData.filiais.find(f => f.id === selectedFilial)}
              depts={enrichedData.departamentos || []}
              setSelectedFilial={setSelectedFilial}
              shareFilialWhatsApp={shareFilialWhatsApp}
            />
          )
        ) : (
          <div className="empty-state glass-panel">
            <div className="empty-icon">📊</div>
            <h2>Nenhum dado para esta data</h2>
            <p>Selecione a data correta na barra lateral e carregue o PDF do relatório.</p>
          </div>
        )}
      </main>
    </div>
  );
}

function parseNum(str) {
  if (!str) return 0;
  if (typeof str === 'number') return str;
  const s = String(str);
  return parseFloat(s.replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
}
