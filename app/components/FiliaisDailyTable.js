import React, { useState } from 'react';
import { parseNum } from '../utils/formatters';
import { TrendingUp, TrendingDown, Store, Target, ArrowRight, Search, ArrowUp, ArrowDown } from 'lucide-react';

export default function FiliaisDailyTable({ filiais, onFilialClick }) {
  const [sortConfig, setSortConfig] = useState({ key: 'desvioPerc', direction: 'desc' });
  const [searchTerm, setSearchTerm] = useState('');

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredFiliais = filiais.filter(f => 
    f.id.toString().includes(searchTerm)
  );

  const sortedFiliais = [...filteredFiliais].sort((a, b) => {
    let aV = a[sortConfig.key];
    let bV = b[sortConfig.key];

    if (sortConfig.key === 'id') {
      const aId = parseInt(aV, 10);
      const bId = parseInt(bV, 10);
      if (!isNaN(aId) && !isNaN(bId)) {
        return sortConfig.direction === 'asc' ? aId - bId : bId - aId;
      }
      return sortConfig.direction === 'asc' ? String(aV).localeCompare(String(bV)) : String(bV).localeCompare(String(aV));
    }

    aV = parseNum(aV);
    bV = parseNum(bV);
    return sortConfig.direction === 'asc' ? aV - bV : bV - aV;
  });

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'asc' ? <ArrowUp size={14} style={{ marginLeft: '4px' }} /> : <ArrowDown size={14} style={{ marginLeft: '4px' }} />;
  };

  return (
    <div style={{ marginTop: '2rem' }}>
      <div className="table-header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <h3>Desempenho Diário por Filial</h3>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {/* Search Input */}
          <div style={{ 
            position: 'relative', 
            display: 'flex', 
            alignItems: 'center' 
          }}>
            <Search size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '12px' }} />
            <input 
              type="text" 
              placeholder="Buscar Filial..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                padding: '0.5rem 1rem 0.5rem 2.2rem',
                borderRadius: '8px',
                color: 'var(--text-primary)',
                outline: 'none',
                width: '100%',
                maxWidth: '200px',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent-primary)'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
            />
          </div>

          {/* Sort Controls */}
          <div className="filter-group" style={{ display: 'flex', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '0.25rem', borderRadius: '10px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', padding: '0.25rem 0.5rem', display: 'flex', alignItems: 'center' }}>Ordenar:</span>
            <button 
              className={`filter-btn ${sortConfig.key === 'id' ? 'active' : ''}`} 
              onClick={() => handleSort('id')}
              style={{ display: 'flex', alignItems: 'center' }}
            >
              Filial {getSortIcon('id')}
            </button>
            <button 
              className={`filter-btn ${sortConfig.key === 'desvioPerc' ? 'active' : ''}`} 
              onClick={() => handleSort('desvioPerc')}
              style={{ display: 'flex', alignItems: 'center' }}
            >
              % Desvio {getSortIcon('desvioPerc')}
            </button>
            <button 
              className={`filter-btn ${sortConfig.key === 'vdaEft' ? 'active' : ''}`} 
              onClick={() => handleSort('vdaEft')}
              style={{ display: 'flex', alignItems: 'center' }}
            >
              Venda {getSortIcon('vdaEft')}
            </button>
          </div>
        </div>
      </div>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
        gap: '1.5rem' 
      }}>
        {sortedFiliais.map(f => {
          const desvioNum = parseNum(f.desvioPerc || '0');
          const evlNum = parseNum(f.evlVda || '0');
          const vdaNum = parseNum(f.vdaEft || '0');
          const alvoNum = parseNum(f.alvo || f.metaDia || '0');
          
          const progresso = alvoNum > 0 ? Math.min(100, (vdaNum / alvoNum) * 100) : 0;
          const isOnTarget = desvioNum >= 0;

          return (
            <div 
              key={f.id} 
              className="glass-panel branch-card hover-lift"
              style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative', overflow: 'hidden', cursor: 'pointer' }}
              onClick={() => onFilialClick && onFilialClick(String(f.id))}
            >
              {/* Background Glow */}
              <div style={{
                position: 'absolute',
                top: '-50px',
                right: '-50px',
                width: '100px',
                height: '100px',
                background: isOnTarget ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                filter: 'blur(30px)',
                borderRadius: '50%'
              }}></div>

              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ background: 'rgba(255,255,255,0.1)', padding: '0.5rem', borderRadius: '8px' }}>
                    <Store size={18} color="var(--accent-primary)" />
                  </div>
                  <h4 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700' }}>{f.id}</h4>
                </div>
                
                {/* Desvio Badge */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '4px',
                  background: isOnTarget ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  color: isOnTarget ? '#10b981' : '#ef4444',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  fontSize: '0.85rem',
                  fontWeight: '600'
                }}>
                  {isOnTarget ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {f.desvioPerc || '0%'}
                </div>
              </div>

              {/* Main Progress (Venda vs Alvo) */}
              <div style={{ marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Venda: <strong style={{ color: 'var(--text-primary)' }}>{f.vdaEft || '-'}</strong></span>
                  <span style={{ color: 'var(--text-secondary)' }}>Alvo: <strong style={{ color: 'var(--text-primary)' }}>{f.alvo || f.metaDia || '-'}</strong></span>
                </div>
                {/* Progress Bar */}
                <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', overflow: 'hidden' }}>
                  <div style={{ 
                    height: '100%', 
                    width: progresso + '%', 
                    background: isOnTarget ? '#10b981' : '#ef4444',
                    borderRadius: '10px',
                    transition: 'width 1s ease-out'
                  }}></div>
                </div>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.05)', margin: '0.5rem 0' }} />

              {/* Micro Metrics Bottom */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Vda Ontem</span>
                  <span style={{ fontSize: '1rem', fontWeight: '600' }}>{f.vdaOnt || '-'}</span>
                </div>
                
                <ArrowRight size={16} color="var(--text-secondary)" style={{ opacity: 0.5 }} />

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>% Evolução</span>
                  <span style={{ 
                    fontSize: '1rem', 
                    fontWeight: '700',
                    color: evlNum >= 0 ? '#10b981' : '#ef4444'
                  }}>
                    {f.evlVda || '-'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <style jsx>{`
        .hover-lift {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .hover-lift:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        }
      `}</style>
    </div>
  );
}
