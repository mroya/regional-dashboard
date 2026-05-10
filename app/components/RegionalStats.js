import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const DepartmentCard = ({ dept }) => {
  const d = dept;
  const isPos = !d.desvioPerc?.includes('-');

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h3 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Departamento
          </h3>
          <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>{d.departamento}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ 
            padding: '4px 12px', 
            borderRadius: '20px', 
            fontSize: '0.7rem', 
            fontWeight: 700,
            background: isPos ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            color: isPos ? '#10b981' : '#ef4444',
            border: `1px solid ${isPos ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`
          }}>
            {isPos ? 'ACIMA DA META' : 'ABAIXO DA META'}
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="stats-mini-card">
          <p className="label">Venda Atual</p>
          <p className="value">{d.vdaEft}</p>
        </div>
        <div className="stats-mini-card">
          <p className="label">Projeção</p>
          <p className="value">{d.projecao}</p>
        </div>
        <div className="stats-mini-card">
          <p className="label">Desvio (%)</p>
          <p className={`value ${isPos ? 'text-success' : 'text-danger'}`}>{d.desvioPerc}</p>
        </div>
        <div className="stats-mini-card">
          <p className="label">Valor Desvio</p>
          <p className={`value ${isPos ? 'text-success' : 'text-danger'}`}>{d.vlrDesvio}</p>
        </div>
      </div>

      <div style={{ 
        background: 'rgba(255,255,255,0.03)', 
        padding: '1.2rem', 
        borderRadius: '12px',
        border: '1px dashed rgba(255,255,255,0.1)'
      }}>
        <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
          Meta Diária Necessária (P/ recuperar desvio)
        </p>
        <p style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(d.metaRestanteDia || 0)}
        </p>
      </div>
    </div>
  );
};

export default function RegionalStats({ data }) {
  if (!data || !data.filiais) return null;

  const chartData = data.filiais.map(f => ({
    name: f.id.substring(0, 3),
    venda: parseFloat(f.vdaEft.replace(/[R$\s.]/g, '').replace(',', '.')) || 0
  })).reverse();

  const filteredDepts = data.departamentos || [];

  return (
    <div className="regional-stats-container">
      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <h2 className="section-title">Performance Acumulada (Mês)</h2>
        <div className="h-[300px] w-full min-h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorVda" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
              <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v/1000000).toFixed(1)}M`} />
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }} />
              <Area type="monotone" dataKey="venda" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorVda)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="department-grid">
        <h2 className="section-title" style={{ marginBottom: '1.5rem' }}>Alvos por Departamento</h2>
        {filteredDepts.map((d, idx) => (
          <DepartmentCard key={idx} dept={d} />
        ))}
      </div>
    </div>
  );
}
