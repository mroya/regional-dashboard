export const parseRawRows = (rows) => {
  let result = { geral: { diasUteis: '31', diasRestantes: '24' }, filiais: [], departamentos: [] };
  
  const monthKeywords = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i].map(cell => (cell || '').toString().trim());
    const joined = row.join(' ').toUpperCase();

    // 1. Captura Dias Úteis e Restantes
    const matchDias = joined.match(/DIAS\s*ÚTEIS[:\s]*(\d+)/i);
    if (matchDias) result.geral.diasUteis = matchDias[1];
    const matchRest = joined.match(/DIAS\s*REST[\.:\s]*(\d+)/i);
    if (matchRest) result.geral.diasRestantes = matchRest[1];

    // 2. Busca de Departamentos (Varredura de Células)
    // Se a linha contém MED, HB ou CLINIC, pegamos os números dessa linha
    const medIdx = row.findIndex(c => c.toUpperCase() === 'MED');
    const hbIdx = row.findIndex(c => c.toUpperCase().includes('HB'));
    const clinicIdx = row.findIndex(c => c.toUpperCase() === 'CLINIC');
    const geralIdx = row.findIndex(c => c.toUpperCase() === 'GERAL');

    const targetIdx = medIdx !== -1 ? medIdx : (hbIdx !== -1 ? hbIdx : (clinicIdx !== -1 ? clinicIdx : (geralIdx !== -1 && joined.includes('INDICADORES') ? -1 : geralIdx)));

    if (targetIdx !== -1) {
      // Pega todas as células após o nome do departamento que contêm números
      const numbers = row.slice(targetIdx + 1).filter(c => /[\d]/.test(c)).map(c => c.replace(/[^\d.,%-]/g, ''));
      
      if (numbers.length >= 4) {
        let label = 'GERAL';
        if (medIdx !== -1) label = 'MED';
        else if (hbIdx !== -1) label = 'HB (N-MED)';
        else if (clinicIdx !== -1) label = 'CLINIC';

        result.departamentos.push({
          id: 'SUMMARY',
          departamento: label,
          vdaEft: numbers[0],
          metaDia: numbers[1],
          projecao: numbers[2],
          desvioPerc: numbers[3],
          vlrDesvio: numbers[4] || '0'
        });
      }
    }

    // 3. Captura de Meses (Topo do Dashboard)
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
