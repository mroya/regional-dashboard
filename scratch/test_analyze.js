const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

function buildPrompt(text) {
  return `
Voce e um analista financeiro. Analise o texto extraido de um PDF e extraia os indicadores financeiros no formato JSON.
Responda somente com JSON valido, minificado, sem markdown e sem explicacoes.

IMPORTANTE:
- Na parte "geral", preencha diasUteis, diasRestantes. 
- Procure a tabela "Indicadores Gerais" (que tem colunas como Vda Eft, Média Dia, Cupons, Tkt Méd, %Evol). Use a linha do mês mais recente (ex: "Mai 2026") para preencher "performanceGeral" (use o valor de %Evol), "tktMed" (valor de Tkt Méd) e "evTkt" (valor de %Evol se for o único percentual de evolução ali).
- Procure a linha "Total :" da tabela REGIONAL e extraia "Vda Eft" (vdaEft), "Vda Ont" (vdaOnt), "Alvo" (alvo), "%Desv" (desvioPerc) e "%Evl Vda" (evlVda).
- Existe uma tabela de resumo por area de negocio com as linhas "Geral", "Med", "HB (N-Med)", "Clinic". Voce DEVE colocar esses dados no array "departamentos" usando o "id": "SUMMARY".
- Mapeie sempre para os nomes padroes no regional: "MED", "HB (N-MED)", "CLINIC" e "GERAL".
- Para os departamentos no regional: a coluna "%Desv 1" vai para "desvioPerc". A coluna "VlrDesv" vai para "vlrDesvio".
- Procure a tabela de "% Participacao" (que tem as colunas Med, HB, Clinic, Marca, Gen, RX, OTC, BIO, PP, Lifar). Extraia os valores percentuais da linha referente ao mes principal e coloque na secao "participacao" (para "med", "hb", "gen" e "pp").
- Na tabela principal de filiais (REGIONAL), você DEVE extrair as colunas: "Vda Eft" (vdaEft), "Vda Ont" (vdaOnt), "Alvo" (alvo), "%Desv" (desvioPerc) e "%Evl Vda" (evlVda) para cada filial (ex: 38, 44, 113, etc.).
- EXTRAÇÃO DE DEPARTAMENTOS POR FILIAL:
  Para cada filial (como 38, 44, 113, etc.) listada na tabela principal, você DEVE procurar nas outras tabelas específicas do PDF os dados correspondentes e adicioná-los ao array "departamentos" com as chaves:
  1. Tabela "MEDICAMENTO TOTAL": departamento "MEDICAMENTO_GERAL". Extraia vdaEft, alvo, desvioPerc, evolucaoPerc (da coluna %Evl Vda) e calcule o share = (vdaEft do Medicamento / vdaEft total da filial) * 100 (ex: 60.1%).
  2. Tabela "GENÉRICO": departamento "GENERICO". Extraia vdaEft, alvo, desvioPerc, evolucaoPerc (da coluna %Evl Vda) e share (use a coluna %Med).
  3. Tabela "HB (Não Medicamento)": departamento "HB". Extraia vdaEft, alvo, desvioPerc, evolucaoPerc (da coluna %Evl Vda) e calcule o share = (vdaEft do HB / vdaEft total da filial) * 100 (ex: 37.8%).
  4. Tabela "PRODUTOS PANVEL": departamento "PANVEL". Extraia vdaEft, alvo, desvioPerc, evolucaoPerc (da coluna %Evl Vda) e share (use a coluna %HB).
  Tanto desvioPerc quanto evolucaoPerc e share devem ser strings no formato original (ex: "7,41%", "31,79%", "60,1%").
- Mantenha valores monetarios e percentuais como texto original (ex: "3.427.863", "67,34%").
- IMPORTANTE: NUNCA retorne os "..." literais do formato JSON. Substitua-os pelos valores reais que encontrar. Se não houver valor ou tabela, retorne "-".

TEXTO:
${text}

FORMATO JSON:
{
  "geral": { "diasUteis": "31", "diasRestantes": "24", "performanceGeral": "...", "tktMed": "...", "evTkt": "...", "medDesv": "...", "medEvlVda": "...", "genDesv": "...", "genEvlVda": "...", "hbDesv": "...", "hbEvlVda": "...", "ppDesv": "...", "ppEvlVda": "...", "cupomSVda": "...", "pbmRepr": "...", "taVlr": "...", "taVlrOntem": "..." },
  "filiais": [ { "id": "123", "vdaEft": "...", "vdaOnt": "...", "alvo": "...", "desvioPerc": "...", "evlVda": "...", "mediaDia": "...", "rtRep": "..." } ],
  "participacao": { "med": "...", "hb": "...", "gen": "...", "pp": "..." },
  "departamentos": [
    { "id": "SUMMARY", "departamento": "MED", "vdaEft": "...", "alvo": "...", "projecao": "...", "desvioPerc": "...", "vlrDesvio": "..." },
    { "id": "SUMMARY", "departamento": "HB (N-MED)", "vdaEft": "...", "alvo": "...", "projecao": "...", "desvioPerc": "...", "vlrDesvio": "..." },
    { "id": "SUMMARY", "departamento": "CLINIC", "vdaEft": "...", "alvo": "...", "projecao": "...", "desvioPerc": "...", "vlrDesvio": "..." },
    { "id": "SUMMARY", "departamento": "GERAL", "vdaEft": "...", "alvo": "...", "projecao": "...", "desvioPerc": "...", "vlrDesvio": "..." },
    { "id": "38", "departamento": "MEDICAMENTO_GERAL", "vdaEft": "...", "alvo": "...", "desvioPerc": "...", "evolucaoPerc": "...", "share": "..." },
    { "id": "38", "departamento": "GENERICO", "vdaEft": "...", "alvo": "...", "desvioPerc": "...", "evolucaoPerc": "...", "share": "..." },
    { "id": "38", "departamento": "HB", "vdaEft": "...", "alvo": "...", "desvioPerc": "...", "evolucaoPerc": "...", "share": "..." },
    { "id": "38", "departamento": "PANVEL", "vdaEft": "...", "alvo": "...", "desvioPerc": "...", "evolucaoPerc": "...", "share": "..." }
  ]
}
`;
}

async function run() {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  const apiKeyMatch = envContent.match(/GEMINI_API_KEY\s*=\s*(.*)/);
  const apiKey = apiKeyMatch ? apiKeyMatch[1].trim() : null;

  if (!apiKey) {
    console.error('Error: GEMINI_API_KEY not found in .env.local');
    process.exit(1);
  }

  const text = fs.readFileSync('parsed_pdf.txt', 'utf8');
  console.log('Read text:', text.length, 'chars');

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 8192,
      responseMimeType: 'application/json',
    },
  });

  console.log('Calling Gemini...');
  const prompt = buildPrompt(text);
  const result = await model.generateContent(prompt);
  const response = await result.response;
  const rawText = response.text();

  console.log('Result length:', rawText.length, 'chars');
  fs.writeFileSync('scratch/test_output.json', rawText, 'utf8');
  console.log('Result saved to scratch/test_output.json');
}

run().catch(console.error);
