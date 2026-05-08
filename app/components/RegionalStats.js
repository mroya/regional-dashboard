import React from 'react';
import { TrendingUp, TrendingDown, Target, DollarSign, Activity, PieChart } from 'lucide-react';
import { formatCurrency, parseNum } from '../utils/formatters';

export function RegionalHeader({ regional, shareWhatsApp }) {
  return (
    <div className="detail-grid" style={{ marginBottom: '2rem' }}>
      <div className="header-status-card" style={{
        background: regional.dentroMeta 
          ? 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.02))' 
          : 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.02))',
        border: `1px solid ${regional.dentroMeta ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`
      }}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
          <div>
            <p className={`status-badge ${regional.dentroMeta ? 'success' : 'danger'}`}>
              {regional.dentroMeta ? '✅ Regional na Meta' : '⚠️ Regional Abaixo'}
            </p>
            <h2 style={{fontSize:'1.8rem', marginTop:'0.5rem'}}>Área 02 Sul POA</h2>
          </div>
          <div style={{textAlign:'right'}}>
            <p style={{fontSize:'0.75rem', color:'var(--text-secondary)'}}>Ritmo Regional</p>
            <h2 style={{fontSize:'2.2rem', color: regional.dentroMeta ? '#10b981' : '#ef4444'}}>{regional.percProj.toFixed(1)}%</h2>
          </div>
        </div>
        <button onClick={shareWhatsApp} className="whatsapp-btn" style={{marginTop:'1.5rem'}}>Compartilhar Geral</button>
      </div>

      <div className="stats-main-grid">
        <div className="glass-panel stat-card" style={{borderTop: `3px solid ${regional.dentroMeta ? '#10b981' : '#ef4444'}`}}>
          <div className="stat-label">Projeção (Regional)</div>
          <div className="stat-value" style={{color: regional.dentroMeta ? '#10b981' : '#ef4444'}}>{formatCurrency(regional.projecaoFinal)}</div>
          <div className="stat-sub">Meta: {formatCurrency(regional.alvoMensalEst)}</div>
        </div>
        <div className="glass-panel stat-card" style={{borderTop: '3px solid #3b82f6'}}>
          <div className="stat-label">Meta Diária (Total)</div>
          <div className="stat-value" style={{color:'#3b82f6'}}>{formatCurrency(regional.metaDia)}</div>
        </div>
        <div className="glass-panel stat-card" style={{borderTop: '3px solid #8b5cf6'}}>
          <div className="stat-label">Média Diária Regional</div>
          <div className="stat-value" style={{color:'#8b5cf6'}}>{formatCurrency(regional.mediaReal)}</div>
          <div className="stat-sub">Meta/dia: {formatCurrency(regional.mediaAlvo)}</div>
        </div>
      </div>
    </div>
  );
}

export function DepartmentGrid({ regionalDepts }) {
  return (
    <div className="glass-panel depts-box">
      <h4>Média de Departamentos (Regional)</h4>
      <div className="depts-grid">
        {regionalDepts.map(d => {
          const isPos = parseNum(d.desvioPerc) >= 0;
          return (
            <div key={d.departamento} className="dept-card" style={{borderTop: `2px solid ${isPos ? '#10b981' : '#ef4444'}`, padding: '0.6rem'}}>
              <div className="dept-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{fontWeight: 700, fontSize: '0.7rem', opacity: 0.8}}>{d.departamento}</span>
                <span style={{ color: 'var(--accent-primary)', fontWeight: 700, fontSize: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  <PieChart size={9} /> PART. {d.share}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                  <span style={{fontSize: '0.55rem', color: 'var(--text-secondary)', textTransform: 'uppercase'}}>Desv.</span>
                  <span style={{ color: isPos ? 'var(--success)' : 'var(--danger)', fontWeight: 800, fontSize: '1.2rem' }}>{d.desvioPerc}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{fontSize: '0.55rem', color: 'var(--text-secondary)', textTransform: 'uppercase'}}>Evol.</span>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.75rem' }}>{d.evolucaoPerc}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
