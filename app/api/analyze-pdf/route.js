import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import fs from 'fs';

export const runtime = 'nodejs';
export const maxDuration = 300;

const MAX_INPUT_CHARS = 150000;

// Cache em memoria inteligente (hash do texto -> resultado)
// Isso evita reprocessar o mesmo PDF (ex: multiplos envios sem querer), economizando API
const analysisCache = new Map();

function buildPrompt(text, filialId = null) {
  // If filialId is provided, we generate a concise prompt that extracts department data and general indicators for that filial.
  if (filialId) {
    return `
Voce e um analista financeiro. Analise o texto extraido de um PDF e extraia, para a filial ${filialId}, os indicadores de departamentos e indicadores gerais no formato JSON.
Responda somente com JSON valido, minificado, sem markdown e sem explicacoes.

IMPORTANTE:
- Extraia as colunas Vda Eft, Alvo, %Desv, %Evl Vda para os departamentos MEDICAMENTO_GERAL, GENERICO, HB e PANVEL conforme especificado no requisito original.
- Calcule o share conforme descrito.
- Extraia da tabela "CUPOM BEM PANVEL" a porcentagem da coluna "%S/Vda" para a filial ${filialId}.
- Extraia da tabela "PBM" a porcentagem da coluna "PBM %Repr 80/20" para a filial ${filialId}.
- Extraia da tabela "TROCO AMIGO" o valor da coluna "Vlr T.Amigo" como "taVlr" e o valor da coluna "Vlr Ontem" como "taVlrOntem" para a filial ${filialId}.
- Mantenha os valores como strings originais (ex: "5,72%", "90,06%", "299,55", "50,91").
- Nunca retorne "..." ou vazio; use "-" se ausente.

TEXTO:
${text}

FORMATO JSON:
{
  "departamentos": [
    { "id": "${filialId}", "departamento": "MEDICAMENTO_GERAL", "vdaEft": "...", "alvo": "...", "desvioPerc": "...", "evolucaoPerc": "...", "share": "..." },
    { "id": "${filialId}", "departamento": "GENERICO", "vdaEft": "...", "alvo": "...", "desvioPerc": "...", "evolucaoPerc": "...", "share": "..." },
    { "id": "${filialId}", "departamento": "HB", "vdaEft": "...", "alvo": "...", "desvioPerc": "...", "evolucaoPerc": "...", "share": "..." },
    { "id": "${filialId}", "departamento": "PANVEL", "vdaEft": "...", "alvo": "...", "desvioPerc": "...", "evolucaoPerc": "...", "share": "..." }
  ],
  "indicadores": {
    "cupomSVda": "...",
    "pbmRepr": "...",
    "taVlr": "...",
    "taVlrOntem": "..."
  }
}
`;
  }
  // Full prompt
  return `
Voce e um analista financeiro. Analise o texto extraido de um PDF e extraia os indicadores financeiros no formato JSON.
Responda somente com JSON valido, minificado, sem markdown e sem explicacoes.

IMPORTANTE:
- Extraia TODOS os campos de "geral" (diasUteis, diasRestantes, performanceGeral, tktMed, evTkt, medDesv, medEvlVda, genDesv, genEvlVda, hbDesv, hbEvlVda, ppDesv, ppEvlVda, cupomSVda, pbmRepr, taVlr, taVlrOntem).
- Extraia TODAS as filiais encontradas no texto com seus indicadores.
- Extraia os resumos por área (id "SUMMARY") e os departamentos por filial.
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
  "filiais": [
    { "id": "123", "vdaEft": "...", "vdaOnt": "...", "alvo": "...", "desvioPerc": "...", "evlVda": "...", "mediaDia": "...", "rtRep": "..." }
  ],
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

async function callOpenAI(prompt) {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "Você é um assistente especializado em extrair dados financeiros e retornar apenas JSON." },
      { role: "user", content: prompt }
    ],
    response_format: { type: "json_object" },
    temperature: 0,
    max_tokens: 8192,
  });

  const rawText = response.choices[0].message.content;
  try {
    return JSON.parse(rawText);
  } catch (err) {
    throw new Error("OpenAI gerou um JSON incompleto/invalido: " + rawText.slice(0, 300));
  }
}

async function callGemini(prompt) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const fallbackModels = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest', 'gemini-2.5-pro'];
  let lastError;

  for (const modelName of fallbackModels) {
    try {
      console.log(`[Gemini] Tentando modelo: ${modelName}...`);
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 8192,
          responseMimeType: 'application/json',
        },
      });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const rawText = response.text();
      
      try {
        return extractJson(rawText);
      } catch (parseErr) {
        throw new Error(`Parse failed no ${modelName}. Raw: ` + rawText.slice(0, 300));
      }
    } catch (error) {
      console.warn(`[Gemini] Erro no modelo ${modelName}:`, error.message);
      lastError = error;
    }
  }

  throw lastError || new Error("Todos os modelos de fallback do Gemini falharam.");
}

function parseNum(str) {
  if (!str) return 0;
  return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
}

function parseFilialTableData(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const departamentos = [];
  const filiaisExtra = {};
  const filialTotals = {};
  
  function normalizeId(idStr) {
    if (!idStr) return '';
    return idStr.replace(/\D/g, '');
  }
  
  let currentSection = '';
  
  // First pass: extract filial totals
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
      continue;
    }
    
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
  
  return { departamentos, filiaisExtra };
}

export async function POST(request) {
  try {
    let inputText = '';
    let referenceDate = '';

    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      // Upload direto de arquivo via FormData (usado pelo dashboard)
      const formData = await request.formData();
      const file = formData.get('file');

      if (file && typeof file.arrayBuffer === 'function') {
        const arrayBuffer = await file.arrayBuffer();
        inputText = Buffer.from(arrayBuffer).toString('utf-8');
      } else if (formData.get('text')) {
        inputText = formData.get('text');
      } else {
        return NextResponse.json({ error: 'Arquivo ausente e nenhum texto fornecido' }, { status: 400 });
      }

      const refDate = formData.get('referenceDate');
      if (!refDate) {
        return NextResponse.json({ error: 'referenceDate ausente' }, { status: 400 });
      }
      referenceDate = refDate;

    } else {
      // JSON body: aceita { text, referenceDate } ou { filePath, referenceDate }
      const body = await request.json();
      referenceDate = body.referenceDate || '';

      if (body.filePath) {
        try {
          inputText = fs.readFileSync(body.filePath, 'utf8');
        } catch (e) {
          return NextResponse.json({ error: `Falha ao ler arquivo: ${e.message}` }, { status: 400 });
        }
      } else if (body.text) {
        inputText = body.text;
      } else {
        return NextResponse.json({ error: 'Dados incompletos: forneça text ou filePath' }, { status: 400 });
      }

      if (!referenceDate) {
        return NextResponse.json({ error: 'referenceDate ausente' }, { status: 400 });
      }
    }

    const limitedText = inputText.length > MAX_INPUT_CHARS ? inputText.slice(0, MAX_INPUT_CHARS) : inputText;
    
    // Cache Inteligente – inclui versão
    const textHash = crypto.createHash('sha256').update(limitedText + "v16").digest('hex');
    if (analysisCache.has(textHash)) {
      console.log('[Cache] Dados carregados do cache em memoria');
      return NextResponse.json({ success: true, data: analysisCache.get(textHash), fromCache: true });
    }

    // 1️⃣ Process summary (global data) – single call
    const summaryPrompt = buildPrompt(limitedText);
    let summaryData;
    try {
      if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY nao configurada");
      summaryData = await callOpenAI(summaryPrompt);
    } catch (e) {
      if (!process.env.GEMINI_API_KEY) throw new Error('Chave Gemini ausente');
      summaryData = await callGemini(summaryPrompt);
    }

    // 2️⃣ Parse filial details programmatically to avoid Vercel 10s timeout & rate limit errors
    const { departamentos: filialDepts, filiaisExtra } = parseFilialTableData(limitedText);

    // Merge results
    const finalData = {
      ...summaryData,
      filiais: (summaryData.filiais || []).map(f => ({
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

    // Store in cache
    analysisCache.set(textHash, finalData);

    return NextResponse.json({ success: true, data: finalData });
  } catch (error) {
    console.error('Erro geral no processamento de IA:', error);
    return NextResponse.json({ error: 'Falha na IA: ' + error.message }, { status: 500 });
  }
}
