export const parseRawRows = (rows) => {
  let result = { geral: { diasUteis: '31', diasRestantes: '24' }, filiais: [], departamentos: [] };
  
  // Transforma tudo em um blocão de texto limpo
  const fullText = rows.map(row => row.join(' ')).join('\n').toUpperCase();
  const monthKeywords = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

  // 1. Captura Dias Úteis e Restantes (Busca Global)
  const matchDias = fullText.match(/DIAS\s*ÚTEIS[:\s]*(\d+)/i);
  if (matchDias) result.geral.diasUteis = matchDias[1];
  
  const matchRest = fullText.match(/DIAS\s*REST[\.:\s]*(\d+)/i);
  if (matchRest) result.geral.diasRestantes = matchRest[1];

  // 2. Busca por Departamentos (A Lógica Ninja)
  // Procuramos pela palavra chave e pegamos os próximos 5 blocos de números
  const keywords = ['MED', 'HB', 'CLINIC', 'GERAL'];
  
  keywords.forEach(key => {
    // Busca a palavra chave e ignora o que vem antes (ex: "2 MED")
    const regex = new RegExp(`(?:\\d+\\s+)?${key}(?:\\s+\\(N-MED\\))?\\s+([\\d\\s.,%\\-]+)`, 'g');
    let match;
    while ((match = regex.exec(fullText)) !== null) {
      const numbers = match[1].match(/[\d]{1,3}(?:\.[\d]{3})*(?:,[\d]+)?|[\d]+(?:,[\d]+)?/g) || [];
      
      // Se achou pelo menos 4 números, é a linha de resumo
      if (numbers.length >= 4) {
        result.departamentos.push({
          id: 'SUMMARY',
          departamento: key === 'HB' ? 'HB (N-MED)' : key,
          vdaEft: numbers[0],
          metaDia: numbers[1],
          projecao: numbers[2],
          desvioPerc: numbers[3],
          vlrDesvio: numbers[4] || '0'
        });
      }
    }
  });

  // 3. Captura de Meses (Topo do Dashboard)
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
