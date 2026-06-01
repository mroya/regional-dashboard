const fs = require('fs');

function parseNum(str) {
  if (!str) return 0;
  return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
}

function parseFilialTableData(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  
  const filiais = [];
  const departamentos = [];
  const filiaisExtra = {};
  const filialTotals = {};
  
  function normalizeId(idStr) {
    if (!idStr) return '';
    return idStr.replace(/\D/g, ''); // keep only numbers
  }
  
  let currentSection = '';
  
  // First pass: extract filial totals and main filial indicators
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const upperLine = line.toUpperCase();
    
    if (upperLine === 'TOTAL') {
      currentSection = 'TOTAL';
      continue;
    } else if (upperLine.startsWith('TOTAL :') || upperLine.startsWith('TOTAL:')) {
      currentSection = '';
      continue;
    } else if (upperLine.includes('MEDICAMENTO TOTAL') || upperLine.includes('MEDICAMENTO - RX') || upperLine.includes('PBM') || upperLine.includes('TROCO AMIGO')) {
      currentSection = '';
      continue;
    }
    
    if (currentSection === 'TOTAL') {
      const parts = line.split(/\s+/);
      const firstPart = parts[0];
      if (/^\d+/.test(firstPart)) {
        const filialId = normalizeId(firstPart);
        if (filialId) {
          filialTotals[filialId] = parseNum(parts[1]);
          filiais.push({
            id: filialId,
            vdaEft: parts[1] || '-',
            vdaOnt: parts[2] || '-',
            alvo: parts[3] || '-',
            desvioPerc: parts[4] || '-',
            evlVda: parts[5] || '-'
          });
        }
      }
    }
  }
  
  currentSection = '';
  
  // Second pass: parse departments and other indicators
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const upperLine = line.toUpperCase();
    
    // Detect section headers
    if (upperLine.includes('MEDICAMENTO TOTAL')) {
      currentSection = 'MEDICAMENTO_GERAL';
      continue;
    } else if (upperLine.includes('MEDICAMENTO - OTC') || upperLine.includes('MEDICAMENTO - RX') || upperLine.includes('MEDICAMENTO - BIO') || upperLine.includes('MARCA') || upperLine.includes('CLINIC')) {
      currentSection = ''; // ignore sub-departments and clinic
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
          const vdaEftNum = parseNum(vdaEft);
          const filialTotal = filialTotals[filialId] || 0;
          
          if (currentSection === 'MEDICAMENTO_GERAL') {
            share = filialTotal > 0 ? ((vdaEftNum / filialTotal) * 100).toFixed(2).replace('.', ',') + '%' : '-';
          } else if (currentSection === 'GENERICO') {
            share = numericParts[11] || '-';
          } else if (currentSection === 'HB') {
            share = filialTotal > 0 ? ((vdaEftNum / filialTotal) * 100).toFixed(2).replace('.', ',') + '%' : '-';
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
  
  return { filiais, departamentos, filiaisExtra };
}

async function run() {
  const text = fs.readFileSync('parsed_pdf.txt', 'utf8');
  const result = parseFilialTableData(text);
  
  console.log('Result filiais count:', result.filiais.length);
  console.log('Result filiaisExtra count:', Object.keys(result.filiaisExtra).length);
  console.log('Result departamentos count:', result.departamentos.length);
  console.log('Filial 351 details:', {
    main: result.filiais.find(f => f.id === '351'),
    extra: result.filiaisExtra['351'],
    depts: result.departamentos.filter(d => d.id === '351')
  });
}

run().catch(console.error);
