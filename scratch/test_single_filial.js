const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');

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
}

async function callGemini(prompt, apiKey) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 8192,
      responseMimeType: 'application/json',
    },
  });

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const rawText = response.text();
  return JSON.parse(rawText);
}

async function run() {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  const geminiKey = envContent.match(/GEMINI_API_KEY\s*=\s*(.*)/)[1].trim();
  const text = fs.readFileSync('parsed_pdf.txt', 'utf8');

  console.log('Testing single filial extraction for Filial 38 using Gemini...');
  const prompt = buildPrompt(text, "38");
  const res = await callGemini(prompt, geminiKey);
  console.log('Result:', JSON.stringify(res, null, 2));
}

run().catch(console.error);
