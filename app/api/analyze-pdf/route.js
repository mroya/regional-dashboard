import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const maxDuration = 300;

const MAX_INPUT_CHARS = 30000;

// Cache em memoria inteligente (hash do texto -> resultado)
// Isso evita reprocessar o mesmo PDF (ex: multiplos envios sem querer), economizando API
const analysisCache = new Map();

function buildPrompt(text) {
  return `
Voce e um analista financeiro. Analise o texto extraido de um PDF e extraia os indicadores financeiros no formato JSON.
Responda somente com JSON valido, minificado, sem markdown e sem explicacoes.

IMPORTANTE:
- Na parte "geral", preencha diasUteis, diasRestantes e performanceGeral (Performance Acumulada do Mes).
- A tabela principal de filiais vai em "filiais".
- Existe uma tabela de resumo por area de negocio com as linhas "Geral", "Med", "HB (N-Med)", "Clinic". Voce DEVE colocar esses dados no array "departamentos".
- Mapeie sempre para os nomes padroes: "MED", "HB (N-MED)", "CLINIC" e "GERAL".
- Para os departamentos: a coluna "%Desv 1" vai para "desvioPerc". A coluna "VlrDesv" vai para "vlrDesvio".
- Procure a tabela de "% Participacao" (que tem as colunas Med, HB, Clinic, Marca, Gen, RX, OTC, BIO, PP, Lifar).
- Extraia os valores percentuais da linha referente ao mes principal e coloque na secao "participacao" (para "med", "hb", "gen" e "pp").
- Mantenha valores monetarios e percentuais como texto original (ex: "3.427.863", "67,34%").

TEXTO:
${text}

FORMATO JSON:
{
  "geral": { "diasUteis": "31", "diasRestantes": "24", "performanceGeral": "..." },
  "filiais": [ { "id": "Mes", "vdaEft": "...", "mediaDia": "...", "rtRep": "..." } ],
  "participacao": { "med": "...", "hb": "...", "gen": "...", "pp": "..." },
  "departamentos": [
    { "departamento": "MED", "vdaEft": "...", "alvo": "...", "projecao": "...", "desvioPerc": "...", "vlrDesvio": "..." },
    { "departamento": "HB (N-MED)", "vdaEft": "...", "alvo": "...", "projecao": "...", "desvioPerc": "...", "vlrDesvio": "..." },
    { "departamento": "CLINIC", "vdaEft": "...", "alvo": "...", "projecao": "...", "desvioPerc": "...", "vlrDesvio": "..." },
    { "departamento": "GERAL", "vdaEft": "...", "alvo": "...", "projecao": "...", "desvioPerc": "...", "vlrDesvio": "..." }
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
    model: "gpt-4o-mini", // Model mais rápido e barato
    messages: [
      { role: "system", content: "Você é um assistente especializado em extrair dados financeiros e retornar apenas JSON." },
      { role: "user", content: prompt }
    ],
    response_format: { type: "json_object" },
    temperature: 0,
  });

  return JSON.parse(response.choices[0].message.content);
}

async function callGemini(prompt) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  // Modelos disponíveis e atualizados
  const fallbackModels = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest', 'gemini-2.5-pro'];
  let lastError;

  for (const modelName of fallbackModels) {
    try {
      console.log(`[Gemini] Tentando modelo: ${modelName}...`);
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json',
        },
      });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return extractJson(response.text());
    } catch (error) {
      console.warn(`[Gemini] Erro no modelo ${modelName}:`, error.message);
      lastError = error;
    }
  }

  throw lastError || new Error("Todos os modelos de fallback do Gemini falharam.");
}

export async function POST(request) {
  try {
    const { text, referenceDate } = await request.json();

    if (!text || !referenceDate) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    const limitedText = text.length > MAX_INPUT_CHARS ? text.slice(0, MAX_INPUT_CHARS) : text;
    
    // Cache Inteligente
    const textHash = crypto.createHash('sha256').update(limitedText).digest('hex');
    if (analysisCache.has(textHash)) {
      console.log('[Cache] Dados carregados do cache em memoria');
      return NextResponse.json({ success: true, data: analysisCache.get(textHash), fromCache: true });
    }

    const prompt = buildPrompt(limitedText);
    let parsedData;

    try {
      if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY nao configurada no ambiente");
      console.log('[IA] Tentando processar com OpenAI...');
      parsedData = await callOpenAI(prompt);
      console.log('[IA] Sucesso com OpenAI');
    } catch (openaiError) {
      console.warn('[IA] Falha na OpenAI, acionando fallback Gemini:', openaiError.message);
      
      if (!process.env.GEMINI_API_KEY) {
        throw new Error('Nenhuma API Key (OpenAI ou Gemini) configurada ou ambas falharam.');
      }
      
      console.log('[IA] Processando com Gemini...');
      parsedData = await callGemini(prompt);
      console.log('[IA] Sucesso com Gemini');
    }

    // Salvar no cache para evitar processamento duplicado
    analysisCache.set(textHash, parsedData);

    return NextResponse.json({ success: true, data: parsedData });
  } catch (error) {
    console.error('Erro geral no processamento de IA:', error);
    return NextResponse.json({ error: 'Falha na IA: ' + error.message }, { status: 500 });
  }
}

