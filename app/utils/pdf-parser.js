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

    // BUSCA INTELIGENTE: Separa texto de número grudado e remove o índice (1, 2, 3...)
    const splitJoined = joined.replace(/([A-Z])([\d])/g, '$1 $2').replace(/([\d])([A-Z])/g, '$1 $2');
    const cleanJoined = splitJoined.replace(/\s+/g, ' '); 
    
    // Se a linha tem "MED", "HB" ou "CLINIC"
    const deptMatch = cleanJoined.match(/\b(MED|HB|CLINIC)\b/);
    if (deptMatch) {
      const rawNumbers = cleanJoined.match(/[\d]{1,3}(?:\.[\d]{3})*(?:,[\d]+)?|[\d]+(?:,[\d]+)?/g) || [];
      
      // Se o primeiro número for pequeno (índice 1, 2, 3, 4) e tivermos muitos números, removemos ele
      let validNumbers = [...rawNumbers];
      if (validNumbers.length >= 5 && parseInt(validNumbers[0]) < 10) {
        validNumbers.shift();
      }

      if (validNumbers.length >= 4) {
        result.departamentos.push({
          id: 'SUMMARY',
          departamento: deptMatch[1],
          vdaEft: validNumbers[0],
          metaDia: validNumbers[1], // Alvo
          projecao: validNumbers[2],
          desvioPerc: validNumbers[3],
          vlrDesvio: validNumbers[4] || '0',
          allValues: validNumbers
        });
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
