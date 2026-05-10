export const parseRawRows = (rows) => {
  let result = { geral: { diasUteis: '31' }, filiais: [], departamentos: [] };
  let currentSection = 'GERAL'; 
  
  // Lista de filiais limpa (apenas números para busca flexível)
  const branchIds = ["38", "44", "113", "167", "171", "184", "186", "192", "313", "347", "351", "376", "378", "441", "456", "464", "487", "778", "829", "831", "868", "876", "922"];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i].map(cell => (cell || '').toString().trim());
    const joined = row.join(' ').toUpperCase();
    
    // 1. Detectar Dias Úteis
    const matchDias = joined.match(/DIAS\s*ÚTEIS[:\s]*(\d+)/i);
    if (matchDias) result.geral.diasUteis = matchDias[1];
    
    // 2. Troca de Seção (Case Insensitive)
    if (joined.includes('INDICADORES GERAIS')) {
      currentSection = 'GERAL';
      continue; 
    }
    else if (joined.includes('DIAS ÚTEIS')) {
      currentSection = 'SUMMARY';
      // Tenta pegar o Dias Restantes também
      const matchRest = joined.match(/DIAS REST\.:?\s*(\d+)/);
      if (matchRest) result.geral.diasRestantes = matchRest[1];
      continue;
    }
    else if (joined.includes('RESUMO DE FILIAIS')) currentSection = 'FILIAIS';
    else if (joined.includes('MEDICAMENTO GERAL')) currentSection = 'MEDICAMENTO_GERAL';
    else if (joined.includes('GENÉRICO')) currentSection = 'GENERICO';
    else if (joined.includes('HB (NÃO MEDICAMENTO)')) currentSection = 'HB';
    else if (joined.includes('PRODUTOS PANVEL')) currentSection = 'PANVEL';

    // BUSCA POR REGEX: Se a linha começa com Med, HB ou Clinic, extraímos tudo
    const isMed = joined.startsWith('MED ') || joined === 'MED';
    const isHB = joined.includes('HB (N-MED)');
    const isClinic = joined.startsWith('CLINIC');
    const isSummaryGeral = joined.startsWith('GERAL') && currentSection === 'SUMMARY';

    if (isMed || isHB || isClinic || isSummaryGeral) {
      // Extrai todos os números formatados (ex: 1.234.567 ou 12,34%)
      const numbers = joined.match(/[\d.,%]+/g) || [];
      // Filtra para garantir que são números reais (mínimo 2 dígitos ou ponto/vírgula)
      const validNumbers = numbers.filter(n => n.length >= 2 || n.includes(',') || n.includes('.'));

      if (validNumbers.length >= 4) {
        result.departamentos.push({
          id: 'SUMMARY',
          departamento: isMed ? 'MED' : isHB ? 'HB' : isClinic ? 'CLINIC' : 'GERAL',
          vdaEft: validNumbers[0],
          metaDia: validNumbers[1], // Alvo
          projecao: validNumbers[2],
          desvioPerc: validNumbers[3],
          vlrDesvio: validNumbers[4] || 'R$ 0',
          allValues: validNumbers
        });
        continue;
      }
    }

    let filialId = null;
    const firstCell = (row[0] || '').trim().toUpperCase();
    const monthKeywords = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

    // 4. Identificação de Filiais (Para outras tabelas que não a de resumo)
    for (let colIdx = 0; colIdx < Math.min(row.length, 3); colIdx++) {
      const cellClean = row[colIdx].trim().replace(/\D/g, ''); 
      if (branchIds.includes(cellClean)) {
        filialId = cellClean;
        break;
      }
    }

    if (filialId) {
      const numericCols = row.filter((cell, idx) => {
        const clean = cell.replace(/[R$\s.%]/g, '').replace(/\./g, '').replace(',', '.');
        return idx > 0 && !isNaN(parseFloat(clean)) && /\d/.test(cell);
      });

      // Apenas para tabelas detalhadas de filiais
      if (currentSection !== 'SUMMARY' && numericCols.length >= 2) {
        result.filiais.push({
          id: filialId,
          vdaEft: numericCols[0] || '0',
          metaDia: numericCols[1] || '0',
          desvioPerc: numericCols[2] || '0%',
          evolucaoPerc: numericCols[numericCols.length - 1] || '0%'
        });
      }
    }
  }
  
  return result;
};
