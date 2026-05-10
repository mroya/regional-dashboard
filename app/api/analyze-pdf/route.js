import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from '@/app/lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { NextResponse } from 'next/server';
import { sanitizeFirestoreData } from '@/app/utils/firestore';

export const runtime = 'nodejs';
export const maxDuration = 300;

const MAX_INPUT_CHARS = 30000;

function buildPrompt(text) {
  return `
Voce e um analista financeiro. Analise o texto extraido de um PDF e extraia os indicadores financeiros no formato JSON.
Responda somente com JSON valido, minificado, sem markdown e sem explicacoes.

IMPORTANTE:
- Procure por variacoes de nomes: "MED" ou "Medicamentos", "HB" ou "HB (N-Med)", "Clinic" ou "Clinica".
- Mapeie sempre para os nomes padroes: "MED", "HB (N-MED)", "CLINIC" e "GERAL".
- Mantenha valores monetarios e percentuais como texto, no formato encontrado no relatorio.

TEXTO:
${text}

FORMATO JSON:
{
  "geral": { "diasUteis": "31", "diasRestantes": "..." },
  "filiais": [ { "id": "Mes", "vdaEft": "...", "mediaDia": "...", "rtRep": "..." } ],
  "departamentos": [
    { "departamento": "MED", "vdaEft": "...", "metaDia": "...", "projecao": "...", "desvioPerc": "...", "vlrDesvio": "..." },
    { "departamento": "HB (N-MED)", "vdaEft": "...", "metaDia": "...", "projecao": "...", "desvioPerc": "...", "vlrDesvio": "..." },
    { "departamento": "CLINIC", "vdaEft": "...", "metaDia": "...", "projecao": "...", "desvioPerc": "...", "vlrDesvio": "..." },
    { "departamento": "GERAL", "vdaEft": "...", "metaDia": "...", "projecao": "...", "desvioPerc": "...", "vlrDesvio": "..." }
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
      process.env.GEMINI_MODEL || 'gemini-2.0-flash',
      'gemini-2.5-flash',
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
      parsedData = await repairJsonWithGemini(successfulModel, rawText);
    }

    const docRef = doc(db, 'reports', referenceDate);
    await setDoc(docRef, {
      ...sanitizeFirestoreData(parsedData),
      updatedAtStr: new Date().toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
      timestamp: serverTimestamp(),
      referenceDate,
    }, { merge: true });

    return NextResponse.json({ success: true, data: parsedData });
  } catch (error) {
    console.error('Erro no Gemini:', error);
    return NextResponse.json({ error: 'Falha na IA: ' + error.message }, { status: 500 });
  }
}
