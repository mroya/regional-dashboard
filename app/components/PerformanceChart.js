import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function PerformanceChart({ data }) {
  return (
    <div className="glass-panel" style={{height:'400px', minHeight: '400px', padding:'1.5rem', overflow: 'hidden', marginTop: '2rem'}}>
      <h3 style={{marginBottom:'1.5rem', fontSize:'1.1rem'}}>Estimativa de Fechamento (%)</h3>
      <div style={{width: '100%', height: '300px'}}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="id" stroke="var(--text-secondary)" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis stroke="var(--text-secondary)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}%`} />
            <Tooltip 
              contentStyle={{backgroundColor:'rgba(15,23,42,0.9)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'8px'}}
              itemStyle={{color:'var(--text-primary)'}}
              formatter={(value) => [`${value.toFixed(1)}%`, 'Projeção']}
            />
            <Bar dataKey="percProj" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.percProj >= 100 ? '#10b981' : (entry.percProj >= 95 ? '#f59e0b' : '#ef4444')} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
