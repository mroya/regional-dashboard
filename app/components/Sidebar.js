import React from 'react';
import { UploadCloud, LogOut, User, Calendar, X, Trash2, FileText } from 'lucide-react';
import { formatDateBR } from '../utils/formatters';

export default function Sidebar({ 
  user, sidebarOpen, setSidebarOpen, darkMode, setDarkMode, clock, weather, weatherIcon,
  referenceDate, setReferenceDate, defaultDate, elapsedDays, selectedFilial, setSelectedFilial, 
  enrichedData, updatedAt, handleFileUpload, handleClearData, handleLogout 
}) {
  return (
    <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <div style={{flex:1}}>
          <h3 style={{marginBottom:'0.1rem'}}>Dashboard</h3>
          <p style={{display:'flex', alignItems:'center', gap:'0.3rem', fontSize:'0.8rem', color:'var(--text-secondary)'}}>
            <User size={11} /> {user?.email?.split('@')[0]}
          </p>
        </div>
        <div style={{display:'flex', gap:'0.4rem', alignItems:'center', flexShrink:0}}>
          <button onClick={() => setDarkMode(!darkMode)} className="menu-toggle">
            {darkMode ? '☀️' : '🌙'}
          </button>
          {sidebarOpen && <button className="menu-toggle" onClick={() => setSidebarOpen(false)}><X size={18} /></button>}
        </div>
      </div>

      <div className="glass-panel" style={{padding:'0.75rem 1rem', textAlign:'center'}}>
        <p style={{fontSize:'0.7rem', color:'var(--text-secondary)', textTransform:'uppercase', marginBottom:'0.2rem'}}>🕐 Agora</p>
        <p style={{fontSize:'0.85rem', fontWeight:600}}>{clock}</p>
      </div>

      {weather && (
        <div className="glass-panel" style={{padding:'0.75rem 1rem'}}>
          <p style={{fontSize:'0.7rem', color:'var(--text-secondary)', textTransform:'uppercase', marginBottom:'0.6rem'}}>🌦️ Previsão POA</p>
          <div style={{display:'flex', justifyContent:'space-between', gap:'0.25rem'}}>
            {weather.slice(0,5).map((d, i) => (
              <div key={i} style={{textAlign:'center', flex:1}}>
                <div style={{fontSize:'1.1rem'}}>{weatherIcon(d.code, d.rain)}</div>
                <div style={{fontSize:'0.6rem', color:'var(--text-secondary)'}}>
                  {new Date(d.date+'T12:00:00').toLocaleDateString('pt-BR', {weekday:'short'}).replace('.','')}
                </div>
                <div style={{fontSize:'0.65rem', fontWeight:600}}>{d.rain}%</div>
                <div style={{fontSize:'0.6rem'}}>{Math.round(d.tMax)}°</div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="sidebar-controls">
        <div className="glass-panel control-card">
          <label style={{display:'flex', alignItems:'center', gap:'0.4rem', marginBottom:'0.5rem'}}>
            <Calendar size={14} /> Data de Referência
          </label>
          <div style={{position: 'relative', width: '100%', marginBottom: '0.4rem'}}>
            <div className="date-display">{formatDateBR(referenceDate)} <Calendar size={12}/></div>
            <input type="date" value={referenceDate} max={defaultDate} onChange={(e) => setReferenceDate(e.target.value)} className="hidden-date-input" />
          </div>
          <p style={{fontSize:'0.72rem', color:'var(--text-secondary)'}}>
            📅 {elapsedDays} dia{elapsedDays !== 1 ? 's' : ''} decorrido{elapsedDays !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="glass-panel control-card">
          <label>Unidade</label>
          <select value={selectedFilial} onChange={(e) => { setSelectedFilial(e.target.value); setSidebarOpen(false); }} className="glass-select">
            <option value="REGIONAL">Visão Regional</option>
            {enrichedData?.filiais.map(f => <option key={f.id} value={f.id}>Filial {f.id}</option>)}
          </select>
        </div>

        {updatedAt && (
          <div className="glass-panel control-card" style={{fontSize:'0.75rem', textAlign:'center', padding:'0.75rem'}}>
            <div style={{color:'var(--text-secondary)', marginBottom:'0.2rem'}}>🕐 Última atualização</div>
            <div style={{color:'var(--accent-primary)', fontWeight:600}}>{updatedAt}</div>
          </div>
        )}
      </div>

      <label className="upload-btn">
        <UploadCloud size={20} /> <span>Carregar PDF</span>
        <input type="file" accept="application/pdf" onChange={handleFileUpload} style={{ display: 'none' }} />
      </label>

      <button className="sidebar-btn-danger" onClick={handleClearData}>
        <Trash2 size={18} /> Limpar Dados
      </button>

      <button onClick={handleLogout} className="btn outline-btn" style={{marginTop:'auto', color:'var(--danger)'}}>
        <LogOut size={18} /> Sair
      </button>
    </aside>
  );
}
