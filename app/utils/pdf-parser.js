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

    // CAPTURA TOTAL: Se a linha tem números, a gente guarda para analisar depois
    const numericCols = row.filter((cell, idx) => {
      const clean = cell.replace(/[R$\s.%]/g, '').replace(/\./g, '').replace(',', '.');
      return !isNaN(parseFloat(clean)) && /\d/.test(cell);
    });

    if (numericCols.length >= 3) {
      result.departamentos.push({
        id: 'RAW',
        departamento: row[0] || 'LINHA',
        vdaEft: numericCols[0] || '0',
        metaDia: numericCols[1] || '0',
        projecao: numericCols[2] || '0',
        desvioPerc: numericCols[3] || '0%',
        vlrDesvio: numericCols[4] || 'R$ 0',
        allValues: numericCols
      });
    }

    // Mantém a detecção de Dias Úteis e Meses para o topo (que já funciona)
    if (currentSection === 'GERAL' && monthKeywords.some(m => firstCell.includes(m))) {
      result.filiais.push({
        id: firstCell,
        vdaEft: numericCols[0] || '0',
        mediaDia: numericCols[1] || '0',
        rtRep: numericCols[7] || '0%'
      });
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
