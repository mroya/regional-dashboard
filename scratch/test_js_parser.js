const fs = require('fs');

function parseFilialTableData(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  const departamentos = [];
  const filiaisExtra = {};

  function normalizeId(idStr) {
    if (!idStr) return '';
    return idStr.replace(/\D/g, ''); // keep only numbers
  }

  let currentSection = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const upperLine = line.toUpperCase();

    // Detect section headers
    if (upperLine.includes('MEDICAMENTO TOTAL')) {
      currentSection = 'MEDICAMENTO_GERAL';
      continue;
    } else if (upperLine.includes('MEDICAMENTO - OTC') || upperLine.includes('MEDICAMENTO - RX') || upperLine.includes('MEDICAMENTO - BIO') || upperLine.includes('MARCA')) {
      currentSection = ''; // ignore sub-departments
      continue;
    } else if (upperLine.includes('GENÉRICO') || upperLine.includes('GENERICO')) {
      currentSection = 'GENERICO';
      continue;
    } else if (upperLine.includes('HB (NÃO MEDICAMENTO)') || upperLine.includes('HB (NAO MEDICAMENTO)') || upperLine.includes('HB (N-MED)') || (upperLine.startsWith('HB') && upperLine.includes('MEDICAMENTO'))) {
      currentSection = 'HB';
      continue;
    } else if (upperLine.includes('PRODUTOS PANVEL')) {
      currentSection = 'PANVEL';
      continue;
    } else if (upperLine.includes('CUPOM BEM PANVEL')) {
      currentSection = 'CUPOM_BEM';
      continue;
    } else if (upperLine.startsWith('PBM')) {
      currentSection = 'PBM';
      continue;
    } else if (upperLine.includes('TROCO AMIGO')) {
      currentSection = 'TROCO_AMIGO';
      continue;
    } else if (upperLine.includes('--- PAGE ---') || upperLine.includes('DT.EMISSÃO') || upperLine.includes('DT. REFERÊNCIA') || upperLine.includes('REGIONAL 2') || upperLine.includes('Vda Eft')) {
      // skip headers/metas
      continue;
    }

    // Parse rows in sections
    if (currentSection) {
      const parts = line.split(/\s+/);
      const firstPart = parts[0];

      if (/^\d+/.test(firstPart)) {
        const filialId = normalizeId(firstPart);
        if (!filialId) continue;

        if (!filiaisExtra[filialId]) {
          filiaisExtra[filialId] = {
            cupomSVda: '-',
            pbmRepr: '-',
            taVlr: '-',
            taVlrOntem: '-'
          };
        }

        const numericParts = parts.slice(1).map(p => p.trim());

        if (currentSection === 'MEDICAMENTO_GERAL' || currentSection === 'GENERICO' || currentSection === 'HB' || currentSection === 'PANVEL') {
          const vdaEft = numericParts[0] || '-';
          const alvo = numericParts[2] || '-';
          const desvioPerc = numericParts[3] || '-';
          const evolucaoPerc = numericParts[4] || '-';

          let share = '-';
          if (currentSection === 'MEDICAMENTO_GERAL') {
            share = numericParts[10] || '-';
          } else if (currentSection === 'GENERICO') {
            share = numericParts[11] || '-';
          } else if (currentSection === 'HB') {
            share = numericParts[10] || '-';
          } else if (currentSection === 'PANVEL') {
            share = numericParts[11] || '-';
          }

          departamentos.push({
            id: filialId,
            departamento: currentSection,
            vdaEft,
            alvo,
            desvioPerc,
            evolucaoPerc,
            share
          });
        } else if (currentSection === 'CUPOM_BEM') {
          filiaisExtra[filialId].cupomSVda = parts[2] || '-';
        } else if (currentSection === 'PBM') {
          filiaisExtra[filialId].pbmRepr = parts[4] || '-';
        } else if (currentSection === 'TROCO_AMIGO') {
          filiaisExtra[filialId].taVlr = parts[1] || '-';
          filiaisExtra[filialId].taVlrOntem = parts[8] || '-';
        }
      }
    }
  }

  return { departamentos, filiaisExtra };
}

async function run() {
  const text = fs.readFileSync('parsed_pdf.txt', 'utf8');
  console.log('Parsing text programmatically...');
  const start = Date.now();
  const result = parseFilialTableData(text);
  const end = Date.now();

  console.log(`Programmatic parsing took ${end - start}ms.`);
  console.log('Result filiaisExtra count:', Object.keys(result.filiaisExtra).length);
  console.log('Result departamentos count:', result.departamentos.length);
  console.log('Filial 38 details:', {
    extra: result.filiaisExtra['38'],
    depts: result.departamentos.filter(d => d.id === '38')
  });
}

run().catch(console.error);