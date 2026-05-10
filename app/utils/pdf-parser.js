const MONTH_KEYWORDS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

function hasNumber(value) {
  return /\d/.test(value || '');
}

function cleanValue(value) {
  return (value || '').toString().replace(/[^\d.,%-]/g, '');
}

function isNumericCell(value) {
  const clean = cleanValue(value).replace(/[.%]/g, '').replace(/\./g, '').replace(',', '.');
  return clean !== '' && !Number.isNaN(Number.parseFloat(clean));
}

function getMonthIndex(row) {
  return row.findIndex((cell) => {
    const value = (cell || '').toString().trim().toUpperCase();
    return MONTH_KEYWORDS.some((month) => value.includes(month)) && /\d{4}/.test(value);
  });
}

function getNumericValues(cells) {
  return cells.filter(isNumericCell).map(cleanValue);
}

export const parseRawRows = (rows) => {
  const result = {
    geral: {
      diasUteis: '31',
      diasDecorridos: '0',
      diasRestantes: '0',
      vdaEft: '0',
      alvo: '0',
      projecao: '0',
      desvioPerc: '0%',
      vlrDesv: '0',
      performanceGeral: '0%',
    },
    filiais: [],
    departamentos: [],
  };

  for (const rawRow of rows) {
    const row = rawRow.map((cell) => (cell || '').toString().trim()).filter(Boolean);
    const joined = row.join(' ').toUpperCase();

    const diasUteis = joined.match(/DIAS\s*(?:UTEIS|ÚTEIS|ÃšTEIS)[:\s]*(\d+)/i);
    if (diasUteis) result.geral.diasUteis = diasUteis[1];

    const diasRestantes = joined.match(/DIAS\s*REST[\.:\s]*(\d+)/i);
    if (diasRestantes) result.geral.diasRestantes = diasRestantes[1];

    const geralIdx = row.findIndex((cell) => cell.toUpperCase() === 'GERAL');
    if (geralIdx !== -1 && result.geral.vdaEft === '0') {
      const values = getNumericValues(row.slice(geralIdx + 1));
      if (values.length >= 5) {
        result.geral.vdaEft = values[0];
        result.geral.alvo = values[1];
        result.geral.projecao = values[2];
        result.geral.desvioPerc = values[3];
        result.geral.vlrDesv = values[4];
        result.geral.performanceGeral = values[3];
      }
    }

    const monthIdx = getMonthIndex(row);
    if (monthIdx === -1) continue;

    const monthLabel = row[monthIdx].toUpperCase();
    if (monthLabel !== 'MAI 2026') continue;

    const values = getNumericValues(row.slice(monthIdx + 1));
    if (values.length >= 8 && !values[0].includes('%') && result.filiais.length === 0) {
      result.filiais.push({
        id: monthLabel,
        vdaEft: values[0],
        mediaDia: values[1],
        rtRep: values[7],
      });
    }
  }

  const diasUteisNum = Number.parseInt(result.geral.diasUteis, 10);
  const diasRestantesNum = Number.parseInt(result.geral.diasRestantes, 10);
  if (Number.isFinite(diasUteisNum) && Number.isFinite(diasRestantesNum)) {
    result.geral.diasDecorridos = String(Math.max(0, diasUteisNum - diasRestantesNum));
  }

  if (!hasNumber(result.geral.diasRestantes)) {
    result.geral.diasRestantes = '0';
  }

  return result;
};
