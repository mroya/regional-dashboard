import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from '@/app/lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

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
      process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      'gemini-2.0-flash',
    ].filter((model, index, models) => model && models.indexOf(model) === index);

    const prompt = `
      Você é um analista financeiro. Analise o texto extraído de um PDF e extraia os indicadores financeiros no formato JSON.
      
      IMPORTANTE:
      - Procure por variações de nomes: "MED" ou "Medicamentos", "HB" ou "HB (N-Med)", "Clinic" ou "Clínica".
      - Mapeie sempre para os nomes padrões: "MED", "HB (N-MED)", "CLINIC" e "GERAL".
      
      TEXTO:
      ${text}

      FORMATO JSON:
      {
        "geral": { "diasUteis": "31", "diasRestantes": "..." },
        "filiais": [ { "id": "Mês", "vdaEft": "...", "mediaDia": "...", "rtRep": "..." } ],
        "departamentos": [ 
          { "departamento": "MED", "vdaEft": "...", "metaDia": "...", "projecao": "...", "desvioPerc": "...", "vlrDesvio": "..." },
          { "departamento": "HB (N-MED)", "vdaEft": "...", "metaDia": "...", "projecao": "...", "desvioPerc": "...", "vlrDesvio": "..." },
          { "departamento": "CLINIC", "vdaEft": "...", "metaDia": "...", "projecao": "...", "desvioPerc": "...", "vlrDesvio": "..." },
          { "departamento": "GERAL", "vdaEft": "...", "metaDia": "...", "projecao": "...", "desvioPerc": "...", "vlrDesvio": "..." }
        ]
      }
    `;

    let result;
    let lastModelError;

    for (const modelName of modelNames) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        result = await model.generateContent(prompt);
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
    let jsonText = response.text().trim();
    
    console.log('[Gemini] Resposta bruta:', jsonText);

    // Limpeza ultra-agressiva de JSON
    jsonText = jsonText.replace(/```json/g, '').replace(/```/g, '').replace(/\\n/g, '').trim();
    if (jsonText.includes('{') && jsonText.includes('}')) {
      jsonText = jsonText.substring(jsonText.indexOf('{'), jsonText.lastIndexOf('}') + 1);
    }
    
    const parsedData = JSON.parse(jsonText);
    console.log('[Gemini] JSON parseado com sucesso');

    // Salva direto no Firebase
    const docRef = doc(db, 'reports', referenceDate);
    await setDoc(docRef, {
      ...parsedData,
      updatedAtStr: new Date().toLocaleString('pt-BR', { 
        day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' 
      }),
      timestamp: serverTimestamp(),
      referenceDate: referenceDate
    }, { merge: true });

    return NextResponse.json({ success: true, data: parsedData });
  } catch (error) {
    console.error('Erro no Gemini:', error);
    return NextResponse.json({ error: 'Falha na IA: ' + error.message }, { status: 500 });
  }
}
