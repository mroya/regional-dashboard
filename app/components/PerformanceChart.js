import React, { useState, useEffect, useRef } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

export default function PerformanceChart({ data = [] }) {
  const [isMounted, setIsMounted] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    // Aguarda o DOM estar pronto e o container ter dimensões reais
    const timer = setTimeout(() => {
      if (containerRef.current && containerRef.current.offsetWidth > 0) {
        setIsMounted(true);
      } else {
        // Fallback: tenta novamente em 200ms se o container ainda não tiver largura
        const fallback = setTimeout(() => setIsMounted(true), 200);
        return () => clearTimeout(fallback);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className="glass-panel"
      style={{
        padding: '1.5rem',
        overflow: 'hidden',
        marginTop: '2rem',
        minWidth: 0,
      }}
    >
      <h3
        style={{
          marginBottom: '1.5rem',
          fontSize: '1.1rem'
        }}
      >
        Estimativa de Fechamento (%)
      </h3>

      {/* 
        FIX: O ResponsiveContainer precisa de um pai com altura EXPLÍCITA em px.
        Usar height="100%" no pai sem uma altura em px causa width/height=-1 no Recharts.
        Solução: definir height fixo aqui e usar height="100%" no ResponsiveContainer.
      */}
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '320px', // altura explícita em px — obrigatório para o ResponsiveContainer funcionar
          minWidth: 0,
        }}
      >
        {isMounted && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.05)"
                vertical={false}
              />

              <XAxis
                dataKey="id"
                stroke="var(--text-secondary)"
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />

              <YAxis
                stroke="var(--text-secondary)"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `${val}%`}
              />

              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(15,23,42,0.9)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px'
                }}
                itemStyle={{
                  color: 'var(--text-primary)'
                }}
                formatter={(value) => [
                  `${Number(value).toFixed(1)}%`,
                  'Projeção'
                ]}
              />

              <Bar
                dataKey="percProj"
                radius={[4, 4, 0, 0]}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      entry.percProj >= 100
                        ? '#10b981'
                        : entry.percProj >= 95
                        ? '#f59e0b'
                        : '#ef4444'
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
