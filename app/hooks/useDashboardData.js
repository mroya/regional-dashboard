import { useState, useMemo, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, setDoc, getDoc, deleteDoc, serverTimestamp, collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { parseRawRows } from '../utils/pdf-parser';
import { parseNum } from '../utils/formatters';

export function useDashboardData(user, referenceDate) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [error, setError] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);

  // FIX: A query agora filtra pelo referenceDate selecionado no dashboard.
  // Antes buscava sempre o doc mais recente, ignorando a data — causava dados errados.
  // O documento é salvo com ID = referenceDate (ex: "2025-05-08"), então buscamos por esse ID.
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
        // Nenhum dado para esta data — mostra estado vazio em vez de dados de outra data
        setData(null);
        setUpdatedAt(null);
      }
    }, (err) => setError(err.message));

    return () => unsubscribe();
  }, [user, referenceDate]); // Re-executa quando a data muda

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setLoading(true);
      setUploadStatus('Lendo arquivo PDF...');
      setError(null);
      
      const startTime = Date.now();
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
      
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      setUploadStatus(`Processando ${pdf.numPages} páginas...`);
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

      // ===== DEBUG: mostra as linhas extraídas para conferência =====
      console.log('[PDF] Primeiras 50 linhas extraídas:', allRows.slice(0, 50));
      console.log('[PDF] Exemplo de linha com filial:', allRows.find(r => r.some(c => /^(38|44|113)$/.test(c.trim()))));

      setUploadStatus('Analisando dados das filiais...');
      const parsed = parseRawRows(allRows);
      
      setUploadStatus('Salvando no banco de dados...');
      const now = new Date();
      const nowStr = now.toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });
      
      const refDateObj = new Date(referenceDate + 'T12:00:00');
      const currentElapsed = refDateObj.getDate() || 1;

      await setDoc(doc(db, 'reports', referenceDate), {
        ...parsed,
        timestamp: serverTimestamp(),
        updatedAtStr: nowStr,
        referenceDate: referenceDate,
        elapsedDays: currentElapsed
      });
      
      // Garante que a animação dure pelo menos 1.5s para feedback visual
      const duration = Date.now() - startTime;
      if (duration < 1500) await new Promise(r => setTimeout(r, 1500 - duration));
      
      setUploadStatus('Concluído!');
    } catch (err) {
      setError('Erro ao processar PDF: ' + err.message);
    } finally {
      setLoading(false);
      setUploadStatus('');
    }
  };

  const handleClearData = async () => {
    if (!confirm('Tem certeza que deseja limpar os dados desta data?')) return;
    try {
      setLoading(true);
      // FIX: Apaga apenas o documento da data selecionada, não um 'latest' genérico
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
      const desvNum = parseNum(f.desvioPerc);
      const vdaNum = parseNum(f.vdaEft);
      const alvoNum = parseNum(f.metaDia);
      const valorRestante = Math.max(0, alvoNum - vdaNum);
      const metaRestanteDia = diasRestantes > 0 ? valorRestante / diasRestantes : 0;

      return { 
        ...f, 
        percProj: desvNum,
        dentroMeta: desvNum >= 0,
        metaRestanteDia: 'R$ ' + metaRestanteDia.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        vdaNum,
        alvoNum
      };
    });

    // 2. Dados do Coordenador (Geral e Indicadores Gerais)
    const monthNamesShort = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
    const selectedMonthName = monthNamesShort[refDateObj.getMonth()];
    const selectedYear = refDateObj.getFullYear();
    const monthKey = `${selectedMonthName} ${selectedYear}`;

    // Busca a linha dos Indicadores Gerais que bate com o mês (ex: "Mai 2026")
    const indicadoresGeraisRow = (data.filiais || []).find(f => 
      f.id.toUpperCase().includes(selectedMonthName) && f.id.includes(selectedYear.toString())
    );

    const coordinatorRaw = (data.departamentos || []).find(d => d.id === 'REGIONAL') || {
      vdaEft: '0',
      metaDia: '0',
      desvioPerc: '0%',
      evolucaoPerc: '0%'
    };

    const regional = {
      ...coordinatorRaw,
      id: coordinatorRaw.departamento || 'Área 02 Sul POA',
      dentroMeta: parseNum(coordinatorRaw.desvioPerc) >= 0,
      currentElapsed,
      totalDays,
      diasRestantes,
      mediaDia: indicadoresGeraisRow?.mediaDia || 'R$ 0',
      rtRep: indicadoresGeraisRow?.rtRep || '0,0%'
    };

    // 3. Departamentos do Coordenador (Busca qualquer dado de MEDICAMENTOS)
    console.log("DEBUG - Todos os Deptos encontrados:", data.departamentos);
    
    const regionalDepts = (data.departamentos || []).filter(d => {
      return d.id === 'SUMMARY' && d.departamento === 'MED';
    }).map(d => {
      const vdaNum = parseNum(d.vdaEft);
      const alvoNum = parseNum(d.metaDia);
      
      const valorRestante = Math.max(0, alvoNum - vdaNum);
      const diasParaCalculo = parseInt(data.geral?.diasRestantes) || diasRestantes;
      const metaRestanteDia = diasParaCalculo > 0 ? valorRestante / diasParaCalculo : 0;
      
      return {
        ...d,
        departamento: 'MEDICAMENTOS',
        metaRestanteDia: 'R$ ' + metaRestanteDia.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      };
    });
    
    console.log("DEBUG - Deptos filtrados para tela:", regionalDepts);

    const departamentos = data.departamentos || [];

    return { filiais, regional, regionalDepts, departamentos };
  }, [data, referenceDate]);

  return { enrichedData, loading, uploadStatus, error, updatedAt, handleFileUpload, handleClearData };
}
