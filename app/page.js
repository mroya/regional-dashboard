'use client';

import React, { useState, useEffect } from 'react';
import { auth } from './lib/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';

// Hooks
import { useDashboardData } from './hooks/useDashboardData';
import { useWeather } from './hooks/useWeather';

// Components
import LoginPage from './components/LoginPage';
import Sidebar from './components/Sidebar';
import { RegionalHeader, DepartmentGrid } from './components/RegionalStats';
import RankingTable from './components/RankingTable';
import BranchDetail from './components/BranchDetail';
import PerformanceChart from './components/PerformanceChart';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState('LOGIN'); 
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authMessage, setAuthMessage] = useState('');

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [selectedFilial, setSelectedFilial] = useState('REGIONAL');
  const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'asc' });
  const [filterMeta, setFilterMeta] = useState('ALL');

  const getYesterdayStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  };
  const defaultDate = getYesterdayStr();
  const [referenceDate, setReferenceDate] = useState(defaultDate);

  const { enrichedData, loading, error, updatedAt, handleFileUpload, handleClearData } = useDashboardData(user, referenceDate);
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
    setAuthError('');
    try {
      if (authMode === 'LOGIN') await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      else await createUserWithEmailAndPassword(auth, loginEmail, loginPassword);
    } catch (err) { setAuthError(err.message); }
  };

  const handleLogout = () => signOut(auth);

  const shareWhatsApp = () => {
    if (!enrichedData) return;
    const { regional } = enrichedData;
    const msg = `📊 *RESUMO REGIONAL AREA 02*\n📅 Data: ${new Date(referenceDate + 'T12:00:00').toLocaleDateString('pt-BR')}\n📈 Ritmo: ${regional.percProj.toFixed(1)}%\n💰 Projeção: R$ ${Math.round(regional.projecaoFinal).toLocaleString('pt-BR')}\n🎯 Meta: R$ ${Math.round(regional.alvoMensalEst).toLocaleString('pt-BR')}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const shareFilialWhatsApp = (f) => {
    const msg = `🏪 *FILIAL ${f.id}*\n📅 Data: ${new Date(referenceDate + 'T12:00:00').toLocaleDateString('pt-BR')}\n📈 Ritmo: ${f.percProj.toFixed(1)}%\n💰 Projeção: R$ ${Math.round(f.projecaoFinal).toLocaleString('pt-BR')}\n🎯 Meta: R$ ${Math.round(f.alvoMensalEst).toLocaleString('pt-BR')}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  if (authLoading) return <div className="loading-screen">Carregando...</div>;
  if (!user) return <LoginPage {...{ authMode, setAuthMode, loginEmail, setLoginEmail, loginPassword, setLoginPassword, handleAuth, authError, authMessage }} />;

  return (
    <>
      {loading && <div className="pdf-loader">Processando PDF...</div>}
      <div className={`dashboard-container ${darkMode ? 'dark' : 'light'}`}>
        <Sidebar {...{ 
          user, sidebarOpen, setSidebarOpen, darkMode, setDarkMode, clock, weather, weatherIcon,
          referenceDate, setReferenceDate, defaultDate, 
          elapsedDays: enrichedData?.regional.currentElapsed || 1,
          selectedFilial, setSelectedFilial, enrichedData, updatedAt, handleFileUpload, handleClearData, handleLogout
        }} />

        <main className="main-content">
          {error && <div className="error-banner">{error}</div>}
          
          {enrichedData && (
            <div className="animate-fade-in">
              {selectedFilial === 'REGIONAL' ? (
                <>
                  <RegionalHeader regional={enrichedData.regional} shareWhatsApp={shareWhatsApp} />
                  <DepartmentGrid regionalDepts={enrichedData.regionalDepts} />
                  <PerformanceChart data={enrichedData.filiais} />
                  <RankingTable {...{ filiais: enrichedData.filiais, filterMeta, setFilterMeta, sortConfig, setSortConfig }} />
                </>
              ) : (
                <BranchDetail 
                  f={enrichedData.filiais.find(f => f.id === selectedFilial)} 
                  depts={enrichedData.departamentos}
                  setSelectedFilial={setSelectedFilial}
                  shareFilialWhatsApp={shareFilialWhatsApp}
                />
              )}
            </div>
          )}
        </main>

        {enrichedData?.regional && (
          <div className="version-footer">
            v1.3.0 | Refactored | D:{enrichedData.regional.currentElapsed} | T:{enrichedData.regional.totalDays}
          </div>
        )}
      </div>
    </>
  );
}
