'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { UploadCloud, TrendingUp, TrendingDown, Target, DollarSign, Percent, Activity, Save, LogOut, Lock, Mail, User, UserPlus, Key, Calendar, Menu, X, ChevronLeft, PieChart } from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut } from 'firebase/auth';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState('LOGIN'); 
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authMessage, setAuthMessage] = useState('');

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'asc' });
  const [filterMeta, setFilterMeta] = useState('ALL');
  const [selectedFilial, setSelectedFilial] = useState('REGIONAL');
  const [isSaving, setIsSaving] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [clock, setClock] = useState('');
  const [weather, setWeather] = useState(null);

  const getYesterdayStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  };

  const defaultDate = getYesterdayStr();
  const [referenceDate, setReferenceDate] = useState(defaultDate);
  const [elapsedDays, setElapsedDays] = useState(new Date(defaultDate + 'T12:00:00').getDate());

  // Live clock
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClock(now.toLocaleString('pt-BR', { weekday:'short', day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit' }));
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  // Weather forecast - Porto Alegre region (Open-Meteo, no key needed)
  useEffect(() => {
    fetch('https://api.open-meteo.com/v1/forecast?latitude=-30.0346&longitude=-51.2177&daily=precipitation_probability_max,weathercode,temperature_2m_max,temperature_2m_min&timezone=America%2FSao_Paulo&forecast_days=5')
      .then(r => r.json())
      .then(d => {
        const days = d.daily.time.map((date, i) => ({
          date,
          rain: d.daily.precipitation_probability_max[i],
          code: d.daily.weathercode[i],
          tMax: d.daily.temperature_2m_max[i],
          tMin: d.daily.temperature_2m_min[i],
        }));
        setWeather(days);
      })
      .catch(() => {});
  }, []);

  const weatherIcon = (code, rain) => {
    if (rain >= 70) return '🌧️';
    if (rain >= 40) return '🌦️';
    if (code <= 1) return '☀️';
    if (code <= 3) return '⛅';
    return '🌥️';
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const loadData = async () => {
      try {
        const docRef = doc(db, "reports", "latest");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const content = docSnap.data().content;
          setData(content);
          if (docSnap.data().elapsedDays) setElapsedDays(docSnap.data().elapsedDays);
          if (docSnap.data().referenceDate) setReferenceDate(docSnap.data().referenceDate);
          if (docSnap.data().updatedAtStr) setUpdatedAt(docSnap.data().updatedAtStr);
        }
      } catch (err) { console.error(err); }
    };
    loadData();
  }, [user]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError(''); setAuthMessage('');
    try {
      if (authMode === 'LOGIN') await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      else if (authMode === 'REGISTER') { await createUserWithEmailAndPassword(auth, loginEmail, loginPassword); setAuthMessage('Conta criada!'); }
      else if (authMode === 'RESET') { await sendPasswordResetEmail(auth, loginEmail); setAuthMessage('E-mail enviado!'); }
    } catch (err) { setAuthError('Falha na autenticação.'); }
  };

  const handleLogout = async () => { try { await signOut(auth); setData(null); } catch (err) { console.error(err); } };

  const parseNum = (str) => parseFloat(str?.replace(/[R$\s%]/g, '').replace(/\./g, '').replace(',', '.') || '0');
  const formatDateBR = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true); setError(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/parse-pdf', { method: 'POST', body: formData });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao processar PDF');
      const parsed = parseRawRows(json.rawRows);
      setData(parsed);
      const nowStr = new Date().toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
      setUpdatedAt(nowStr);
      setIsSaving(true);
      await setDoc(doc(db, "reports", "latest"), { 
        content: parsed, 
        elapsedDays: elapsedDays, 
        referenceDate: referenceDate,
        updatedAtStr: nowStr, 
        updatedAt: serverTimestamp() 
      });
      setIsSaving(false);
      setSidebarOpen(false);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const handleClearData = async () => {
    if (!confirm('Tem certeza que deseja limpar todos os dados do dashboard?')) return;
    try {
      setLoading(true);
      await deleteDoc(doc(db, 'reports', 'latest'));
      setData(null);
      alert('Dados limpos com sucesso!');
    } catch (err) {
      setError('Erro ao limpar dados: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const parseRawRows = (rows) => {
    let result = { geral: { diasUteis: '31' }, filiais: [], departamentos: [] };
    let currentSection = 'GERAL'; 
    const branchesMap = new Map();
    const knownBranches = ["38", "44", "113", "167", "171", "184", "186", "192", "313", "347", "351", "376", "378", "441", "456", "464", "487", "778", "829", "831", "868", "876(POA)", "922(POA)"];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const joined = row.join(' ');
      
      const matchDias = joined.match(/Dias\s*Úteis[:\s]*(\d+)/i);
      if (matchDias) result.geral.diasUteis = matchDias[1];
      
      if (joined.includes('Indicadores Gerais')) currentSection = 'GERAL';
      else if (joined.includes('Vda Eft Meta Dia % Desv')) currentSection = 'RANKING';
      else if (joined.includes('MEDICAMENTO TOTAL')) currentSection = 'MEDICAMENTO_GERAL';
      else if (joined.includes('GENÉRICO')) currentSection = 'GENERICO';
      else if (joined.includes('HB (Não Medicamento)')) currentSection = 'HB';
      else if (joined.includes('PRODUTOS PANVEL')) currentSection = 'PANVEL';

      // Strict branch parsing: ONLY in RANKING section, must start with rank, must have currency and %
      const rankVal = parseInt(row[0]);
      const isRank = !isNaN(rankVal) && rankVal > 0 && rankVal < 200; // Rank is usually 1-100
      
      if (currentSection === 'RANKING' && isRank && row.length >= 5) {
        const numericCols = row.slice(1).filter(c => {
          const clean = c.replace(/[R$\s%]/g, '');
          return clean.length > 0 && !isNaN(clean.replace(/\./g, '').replace(',', '.'));
        });
        
        const hasPercent = row.some(c => c.includes('%'));

        if (numericCols.length >= 2 && hasPercent) {
          const vdaVal = numericCols[0];
          const metaVal = numericCols[1];
          // Try to find a known branch code in the row, or fallback to rank
          const branchCode = row.find(c => knownBranches.includes(c));
          const finalId = branchCode || row[0];
          
          if (!branchesMap.has(finalId)) {
            branchesMap.set(finalId, {
              id: finalId,
              vdaEft: vdaVal,
              metaDia: metaVal,
              desvioPerc: row.find(c => c.includes('%')) || '0%',
              evolucaoPerc: row[row.length - 1] || '0%'
            });
          }
        }
      }

      if (['MEDICAMENTO_GERAL', 'GENERICO', 'HB', 'PANVEL', 'MEDICAMENTO_BIO'].includes(row[0])) {
        result.departamentos.push({
          id: 'REGIONAL',
          departamento: row[0],
          vdaEft: row[1] || '0',
          desvioPerc: row[4] || '0%',
          evolucaoPerc: row[10] || '0%'
        });
      }
    }
    result.filiais = Array.from(branchesMap.values());
    return result;
  };

  const enrichedData = useMemo(() => {
    if (!data) return null;
    
    // Force calculation based on the SELECTED date in the UI, ignoring potentially stale state
    const refDateObj = new Date(referenceDate + 'T12:00:00');
    const currentElapsed = refDateObj.getDate() || 1;
    const parsedDays = parseInt(data.geral.diasUteis);
    const totalDays = (!isNaN(parsedDays) && parsedDays > 25) ? parsedDays : 31;
    
    const filiais = data.filiais.map(f => {
      const vdaEft = parseNum(f.vdaEft);
      const metaDia = parseNum(f.metaDia);
      
      // Calculate daily averages using the verified date
      const vdaMedia = currentElapsed > 0 ? vdaEft / currentElapsed : 0;
      const metaMedia = currentElapsed > 0 ? metaDia / currentElapsed : 0;
      
      const projecaoFinal = vdaMedia * totalDays;
      const alvoMensalEst = metaMedia * totalDays;
      
      const percProj = alvoMensalEst > 0 ? (projecaoFinal / alvoMensalEst) * 100 : 0;
      const status = percProj >= 100 ? 'SUCCESS' : (percProj >= 95 ? 'WARNING' : 'DANGER');
      
      return { 
        ...f, 
        vdaEftNum: vdaEft,
        metaDiaNum: metaDia,
        projecaoFinal, 
        alvoMensalEst, 
        percProj, 
        status, 
        dentroMeta: parseNum(f.desvioPerc) >= 0,
        mediaReal: vdaMedia,
        mediaAlvoNec: (totalDays - elapsedDays) > 0 ? (alvoMensalEst - vdaEft) / (totalDays - elapsedDays) : 0
      };
    });

    const regional = {
      vdaEft: filiais.reduce((acc, f) => acc + f.vdaEftNum, 0),
      metaDia: filiais.reduce((acc, f) => acc + f.metaDiaNum, 0),
    };

    // Calculate regional projections based on AGGREGATE totals for maximum accuracy
    const regionalVdaMedia = currentElapsed > 0 ? regional.vdaEft / currentElapsed : 0;
    const regionalMetaMedia = currentElapsed > 0 ? regional.metaDia / currentElapsed : 0;
    
    regional.projecaoFinal = regionalVdaMedia * totalDays;
    regional.alvoMensalEst = regionalMetaMedia * totalDays;
    
    regional.mediaReal = regionalVdaMedia;
    regional.mediaAlvoNec = (totalDays - currentElapsed) > 0 ? (regional.alvoMensalEst - regional.vdaEft) / (totalDays - currentElapsed) : 0;
    
    regional.percProj = regional.alvoMensalEst > 0 ? (regional.projecaoFinal / regional.alvoMensalEst) * 100 : 0;
    regional.status = regional.percProj >= 100 ? 'SUCCESS' : (regional.percProj >= 95 ? 'WARNING' : 'DANGER');
    regional.dentroMeta = regional.percProj >= 100;

    const deptKeys = ['MEDICAMENTO_GERAL', 'GENERICO', 'HB', 'PANVEL', 'MEDICAMENTO_BIO'];
    const regionalDepts = deptKeys.map(k => {
      const dItems = data.departamentos.filter(d => d.departamento === k);
      if (dItems.length === 0) return null;
      const deptVdaTotal = dItems.reduce((acc, d) => acc + parseNum(d.vdaEft), 0);
      const share = regional.vdaEft > 0 ? (deptVdaTotal / regional.vdaEft) * 100 : 0;
      const avgDesvio = dItems.reduce((acc, d) => acc + parseNum(d.desvioPerc), 0) / dItems.length;
      const avgEvol = dItems.reduce((acc, d) => acc + parseNum(d.evolucaoPerc), 0) / dItems.length;
      return {
        departamento: k,
        share: share.toFixed(1).replace('.', ',') + '%',
        desvioPerc: avgDesvio.toFixed(1).replace('.', ',') + '%',
        evolucaoPerc: avgEvol.toFixed(1).replace('.', ',') + '%'
      };
    }).filter(Boolean);

    const departamentos = data.departamentos.map(d => {
      const branch = filiais.find(f => f.id === d.id);
      const branchTotal = branch ? branch.vdaEftNum : 0;
      const share = branchTotal > 0 ? (parseNum(d.vdaEft) / branchTotal) * 100 : 0;
      return { ...d, share: share.toFixed(1).replace('.', ',') + '%' };
    });

    const debug = { currentElapsed, totalDays, regionalMeta: regional.metaDia, regionalVda: regional.vdaEft, ver: '1.2.2' };
    return { ...data, filiais, regional, regionalDepts, departamentos, debug };
  }, [data, referenceDate, elapsedDays]);

  const filteredFiliais = useMemo(() => {
    if (!enrichedData) return [];
    let items = [...enrichedData.filiais];
    if (filterMeta === 'NA_META') items = items.filter(f => f.dentroMeta);
    if (filterMeta === 'ABAIXO') items = items.filter(f => !f.dentroMeta);
    if (sortConfig.key) {
      items.sort((a, b) => {
        let aV = a[sortConfig.key]; let bV = b[sortConfig.key];
        if (typeof aV === 'string') { aV = parseNum(aV); bV = parseNum(bV); }
        return sortConfig.direction === 'asc' ? aV - bV : bV - aV;
      });
    }
    return items;
  }, [enrichedData, filterMeta, sortConfig]);

  const shareWhatsApp = () => {
    if (!enrichedData) return;
    const date = new Date(referenceDate + 'T12:00:00').toLocaleDateString('pt-BR');
    const naMetaCount = enrichedData.filiais.filter(f => f.dentroMeta).length;
    const total = enrichedData.filiais.length;
    const avgProj = (enrichedData.filiais.reduce((acc, f) => acc + f.percProj, 0) / total).toFixed(1);
    const lines = [
      `📊 *Ranking Regional - Área 02 Sul POA*`,
      `📅 ${date} | Dia ${elapsedDays} de ${enrichedData.geral.diasUteis}`,
      ``,
      `📈 Ritmo Regional: *${avgProj}%*`,
      `${naMetaCount === total ? '🏆' : '⚠️'} Na Meta: *${naMetaCount} de ${total}* filiais`,
      ``,
      ...filteredFiliais.map(f => {
        const icon = f.status === 'SUCCESS' ? '🟢' : f.status === 'WARNING' ? '🟡' : '🔴';
        const pad = f.id.toString().padEnd(8);
        return `${icon} Fil. ${pad}→ *${f.percProj.toFixed(1)}%* (Desv: ${f.desvioPerc})`;
      }),
      ``,
      `_Enviado via Dashboard Regional_`
    ];
    const text = encodeURIComponent(lines.join('\n'));
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const shareFilialWhatsApp = (f) => {
    const date = new Date(referenceDate + 'T12:00:00').toLocaleDateString('pt-BR');
    const statusEmoji = f.status === 'SUCCESS' ? '🟢' : f.status === 'WARNING' ? '🟡' : '🔴';
    const statusText = f.dentroMeta ? '✅ Na Meta' : '⚠️ Abaixo da Meta';
    const lines = [
      `📊 *Filial ${f.id} - Área 02 Sul POA*`,
      `📅 ${date} | Dia ${elapsedDays} de ${enrichedData.geral.diasUteis}`,
      `${statusEmoji} *${statusText}*`,
      ``,
      `💰 Venda Acumulada: *${f.vdaEft}*`,
      `🎯 Meta Diária: *R$ ${f.metaDia}*`,
      `📉 Desvio Atual: *${f.desvioPerc}*`,
      ``,
      `📈 Projeção Mês: *R$ ${f.projecaoFinal.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}*`,
      `🏁 Meta Mensal Est.: *R$ ${f.alvoMensalEst.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}*`,
      `📊 % Projeção: *${f.percProj.toFixed(1)}%*`,
      ``,
      `⚡ Média/dia Real: *R$ ${f.mediaReal.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}*`,
      `🎯 Meta/dia Nec.: *R$ ${f.mediaAlvoNec?.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}*`,
      ``,
      `_Enviado via Dashboard Regional_`
    ];
    const text = encodeURIComponent(lines.join('\n'));
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  if (authLoading) return <div className="loading-screen"><Activity className="animate-spin" size={48} color="#3b82f6" /></div>;

  if (!user) return (
    <div className="auth-container">
      <div className="glass-panel auth-card animate-fade-in">
        <div className="auth-header">
          <div className="auth-icon">{authMode === 'LOGIN' ? <Lock size={30} /> : <UserPlus size={30} />}</div>
          <h2>{authMode === 'LOGIN' ? 'Regional Varejo' : 'Nova Conta'}</h2>
        </div>
        <form onSubmit={handleAuth} className="auth-form">
          <div className="input-group"><Mail size={18} /><input type="email" placeholder="E-mail" required value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} /></div>
          <div className="input-group"><Lock size={18} /><input type="password" placeholder="Senha" required value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} /></div>
          {authError && <p className="error-text" style={{color:'var(--danger)', fontSize:'0.8rem'}}>{authError}</p>}
          <button type="submit" className="btn primary-btn">{authMode === 'LOGIN' ? 'Entrar' : 'Cadastrar'}</button>
        </form>
        <div className="auth-footer">
          <button className="text-btn" onClick={() => setAuthMode(authMode === 'LOGIN' ? 'REGISTER' : 'LOGIN')}>{authMode === 'LOGIN' ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Faça Login'}</button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {loading && (
        <div className="pdf-loading-overlay">
          <div className="pdf-spinner">
            <div className="ring"></div>
            <div className="ring"></div>
            <div className="ring"></div>
            <div className="icon-center">📄</div>
          </div>
          <div className="pdf-loading-text">
            <h3>Processando Relatório...</h3>
            <p>Lendo e interpretando os dados do PDF</p>
          </div>
          <div className="pdf-loading-dots">
            <span></span><span></span><span></span>
          </div>
        </div>
      )}
    <div className={`dashboard-container ${darkMode ? 'dark' : 'light'}`}>
      {user && (
        <>
          <div className="mobile-header">
            <button className="menu-toggle" onClick={() => setSidebarOpen(true)}><Menu size={24} /></button>
            <h3>Área 02</h3>
            <div style={{width: 40}}></div>
          </div>

          <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
            {/* Sidebar Header */}
            <div className="sidebar-header">
              <div style={{flex:1}}>
                <h3 style={{marginBottom:'0.1rem'}}>Dashboard</h3>
                <p style={{display:'flex', alignItems:'center', gap:'0.3rem', fontSize:'0.8rem', color:'var(--text-secondary)'}}>
                  <User size={11} /> {user.email?.split('@')[0]}
                </p>
              </div>
              <div style={{display:'flex', gap:'0.4rem', alignItems:'center', flexShrink:0}}>
                <button onClick={() => setDarkMode(!darkMode)} className="menu-toggle" title={darkMode ? 'Modo Dia' : 'Modo Noite'} style={{fontSize:'1rem', padding:'0.4rem'}}>
                  {darkMode ? '☀️' : '🌙'}
                </button>
                {sidebarOpen && <button className="menu-toggle" onClick={() => setSidebarOpen(false)} style={{padding:'0.4rem'}}><X size={18} /></button>}
              </div>
            </div>

            {/* Clock */}
            <div className="glass-panel" style={{padding:'0.75rem 1rem', textAlign:'center'}}>
              <p style={{fontSize:'0.7rem', color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'0.2rem'}}>🕐 Agora</p>
              <p style={{fontSize:'0.85rem', fontWeight:600, letterSpacing:'0.02em'}}>{clock}</p>
            </div>

            {/* Weather widget */}
            {weather && (
              <div className="glass-panel" style={{padding:'0.75rem 1rem'}}>
                <p style={{fontSize:'0.7rem', color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'0.6rem'}}>🌦️ Previsão POA</p>
                <div style={{display:'flex', justifyContent:'space-between', gap:'0.25rem'}}>
                  {weather.slice(0,5).map((d, i) => (
                    <div key={i} style={{textAlign:'center', flex:1}}>
                      <div style={{fontSize:'1.1rem'}}>{weatherIcon(d.code, d.rain)}</div>
                      <div style={{fontSize:'0.6rem', color:'var(--text-secondary)', marginTop:'0.2rem'}}>
                        {new Date(d.date+'T12:00:00').toLocaleDateString('pt-BR', {weekday:'short'}).replace('.','')}
                      </div>
                      <div style={{fontSize:'0.65rem', fontWeight:600, color: d.rain >= 60 ? '#3b82f6' : 'var(--text-primary)'}}>
                        {d.rain}%
                      </div>
                      <div style={{fontSize:'0.6rem', color:'var(--text-secondary)'}}>
                        {Math.round(d.tMax)}°
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="sidebar-controls">

              {/* Date picker - calculates elapsed days automatically */}
              <div className="glass-panel control-card">
                <label style={{display:'flex', alignItems:'center', gap:'0.4rem', marginBottom:'0.5rem'}}>
                  <Calendar size={14} /> Data de Referência
                </label>
                <div style={{position: 'relative', width: '100%', marginBottom: '0.4rem'}}>
                  <div className="date-display" style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    pointerEvents: 'none'
                  }}>
                    {formatDateBR(referenceDate)}
                    <Calendar size={12} style={{opacity: 0.5}}/>
                  </div>
                  <input 
                    type="date" 
                    value={referenceDate}
                    max={defaultDate}
                    onChange={(e) => {
                      const val = e.target.value;
                      setReferenceDate(val);
                      if (val) {
                        const ref = new Date(val + 'T12:00:00');
                        const days = ref.getDate();
                        setElapsedDays(days > 0 ? days : 1);
                      }
                    }}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      opacity: 0,
                      cursor: 'pointer',
                      appearance: 'none'
                    }}
                  />
                </div>
                <p style={{fontSize:'0.72rem', color:'var(--text-secondary)'}}>
                  📅 {elapsedDays} dia{elapsedDays !== 1 ? 's' : ''} decorrido{elapsedDays !== 1 ? 's' : ''}
                </p>
              </div>

              <div className="glass-panel control-card">
                <label style={{display:'flex', alignItems:'center', gap:'0.4rem', marginBottom:'0.5rem'}}>
                  Unidade
                </label>
                <select value={selectedFilial} onChange={(e) => { setSelectedFilial(e.target.value); setSidebarOpen(false); }} className="glass-select">
                  <option value="REGIONAL">Visão Regional</option>
                  {enrichedData?.filiais.map(f => <option key={f.id} value={f.id}>Filial {f.id}</option>)}
                </select>
              </div>

              {/* Last updated card */}
              {updatedAt && (
                <div className="glass-panel control-card" style={{fontSize:'0.75rem', textAlign:'center', padding:'0.75rem'}}>
                  <div style={{color:'var(--text-secondary)', marginBottom:'0.2rem'}}>🕐 Última atualização</div>
                  <div style={{color:'var(--accent-primary)', fontWeight:600}}>{updatedAt}</div>
                </div>
              )}

            </div>

            <label className="upload-btn"><UploadCloud size={20} /> <span>Carregar PDF</span><input type="file" accept="application/pdf" onChange={handleFileUpload} style={{ display: 'none' }} /></label>
            <button onClick={handleLogout} className="btn outline-btn" style={{marginTop:'auto', color:'var(--danger)'}}><LogOut size={18} /> Sair</button>
          </aside>
        </>
      )}

      <main className="main-content">
        {enrichedData && (
          <div className="animate-fade-in">
            {selectedFilial === 'REGIONAL' ? (
              <>
                <div className="detail-grid" style={{ marginBottom: '2rem' }}>
                  {/* Header with conditional color */}
                  <div style={{
                    borderRadius: 'var(--radius-md)',
                    background: enrichedData.regional.dentroMeta
                      ? 'linear-gradient(135deg, rgba(16,185,129,0.25), rgba(16,185,129,0.05))'
                      : 'linear-gradient(135deg, rgba(239,68,68,0.25), rgba(239,68,68,0.05))',
                    border: `1px solid ${enrichedData.regional.dentroMeta ? 'rgba(16,185,129,0.5)' : 'rgba(239,68,68,0.5)'}`,
                    padding: '1.5rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1rem',
                    boxShadow: enrichedData.regional.dentroMeta ? '0 0 30px rgba(16,185,129,0.15)' : '0 0 30px rgba(239,68,68,0.15)'
                  }}>
                    <div style={{display:'flex', alignItems:'center', gap:'1rem'}}>
                      <div>
                        <p style={{fontSize:'0.75rem', color: enrichedData.regional.dentroMeta ? '#10b981' : '#ef4444', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em'}}>
                          {enrichedData.regional.dentroMeta ? '✅ Regional na Meta' : '⚠️ Regional Abaixo da Meta'}
                        </p>
                        <h2 style={{fontSize:'1.8rem'}}>Área 02 Sul POA</h2>
                      </div>
                    </div>
                    <div style={{display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'0.75rem'}}>
                      <div style={{display:'flex', gap:'0.5rem'}}>
                        <div className="glass-panel" style={{padding:'0.4rem 0.8rem', fontSize:'0.7rem', display:'flex', alignItems:'center', gap:'0.4rem'}}>
                          <Calendar size={12} /> {elapsedDays} / {enrichedData.geral.diasUteis} dias
                        </div>
                        <button
                          onClick={shareWhatsApp}
                          className="whatsapp-btn"
                          title="Compartilhar resumo regional no WhatsApp"
                        >
                          <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                          Compartilhar Geral
                        </button>
                      </div>
                      <div style={{textAlign:'right'}}>
                        <p style={{fontSize:'0.75rem', color:'var(--text-secondary)'}}>Ritmo Regional</p>
                        <p style={{fontSize:'2.5rem', fontWeight:800, color: enrichedData.regional.dentroMeta ? '#10b981' : '#ef4444', lineHeight:1}}>{enrichedData.regional.percProj.toFixed(1)}%</p>
                      </div>
                    </div>
                  </div>

                  {/* Stat cards with color accent */}
                  <div className="detail-stats">
                    <div className="glass-panel stat-card" style={{borderTop: `3px solid ${enrichedData.regional.dentroMeta ? '#10b981' : '#ef4444'}`}}>
                      <div className="stat-label">Projeção (Regional)</div>
                      <div className="stat-value" style={{color: enrichedData.regional.dentroMeta ? '#10b981' : '#ef4444'}}>R$ {enrichedData.regional.projecaoFinal.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</div>
                      <div className="stat-sub">Meta: R$ {enrichedData.regional.alvoMensalEst.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</div>
                    </div>
                    <div className="glass-panel stat-card" style={{borderTop: '3px solid #3b82f6'}}>
                      <div className="stat-label">Meta Diária (Total)</div>
                      <div className="stat-value" style={{color:'#3b82f6'}}>R$ {enrichedData.regional.metaDia.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</div>
                    </div>
                    <div className="glass-panel stat-card" style={{borderTop: '3px solid #8b5cf6'}}>
                      <div className="stat-label">Média Diária Regional</div>
                      <div className="stat-value" style={{color:'#8b5cf6'}}>R$ {enrichedData.regional.mediaReal.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</div>
                      <div className="stat-sub">Meta/dia: R$ {enrichedData.regional.mediaAlvoNec?.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</div>
                    </div>
                  </div>

                  {/* Departments */}
                  <div className="glass-panel depts-box">
                    <h4>Média de Departamentos (Regional)</h4>
                    <div className="depts-grid">
                      {[{ k: 'MEDICAMENTO_GERAL', l: 'Medicamento' }, { k: 'GENERICO', l: 'Genérico' }, { k: 'HB', l: 'HB' }, { k: 'PANVEL', l: 'Panvel' }].map(dept => {
                        const d = enrichedData.regionalDepts.find(x => x.departamento === dept.k);
                        if (!d) return null;
                        const isPos = parseNum(d.desvioPerc) >= 0;
                        return (
                          <div key={dept.k} className="dept-card" style={{borderTop: `2px solid ${isPos ? '#10b981' : '#ef4444'}`, padding: '0.6rem'}}>
                            <div className="dept-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.3rem', marginBottom: '0.5rem' }}>
                              <span style={{fontWeight: 700, fontSize: '0.7rem', opacity: 0.8}}>{dept.l}</span>
                              <span style={{ color: 'var(--accent-primary)', fontWeight: 700, fontSize: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.2rem', opacity: 0.9 }}>
                                <PieChart size={9} /> PART. {d.share}
                              </span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                                <span style={{fontSize: '0.55rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600}}>Desv.</span>
                                <span style={{ color: isPos ? 'var(--success)' : 'var(--danger)', fontWeight: 800, fontSize: '1.2rem', lineHeight: 1 }}>{d.desvioPerc}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <span style={{fontSize: '0.55rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600}}>Evol.</span>
                                <span style={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.75rem' }}>{d.evolucaoPerc}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="glass-panel" style={{height:'400px', minHeight: '400px', padding:'1.5rem', overflow: 'hidden'}}>
                  <h3 style={{marginBottom:'1.5rem', fontSize:'1.1rem'}}>Estimativa de Fechamento (%)</h3>
                  <div style={{width: '100%', height: '300px'}}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={enrichedData.filiais}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis dataKey="id" stroke="var(--text-secondary)" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="var(--text-secondary)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}%`} />
                        <Tooltip 
                          contentStyle={{backgroundColor:'rgba(15,23,42,0.9)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'8px'}}
                          itemStyle={{color:'var(--text-primary)'}}
                          formatter={(value) => [`${value.toFixed(1)}%`, 'Projeção']}
                        />
                        <Bar dataKey="percProj" radius={[4, 4, 0, 0]}>
                          {enrichedData.filiais.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.percProj >= 100 ? '#10b981' : (entry.percProj >= 95 ? '#f59e0b' : '#ef4444')} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="glass-panel table-box">
                  <div className="table-header">
                    <h4>Ranking Regional</h4>
                    <div style={{display:'flex', gap:'0.5rem', alignItems:'center', flexWrap:'wrap'}}>
                      <div className="table-filters">
                        <button className={filterMeta === 'ALL' ? 'active' : ''} onClick={() => setFilterMeta('ALL')}>Todas</button>
                        <button className={filterMeta === 'ABAIXO' ? 'active' : ''} onClick={() => setFilterMeta('ABAIXO')}>Abaixo</button>
                      </div>
                      <button
                        onClick={shareWhatsApp}
                        className="whatsapp-btn"
                        title="Compartilhar resumo no WhatsApp"
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                        Compartilhar
                      </button>
                    </div>
                  </div>
                  <div className="scroll-table">
                    <table>
                      <thead>
                        <tr>
                          <th onClick={() => setSortConfig({ key: 'id', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' })}>Filial</th>
                          <th>Vda Eft</th>
                          <th>Meta Dia</th>
                          <th onClick={() => setSortConfig({ key: 'percProj', direction: 'desc' })}>% Proj.</th>
                          <th>Desvio</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredFiliais.map(f => (
                          <tr 
                            key={f.id} 
                            onClick={() => setSelectedFilial(f.id)} 
                            style={{
                              cursor: 'pointer',
                              background: f.dentroMeta 
                                ? 'rgba(16, 185, 129, 0.07)' 
                                : 'rgba(239, 68, 68, 0.07)',
                              borderLeft: `3px solid ${f.dentroMeta ? '#10b981' : '#ef4444'}`,
                              transition: 'background 0.2s'
                            }}
                          >
                            <td>
                              <span style={{display:'flex', alignItems:'center', gap:'0.5rem'}}>
                                <span style={{fontSize:'0.8rem'}}>{f.dentroMeta ? '🟢' : '🔴'}</span>
                                <strong>{f.id}</strong>
                              </span>
                            </td>
                            <td>{f.vdaEft}</td>
                            <td>{f.metaDia}</td>
                            <td className={f.status === 'SUCCESS' ? 'text-success' : f.status === 'WARNING' ? 'text-warning' : 'text-danger'} style={{ fontWeight: 700 }}>{f.percProj.toFixed(1)}%</td>
                            <td style={{ color: parseNum(f.desvioPerc) >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>{f.desvioPerc}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="filial-detail-view animate-fade-in">
                {(() => {
                  const f = enrichedData.filiais.find(x => x.id === selectedFilial);
                  if (!f) return null;
                  const depts = enrichedData.departamentos.filter(d => d.id === selectedFilial);
                  return (
                    <div className="detail-grid">
                      {/* Header with conditional color */}
                      <div style={{
                        borderRadius: 'var(--radius-md)',
                        background: f.dentroMeta
                          ? 'linear-gradient(135deg, rgba(16,185,129,0.25), rgba(16,185,129,0.05))'
                          : 'linear-gradient(135deg, rgba(239,68,68,0.25), rgba(239,68,68,0.05))',
                        border: `1px solid ${f.dentroMeta ? 'rgba(16,185,129,0.5)' : 'rgba(239,68,68,0.5)'}`,
                        padding: '1.5rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '1rem',
                        boxShadow: f.dentroMeta ? '0 0 30px rgba(16,185,129,0.15)' : '0 0 30px rgba(239,68,68,0.15)'
                      }}>
                        <div style={{display:'flex', alignItems:'center', gap:'1rem'}}>
                          <button onClick={() => setSelectedFilial('REGIONAL')} className="menu-toggle"><ChevronLeft size={20}/></button>
                          <div>
                            <p style={{fontSize:'0.75rem', color: f.dentroMeta ? '#10b981' : '#ef4444', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em'}}>
                              {f.dentroMeta ? '✅ Na Meta' : '⚠️ Abaixo da Meta'}
                            </p>
                            <h2 style={{fontSize:'1.8rem'}}>Filial {f.id}</h2>
                          </div>
                        </div>
                        <div style={{display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'0.75rem'}}>
                          <button
                            onClick={() => shareFilialWhatsApp(f)}
                            className="whatsapp-btn"
                            title="Compartilhar dados desta filial no WhatsApp"
                          >
                            <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                            Enviar p/ Gerente
                          </button>
                          <div style={{textAlign:'right'}}>
                            <p style={{fontSize:'0.75rem', color:'var(--text-secondary)'}}>Projeção de Fechamento</p>
                            <p style={{fontSize:'2.5rem', fontWeight:800, color: f.dentroMeta ? '#10b981' : '#ef4444', lineHeight:1}}>{f.percProj.toFixed(1)}%</p>
                          </div>
                        </div>
                      </div>

                      {/* Stat cards with color accent */}
                      <div className="detail-stats">
                        <div className="glass-panel stat-card" style={{borderTop: `3px solid ${f.dentroMeta ? '#10b981' : '#ef4444'}`}}>
                          <div className="stat-label">Projeção (Mês)</div>
                          <div className="stat-value" style={{color: f.dentroMeta ? '#10b981' : '#ef4444'}}>R$ {f.projecaoFinal.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</div>
                          <div className="stat-sub">Meta: R$ {f.alvoMensalEst.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</div>
                        </div>
                        <div className="glass-panel stat-card" style={{borderTop: '3px solid #3b82f6'}}>
                          <div className="stat-label">Meta Diária</div>
                          <div className="stat-value" style={{color:'#3b82f6'}}>R$ {f.metaDia}</div>
                        </div>
                        <div className="glass-panel stat-card" style={{borderTop: '3px solid #8b5cf6'}}>
                          <div className="stat-label">Média Diária Real</div>
                          <div className="stat-value" style={{color:'#8b5cf6'}}>R$ {f.mediaReal.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</div>
                          <div className="stat-sub">Meta/dia: R$ {f.mediaAlvoNec?.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</div>
                        </div>
                      </div>

                      {/* Departments */}
                      <div className="glass-panel depts-box">
                        <h4>Departamentos</h4>
                        <div className="depts-grid">
                          {[{ k: 'MEDICAMENTO_GERAL', l: 'Medicamento' }, { k: 'GENERICO', l: 'Genérico' }, { k: 'HB', l: 'HB' }, { k: 'PANVEL', l: 'Panvel' }].map(dept => {
                            const d = depts.find(x => x.departamento === dept.k);
                            if (!d) return null;
                            const isPos = parseNum(d.desvioPerc) >= 0;
                            return (
                              <div key={dept.k} className="dept-card" style={{borderTop: `2px solid ${isPos ? '#10b981' : '#ef4444'}`}}>
                                  <div className="dept-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.3rem', marginBottom: '0.5rem' }}>
                                    <span style={{fontWeight: 700, fontSize: '0.7rem', opacity: 0.8}}>{dept.l}</span>
                                    <span style={{ color: 'var(--accent-primary)', fontWeight: 700, fontSize: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.2rem', opacity: 0.9 }}>
                                      <PieChart size={9} /> PART. {d.share}
                                    </span>
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                                      <span style={{fontSize: '0.55rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600}}>Desv.</span>
                                      <span style={{ color: isPos ? 'var(--success)' : 'var(--danger)', fontWeight: 800, fontSize: '1.2rem', lineHeight: 1 }}>{d.desvioPerc}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                      <span style={{fontSize: '0.55rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600}}>Evol.</span>
                                      <span style={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.75rem' }}>{d.evolucaoPerc}</span>
                                    </div>
                                  </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </main>
      
      {/* Debug Panel */}
      {enrichedData?.debug && (
        <div style={{position:'fixed', bottom:0, right:0, background:'rgba(0,0,0,0.8)', color:'#aaa', fontSize:'10px', padding:'4px 8px', borderRadius:'4px 0 0 0', zIndex:9999}}>
          v{enrichedData.debug.ver} | D:{enrichedData.debug.currentElapsed} | T:{enrichedData.debug.totalDays} | M:{Math.round(enrichedData.debug.regionalMeta)}
        </div>
      )}
    </div>
    </>
  );
}
