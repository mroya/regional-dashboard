const fs = require('fs');
const crypto = require('crypto');
const OpenAI = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const MAX_INPUT_CHARS = 150000;

function buildPrompt(text, filialId = null) {
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

async function callOpenAI(prompt, apiKey) {
  if (!apiKey) throw new Error("OPENAI_API_KEY nao configurada");
  const openai = new OpenAI({ apiKey });
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
  return JSON.parse(response.choices[0].message.content);
}

async function callGemini(prompt, apiKey) {
  if (!apiKey) throw new Error("GEMINI_API_KEY nao configurada");
  const genAI = new GoogleGenerativeAI(apiKey);
  const fallbackModels = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest', 'gemini-2.5-pro'];
  let lastError;

  for (const modelName of fallbackModels) {
    try {
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
      return extractJson(rawText);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

async function run() {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  const geminiKey = envContent.match(/GEMINI_API_KEY\s*=\s*(.*)/)[1].trim();
  const openaiKeyMatch = envContent.match(/OPENAI_API_KEY\s*=\s*(.*)/);
  const openaiKey = (openaiKeyMatch && openaiKeyMatch[1] && openaiKeyMatch[1].replace(/"/g, '').trim()) || '';

  const text = fs.readFileSync('parsed_pdf.txt', 'utf8');
  const limitedText = text.length > MAX_INPUT_CHARS ? text.slice(0, MAX_INPUT_CHARS) : text;

  console.log('1. Processing summary...');
  let summaryData;
  try {
    if (!openaiKey) throw new Error("OPENAI_API_KEY nao configurada");
    summaryData = await callOpenAI(buildPrompt(limitedText), openaiKey);
  } catch (e) {
    console.log('Summary fallback to Gemini...');
    summaryData = await callGemini(buildPrompt(limitedText), geminiKey);
  }

  console.log('Detected filiais in summaryData...');
  const uniqueFilialIds = (summaryData.filiais || [])
    .map(f => f.id)
    .filter(id => id && id.match(/^\d+$/)); // must be numeric
  console.log('Testing with filiais:', uniqueFilialIds);

  const departmentResults = [];
  const filialExtraData = {};

  for (const fid of uniqueFilialIds) {
    const filialPrompt = buildPrompt(limitedText, fid);
    console.log(`Processing filial ${fid}...`);
    try {
      if (!openaiKey) throw new Error("OPENAI_API_KEY nao configurada");
      const res = await callOpenAI(filialPrompt, openaiKey);
      if (res && res.departamentos) departmentResults.push(...res.departamentos);
      if (res && res.indicadores) filialExtraData[fid] = res.indicadores;
    } catch (e) {
      console.log(`Filial ${fid} fallback to Gemini...`);
      try {
        const res = await callGemini(filialPrompt, geminiKey);
        if (res && res.departamentos) departmentResults.push(...res.departamentos);
        if (res && res.indicadores) filialExtraData[fid] = res.indicadores;
      } catch (geminiErr) {
        console.error(`Failed to process filial ${fid}:`, geminiErr.message);
      }
    }
  }

  const finalData = {
    ...summaryData,
    filiais: (summaryData.filiais || []).map(f => ({
      ...f,
      ...(filialExtraData[f.id] || {})
    })),
    departamentos: [...(summaryData.departamentos || []), ...departmentResults]
  };

  console.log('SUCCESS! Extracted filialExtraData keys:', Object.keys(filialExtraData));
  console.log('First filial result merged:', finalData.filiais.find(f => filialExtraData[f.id]));
}

run().catch(console.error);
