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
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', 
        gap: '1rem' 
      }}>
        {sortedFiliais.map(f => {
          const desvioNum = parseNum(f.desvioPerc || '0');
          const evlNum = parseNum(f.evlVda || '0');
          
          return (
            <div 
              key={f.id} 
              className="stats-mini-card hover-lift"
              style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', cursor: 'pointer', display: 'flex', flexDirection: 'column' }}
              onClick={() => onFilialClick && onFilialClick(String(f.id))}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
                <Store size={16} color="var(--accent-primary)" />
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, fontWeight: 600 }}>Filial {f.id}</p>
              </div>

              <p style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                {f.desvioPerc || '0%'} <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Desv</span>
              </p>

              <div style={{ fontSize: '0.85rem', color: evlNum >= 0 ? '#10b981' : '#ef4444', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px', fontWeight: 600 }}>
                {evlNum >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {f.evlVda || '0%'} Evol
              </div>

              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span>Vda:</span> <strong style={{ color: 'var(--text-primary)' }}>{f.vdaEft || '-'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Alvo:</span> <strong>{f.alvo || f.metaDia || '-'}</strong>
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
