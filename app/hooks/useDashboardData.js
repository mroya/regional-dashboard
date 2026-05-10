import { useState, useMemo, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
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
      setUploadStatus('Extraindo texto do relatório...');
      setError(null);

      // 1. Extrai texto localmente via CDN para compatibilidade mobile
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

      setUploadStatus('Gemini analisando dados (IA)...');
      
      // 2. Envia para nossa API interna (onde está a Gemini API Key segura)
      const response = await fetch('/api/analyze-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: fullText,
          referenceDate: referenceDate
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Erro na análise da IA');
      }

      setUploadStatus('Concluído!');
    } catch (err) {
      console.error('Erro no upload:', err);
      setError('Erro: ' + err.message);
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
      const mediaDiaNum = parseNum(f.mediaDia);
      const alvoTotal = mediaDiaNum * totalDays;
      const valorRestante = Math.max(0, alvoTotal - vdaNum);
      const metaRestanteDia = diasRestantes > 0 ? valorRestante / diasRestantes : 0;
      
      return {
        ...f,
        valorRestante,
        metaRestanteDia,
        desvioPerc: f.desvioPerc || '0%'
      };
    });

    const departamentos = (data.departamentos || []).map(d => {
      const vdaNum = parseNum(d.vdaEft);
      const projNum = parseNum(d.projecao);
      const metaMesNum = parseNum(d.metaDia) || (vdaNum + parseNum(d.vlrDesvio)); // Fallback
      const valorRestante = Math.max(0, metaMesNum - vdaNum);
      const metaRestanteDia = diasRestantes > 0 ? valorRestante / diasRestantes : 0;
      
      return {
        ...d,
        metaMesNum,
        valorRestante,
        metaRestanteDia
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
      departamentos
    };
  }, [data, referenceDate]);

  return { data: enrichedData, loading, uploadStatus, error, updatedAt, handleFileUpload, handleClearData };
}
