import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from '@/app/lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(request) {
  try {
    const { text, referenceDate } = await request.json();

    if (!text || !referenceDate) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    // Configura o modelo
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      Você é um analista financeiro. Analise o texto extraído de um PDF de relatório de vendas e extraia os dados estritamente no formato JSON abaixo.
      Retorne APENAS o JSON puro, sem comentários ou blocos de código.
      
      TEXTO:
      ${text}

      FORMATO ESPERADO:
      {
        "geral": { "diasUteis": "31", "diasRestantes": "..." },
        "filiais": [ { "id": "Mês", "vdaEft": "...", "mediaDia": "...", "rtRep": "..." } ],
        "departamentos": [ 
          { 
            "departamento": "MED", 
            "vdaEft": "...", 
            "metaDia": "...", 
            "projecao": "...", 
            "desvioPerc": "...", 
            "vlrDesvio": "..." 
          },
          { "departamento": "HB (N-MED)", "vdaEft": "...", "metaDia": "...", "projecao": "...", "desvioPerc": "...", "vlrDesvio": "..." },
          { "departamento": "CLINIC", "vdaEft": "...", "metaDia": "...", "projecao": "...", "desvioPerc": "...", "vlrDesvio": "..." },
          { "departamento": "GERAL", "vdaEft": "...", "metaDia": "...", "projecao": "...", "desvioPerc": "...", "vlrDesvio": "..." }
        ]
      }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let jsonText = response.text().trim();
    
    // Limpeza de possíveis formatações de markdown que a IA possa colocar
    jsonText = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const parsedData = JSON.parse(jsonText);

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
