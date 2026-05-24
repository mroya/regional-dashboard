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

      {/* 6 Cards idênticos à visão Regional */}
      <div className="metrics-grid" style={{ marginTop: '2rem' }}>
        <div className="glass-panel metric-card orange" style={{ cursor: 'help' }} title={`Projeção final do mês estimado para esta filial: ${formatCurrency(f.projecaoFinal)}`}>
          <span className="icon">📈</span>
          <h3>Projeção (Mês)</h3>
          <div className="big-value">{f.percProj.toFixed(1)}%</div>
          <p>Valor: {formatCurrency(f.projecaoFinal)}</p>
        </div>

        <div className="glass-panel metric-card blue" style={{ cursor: 'help' }} title="Meta Diária exigida para esta filial.">
          <span className="icon">📅</span>
          <h3>Meta Diária</h3>
          <div className="big-value">{formatCurrency(parseNum(f.metaDia))}</div>
          <p>Valor Proporcional</p>
        </div>

        <div className="glass-panel metric-card purple" style={{ cursor: 'help' }} title={`Média Dia: Média real de faturamento por dia decorrido.\nMeta/Dia: Ritmo médio exigido (${formatCurrency(f.mediaAlvoNec)}).`}>
          <span className="icon">💰</span>
          <h3>Média Dia</h3>
          <div className="big-value">{formatCurrency(f.mediaReal)}</div>
          <p>Meta/Dia: {formatCurrency(f.mediaAlvoNec)}</p>
        </div>

        <div className="glass-panel metric-card blue" style={{ cursor: 'help' }} title={`Vda Eft: Faturamento total acumulado pela filial no mês.\nOntem: Venda realizada no dia anterior (${f.vdaOnt}).`}>
          <span className="icon">V</span>
          <h3>Vda Eft</h3>
          <div className="big-value">{f.vdaEft || '-'}</div>
          <p>Ontem: {f.vdaOnt || '-'}</p>
        </div>

        <div className="glass-panel metric-card blue" style={{ cursor: 'help' }} title={`Alvo: Meta proporcional acumulada até ontem.\nMeta Total: Meta cheia do mês (${formatCurrency(f.alvoMensalEst)}).`}>
          <span className="icon">A</span>
          <h3>Alvo (Meta Acumulada)</h3>
          <div className="big-value">{f.alvo || '-'}</div>
          <p>Meta Total: {formatCurrency(f.alvoMensalEst)}</p>
        </div>

        <div className="glass-panel metric-card orange" style={{ cursor: 'help' }} title={`Desvio: Desvio percentual acumulado.\nEvolução: Comparativo vs ano/mês anterior (${f.evlVda}).`}>
          <span className="icon">%</span>
          <h3>% Desv</h3>
          <div className="big-value" style={{ color: parseNum(f.desvioPerc) >= 0 ? '#10b981' : '#ef4444' }}>
            {f.desvioPerc || '-'}
          </div>
          <p>Evolução: <span style={{ color: parseNum(f.evlVda) >= 0 ? '#10b981' : '#ef4444', fontWeight: 600 }}>{f.evlVda || '-'}</span></p>
        </div>
      </div>

      {/* Barra de Progresso & Acumulado */}
      <div className="glass-panel" style={{ marginTop: '1.5rem', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Progresso da Meta Acumulada</span>
          <span><strong style={{ color: 'var(--text-primary)' }}>{f.vdaEft || 0}</strong> / {f.alvo || 0}</span>
        </div>
        <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', overflow: 'hidden' }}>
           <div style={{
             height: '100%', 
             width: `${Math.min(100, (parseNum(f.vdaEft) / (parseNum(f.alvo) || 1)) * 100)}%`,
             background: parseNum(f.desvioPerc) >= 0 ? '#10b981' : '#ef4444',
             borderRadius: '10px',
             transition: 'width 1s ease-out'
           }}></div>
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
