import React, { useState } from 'react';
import { parseNum } from '../utils/formatters';

export default function FiliaisDailyTable({ filiais }) {
  const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'asc' });

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

    // Lógica para ordenar IDs (números ou strings numéricas)
    if (sortConfig.key === 'id') {
      const aId = parseInt(aV, 10);
      const bId = parseInt(bV, 10);
      if (!isNaN(aId) && !isNaN(bId)) {
        return sortConfig.direction === 'asc' ? aId - bId : bId - aId;
      }
      return sortConfig.direction === 'asc' ? String(aV).localeCompare(String(bV)) : String(bV).localeCompare(String(aV));
    }

    // Ordenação numérica para outros campos
    aV = parseNum(aV);
    bV = parseNum(bV);
    return sortConfig.direction === 'asc' ? aV - bV : bV - aV;
  });

  return (
    <div className="glass-panel" style={{ marginTop: '2rem' }}>
      <div className="table-header">
        <h3>Desempenho Diário por Filial</h3>
      </div>
      
      <div className="table-wrapper">
        <table className="modern-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('id')} style={{ cursor: 'pointer' }}>Filial</th>
              <th onClick={() => handleSort('vdaEft')} style={{ cursor: 'pointer' }}>Vda Eft</th>
              <th onClick={() => handleSort('vdaOnt')} style={{ cursor: 'pointer' }}>Vda Ont</th>
              <th onClick={() => handleSort('alvo')} style={{ cursor: 'pointer' }}>Alvo</th>
              <th onClick={() => handleSort('desvioPerc')} style={{ cursor: 'pointer' }}>%Desv</th>
              <th onClick={() => handleSort('evlVda')} style={{ cursor: 'pointer' }}>%Evl Vda</th>
            </tr>
          </thead>
          <tbody>
            {sortedFiliais.map(f => {
              // Valores numéricos para condicional de cor
              const desvioNum = parseNum(f.desvioPerc || '0');
              const evlNum = parseNum(f.evlVda || '0');

              return (
                <tr key={f.id} className="row-hover">
                  <td style={{ fontWeight: 600 }}>{f.id}</td>
                  <td>{f.vdaEft || '-'}</td>
                  <td>{f.vdaOnt || '-'}</td>
                  <td>{f.alvo || f.metaDia || '-'}</td>
                  <td style={{ color: desvioNum >= 0 ? '#10b981' : '#ef4444', fontWeight: 500 }}>
                    {f.desvioPerc || '-'}
                  </td>
                  <td style={{ color: evlNum >= 0 ? '#10b981' : '#ef4444', fontWeight: 500 }}>
                    {f.evlVda || '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
