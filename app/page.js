'use client';

import React, { useState, useEffect } from 'react';
import { auth } from './lib/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { useDashboardData } from './hooks/useDashboardData';
import { useWeather } from './hooks/useWeather';
import LoginPage from './components/LoginPage';
import Sidebar from './components/Sidebar';
import RegionalStats from './components/RegionalStats';
import BranchDetail from './components/BranchDetail';
import FiliaisDailyTable from './components/FiliaisDailyTable';
import dynamic from 'next/dynamic';
import { Brain, CheckCircle2, FileText, Loader2, Receipt, TrendingUp, TrendingDown, Pill, Package, ShoppingBag, Tag, Ticket, PieChart, Heart } from 'lucide-react';



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
  const { data: enrichedData, loading, uploadStatus, error, updatedAt, handleFileUpload, handleClearData } = useDashboardData(user, referenceDate);
  const { clock, weather, weatherIcon } = useWeather();
  const processingStep = getProcessingStep(uploadStatus);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      if (authMode === 'LOGIN') await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      else await createUserWithEmailAndPassword(auth, loginEmail, loginPassword);
    } catch (err) { setAuthError(err.message); }
  };

  const shareFilialWhatsApp = (f) => {
    if (!f) return;
    
    // Using Unicode escapes to avoid encoding issues on Windows
    const e_wave = '\uD83D\uDC4B';
    const e_green = '\uD83D\uDFE2';
    const e_rocket = '\uD83D\uDE80';
    const e_red = '\uD83D\uDD34';
    const e_muscle = '\uD83D\uDCAA';
    const e_bar = '\uD83D\uDCCA';
    const e_target = '\uD83C\uDFAF';
    const e_trophy = '\uD83C\uDFC6';
    const bullet = '\u2022';

    const saudacao = `Olá, gerente da Filial ${f.id}! ${e_wave}`;
    const statusMeta = f.dentroMeta 
      ? `${e_green} *ESTAMOS NA META!* Parabéns pelo resultado até aqui. Vamos manter a pegada! ${e_rocket}` 
      : `${e_red} *ATENÇÃO À META!* Precisamos de um esforço extra para buscar o resultado. Conto com a liderança de vocês! ${e_muscle}`;

    const text = `${saudacao}
Aqui está o nosso farol de desempenho atualizado:

${e_bar} *Resumo Acumulado*
${bullet} Venda Atual: *${f.vdaEft || '0'}*
${bullet} Meta Acumulada: *${f.alvo || '0'}*
${bullet} Desvio: *${f.desvioPerc || '0%'}*
${bullet} Venda Ontem: *${f.vdaOnt || '0'}*

${e_target} *Projeção*
${bullet} Projeção de Fechamento: *${f.percProj?.toFixed(1) || 0}%*

${statusMeta}

Vamos com tudo entregar esse resultado! ${e_trophy}`;

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
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
              <header className="main-header glass-panel">
                <div className="header-info">
                  <div className="status-badge">
                    <span className="dot"></span> NA META
                  </div>
                  <h1>Visão Do Coordenador</h1>
                  <p className="subtitle">Área 02 Sul POA • {new Date(referenceDate + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</p>
                </div>
                <div className="header-metrics">
                  <div className="metric-main">
                    <span className="label">Performance Acumulada</span>
                    <span className="value">{enrichedData.geral?.performanceGeral || '0%'}</span>
                  </div>
                </div>
              </header>

              {(() => {
                const medDept = enrichedData.departamentos?.find(d => d.departamento?.toUpperCase().includes('MED')) || {};
                const medVdaEft = parseNum(medDept.vdaEft);
                const medAlvo = parseNum(medDept.alvo) || parseNum(medDept.metaDia);
                const diasDecorridos = enrichedData.geral?.diasDecorridos || 1;
                const diasRestantes = enrichedData.geral?.diasRestantes || 1;
                
                const medVendaDiaria = diasDecorridos > 0 ? medVdaEft / diasDecorridos : 0;
                // Alvo / dias q falta: The remaining target divided by remaining days
                const medAlvoPorDiaRestante = diasRestantes > 0 ? Math.max(0, medAlvo - medVdaEft) / diasRestantes : 0;

                return (
              <div className="metrics-grid">
                <div className="glass-panel metric-card blue">
                  <span className="icon">📅</span>
                  <h3>Dias Úteis do Mês</h3>
                  <div className="big-value">{enrichedData.geral?.diasUteis}</div>
                  <p>Decorridos: {enrichedData.geral?.diasDecorridos}</p>
                </div>
                <div className="glass-panel metric-card orange">
                  <span className="icon">⏳</span>
                  <h3>Dias Restantes</h3>
                  <div className="big-value">{enrichedData.geral?.diasRestantes}</div>
                  <p>Para bater a meta</p>
                </div>
                <div className="glass-panel metric-card purple">
                  <span className="icon">💰</span>
                  <h3>Média Dia (Meta)</h3>
                  <div className="big-value">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(parseNum(enrichedData.filiais[0]?.mediaDia) || 0)}
                  </div>
                  <p>%RT Rep: {enrichedData.filiais[0]?.rtRep || '0%'}</p>
                </div>
                <div className="glass-panel metric-card blue">
                  <span className="icon">V</span>
                  <h3>Vda Eft</h3>
                  <div className="big-value">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(medVdaEft)}
                  </div>
                  <p>Diária: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(medVendaDiaria)}</p>
                </div>
                <div className="glass-panel metric-card blue">
                  <span className="icon">A</span>
                  <h3>Alvo (Meta do Mês)</h3>
                  <div className="big-value">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(medAlvo)}
                  </div>
                  <p>Nec/Dia Rest.: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(medAlvoPorDiaRestante)}</p>
                </div>
                <div className="glass-panel metric-card orange">
                  <span className="icon">%</span>
                  <h3>% Desv</h3>
                  <div className="big-value">{medDept.desvioPerc || '0%'}</div>
                  <p>VlrDesv: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(parseNum(medDept.vlrDesvio || medDept.vlrDesv || '0'))}</p>
                </div>
              </div>
                );
              })()}

              {enrichedData.participacao && (
                <div className="glass-panel" style={{ padding: '1.5rem', marginTop: '2rem' }}>
                  <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>
                    % Participação Venda Efetiva sobre a Venda
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
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
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
                      
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
  return parseFloat(str.replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
}
