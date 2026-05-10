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

    // 3. Identificar linha de filial, de mês ou de resumo (Med, HB, etc)
    const monthKeywords = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
    const summaryKeywords = ['GERAL', 'MED', 'HB (N-MED)', 'CLINIC'];
    let filialId = null;
    
    // Na seção SUMMARY, o ID é o nome do depto (Med, HB, etc) na primeira coluna
    const firstCell = (row[0] || '').trim().toUpperCase();
    const isSummaryRow = summaryKeywords.some(k => firstCell.includes(k));
    
    if (currentSection === 'SUMMARY' && isSummaryRow) {
      filialId = firstCell;
    } 
    // Na seção GERAL, o ID é o nome do mês (ex: Mai 2026) na primeira coluna
    else if (currentSection === 'GERAL' && monthKeywords.some(m => firstCell.includes(m))) {
      filialId = firstCell;
    } else {
      for (let colIdx = 0; colIdx < Math.min(row.length, 3); colIdx++) {
        const cellClean = row[colIdx].trim().replace(/\D/g, ''); 
        const isMonth = monthKeywords.some(m => row[colIdx].toUpperCase().includes(m));
        if (branchIds.includes(cellClean) && !isMonth) {
          filialId = cellClean;
          break;
        }
      }
    }

    if (filialId) {
      // Pega colunas numéricas, ignorando textos e o ID da filial
      const numericCols = row.filter((cell, idx) => {
        const clean = cell.replace(/[R$\s.%]/g, '').replace(',', '.');
        return idx > 0 && !isNaN(parseFloat(clean)) && /\d/.test(cell);
      });

      // Seção GERAL ou se a linha parece ser de um mês (como na imagem do usuário)
      const isMonthLine = monthKeywords.some(m => row.join(' ').toUpperCase().includes(m));

      if ((currentSection === 'GERAL' || isMonthLine) && numericCols.length >= 8) {
        // Agora mapeamos exatamente como na imagem enviada
        result.filiais.push({
          id: filialId || row[0], // Pode ser "Mai 2026"
          vdaEft: numericCols[0] || '0',
          mediaDia: numericCols[1] || '0',
          cupons: numericCols[2] || '0',
          tktMed: numericCols[3] || '0',
          descPerc: numericCols[4] || '0%',
          rentPerc: numericCols[5] || '0%',
          aptVerba: numericCols[6] || '0',
          rtRep: numericCols[7] || '0%',
          evolucaoPerc: numericCols[8] || '0%'
        });
      }
      // Seção de Resumo (Geral, Med, HB, Clinic)
      else if (currentSection === 'SUMMARY' && numericCols.length >= 4) {
        result.departamentos.push({
          id: 'SUMMARY',
          departamento: filialId, // Ex: "Med"
          vdaEft: numericCols[0] || '0',
          metaDia: numericCols[1] || '0', // Alvo
          projecao: numericCols[2] || '0',
          desvioPerc: numericCols[3] || '0%',
          vlrDesvio: numericCols[4] || 'R$ 0'
        });
      }
      // Seções de Departamentos Detalhados
      else if (['MEDICAMENTO_GERAL', 'GENERICO', 'HB', 'PANVEL'].includes(currentSection) && numericCols.length >= 2) {
        result.departamentos.push({ 
          id: filialId, 
          departamento: currentSection, 
          vdaEft: numericCols[0] || '0',  // 1ª coluna numérica (Vda Eft)
          metaDia: numericCols[1] || '0', // 2ª coluna numérica (Alvo)
          desvioPerc: numericCols[2] || '0%',
          vlrDesvio: numericCols[3] || 'R$ 0',
          evolucaoPerc: numericCols[numericCols.length - 1] || '0%' 
        });
      }
    }

    // 4. Totais Regionais (Linhas que começam com o nome do depto)
    if (['MEDICAMENTO_GERAL', 'GENERICO', 'HB', 'PANVEL'].includes(firstCell) || joined.startsWith(firstCell)) {
      if (firstCell.length > 3) {
        result.departamentos.push({
          id: 'REGIONAL',
          departamento: firstCell.replace(' TOTAL', ''),
          vdaEft: row[1] || '0',
          desvioPerc: row[4] || '0%',
          evolucaoPerc: row[row.length - 1] || '0%'
        });
      }
    }
  }
  
  return result;
};
