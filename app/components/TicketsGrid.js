import React, { useState } from 'react';
import { parseNum } from '../utils/formatters';
import { TrendingUp, TrendingDown, Store, Receipt } from 'lucide-react';

export default function TicketsGrid({ filiais }) {
  const [sortConfig, setSortConfig] = useState({ key: 'evTkt', direction: 'desc' });

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedFiliais = [...filiais].sort((a, b) => {
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

  return (
    <div style={{ marginTop: '2rem' }}>
      <div className="table-header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>Ticket Médio por Filial</h3>
        
        {/* Sort Controls */}
        <div className="filter-group">
          <button className={`filter-btn ${sortConfig.key === 'id' ? 'active' : ''}`} onClick={() => handleSort('id')}>Filial</button>
          <button className={`filter-btn ${sortConfig.key === 'evTkt' ? 'active' : ''}`} onClick={() => handleSort('evTkt')}>% Evolução</button>
          <button className={`filter-btn ${sortConfig.key === 'tktMed' ? 'active' : ''}`} onClick={() => handleSort('tktMed')}>Ticket Médio</button>
        </div>
      </div>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', 
        gap: '1.5rem' 
      }}>
        {sortedFiliais.map(f => {
          const evlNum = parseNum(f.evTkt || '0');
          const isOnTarget = evlNum >= 0;

          return (
            <div 
              key={f.id} 
              className="glass-panel branch-card hover-lift"
              style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', position: 'relative', overflow: 'hidden' }}
            >
              {/* Background Glow */}
              <div style={{
                position: 'absolute',
                top: '-40px',
                right: '-40px',
                width: '80px',
                height: '80px',
                background: isOnTarget ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                filter: 'blur(20px)',
                borderRadius: '50%'
              }}></div>

              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ background: 'rgba(255,255,255,0.1)', padding: '0.4rem', borderRadius: '6px' }}>
                    <Store size={16} color="var(--accent-primary)" />
                  </div>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700' }}>{f.id}</h4>
                </div>
              </div>

              {/* Main Ticket */}
              <div style={{ display: 'flex', flexDirection: 'column', marginTop: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Receipt size={12} /> Tkt Médio
                </span>
                <span style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-primary)', marginTop: '2px' }}>
                  {f.tktMed || '-'}
                </span>
              </div>

              {/* Evolução */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                background: 'rgba(255,255,255,0.03)',
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                marginTop: 'auto'
              }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Evolução</span>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '4px',
                  color: isOnTarget ? '#10b981' : '#ef4444',
                  fontWeight: '700',
                  fontSize: '0.9rem'
                }}>
                  {isOnTarget ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {f.evTkt || '0%'}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
