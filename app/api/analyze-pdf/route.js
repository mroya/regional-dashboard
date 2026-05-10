import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 300;

const MAX_INPUT_CHARS = 30000;

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
- Procure a tabela "% Participacao Venda Efetiva sobre a Venda nos utimos 3 meses e mesmo mes do ano anterior".
- Na secao "participacao", preencha os percentuais da linha do mes principal (ex: Mai 2026) para as colunas "Med", "HB (N-Med)", "Gen" e "PP".
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

async function repairJsonWithGemini(model, invalidJson) {
  const repairPrompt = `
Corrija o texto abaixo para JSON valido.
Responda somente com o JSON corrigido, sem markdown e sem explicacoes.

TEXTO:
${invalidJson.slice(0, 12000)}
`;

  const repairResult = await model.generateContent(repairPrompt);
  const repairResponse = await repairResult.response;
  return extractJson(repairResponse.text());
}

export async function POST(request) {
  try {
    const { text, referenceDate } = await request.json();
    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (!text || !referenceDate) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    if (!geminiApiKey) {
      return NextResponse.json({
        error: 'GEMINI_API_KEY nao configurada no ambiente do servidor',
      }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const modelNames = [
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-flash-latest'
    ].filter((model, index, models) => model && models.indexOf(model) === index);

    const limitedText = text.length > MAX_INPUT_CHARS ? text.slice(0, MAX_INPUT_CHARS) : text;
    const prompt = buildPrompt(limitedText);

    let result;
    let successfulModel;
    let lastModelError;

    for (const modelName of modelNames) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            temperature: 0,
            maxOutputTokens: 2048,
            responseMimeType: 'application/json',
          },
        });
        result = await model.generateContent(prompt);
        successfulModel = model;
        break;
      } catch (error) {
        lastModelError = error;
        if (!error.message?.includes('404 Not Found')) {
          throw error;
        }
      }
    }

    if (!result) {
      throw lastModelError || new Error('Nenhum modelo Gemini disponivel para generateContent');
    }

    const response = await result.response;
    const rawText = response.text();
    let parsedData;

    try {
      parsedData = extractJson(rawText);
    } catch (parseError) {
      console.warn('[Gemini] JSON invalido, tentando reparar:', parseError.message);
      try {
        parsedData = await repairJsonWithGemini(successfulModel, rawText);
      } catch (repairError) {
        throw new Error('Erro ao reparar JSON: ' + repairError.message + ' | RAW: ' + rawText.slice(0, 500));
      }
    }

    // Removido o salvamento do Firestore daqui (movido para o client-side)
    // para evitar hangs da SDK client do Firebase no ambiente Node/Serverless.

    return NextResponse.json({ success: true, data: parsedData });
  } catch (error) {
    console.error('Erro no Gemini:', error);
    return NextResponse.json({ error: 'Falha na IA: ' + error.message }, { status: 500 });
  }
}
