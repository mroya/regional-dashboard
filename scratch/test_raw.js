// Refactored script to process large PDF text in chunks and combine JSON results
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Load Gemini API key from .env.local
const envContent = fs.readFileSync('.env.local', 'utf8');
const apiKeyMatch = envContent.match(/GEMINI_API_KEY\s*=\s*(.*)/);
const apiKey = apiKeyMatch ? apiKeyMatch[1].trim() : null;
if (!apiKey) {
  console.error('GEMINI_API_KEY not found in .env.local');
  process.exit(1);
}

// Read the full extracted PDF text
const fullText = fs.readFileSync('parsed_pdf.txt', 'utf8');

// Chunk size (characters) – safe approximation for Gemini token limits
const CHUNK_SIZE = 3000; // adjust if needed
function splitIntoChunks(text, size) {
  const chunks = [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks;
}

// Helper to safely extract JSON (object or array) from model response
function safeParseJson(text) {
  let cleaned = text.trim().replace(/```json/g, '').replace(/```/g, '').trim();
  const firstBrace = cleaned.search(/[\{\[]/);
  if (firstBrace === -1) throw new Error('No JSON brace found');
  cleaned = cleaned.slice(firstBrace);
  const lastBrace = cleaned.lastIndexOf(cleaned[0] === '{' ? '}' : ']');
  if (lastBrace !== -1) cleaned = cleaned.slice(0, lastBrace + 1);
  return JSON.parse(cleaned);
}

// Base prompt (without the large text) – keep it concise
function buildPrompt(chunkText, chunkIdx, totalChunks) {
  if (chunkIdx === 0) {
    return `
Extraia dados do relatório de vendas abaixo em formato JSON.
Preencha todos os campos com os valores encontrados, mantendo o formato original (ex: "3.427.863", "67,34%").
Se não encontrar um valor, retorne "-".

TEXTO:
${chunkText}

FORMATO JSON:
{
  "geral": { "diasUteis": "...", "diasRestantes": "...", "performanceGeral": "...", "tktMed": "...", "evTkt": "...", "medDesv": "...", "medEvlVda": "...", "genDesv": "...", "genEvlVda": "...", "hbDesv": "...", "hbEvlVda": "...", "ppDesv": "...", "ppEvlVda": "...", "cupomSVda": "...", "pbmRepr": "...", "taVlr": "...", "taVlrOntem": "..." },
  "filiais": [ { "id": "123", "vdaEft": "...", "vdaOnt": "...", "alvo": "...", "desvioPerc": "...", "evlVda": "...", "mediaDia": "...", "rtRep": "..." } ],
  "participacao": { "med": "...", "hb": "...", "gen": "...", "pp": "..." },
  "departamentos": [
    { "id": "SUMMARY", "departamento": "MED", "vdaEft": "...", "alvo": "...", "projecao": "...", "desvioPerc": "...", "vlrDesvio": "..." }
  ]
}
`;
  } else {
    return `
Extraia apenas a lista de "departamentos" do texto abaixo. Retorne apenas o objeto JSON com a chave "departamentos".
TEXTO:
${chunkText}
FORMATO JSON:
{ "departamentos": [ { "id": "...", "departamento": "...", "vdaEft": "...", "alvo": "...", "projecao": "...", "desvioPerc": "...", "vlrDesvio": "..." } ] }
`;
  }
}

async function run() {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 8192,
      responseMimeType: 'application/json',
    },
  });

  const chunks = splitIntoChunks(fullText, CHUNK_SIZE);
  console.log(`Total chunks to process: ${chunks.length}`);

  const mergedResult = {
    geral: {},
    filiais: [],
    participacao: {},
    departamentos: [],
  };

  const dedup = (arr, key) => {
    const seen = new Map();
    return arr.filter(item => {
      if (!item[key]) return true;
      if (seen.has(item[key])) return false;
      seen.set(item[key], true);
      return true;
    });
  };

  for (let i = 0; i < chunks.length; i++) {
    const prompt = buildPrompt(chunks[i], i, chunks.length);
    console.log(`Sending request for chunk ${i + 1}/${chunks.length}...`);
    try {
        const result = await model.generateContent(prompt);
        const raw = result.response.text();
        let parsed;
        try {
          parsed = safeParseJson(raw);
        } catch (e) {
          console.error(`Failed to parse JSON for chunk ${i + 1}:`, e.message);
          continue;
        }
        if (i === 0) {
          if (parsed.geral) Object.assign(mergedResult.geral, parsed.geral);
          if (parsed.participacao) Object.assign(mergedResult.participacao, parsed.participacao);
          if (Array.isArray(parsed.filiais)) mergedResult.filiais.push(...parsed.filiais);
          if (Array.isArray(parsed.departamentos)) mergedResult.departamentos.push(...parsed.departamentos);
        } else {
          // Only departamentos expected
          if (Array.isArray(parsed)) {
            mergedResult.departamentos.push(...parsed);
          } else if (Array.isArray(parsed.departamentos)) {
            mergedResult.departamentos.push(...parsed.departamentos);
          }
        }
    } catch (err) {
      console.error(`Error processing chunk ${i + 1}:`, err);
    }
  }

  // Deduplicate arrays by id where possible
  mergedResult.filiais = dedup(mergedResult.filiais, 'id');
  mergedResult.departamentos = dedup(mergedResult.departamentos, 'id');

  // Output final JSON
  const finalJson = JSON.stringify(mergedResult, null, 2);
  console.log('=== Final Merged JSON ===');
  console.log(finalJson);

  // Write to file for convenience
  fs.writeFileSync('output.json', finalJson, 'utf8');
  console.log('Result written to output.json');
}

run().catch(err => {
  console.error('Unexpected error:', err);
});
