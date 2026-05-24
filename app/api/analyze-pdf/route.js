import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import { NextResponse } from 'next/server';
import crypto from 'crypto';
const fs = require('fs');

export const runtime = 'nodejs';
export const maxDuration = 300;

const MAX_INPUT_CHARS = 150000;

// Cache em memoria inteligente (hash do texto -> resultado)
// Isso evita reprocessar o mesmo PDF (ex: multiplos envios sem querer), economizando API
const analysisCache = new Map();

function buildPrompt(text, filialId = null) {
  // If filialId is provided, we generate a concise prompt that extracts ONLY the department data for that filial.
  if (filialId) {
    return `
Voce e um analista financeiro. Analise o texto extraido de um PDF e extraia, para a filial ${filialId}, os indicadores de departamentos no formato JSON.
Responda somente com JSON valido, minificado, sem markdown e sem explicacoes.

IMPORTANTE:
- Extraia as colunas Vda Eft, Alvo, %Desv, %Evl Vda para os departamentos MEDICAMENTO_GERAL, GENERICO, HB e PANVEL conforme especificado no requisito original.
- Calcule o share conforme descrito.
- Mantenha os valores como strings originais.
- Nunca retorne "..." literal; use "-" se ausente.

TEXTO:
${text}

FORMATO JSON:
{
  "departamentos": [
    { "id": "${filialId}", "departamento": "MEDICAMENTO_GERAL", "vdaEft": "...", "alvo": "...", "desvioPerc": "...", "evolucaoPerc": "...", "share": "..." },
    { "id": "${filialId}", "departamento": "GENERICO", "vdaEft": "...", "alvo": "...", "desvioPerc": "...", "evolucaoPerc": "...", "share": "..." },
    { "id": "${filialId}", "departamento": "HB", "vdaEft": "...", "alvo": "...", "desvioPerc": "...", "evolucaoPerc": "...", "share": "..." },
    { "id": "${filialId}", "departamento": "PANVEL", "vdaEft": "...", "alvo": "...", "desvioPerc": "...", "evolucaoPerc": "...", "share": "..." }
  ]
}
`;
  }
  // Full prompt
  return `
Voce e um analista financeiro. Analise o texto extraido de um PDF e extraia os indicadores financeiros no formato JSON.
Responda somente com JSON valido, minificado, sem markdown e sem explicacoes.

IMPORTANTE:
- Preencha "geral" com diasUteis e diasRestantes.
- Extraia indicadores gerais e tabela REGIONAL como antes.
- Inclua resumo por area usando id "SUMMARY".
- Não inclua detalhes de cada filial aqui (serão processados separadamente).

TEXTO:
${text}

FORMATO JSON:
{
  "geral": {"diasUteis": "31", "diasRestantes": "24", "performanceGeral": "...", "tktMed": "...", "evTkt": "..."},
  "filiais": [],
  "participacao": {},
  "departamentos": []
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
    max_tokens: 8192, // Aumentado para garantir que o JSON não seja cortado na metade
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
          maxOutputTokens: 8192, // Aumentado para evitar cortes
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

export async function POST(request) {
  try {
    // Accept either raw text or a file path for PDF upload
    const { text, referenceDate, filePath } = await request.json();

    let inputText = '';
    if (filePath) {
      // Simple file read – in a real scenario you would parse the PDF to extract text
      try {
        inputText = fs.readFileSync(filePath, 'utf8');
      } catch (e) {
        return NextResponse.json({ error: `Failed to read file: ${e.message}` }, { status: 400 });
      }
    } else if (text) {
      inputText = text;
    } else {
      return NextResponse.json({ error: 'Dados incompletos: forneça texto ou caminho de arquivo' }, { status: 400 });
    }

    if (!referenceDate) {
      return NextResponse.json({ error: 'referenceDate missing' }, { status: 400 });
    }

    const limitedText = inputText.length > MAX_INPUT_CHARS ? inputText.slice(0, MAX_INPUT_CHARS) : inputText;
    
    // Cache Inteligente – inclui versão
    const textHash = crypto.createHash('sha256').update(limitedText + "v13").digest('hex');
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

    // 2️⃣ Detect filial IDs in the text (simple regex for numbers that look like IDs)
    const filialIds = Array.from(limitedText.matchAll(/\bFilial\s*(\d{2,})\b/gi)).map(m => m[1]);
    const uniqueFilialIds = [...new Set(filialIds)];
    console.log('[Process] Filiais encontradas:', uniqueFilialIds);

    // 3️⃣ Process each filial separately (concise prompt to stay under token limit)
    const departmentResults = [];
    for (const fid of uniqueFilialIds) {
      const filialPrompt = buildPrompt(limitedText, fid);
      try {
        const res = await callOpenAI(filialPrompt);
        if (res && res.departamentos) departmentResults.push(...res.departamentos);
      } catch (e) {
        // fallback to Gemini for this filial if OpenAI fails
        if (process.env.GEMINI_API_KEY) {
          const res = await callGemini(filialPrompt);
          if (res && res.departamentos) departmentResults.push(...res.departamentos);
        }
      }
    }

    // Merge results
    const finalData = {
      ...summaryData,
      departamentos: [...(summaryData.departamentos || []), ...departmentResults]
    };

    // Store in cache
    analysisCache.set(textHash, finalData);

    return NextResponse.json({ success: true, data: finalData, qlikLink: getQlikLink() });
  } catch (error) {
    console.error('Erro geral no processamento de IA:', error);
    return NextResponse.json({ error: 'Falha na IA: ' + error.message }, { status: 500 });
  }
}

// Optional helper to generate Qlik link (previously only link was returned)
function getQlikLink() {
  return 'https://panveldash.us.qlikcloud.com/';
}
