import { useState, useMemo, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { parseNum } from '../utils/formatters';

async function readErrorMessage(response, fallback) {
  const text = await response.text();
  if (!text) return fallback;

  try {
    const data = JSON.parse(text);
    return data.error || fallback;
  } catch {
    return text.slice(0, 200) || fallback;
  }
}

export function useDashboardData(user, referenceDate) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [error, setError] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);

  useEffect(() => {
    if (!user || !referenceDate) return;
    const docRef = doc(db, 'reports', referenceDate);
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const docData = snapshot.data();
        console.log('[Firebase] Dados recebidos:', docData);
        setData(docData);
        setUpdatedAt(docData.updatedAtStr);
        setError(null);
      } else {
        setData(null);
        setUpdatedAt(null);
      }
    }, (err) => setError(err.message));
    return () => unsubscribe();
  }, [user, referenceDate]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setLoading(true);
      setUploadStatus('Extraindo texto do relatorio...');
      setError(null);

      const formData = new FormData();
      formData.append('file', file);

      const parseResponse = await fetch('/api/parse-pdf', {
        method: 'POST',
        body: formData,
      });

      if (!parseResponse.ok) {
        throw new Error(await readErrorMessage(parseResponse, 'Erro ao extrair texto do PDF'));
      }

      const parsedData = await parseResponse.json();

      setUploadStatus('Atualizando painel...');

      const response = await fetch('/api/update-dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...parsedData,
          referenceDate,
        }),
      });

      if (!response.ok) {
        const fallback = response.status === 504
          ? 'A atualizacao demorou demais e a Vercel encerrou a requisicao. Tente novamente.'
          : 'Erro ao atualizar o painel';
        throw new Error(await readErrorMessage(response, fallback));
      }

      setUploadStatus('Concluido!');
    } catch (err) {
      console.error('Erro no upload:', err);
      setError('Erro: ' + err.message);
    } finally {
      setLoading(false);
      setUploadStatus('');
      e.target.value = '';
    }
  };

  const handleClearData = async () => {
    if (!confirm('Tem certeza que deseja limpar os dados desta data?')) return;
    try {
      setLoading(true);
      await deleteDoc(doc(db, 'reports', referenceDate));
      setData(null);
    } catch (err) {
      setError('Erro ao limpar dados: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const enrichedData = useMemo(() => {
    if (!data) return null;
    const refDateObj = new Date(referenceDate + 'T12:00:00');
    const totalDays = parseInt(data.geral?.diasUteis || '31');
    const currentElapsed = parseInt(data.geral?.diasDecorridos || '', 10) || refDateObj.getDate() || 1;
    const diasRestantes = parseInt(data.geral?.diasRestantes || '', 10) || Math.max(0, totalDays - currentElapsed);

    const filiais = (data.filiais || []).map((f) => {
      const vdaNum = parseNum(f.vdaEft);
      const mediaDiaNum = parseNum(f.mediaDia);
      const alvoTotal = mediaDiaNum * totalDays;
      const valorRestante = Math.max(0, alvoTotal - vdaNum);
      const metaRestanteDia = diasRestantes > 0 ? valorRestante / diasRestantes : 0;

      return {
        ...f,
        valorRestante,
        metaRestanteDia,
        desvioPerc: f.desvioPerc || '0%',
      };
    });

    const departamentos = (data.departamentos || []).map((d) => {
      const vdaNum = parseNum(d.vdaEft);
      const metaMesNum = parseNum(d.metaDia) || (vdaNum + parseNum(d.vlrDesvio));
      const valorRestante = Math.max(0, metaMesNum - vdaNum);
      const metaRestanteDia = diasRestantes > 0 ? valorRestante / diasRestantes : 0;

      return {
        ...d,
        metaMesNum,
        valorRestante,
        metaRestanteDia,
      };
    });

    return {
      ...data,
      geral: {
        ...data.geral,
        diasUteis: totalDays,
        diasDecorridos: currentElapsed,
        diasRestantes,
        vlrDesvio: data.geral?.vlrDesvio || data.geral?.vlrDesv || '0',
      },
      filiais,
      departamentos,
    };
  }, [data, referenceDate]);

  return { data: enrichedData, loading, uploadStatus, error, updatedAt, handleFileUpload, handleClearData };
}
