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

    // BUSCA ULTRA-PERMISSIVA: Procura palavras-chave e números na mesma linha
    const cleanJoined = joined.replace(/\s+/g, ' '); // Remove espaços duplos
    
    if (cleanJoined.includes('MED') || cleanJoined.includes('HB (N-MED)') || cleanJoined.includes('CLINIC')) {
      // Pega todos os blocos que parecem números (incluindo pontos e vírgulas)
      const rawNumbers = cleanJoined.match(/[\d]{1,3}(?:\.[\d]{3})*(?:,[\d]+)?|[\d]+(?:,[\d]+)?/g) || [];
      
      if (rawNumbers.length >= 4) {
        const deptKey = cleanJoined.includes('HB') ? 'HB' : cleanJoined.includes('CLINIC') ? 'CLINIC' : 'MED';
        
        result.departamentos.push({
          id: 'SUMMARY',
          departamento: deptKey,
          vdaEft: rawNumbers[0],
          metaDia: rawNumbers[1],
          projecao: rawNumbers[2],
          desvioPerc: rawNumbers[3],
          vlrDesvio: rawNumbers[4] || '0',
          allValues: rawNumbers
        });
        // Se achou, não precisa processar mais esta linha
        continue;
      }
    }

    // Mantém apenas a lógica de Filiais (que já funciona para o topo)
    let filialId = null;
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

      if (currentSection === 'GERAL' && numericCols.length >= 8) {
        result.filiais.push({
          id: filialId || row[0],
          vdaEft: numericCols[0] || '0',
          mediaDia: numericCols[1] || '0',
          rtRep: numericCols[7] || '0%'
        });
      }
    }
  }
  
  return result;
};
