export const parseRawRows = (rows) => {
  let result = { geral: { diasUteis: '31' }, filiais: [], departamentos: [] };
  let currentSection = 'GERAL'; 
  const knownBranches = ["38", "44", "113", "167", "171", "184", "186", "192", "313", "347", "351", "376", "378", "441", "456", "464", "487", "778", "829", "831", "868", "876(POA)", "922(POA)"];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const joined = row.join(' ');
    const matchDias = joined.match(/Dias\s*Úteis[:\s]*(\d+)/i);
    if (matchDias) result.geral.diasUteis = matchDias[1];
    
    if (joined.includes('Indicadores Gerais')) currentSection = 'GERAL';
    else if (joined.includes('MEDICAMENTO TOTAL')) currentSection = 'MEDICAMENTO_GERAL';
    else if (joined.includes('MEDICAMENTO - BIO')) currentSection = 'MEDICAMENTO_BIO';
    else if (joined.includes('GENÉRICO')) currentSection = 'GENERICO';
    else if (joined.includes('HB (Não Medicamento)')) currentSection = 'HB';
    else if (joined.includes('PRODUTOS PANVEL')) currentSection = 'PANVEL';
    else if (joined.includes('CUPOM BEM PANVEL')) currentSection = 'CUPOM';
    else if (joined.includes('TROCO AMIGO')) currentSection = 'TROCO';

    if (row.length > 3 && knownBranches.includes(row[0])) {
      const filialId = row[0];
      if (currentSection === 'GERAL' && row.length > 5) {
        result.filiais.push({
          id: filialId,
          vdaEft: row[1] || '0',
          metaDia: row[2] || '0',
          desvioPerc: row[3] || '0%',
          evolucaoPerc: row[7] || '0%'
        });
      }
      if (['MEDICAMENTO_GERAL', 'GENERICO', 'HB', 'PANVEL', 'MEDICAMENTO_BIO'].includes(currentSection)) {
        result.departamentos.push({ 
          id: filialId, 
          departamento: currentSection, 
          vdaEft: row[1] || '0',
          desvioPerc: row[4] || '0%', 
          evolucaoPerc: row[5] || '0%' 
        });
      }
    }

    if (['MEDICAMENTO_GERAL', 'GENERICO', 'HB', 'PANVEL'].includes(row[0])) {
      result.departamentos.push({
        id: 'REGIONAL',
        departamento: row[0],
        vdaEft: row[1] || '0',
        desvioPerc: row[4] || '0%',
        evolucaoPerc: row[10] || '0%'
      });
    }
  }
  return result;
};
