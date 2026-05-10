import React from 'react';
import { TrendingUp, TrendingDown, Target, DollarSign, Activity } from 'lucide-react';
import { formatCurrency, parseNum } from '../utils/formatters';

export function RegionalHeader({ regional, shareWhatsApp, monthYear }) {
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
            <h2 style={{fontSize:'1.8rem', marginTop:'0.5rem', textTransform: 'capitalize'}}>
              Visão do Coordenador - {monthYear}
            </h2>
            <p style={{fontSize:'0.8rem', opacity: 0.7}}>Área 02 Sul POA</p>
          </div>
          <div style={{textAlign:'right'}}>
            <p style={{fontSize:'0.75rem', color:'var(--text-secondary)'}}>Performance Acumulada</p>
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
  // Agora usamos diretamente os departamentos que o Hook já filtrou para nós
  const filteredDepts = regionalDepts;

  return (
    <div className="depts-section" style={{marginTop: '2.5rem'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
        <h4 style={{opacity: 0.9, fontSize: '1.1rem', fontWeight: 700}}>
          🎯 Alvos por Departamento (O que falta para a Meta)
        </h4>
        <div style={{fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '0.5rem 1rem', borderRadius: '20px'}}>
          💡 <b>Dica:</b> A "Meta Necessária" é o quanto você precisa vender POR DIA até o fim do mês.
        </div>
      </div>

      <div className="stats-main-grid" style={{
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: '2rem'
      }}>
        {filteredDepts.map((d, idx) => {
          const colors = ['#3b82f6', '#8b5cf6', '#06b6d4', '#f59e0b'];
          const color = colors[idx % colors.length];
          const isPos = parseNum(d.desvioPerc) >= 0;

          return (
            <div key={d.departamento} className="glass-panel stat-card" style={{borderTop: `4px solid ${color}`, padding: '1.8rem', position: 'relative', overflow: 'hidden'}}>
              {/* Nome do Departamento */}
              <div style={{display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.5rem'}}>
                <div style={{width: '12px', height: '12px', borderRadius: '50%', background: color}}></div>
                <div style={{fontSize: '1.1rem', fontWeight: 800, color: '#fff'}}>
                  {d.departamento.replace('_GERAL', '').replace('MEDICAMENTO', 'MEDICAMENTOS')}
                </div>
              </div>
              
              {/* Grid de Dados Principais */}
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem'}}>
                <div className="data-box">
                  <p style={{fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.3rem'}}>Alvo do Mês</p>
                  <p style={{fontWeight: 700, fontSize: '1.1rem'}} title="Meta total definida para este mês">{d.metaDia || 'R$ 0'}</p>
                </div>
                <div className="data-box">
                  <p style={{fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.3rem'}}>Venda Atual</p>
                  <p style={{fontWeight: 700, fontSize: '1.1rem'}} title="Quanto já foi vendido até hoje">{d.vdaEft || 'R$ 0'}</p>
                </div>
              </div>

              {/* Box de Desvio (Explicado) */}
              <div style={{
                padding: '1rem', 
                background: isPos ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', 
                borderRadius: '12px', 
                border: `1px solid ${isPos ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)'}`,
                marginBottom: '1.5rem'
              }}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <div>
                    <p style={{fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase'}}>Desvio vs Alvo</p>
                    <p style={{fontWeight: 800, color: isPos ? '#10b981' : '#ef4444', fontSize: '1.4rem'}}>{d.desvioPerc}</p>
                  </div>
                  <div style={{textAlign: 'right'}}>
        {filteredDepts.map((d) => (
          <DepartmentCard key={d.departamento} dept={d} />
        ))}
      </div>

      {/* Seção de Ajuda Rápida */}
      <div className="glass-panel" style={{marginTop: '2rem', padding: '1rem', borderLeft: '4px solid #3b82f6', fontSize: '0.8rem', color: 'var(--text-secondary)'}}>
        <b>Como ler estes dados?</b> Se a <b>Meta Diária Necessária</b> for maior que a sua meta diária normal, significa que você precisa acelerar as vendas para compensar o desvio negativo atual.
      </div>
    </div>
  );
}
