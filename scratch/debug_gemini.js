const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function run() {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  const apiKeyMatch = envContent.match(/GEMINI_API_KEY\s*=\s*(.*)/);
  const apiKey = apiKeyMatch ? apiKeyMatch[1].trim() : null;

  const text = fs.readFileSync('parsed_pdf.txt', 'utf8');
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
  });

  const prompt = `Analise o texto abaixo e extraia apenas os indicadores gerais como JSON simples.
TEXTO:
${text.slice(0, 1000)}
`;
  
  const result = await model.generateContent(prompt);
  console.log('Response:', JSON.stringify(result, null, 2));
}
run().catch(console.error);
