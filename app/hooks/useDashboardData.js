import { useState, useMemo, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, setDoc, getDoc, deleteDoc, serverTimestamp, collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import * as pdfjsLib from 'pdfjs-dist';
import { parseRawRows } from '../utils/pdf-parser';
import { parseNum } from '../utils/formatters';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export function useDashboardData(user, referenceDate) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);

  // Sync with Firestore
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'reports'), orderBy('timestamp', 'desc'), limit(1));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const docData = snapshot.docs[0].data();
        setData(docData);
        setUpdatedAt(docData.updatedAtStr);
      } else {
        setData(null);
        setUpdatedAt(null);
      }
    }, (err) => setError(err.message));
    return () => unsubscribe();
  }, [user]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setLoading(true);
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let allRows = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const lines = {};
        textContent.items.forEach(item => {
          const y = Math.round(item.transform[5]);
          if (!lines[y]) lines[y] = [];
          lines[y].push({ x: item.transform[4], text: item.str });
        });
        const sortedRows = Object.keys(lines).sort((a, b) => b - a).map(y => 
          lines[y].sort((a, b) => a.x - b.x).map(i => i.text)
        );
        allRows = [...allRows, ...sortedRows];
      }

      const parsed = parseRawRows(allRows);
      const now = new Date();
      const nowStr = now.toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });
      
      const refDateObj = new Date(referenceDate + 'T12:00:00');
      const currentElapsed = refDateObj.getDate() || 1;

      await setDoc(doc(db, 'reports', 'latest'), {
        ...parsed,
        timestamp: serverTimestamp(),
        updatedAtStr: nowStr,
        referenceDate: referenceDate,
        elapsedDays: currentElapsed
      });
      
    } catch (err) {
      setError('Erro ao processar PDF: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClearData = async () => {
    if (!confirm('Tem certeza que deseja limpar todos os dados do dashboard?')) return;
    try {
      setLoading(true);
      await deleteDoc(doc(db, 'reports', 'latest'));
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
    const totalDays = parseInt(data.geral.diasUteis || '31');

    const filiais = data.filiais.map(f => {
      const vdaEftNum = parseNum(f.vdaEft);
      const metaDiaNum = parseNum(f.metaDia);
      const projecaoFinal = (vdaEftNum / currentElapsed) * totalDays;
      const alvoMensalEst = (metaDiaNum / currentElapsed) * totalDays;
      const percProj = alvoMensalEst > 0 ? (projecaoFinal / alvoMensalEst) * 100 : 0;
      
      return { 
        ...f, 
        vdaEftNum, metaDiaNum, projecaoFinal, alvoMensalEst, percProj,
        dentroMeta: percProj >= 100,
        mediaReal: vdaEftNum / currentElapsed,
        mediaAlvoNec: (totalDays - currentElapsed) > 0 ? (alvoMensalEst - vdaEftNum) / (totalDays - currentElapsed) : 0
      };
    });

    const regionalVda = filiais.reduce((acc, f) => acc + f.vdaEftNum, 0);
    const regionalMeta = filiais.reduce((acc, f) => acc + f.metaDiaNum, 0);
    const regionalProj = (regionalVda / currentElapsed) * totalDays;
    const regionalAlvo = (regionalMeta / currentElapsed) * totalDays;

    const regional = {
      vdaEft: regionalVda,
      metaDia: regionalMeta,
      projecaoFinal: regionalProj,
      alvoMensalEst: regionalAlvo,
      percProj: regionalAlvo > 0 ? (regionalProj / regionalAlvo) * 100 : 0,
      mediaReal: regionalVda / currentElapsed,
      mediaAlvo: regionalAlvo / totalDays,
      currentElapsed, totalDays,
      dentroMeta: (regionalProj / regionalAlvo) * 100 >= 100
    };

    const deptKeys = ['MEDICAMENTO_GERAL', 'GENERICO', 'HB', 'PANVEL'];
    const regionalDepts = deptKeys.map(k => {
      const dItems = data.departamentos.filter(d => d.departamento === k);
      if (dItems.length === 0) return null;
      const totalVda = dItems.reduce((acc, d) => acc + parseNum(d.vdaEft), 0);
      const avgDesv = dItems.reduce((acc, d) => acc + parseNum(d.desvioPerc), 0) / dItems.length;
      const avgEvol = dItems.reduce((acc, d) => acc + parseNum(d.evolucaoPerc), 0) / dItems.length;
      return {
        departamento: k, vdaEft: totalVda,
        desvioPerc: avgDesv.toFixed(1).replace('.', ',') + '%',
        evolucaoPerc: avgEvol.toFixed(1).replace('.', ',') + '%'
      };
    }).filter(Boolean);

    const departamentos = data.departamentos.map(d => {
      const branch = filiais.find(f => f.id === d.id);
      const branchTotal = branch ? branch.vdaEftNum : 0;
      const share = branchTotal > 0 ? (parseNum(d.vdaEft) / branchTotal) * 100 : 0;
      return { ...d, share: share.toFixed(1).replace('.', ',') + '%' };
    });

    return { filiais, regional, regionalDepts, departamentos };
  }, [data, referenceDate]);

  return { enrichedData, loading, error, updatedAt, handleFileUpload, handleClearData };
}
