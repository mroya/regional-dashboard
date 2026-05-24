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

// Base prompt (without the large text) – keep it concise
function buildPrompt(chunkText, chunkIdx, totalChunks) {
  return `
Extraia dados do relatório de vendas abaixo em formato JSON.
Preencha todos os campos com os valores encontrados, mantendo o formato original (ex: "3.427.863", "67,34%").
Se não encontrar um valor, retorne "-".

Esta é a parte ${chunkIdx + 1} de ${totalChunks} do texto completo.

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
}

async function run() {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 8192,
      responseMimeType: 'application/json',
    },
  });

  const chunks = splitIntoChunks(fullText, CHUNK_SIZE);
  console.log(`Total chunks to process: ${chunks.length}`);

  // Accumulator for merged result
  const mergedResult = {
    geral: {},
    filiais: [],
    participacao: {},
    departamentos: [],
  };

  // Helper to deduplicate by a key (id)
  const dedup = (arr, key) => {
    const seen = new Set();
    return arr.filter(item => {
      if (!item[key]) return true; // keep if no key
      if (seen.has(item[key])) return false;
      seen.add(item[key]);
      return true;
    });
  };

  for (let i = 0; i < chunks.length; i++) {
    const prompt = buildPrompt(chunks[i], i, chunks.length);
    console.log(`Sending request for chunk ${i + 1}/${chunks.length}...`);
    try {
      const result = await model.generateContent(prompt);
      if (!result.response || !result.response.candidates) {
        console.warn(`No candidates returned for chunk ${i + 1}`);
        continue;
      }
      const text = result.response.candidates[0].content.parts.map(p => p.text).join('');
      // Try parsing JSON; if parsing fails, log and skip
      let partial;
      try {
        partial = JSON.parse(text);
      } catch (e) {
        console.error(`Failed to parse JSON for chunk ${i + 1}:`, e.message);
        console.error('Response excerpt:', text.slice(0, 200));
        continue;
      }

      // Merge geral – keep first non‑placeholder values
      if (partial.geral) {
        for (const [k, v] of Object.entries(partial.geral)) {
          if (v && v !== '-' && !(k in mergedResult.geral)) {
            mergedResult.geral[k] = v;
          }
        }
      }
      // Merge participacao – similar logic
      if (partial.participacao) {
        for (const [k, v] of Object.entries(partial.participacao)) {
          if (v && v !== '-' && !(k in mergedResult.participacao)) {
            mergedResult.participacao[k] = v;
          }
        }
      }
      // Append arrays
      if (Array.isArray(partial.filiais)) {
        mergedResult.filiais.push(...partial.filiais);
      }
      if (Array.isArray(partial.departamentos)) {
        mergedResult.departamentos.push(...partial.departamentos);
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
