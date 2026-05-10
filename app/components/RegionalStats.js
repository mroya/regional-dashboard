import React from 'react';
import { TrendingUp, TrendingDown, Target, DollarSign, Activity } from 'lucide-react';
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
              {regional.dentroMeta ? '✅ Na Meta' : '⚠️ Abaixo da Meta'}
            </p>
            <h2 style={{fontSize:'1.8rem', marginTop:'0.5rem'}}>Visão do Coordenador</h2>
            <p style={{fontSize:'0.8rem', opacity: 0.7}}>Área 02 Sul POA</p>
          </div>
          <div style={{textAlign:'right'}}>
            <p style={{fontSize:'0.75rem', color:'var(--text-secondary)'}}>Performance Coordenador</p>
            <h2 style={{fontSize:'2.2rem', color: regional.dentroMeta ? '#10b981' : '#ef4444'}}>{regional.desvioPerc}</h2>
          </div>
        </div>
        <button onClick={shareWhatsApp} className="whatsapp-btn" style={{marginTop:'1.5rem'}}>Compartilhar Geral</button>
      </div>

      <div className="stats-main-grid">
        <div className="glass-panel stat-card" style={{borderTop: '3px solid #3b82f6'}}>
          <div className="stat-label">Dias Úteis do Mês</div>
          <div className="stat-value" style={{color:'#3b82f6'}}>{regional.totalDays}</div>
          <div className="stat-sub">Decorridos: {regional.currentElapsed}</div>
        </div>
        <div className="glass-panel stat-card" style={{borderTop: '3px solid #f59e0b'}}>
          <div className="stat-label">Dias Restantes</div>
          <div className="stat-value" style={{color:'#f59e0b'}}>{regional.diasRestantes}</div>
          <div className="stat-sub">Para bater a meta</div>
        </div>
        <div className="glass-panel stat-card" style={{borderTop: '3px solid #8b5cf6'}}>
          <div className="stat-label">Média Dia (Meta)</div>
          <div className="stat-value" style={{color:'#8b5cf6'}}>{regional.mediaDia}</div>
          <div className="stat-sub">%RT Rep: {regional.rtRep}</div>
        </div>
      </div>
    </div>
  );
}

export function DepartmentGrid({ regionalDepts }) {
  return (
    <div className="glass-panel depts-box" style={{padding: '1.5rem'}}>
      <h4 style={{marginBottom: '1rem'}}>Alvo por Departamento (Restante do Mês)</h4>
      <div className="table-wrapper">
        <table className="modern-table" style={{fontSize: '0.85rem'}}>
          <thead>
            <tr>
              <th style={{textAlign: 'left'}}>Departamento</th>
              <th>Alvo</th>
              <th>Projeç.</th>
              <th>% Desv</th>
              <th>Vlr Desv</th>
              <th style={{color: 'var(--accent-primary)'}}>Meta/Dia Rest.</th>
            </tr>
          </thead>
          <tbody>
            {regionalDepts.map(d => (
              <tr key={d.departamento}>
                <td style={{textAlign: 'left', fontWeight: 700}}>{d.departamento.replace('_GERAL','')}</td>
                <td>{d.metaDia || 'R$ 0'}</td>
                <td>{d.projecao || 'R$ 0'}</td>
                <td style={{color: parseNum(d.desvioPerc) >= 0 ? 'var(--success)' : 'var(--danger)'}}>{d.desvioPerc}</td>
                <td style={{color: parseNum(d.vlrDesvio) >= 0 ? 'var(--success)' : 'var(--danger)'}}>{d.vlrDesvio || 'R$ 0'}</td>
                <td style={{fontWeight: 800, background: 'rgba(59,130,246,0.05)', color: 'var(--accent-primary)'}}>
                  {d.metaRestanteDia || 'R$ 0'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
