import React from 'react';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { parseNum } from '../utils/formatters';

export default function RankingTable({ filiais, filterMeta, setFilterMeta, sortConfig, setSortConfig, setSelectedFilial }) {
  const filtered = filiais.filter(f => {
    if (filterMeta === 'NA_META') return f.dentroMeta;
    if (filterMeta === 'ABAIXO') return !f.dentroMeta;
    return true;
  });

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const sorted = [...filtered].sort((a, b) => {
    let aV = a[sortConfig.key]; let bV = b[sortConfig.key];
    if (typeof aV === 'string') { aV = parseNum(aV); bV = parseNum(bV); }
    return sortConfig.direction === 'asc' ? aV - bV : bV - aV;
  });

  return (
    <div className="glass-panel" style={{marginTop:'2rem'}}>
      <div className="table-header">
        <h3>Ranking por Filial</h3>
        <div className="filter-group">
          <button className={`filter-btn ${filterMeta === 'ALL' ? 'active' : ''}`} onClick={() => setFilterMeta('ALL')}>Todas</button>
          <button className={`filter-btn ${filterMeta === 'ABAIXO' ? 'active' : ''}`} onClick={() => setFilterMeta('ABAIXO')}>Abaixo</button>
        </div>
      </div>
      
      <div className="table-wrapper">
        <table className="modern-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('id')}>Filial</th>
              <th onClick={() => handleSort('vdaEft')}>Venda</th>
              <th onClick={() => handleSort('metaDia')}>Meta</th>
              <th onClick={() => handleSort('percProj')}>% Perf.</th>
              <th onClick={() => handleSort('desvioPerc')}>Desvio</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(f => (
              <tr 
                key={f.id} 
                className={f.dentroMeta ? 'row-success' : 'row-danger'}
                onClick={() => setSelectedFilial(f.id)}
                style={{ cursor: 'pointer' }}
                title="Clique para ver detalhes"
              >
                <td>
                  <div style={{display:'flex', alignItems:'center', gap:'0.8rem'}}>
                    <div className={`status-dot ${f.dentroMeta ? 'active' : 'inactive'}`}></div>
                    <span style={{fontWeight:600}}>{f.id}</span>
                  </div>
                </td>
                <td>{f.vdaEft}</td>
                <td>{f.metaDia}</td>
                <td>
                  <div style={{display:'flex', alignItems:'center', gap:'0.5rem', justifyContent: 'flex-end'}}>
                    {f.percProj.toFixed(1)}%
                    {f.dentroMeta ? <TrendingUp size={14} color="#10b981"/> : <TrendingDown size={14} color="#ef4444"/>}
                  </div>
                </td>
                <td style={{color: parseNum(f.desvioPerc) >= 0 ? '#10b981' : '#ef4444'}}>{f.desvioPerc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
