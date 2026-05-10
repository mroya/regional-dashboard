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
    if (joined.includes('INDICADORES GERAIS')) currentSection = 'GERAL';
    else if (joined.includes('MEDICAMENTO TOTAL')) currentSection = 'MEDICAMENTO_GERAL';
    else if (joined.includes('MEDICAMENTO - BIO')) currentSection = 'MEDICAMENTO_BIO';
    else if (joined.includes('GENÉRICO')) currentSection = 'GENERICO';
    else if (joined.includes('HB (NÃO MEDICAMENTO)')) currentSection = 'HB';
    else if (joined.includes('PRODUTOS PANVEL')) currentSection = 'PANVEL';
    else if (joined.includes('CUPOM BEM PANVEL')) currentSection = 'CUPOM';
    else if (joined.includes('TROCO AMIGO')) currentSection = 'TROCO';

    // 3. Identificar linha de filial (Procura o ID nas primeiras 3 colunas)
    const monthKeywords = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
    let filialId = null;
    for (let colIdx = 0; colIdx < Math.min(row.length, 3); colIdx++) {
      const cellClean = row[colIdx].trim().replace(/\D/g, ''); 
      // Ignora se for apenas um nome de mês (ex: "ABR 2026")
      const isMonth = monthKeywords.some(m => row[colIdx].toUpperCase().includes(m));
      if (branchIds.includes(cellClean) && !isMonth) {
        filialId = cellClean;
        break;
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

      if ((currentSection === 'GERAL' || isMonthLine) && numericCols.length >= 2) {
        result.filiais.push({
          id: filialId,
          vdaEft: numericCols[0] || '0',
          metaDia: numericCols[1] || '0',
          desvioPerc: numericCols[2] || '0%',
          evolucaoPerc: numericCols[numericCols.length - 1] || '0%'
        });
      }
      // Seções de Departamentos
      else if (['MEDICAMENTO_GERAL', 'GENERICO', 'HB', 'PANVEL', 'MEDICAMENTO_BIO'].includes(currentSection) && numericCols.length >= 1) {
        result.departamentos.push({ 
          id: filialId, 
          departamento: currentSection, 
          vdaEft: numericCols[0] || '0',
          desvioPerc: numericCols[1] || '0%', 
          evolucaoPerc: numericCols[numericCols.length - 1] || '0%' 
        });
      }
    }

    // 4. Totais Regionais (Linhas que começam com o nome do depto)
    const firstCell = (row[0] || '').toUpperCase();
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
