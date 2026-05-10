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
      setUploadStatus('Lendo texto do PDF...');
      setError(null);

      // Extração de texto local (rápida)
      const pdfjsLib = await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.2.67/pdf.min.mjs');
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.2.67/pdf.worker.min.mjs';
      
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        fullText += textContent.items.map(item => item.str).join(' ') + '\n';
      }

      setUploadStatus('Enviando texto para IA...');
      
      const response = await fetch(MAKE_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: fullText,
          referenceDate: referenceDate,
          fileName: file.name
        })
      });

      if (!response.ok) throw new Error('Erro ao enviar para o Make');

      setUploadStatus('IA Processando...');
      await new Promise(r => setTimeout(r, 8000));
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

    const filiais = (data.filiais || []).map(f => ({
      ...f,
      valorRestante: Math.max(0, (parseNum(f.mediaDia) * totalDays) - parseNum(f.vdaEft)),
      metaRestanteDia: diasRestantes > 0 ? Math.max(0, (parseNum(f.mediaDia) * totalDays) - parseNum(f.vdaEft)) / diasRestantes : 0
    }));

    const regionalDepts = (data.departamentos || []).map(d => {
      const vdaNum = parseNum(d.vdaEft);
      const projNum = parseNum(d.projecao);
      const desvio = parseNum(d.desvioPerc) / 100;
      const metaMesNum = projNum / (desvio + 1);
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

    return {
      ...data,
      geral: {
        ...data.geral,
        diasUteis: totalDays,
        diasDecorridos: currentElapsed,
        diasRestantes
      },
      filiais,
      departamentos: regionalDepts
    };
  }, [data, referenceDate]);

  return { data: enrichedData, loading, uploadStatus, error, updatedAt, handleFileUpload, handleClearData };
}
