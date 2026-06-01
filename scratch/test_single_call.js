const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const MAX_INPUT_CHARS = 150000;

function buildSingleCallPrompt(text) {
  return `
Voce e um analista financeiro. Analise o texto extraido de um PDF de vendas diarias e extraia todos os indicadores no formato JSON.
Responda somente com JSON valido, minificado, sem markdown e sem explicacoes.

IMPORTANTE:
1. "geral": Extraia todos os indicadores gerais (diasUteis, diasRestantes, performanceGeral, tktMed, evTkt, medDesv, medEvlVda, genDesv, genEvlVda, hbDesv, hbEvlVda, ppDesv, ppEvlVda, cupomSVda, pbmRepr, taVlr, taVlrOntem).
2. "participacao": Extraia a participação s/ medicamentos (med), higiene e beleza (hb), genéricos (gen) e marca própria/produtos panvel (pp).
3. "departamentos": 
   - Primeiro, insira as chaves com id "SUMMARY" para as categorias consolidada regional (MED, HB (N-MED), CLINIC, GERAL) com as chaves: departamento, vdaEft, alvo, projecao, desvioPerc, vlrDesvio.
   - Depois, para CADA filial encontrada (como 38, 44, 113, etc.), extraia do PDF e insira nesta lista os 4 departamentos correspondentes:
     * departamento "MEDICAMENTO_GERAL": extraia do setor "MEDICAMENTO TOTAL" as colunas vdaEft, alvo, desvioPerc, evolucaoPerc e o share (calcule: vdaEft do departamento / vdaEft total da filial * 100).
     * departamento "GENERICO": extraia do setor "GENÉRICO" as colunas vdaEft, alvo, desvioPerc, evolucaoPerc e o share (use a coluna %Med).
     * departamento "HB": extraia do setor "HB (Não Medicamento)" as colunas vdaEft, alvo, desvioPerc, evolucaoPerc e o share (calcule: vdaEft do departamento / vdaEft total da filial * 100).
     * departamento "PANVEL": extraia do setor "PRODUTOS PANVEL" as colunas vdaEft, alvo, desvioPerc, evolucaoPerc e o share (use a coluna %HB).
4. "filiais": 
   - Extraia a lista de todas as filiais com seus dados principais da tabela consolidada regional (id, vdaEft, vdaOnt, alvo, desvioPerc, evlVda, mediaDia, rtRep).
   - Além disso, para cada filial, extraia os seguintes indicadores e insira como atributos diretamente no objeto da filial:
     * "cupomSVda": da tabela "CUPOM BEM PANVEL", extraia a coluna "%S/Vda" para aquela filial.
     * "pbmRepr": da tabela "PBM", extraia a coluna "PBM %Repr 80/20" para aquela filial.
     * "taVlr": da tabela "TROCO AMIGO", extraia a coluna "Vlr T.Amigo" para aquela filial.
     * "taVlrOntem": da tabela "TROCO AMIGO", extraia a coluna "Vlr Ontem" para aquela filial.

- Mantenha valores como strings originais (ex: "3.427.863", "67,34%").
- Se não encontrar um valor, use "-". Nunca use "..." literal no JSON final.

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
  "participacao": { "med": "...", "hb": "...", "gen": "...", "pp": "..." },
  "filiais": [
    { 
      "id": "123", "vdaEft": "...", "vdaOnt": "...", "alvo": "...", "desvioPerc": "...", "evlVda": "...", "mediaDia": "...", "rtRep": "...",
      "cupomSVda": "...", "pbmRepr": "...", "taVlr": "...", "taVlrOntem": "..."
    }
  ],
  "departamentos": [
    { "id": "SUMMARY", "departamento": "MED", "vdaEft": "...", "alvo": "...", "projecao": "...", "desvioPerc": "...", "vlrDesvio": "..." },
    { "id": "38", "departamento": "MEDICAMENTO_GERAL", "vdaEft": "...", "alvo": "...", "desvioPerc": "...", "evolucaoPerc": "...", "share": "..." }
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

async function run() {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  const geminiKey = envContent.match(/GEMINI_API_KEY\s*=\s*(.*)/)[1].trim();
  const text = fs.readFileSync('parsed_pdf.txt', 'utf8');
  const limitedText = text.length > MAX_INPUT_CHARS ? text.slice(0, MAX_INPUT_CHARS) : text;

  const genAI = new GoogleGenerativeAI(geminiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 8192,
      responseMimeType: 'application/json',
    },
  });

  console.log('Calling Gemini with single prompt...');
  const startTime = Date.now();
  const prompt = buildSingleCallPrompt(limitedText);
  const result = await model.generateContent(prompt);
  const response = await result.response;
  const rawText = response.text();
  const duration = (Date.now() - startTime) / 1000;
  console.log(`Gemini response received in ${duration}s.`);

  const parsed = extractJson(rawText);
  console.log('SUCCESS! Sample filial:', parsed.filiais[0]);
  console.log('Total filiais extracted:', parsed.filiais.length);
  console.log('Total departments extracted:', parsed.departamentos.length);
  
  fs.writeFileSync('scratch/single_call_output.json', JSON.stringify(parsed, null, 2), 'utf8');
}

run().catch(console.error);
