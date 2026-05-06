'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { UploadCloud, TrendingUp, TrendingDown, Target, DollarSign, Percent, Activity, Save, LogOut, Lock, Mail, User, UserPlus, Key, Calendar, Menu, X, ChevronLeft } from 'lucide-react';
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

  const [elapsedDays, setElapsedDays] = useState(new Date().getDate() - 1 || 1);

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
      setIsSaving(true);
      await setDoc(doc(db, "reports", "latest"), { content: parsed, elapsedDays: elapsedDays, updatedAt: serverTimestamp() });
      setIsSaving(false);
      setSidebarOpen(false);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const parseRawRows = (rows) => {
    let result = { geral: { diasUteis: '31' }, filiais: [], departamentos: [] };
    let currentSection = 'GERAL'; 
    const knownBranches = ["38", "44", "113", "167", "171", "184", "186", "192", "313", "347", "351", "376", "378", "441", "456", "464", "487", "778", "829", "831", "868", "876(POA)", "922(POA)"];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const joined = row.join(' ');
      const matchDias = joined.match(/Dias\s*Úteis:\s*(\d+)/);
      if (matchDias) result.geral.diasUteis = matchDias[1];
      if (joined.includes('Indicadores Gerais')) currentSection = 'GERAL';
      else if (joined.includes('MEDICAMENTO TOTAL')) currentSection = 'MEDICAMENTO_GERAL';
      else if (joined.includes('MEDICAMENTO - BIO')) currentSection = 'MEDICAMENTO_BIO';
      else if (joined.includes('GENÉRICO')) currentSection = 'GENERICO';
      else if (joined.includes('HB (Não Medicamento)')) currentSection = 'HB';
      else if (joined.includes('PRODUTOS PANVEL')) currentSection = 'PANVEL';
      else if (joined.includes('CUPOM BEM PANVEL')) currentSection = 'CUPOM';
      else if (joined.includes('TROCO AMIGO')) currentSection = 'TROCO';

      if (row.length > 3 && knownBranches.includes(row[0])) {
        const filialId = row[0];
        if (currentSection === 'GERAL' && row.length > 5) {
          result.filiais.push({
            id: filialId,
            vdaEft: row[1] || '0',
            vdaOnt: row[2] || '0',
            alvo: row[3] || '0',
            desvioPerc: row[4] || '0%',
            evolucaoPerc: row[5] || '0%',
            dentroMeta: parseFloat((row[4]||'0').replace(',','.')) >= 0
          });
        }
        if (['MEDICAMENTO_GERAL', 'GENERICO', 'HB', 'PANVEL', 'MEDICAMENTO_BIO'].includes(currentSection)) {
          result.departamentos.push({ id: filialId, departamento: currentSection, desvioPerc: row[4] || '0%', evolucaoPerc: row[5] || '0%' });
        }
      }
    }
    return result;
  };

  const enrichedData = useMemo(() => {
    if (!data) return null;
    const diasTotais = parseInt(data.geral.diasUteis || '31');
    const filiais = data.filiais.map(f => {
      const vdaEft = parseNum(f.vdaEft);
      const alvoPer = parseNum(f.alvo);
      const alvoMensalEst = elapsedDays > 0 ? (alvoPer / elapsedDays) * diasTotais : alvoPer;
      const mediaReal = elapsedDays > 0 ? vdaEft / elapsedDays : 0;
      const projecaoFinal = mediaReal * diasTotais;
      const percProj = alvoMensalEst > 0 ? (projecaoFinal / alvoMensalEst) * 100 : 0;
      const status = percProj >= 100 ? 'SUCCESS' : (percProj >= 95 ? 'WARNING' : 'DANGER');
      return { ...f, mediaReal, projecaoFinal, alvoMensalEst, percProj, status, mediaAlvoNec: diasTotais > 0 ? (alvoMensalEst / diasTotais) : 0 };
    });
    return { ...data, filiais };
  }, [data, elapsedDays]);

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
    <div className="dashboard-container">
      {user && (
        <>
          <div className="mobile-header">
            <button className="menu-toggle" onClick={() => setSidebarOpen(true)}><Menu size={24} /></button>
            <h3>Área 02</h3>
            <div style={{width: 40}}></div>
          </div>

          <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
            <div className="sidebar-header">
              <div><h3>Dashboard</h3><p><User size={12} /> {user.email?.split('@')[0]}</p></div>
              <button className="menu-toggle" onClick={() => setSidebarOpen(false)} style={{display: sidebarOpen ? 'block' : 'none'}}><X size={20} /></button>
            </div>
            
            <div className="sidebar-controls">
              <div className="glass-panel control-card">
                <label><Calendar size={14} /> Dias Decorridos: <strong>{elapsedDays}</strong></label>
                <div className="slider-group">
                  <input type="range" min="1" max={enrichedData?.geral.diasUteis || 31} value={elapsedDays} onChange={(e) => setElapsedDays(parseInt(e.target.value))} />
                </div>
              </div>

              <div className="control-card">
                <label>Unidade:</label>
                <select value={selectedFilial} onChange={(e) => { setSelectedFilial(e.target.value); setSidebarOpen(false); }} className="glass-select">
                  <option value="REGIONAL">Visão Regional</option>
                  {enrichedData?.filiais.map(f => <option key={f.id} value={f.id}>Filial {f.id}</option>)}
                </select>
              </div>
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
                <div className="top-stats">
                  <div className="glass-panel stat-card"><div className="stat-label">Ritmo Regional</div><div className="stat-value primary">{(enrichedData.filiais.reduce((acc, f) => acc + f.percProj, 0) / enrichedData.filiais.length).toFixed(1)}%</div></div>
                  <div className="glass-panel stat-card"><div className="stat-label">Status Hoje</div><div className="stat-value">{enrichedData.filiais.filter(f => f.dentroMeta).length} / {enrichedData.filiais.length} <span style={{fontSize:'0.8rem', fontWeight:400, color:'var(--text-secondary)'}}>na meta</span></div></div>
                  <div className="glass-panel stat-card"><div className="stat-label">Calendário</div><div className="stat-value">{elapsedDays} / {enrichedData.geral.diasUteis} <span style={{fontSize:'0.8rem', fontWeight:400, color:'var(--text-secondary)'}}>dias</span></div></div>
                </div>

                <div className="glass-panel chart-box">
                  <div className="chart-header"><h4>Estimativa de Fechamento (%)</h4></div>
                  <div style={{width:'100%', height: 250}}>
                    <ResponsiveContainer>
                      <BarChart data={enrichedData.filiais.map(f => ({ name: f.id, val: f.percProj, status: f.status }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="name" fontSize={10} stroke="#94a3b8" />
                        <Tooltip 
                          cursor={{ fill: 'rgba(255,255,255,0.05)' }} 
                          contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', color: '#fff' }}
                          itemStyle={{ color: '#fff' }}
                          formatter={(value) => [`${value.toFixed(1)}%`, 'Projeção']}
                        />
                        <Bar dataKey="val">
                          {enrichedData.filiais.map((f, i) => (<Cell key={i} fill={f.status === 'SUCCESS' ? '#10b981' : f.status === 'WARNING' ? '#f59e0b' : '#ef4444'} />))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="glass-panel table-box">
                  <div className="table-header">
                    <h4>Ranking Regional</h4>
                    <div className="table-filters"><button className={filterMeta === 'ALL' ? 'active' : ''} onClick={() => setFilterMeta('ALL')}>Todas</button><button className={filterMeta === 'ABAIXO' ? 'active' : ''} onClick={() => setFilterMeta('ABAIXO')}>Abaixo</button></div>
                  </div>
                  <div className="scroll-table">
                    <table>
                      <thead>
                        <tr>
                          <th onClick={() => setSortConfig({ key: 'id', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' })}>Filial</th>
                          <th>Vda Eft</th><th>Vda Ontem</th><th>Alvo Per.</th>
                          <th onClick={() => setSortConfig({ key: 'percProj', direction: 'desc' })}>% Proj.</th>
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
                            <td>{f.vdaOnt}</td>
                            <td>{f.alvo}</td>
                            <td className={f.status === 'SUCCESS' ? 'text-success' : f.status === 'WARNING' ? 'text-warning' : 'text-danger'} style={{ fontWeight: 700 }}>{f.percProj.toFixed(1)}%</td>
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
                      <div className="glass-panel detail-header">
                        <div style={{display:'flex', alignItems:'center', gap:'1rem'}}>
                          <button onClick={() => setSelectedFilial('REGIONAL')} className="menu-toggle"><ChevronLeft size={20}/></button>
                          <h2>Filial {f.id}</h2>
                        </div>
                        <div className="header-badges">
                          <span className={`badge ${f.dentroMeta ? 'success' : 'danger'}`}>{f.dentroMeta ? 'META OK' : 'ABAIXO'}</span>
                          <span className={`badge ${f.status === 'SUCCESS' ? 'success' : f.status === 'WARNING' ? 'warning' : 'danger'}`}>{f.percProj.toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="detail-stats">
                        <div className="glass-panel stat-card"><div className="stat-label">Projeção (Mês)</div><div className="stat-value primary">R$ {f.projecaoFinal.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</div><div className="stat-sub">Meta: R$ {f.alvoMensalEst.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</div></div>
                        <div className="glass-panel stat-card"><div className="stat-label">Venda Ontem</div><div className="stat-value">R$ {f.vdaOnt}</div></div>
                        <div className="glass-panel stat-card"><div className="stat-label">Média Diária</div><div className="stat-value">R$ {f.mediaReal.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</div></div>
                      </div>
                      <div className="glass-panel depts-box">
                        <h4>Departamentos</h4>
                        <div className="depts-grid">
                          {[{ k: 'MEDICAMENTO_GERAL', l: 'Medicamento' }, { k: 'GENERICO', l: 'Genérico' }, { k: 'HB', l: 'HB' }, { k: 'PANVEL', l: 'Panvel' }].map(dept => {
                            const d = depts.find(x => x.departamento === dept.k);
                            if (!d) return null;
                            return (
                              <div key={dept.k} className="dept-card"><div className="dept-label">{dept.l}</div><div className="dept-stats"><div className={parseNum(d.desvioPerc) < 0 ? 'neg' : 'pos'}>{d.desvioPerc}</div><div>{d.evolucaoPerc}</div></div></div>
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
    </div>
    </>
  );
}
