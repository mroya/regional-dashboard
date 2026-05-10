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
      diasUteis: '',
      diasRestantes: '',
    },
    filiais: [],
    departamentos: [],
  };

  for (const rawRow of rows) {
    const row = rawRow.map((cell) => (cell || '').toString().trim()).filter(Boolean);
    const joined = row.join(' ').toUpperCase();

    // Extract Dias úteis
    const diasUteisMatch = joined.match(/DIAS\s*(?:UTEIS|ÚTEIS|ÃšTEIS)[:\s]*[=]*\s*(\d+)/i);
    if (diasUteisMatch) {
      result.geral.diasUteis = diasUteisMatch[1];
    }

    // Extract Dias Rest.
    const diasRestMatch = joined.match(/DIAS\s*REST[\.:\s]*[=]*\s*(\d+)/i);
    if (diasRestMatch) {
      result.geral.diasRestantes = diasRestMatch[1];
    }

    // Extract Mai 2026 Média DIa
    const mediaDiaMatch = joined.match(/MAI\s*2026\s*MÉDIA\s*DIA[:\s]*[=]*\s*([\d.,]+)/i);
    if (mediaDiaMatch) {
      if (result.filiais.length === 0) {
        result.filiais.push({
          id: 'Mai 2026',
          mediaDia: mediaDiaMatch[1],
        });
      } else {
        result.filiais[0].mediaDia = mediaDiaMatch[1];
      }
    }

    // Extract Mai 2026 %Rt Rep
    const rtRepMatch = joined.match(/MAI\s*2026\s*%RT\s*REP[:\s]*[=]*\s*([\d.,%]+)/i);
    if (rtRepMatch) {
      if (result.filiais.length === 0) {
        result.filiais.push({
          id: 'Mai 2026',
          rtRep: rtRepMatch[1],
        });
      } else {
        result.filiais[0].rtRep = rtRepMatch[1];
      }
    }

    // Extract Med Vda Eft
    const medVdaEftMatch = joined.match(/MED\s*VDA\s*EFT[:\s]*[=]*\s*([\d.,]+)/i);
    if (medVdaEftMatch) {
      result.departamentos.push({
        departamento: 'MED',
        vdaEft: medVdaEftMatch[1],
      });
    }

    // Extract Med Alvo
    const medAlvoMatch = joined.match(/MED\s*ALVO[:\s]*[=]*\s*([\d.,]+)/i);
    if (medAlvoMatch) {
      const dept = result.departamentos.find(d => d.departamento === 'MED');
      if (dept) dept.metaDia = medAlvoMatch[1];
    }

    // Extract Med Projeç
    const medProjecMatch = joined.match(/MED\s*PROJEÇ[:\s]*[=]*\s*([\d.,]+)/i);
    if (medProjecMatch) {
      const dept = result.departamentos.find(d => d.departamento === 'MED');
      if (dept) dept.projecao = medProjecMatch[1];
    }

    // Extract Med %Desv
    const medDesvPercMatch = joined.match(/MED\s*%DESV[:\s]*[=]*\s*([\d.,%]+)/i);
    if (medDesvPercMatch) {
      const dept = result.departamentos.find(d => d.departamento === 'MED');
      if (dept) dept.desvioPerc = medDesvPercMatch[1];
    }

    // Extract Med VlrDesv
    const medVlrDesvMatch = joined.match(/MED\s*VLRDESV[:\s]*[=]*\s*([\d.,]+)/i);
    if (medVlrDesvMatch) {
      const dept = result.departamentos.find(d => d.departamento === 'MED');
      if (dept) dept.vlrDesvio = medVlrDesvMatch[1];
    }
  }

  return result;
};
