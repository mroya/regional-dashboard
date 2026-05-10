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
    <div className="depts-section" style={{marginTop: '2rem'}}>
      <h4 style={{marginBottom: '1.2rem', opacity: 0.8, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px'}}>
        Alvos por Departamento (Foco Restante)
      </h4>
      <div className="stats-main-grid" style={{
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
        gap: '1.5rem'
      }}>
        {regionalDepts.map((d, idx) => {
          const colors = ['#3b82f6', '#8b5cf6', '#06b6d4', '#f59e0b', '#10b981'];
          const color = colors[idx % colors.length];
          const isPos = parseNum(d.desvioPerc) >= 0;

          return (
            <div key={d.departamento} className="glass-panel stat-card" style={{borderTop: `3px solid ${color}`, padding: '1.5rem'}}>
              <div className="stat-label" style={{fontSize: '0.9rem', fontWeight: 800, color: '#fff', marginBottom: '1rem'}}>
                {d.departamento.replace('_GERAL', '').replace('MEDICAMENTO', 'MED.')}
              </div>
              
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.2rem'}}>
                <div>
                  <p style={{fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase'}}>Alvo</p>
                  <p style={{fontWeight: 700, fontSize: '1rem'}}>{d.metaDia || 'R$ 0'}</p>
                </div>
                <div>
                  <p style={{fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase'}}>Projeção</p>
                  <p style={{fontWeight: 700, fontSize: '1rem'}}>{d.projecao || 'R$ 0'}</p>
                </div>
              </div>

              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', marginBottom: '1rem'}}>
                <div>
                  <p style={{fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase'}}>Desvio</p>
                  <p style={{fontWeight: 800, color: isPos ? '#10b981' : '#ef4444', fontSize: '1.1rem'}}>{d.desvioPerc}</p>
                </div>
                <div style={{textAlign: 'right'}}>
                  <p style={{fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase'}}>Valor</p>
                  <p style={{fontWeight: 600, color: isPos ? '#10b981' : '#ef4444', fontSize: '0.9rem'}}>{d.vlrDesvio || 'R$ 0'}</p>
                </div>
              </div>

              <div style={{borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem'}}>
                <p style={{fontSize: '0.65rem', color: color, fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.3rem'}}>Meta Diária Necessária</p>
                <p style={{fontSize: '1.4rem', fontWeight: 900, color: '#fff'}}>{d.metaRestanteDia || 'R$ 0'}</p>
                <p style={{fontSize: '0.65rem', color: 'var(--text-secondary)'}}>Para os próximos dias</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
