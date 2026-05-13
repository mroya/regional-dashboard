import React from 'react';
import { ChevronLeft, PieChart } from 'lucide-react';
import { formatCurrency, parseNum } from '../utils/formatters';

export default function BranchDetail({ f, depts, setSelectedFilial, shareFilialWhatsApp }) {
  return (
    <div className="animate-fade-in">
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
        gap: '1rem'
      }}>
        <div style={{display:'flex', alignItems:'center', gap:'1rem'}}>
          <button onClick={() => setSelectedFilial('REGIONAL')} className="menu-toggle"><ChevronLeft size={20}/></button>
          <div>
            <p style={{fontSize:'0.75rem', color: f.dentroMeta ? '#10b981' : '#ef4444', fontWeight:600, textTransform:'uppercase'}}>
              {f.dentroMeta ? '✅ Na Meta' : '⚠️ Abaixo da Meta'}
            </p>
            <h2 style={{fontSize:'1.8rem'}}>Filial {f.id}</h2>
          </div>
        </div>
        <div style={{display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'0.75rem'}}>
          <button onClick={() => shareFilialWhatsApp(f)} className="whatsapp-btn">Enviar p/ Gerente</button>
          <div style={{textAlign:'right'}}>
            <p style={{fontSize:'0.75rem', color:'var(--text-secondary)'}}>Projeção de Fechamento</p>
            <p style={{fontSize:'2.5rem', fontWeight:800, color: f.dentroMeta ? '#10b981' : '#ef4444', lineHeight:1}}>{f.percProj.toFixed(1)}%</p>
          </div>
        </div>
      </div>

      <div className="detail-stats" style={{marginTop:'2rem'}}>
        <div className="glass-panel stat-card" style={{borderTop: `3px solid ${f.dentroMeta ? '#10b981' : '#ef4444'}`}}>
          <div className="stat-label">Projeção (Mês)</div>
          <div className="stat-value" style={{color: f.dentroMeta ? '#10b981' : '#ef4444'}}>{formatCurrency(f.projecaoFinal)}</div>
          <div className="stat-sub">Meta: {formatCurrency(f.alvoMensalEst)}</div>
        </div>
        <div className="glass-panel stat-card" style={{borderTop: '3px solid #3b82f6'}}>
          <div className="stat-label">Meta Diária</div>
          <div className="stat-value" style={{color:'#3b82f6'}}>R$ {f.metaDia}</div>
        </div>
        <div className="glass-panel stat-card" style={{borderTop: '3px solid #8b5cf6'}}>
          <div className="stat-label">Média Diária Real</div>
          <div className="stat-value" style={{color:'#8b5cf6'}}>{formatCurrency(f.mediaReal)}</div>
          <div className="stat-sub">Meta/dia: {formatCurrency(f.mediaAlvoNec)}</div>
        </div>
      </div>

      {depts.some(x => x.id === f.id) && (
        <div className="glass-panel depts-box" style={{marginTop:'2rem'}}>
          <h4>Departamentos</h4>
          <div className="depts-grid">
            {[{ k: 'MEDICAMENTO_GERAL', l: 'Medicamento' }, { k: 'GENERICO', l: 'Genérico' }, { k: 'HB', l: 'HB' }, { k: 'PANVEL', l: 'Panvel' }].map(dept => {
              const d = depts.find(x => x.departamento === dept.k && x.id === f.id);
              if (!d) return null;
              const isPos = parseNum(d.desvioPerc) >= 0;
              return (
                <div key={dept.k} className="dept-card" style={{borderTop: `2px solid ${isPos ? '#10b981' : '#ef4444'}`}}>
                    <div className="dept-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{fontWeight: 700, fontSize: '0.7rem', opacity: 0.8}}>{dept.l}</span>
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
      )}
    </div>
  );
}
