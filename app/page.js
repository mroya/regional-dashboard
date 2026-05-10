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
import dynamic from 'next/dynamic';

const PerformanceChart = dynamic(() => import('./components/PerformanceChart'), {
  ssr: false,
  loading: () => <div style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>A carregar gráfico...</div>
});

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

  const getYesterdayStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
  };

  const [referenceDate, setReferenceDate] = useState(getYesterdayStr());
  const { data: enrichedData, loading, uploadStatus, error, updatedAt, handleFileUpload, handleClearData } = useDashboardData(user, referenceDate);
  const { clock, weather, weatherIcon } = useWeather();

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
          <div className="pdf-spinner">
            <div className="ring"></div>
            <p>{uploadStatus || 'Processando...'}</p>
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
              </div>

              <div className="charts-section">
                <RegionalStats data={enrichedData} />
              </div>
            </div>
          ) : (
            <BranchDetail 
              filial={enrichedData.filiais.find(f => f.id === selectedFilial)} 
              onBack={() => setSelectedFilial('REGIONAL')}
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
