const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');

function buildPrompt(text) {
  return `
Voce e um analista financeiro. Analise o texto extraido de um PDF e extraia os indicadores financeiros no formato JSON.
Responda somente com JSON valido, minificado, sem markdown e sem explicacoes.

IMPORTANTE:
- Extraia TODOS os campos de "geral" (diasUteis, diasRestantes, performanceGeral, tktMed, evTkt, medDesv, medEvlVda, genDesv, genEvlVda, hbDesv, hbEvlVda, ppDesv, ppEvlVda, cupomSVda, pbmRepr, taVlr, taVlrOntem).
- NÃO extraia a lista de filiais aqui (sempre retorne "filiais": []).
- Extraia apenas os resumos por área (id "SUMMARY") para a regional (MED, HB (N-MED), CLINIC, GERAL).
- Extraia a participação percentual (med, hb, gen, pp).
- Mantenha os valores como strings originais (ex: "3.427.863", "67,34%").
- Se não encontrar um valor, retorne "-".
- Nunca retorne "..." literal.

TEXTO:
${text}

FORMATO JSON:
{
  "geral": {
    "diasUteis": "31", "diasRestantes": "24", "performanceGeral": "...", "tktMed": "...", "evTkt": "...",
    "medDesv": "...", "medEvlVda": "...", "genDesv": "...", "genEvlVda": "...",
    "hbDesv": "...", "hbEvlVda": "...", "ppDesv": "...", "ppEvlVda": "...",
    "cupomSVda": "...", "pbmRepr": "...", "taVlr": "...", "taVlrOntem": "..."
  },
  "filiais": [],
  "participacao": { "med": "...", "hb": "...", "gen": "...", "pp": "..." },
  "departamentos": [
    { "id": "SUMMARY", "departamento": "MED", "vdaEft": "...", "alvo": "...", "projecao": "...", "desvioPerc": "...", "vlrDesvio": "..." },
    { "id": "SUMMARY", "departamento": "HB (N-MED)", "vdaEft": "...", "alvo": "...", "projecao": "...", "desvioPerc": "...", "vlrDesvio": "..." },
    { "id": "SUMMARY", "departamento": "CLINIC", "vdaEft": "...", "alvo": "...", "projecao": "...", "desvioPerc": "...", "vlrDesvio": "..." },
    { "id": "SUMMARY", "departamento": "GERAL", "vdaEft": "...", "alvo": "...", "projecao": "...", "desvioPerc": "...", "vlrDesvio": "..." }
  ]
}
`;
}

function extractJson(text) {
  let jsonText = text
    .trim()
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .replace(/,\s*([}\]])/g, '$1')
    .trim();

  if (jsonText.includes('{') && jsonText.includes('}')) {
    jsonText = jsonText.substring(jsonText.indexOf('{'), jsonText.lastIndexOf('}') + 1);
  }

  return JSON.parse(jsonText);
}

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
        } else if (currentSection === 'TROCO AMIGO') {
          filiaisExtra[filialId].taVlr = parts[1] || '-';
          filiaisExtra[filialId].taVlrOntem = parts[8] || '-';
        }
      }
    }
  }
  
  return { filiais, departamentos, filiaisExtra };
}

async function run() {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  const geminiKey = envContent.match(/GEMINI_API_KEY\s*=\s*(.*)/)[1].trim();
  const text = fs.readFileSync('parsed_pdf.txt', 'utf8');

  console.log('Calling Gemini for summary...');
  const genAI = new GoogleGenerativeAI(geminiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 8192,
      responseMimeType: 'application/json',
    },
  });

  const prompt = buildPrompt(text);
  const result = await model.generateContent(prompt);
  const response = await result.response;
  const rawText = response.text();

  console.log('Gemini raw output length:', rawText.length);
  const summaryData = extractJson(rawText);
  console.log('Summary data geral:', summaryData.geral);
  console.log('Summary data filiais (should be empty):', summaryData.filiais);

  console.log('\nRunning programmatic parser...');
  const { filiais: parsedFiliais, departamentos: filialDepts, filiaisExtra } = parseFilialTableData(text);
  console.log('Parsed filiais count:', parsedFiliais.length);
  console.log('Parsed filialDepts count:', filialDepts.length);
  
  const finalData = {
    ...summaryData,
    filiais: parsedFiliais.map(f => ({
      ...f,
      ...(filiaisExtra[f.id] || {
        cupomSVda: '-',
        pbmRepr: '-',
        taVlr: '-',
        taVlrOntem: '-'
      })
    })),
    departamentos: [...(summaryData.departamentos || []), ...filialDepts]
  };

  console.log('\nSUCCESS! Final merged data:');
  console.log('- Total Filiais:', finalData.filiais.length);
  console.log('- Total Departamentos:', finalData.departamentos.length);
  console.log('Sample Branch 351:', finalData.filiais.find(f => f.id === '351'));
  console.log('Sample Branch 351 Departments:', finalData.departamentos.filter(d => d.id === '351'));
}

run().catch(console.error);
