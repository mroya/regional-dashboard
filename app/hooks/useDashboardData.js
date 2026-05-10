import { useState, useMemo, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, setDoc, getDoc, deleteDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { parseNum } from '../utils/formatters';

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
    
    const MAKE_WEBHOOK_URL = 'https://hook.us2.make.com/jwaloiiwvyzvahbo2ddmux9mxa1r2erc';

    try {
      setLoading(true);
      setUploadStatus('IA Processando o PDF...');
      setError(null);
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('referenceDate', referenceDate);

      const response = await fetch(MAKE_WEBHOOK_URL, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Erro ao enviar para o servidor de IA');

      setUploadStatus('Finalizando extração...');
      await new Promise(r => setTimeout(r, 5000));
      setUploadStatus('Concluído!');
    } catch (err) {
      setError('Erro no processamento: ' + err.message);
    } finally {
      setLoading(false);
      setUploadStatus('');
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
    const currentElapsed = refDateObj.getDate() || 1;
    const totalDays = parseInt(data.geral?.diasUteis || '31');
    const diasRestantes = Math.max(0, totalDays - currentElapsed);

    const filiais = (data.filiais || []).map(f => {
      const vdaNum = parseNum(f.vdaEft);
      const alvoNum = parseNum(f.mediaDia) * totalDays;
      const valorRestante = Math.max(0, alvoNum - vdaNum);
      return {
        ...f,
        valorRestante,
        metaRestanteDia: diasRestantes > 0 ? valorRestante / diasRestantes : 0
      };
    });

    const regionalDepts = (data.departamentos || []).filter(d => 
      ['MED', 'HB (N-MED)', 'CLINIC', 'GERAL'].includes(d.departamento)
    ).map(d => {
      const vdaNum = parseNum(d.vdaEft);
      const projNum = parseNum(d.projecao);
      const metaMesNum = projNum / (parseNum(d.desvioPerc) / 100 + 1);
      const valorRestante = Math.max(0, metaMesNum - vdaNum);
      
      return {
        ...d,
        vdaEftNum: vdaNum,
        projecaoNum: projNum,
        metaMesNum,
        valorRestante,
        metaRestanteDia: diasRestantes > 0 ? valorRestante / diasRestantes : 0
      };
    });

    const performanceGeral = regionalDepts.find(d => d.departamento === 'GERAL')?.desvioPerc || '0%';

    return {
      ...data,
      geral: {
        ...data.geral,
        performanceGeral,
        diasUteis: totalDays,
        diasDecorridos: currentElapsed,
        diasRestantes
      },
      filiais,
      departamentos: regionalDepts
    };
  }, [data, referenceDate]);

  return {
    data: enrichedData,
    loading,
    uploadStatus,
    error,
    updatedAt,
    handleFileUpload,
    handleClearData
  };
}
