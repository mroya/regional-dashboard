export const parseRawRows = (rows) => {
  let result = { geral: { diasUteis: '31', diasRestantes: '24' }, filiais: [], departamentos: [] };
  
  // Transforma tudo em um blocão de texto para busca global
  const fullText = rows.map(row => row.join(' ')).join('\n').toUpperCase();
  const monthKeywords = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

  // 1. Captura Dias Úteis e Restantes (Busca Global)
  const matchDias = fullText.match(/DIAS\s*ÚTEIS[:\s]*(\d+)/i);
  if (matchDias) result.geral.diasUteis = matchDias[1];
  
  const matchRest = fullText.match(/DIAS\s*REST[\.:\s]*(\d+)/i);
  if (matchRest) result.geral.diasRestantes = matchRest[1];

  // 2. Captura da Tabela de Resumo (A lógica que o Python usou, agora no JS)
  // Padrão: Nome do Depto + 5 blocos de números
  const summaryPattern = /(GERAL|MED|HB \(N-MED\)|CLINIC)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d,%\-]+)\s+([\d.]+)/g;
  let match;
  while ((match = summaryPattern.exec(fullText)) !== null) {
    result.departamentos.push({
      id: 'SUMMARY',
      departamento: match[1],
      vdaEft: match[2],
      metaDia: match[3],
      projecao: match[4],
      desvioPerc: match[5],
      vlrDesvio: match[6]
    });
  }

  // 3. Captura de Meses (Topo do Dashboard) - Mantendo a lógica de linhas que já funcionava
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i].map(cell => (cell || '').toString().trim());
    const firstCell = (row[0] || '').toUpperCase();
    
    if (monthKeywords.some(m => firstCell.includes(m))) {
      const numericCols = row.filter(cell => {
        const clean = cell.replace(/[R$\s.%]/g, '').replace(/\./g, '').replace(',', '.');
        return !isNaN(parseFloat(clean)) && /\d/.test(cell);
      });

      if (numericCols.length >= 8) {
        result.filiais.push({
          id: firstCell,
          vdaEft: numericCols[0] || '0',
          mediaDia: numericCols[1] || '0',
          rtRep: numericCols[7] || '0%'
        });
      }
    }
  }
  
  return result;
};
