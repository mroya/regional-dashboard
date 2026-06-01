const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');

function buildPrompt(text) {
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

async function callGemini(modelName, prompt, apiKey) {
  const genAI = new GoogleGenerativeAI(apiKey);
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
  return response.text();
}

async function run() {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  const geminiKey = envContent.match(/GEMINI_API_KEY\s*=\s*(.*)/)[1].trim();
  const text = fs.readFileSync('parsed_pdf.txt', 'utf8');

  const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest', 'gemini-2.5-pro'];
  for (const m of models) {
    console.log(`Testing model ${m}...`);
    try {
      const rawText = await callGemini(m, buildPrompt(text), geminiKey);
      console.log(`Model ${m} succeeded. Length:`, rawText.length);
      console.log('First 200 chars:', rawText.slice(0, 200));
      console.log('Last 200 chars:', rawText.slice(-200));
    } catch (err) {
      console.error(`Model ${m} failed:`, err.message);
    }
  }
}

run().catch(console.error);
