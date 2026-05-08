import { useState, useEffect } from 'react';

export function useWeather() {
  const [clock, setClock] = useState('');
  const [weather, setWeather] = useState(null);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClock(now.toLocaleString('pt-BR', { weekday:'short', day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit' }));
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    fetch('https://api.open-meteo.com/v1/forecast?latitude=-30.0331&longitude=-51.23&daily=weathercode,temperature_2m_max,precipitation_probability_max&timezone=America%2FSao_Paulo')
      .then(r => r.json())
      .then(d => {
        const forecast = d.daily.time.map((date, i) => ({
          date,
          tMax: d.daily.temperature_2m_max[i],
          rain: d.daily.precipitation_probability_max[i],
          code: d.daily.weathercode[i]
        }));
        setWeather(forecast);
      }).catch(() => {});
  }, []);

  const weatherIcon = (code, rain) => {
    if (rain > 60) return '🌧️';
    if (code <= 3) return '☀️';
    if (code <= 48) return '☁️';
    return '⛅';
  };

  return { clock, weather, weatherIcon };
}
