export const parseRawRows = (rows) => {
  let result = { geral: { diasUteis: '31' }, filiais: [], departamentos: [] };
  let currentSection = 'GERAL'; 
  
  const branchIds = ["38", "44", "113", "167", "171", "184", "186", "192", "313", "347", "351", "376", "378", "441", "456", "464", "487", "778", "829", "831", "868", "876", "922"];
  const monthKeywords = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i].map(cell => (cell || '').toString().trim());
    const joined = row.join(' ').toUpperCase();
    
    // 1. Detectar Dias Úteis e Restantes
    const matchDias = joined.match(/DIAS\s*ÚTEIS[:\s]*(\d+)/i);
    if (matchDias) result.geral.diasUteis = matchDias[1];
    
    const matchRest = joined.match(/DIAS\s*REST[\.:\s]*(\d+)/i);
    if (matchRest) result.geral.diasRestantes = matchRest[1];

    // 2. Troca de Seção (Apenas para organização interna)
    if (joined.includes('INDICADORES GERAIS')) currentSection = 'GERAL';
    else if (joined.includes('RESUMO DE FILIAIS')) currentSection = 'FILIAIS';

    // 3. CAPTURA DE MEDICAMENTOS (Busca por palavra-chave na linha)
    if (joined.includes('MED') && !joined.includes('INDICADORES')) {
      const numbers = joined.match(/[\d]{1,3}(?:\.[\d]{3})*(?:,[\d]+)?|[\d]+(?:,[\d]+)?/g) || [];
      // Se achou pelo menos 4 números e a linha parece ser do resumo
      if (numbers.length >= 4 && numbers.length < 10) {
        let valid = [...numbers];
        if (parseInt(valid[0]) < 10) valid.shift(); // Remove o índice (1, 2, 3...)

        result.departamentos.push({
          id: 'SUMMARY',
          departamento: 'MED',
          vdaEft: valid[0],
          metaDia: valid[1],
          projecao: valid[2],
          desvioPerc: valid[3],
          vlrDesvio: valid[4] || '0'
        });
      }
    }

    // 4. Captura de Meses (Para o topo do dashboard)
    const firstCell = (row[0] || '').toUpperCase();
    const isMonthRow = monthKeywords.some(m => firstCell.includes(m));
    
    if (isMonthRow) {
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
