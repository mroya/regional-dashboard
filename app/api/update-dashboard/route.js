import { db } from '@/app/lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const data = await request.json();
    const { referenceDate, ...parsedData } = data;

    if (!referenceDate) {
      return NextResponse.json({ error: 'Data de referência ausente' }, { status: 400 });
    }

    const docRef = doc(db, 'reports', referenceDate);
    
    // Salva os dados processados pela IA
    await setDoc(docRef, {
      ...parsedData,
      updatedAtStr: new Date().toLocaleString('pt-BR', { 
        day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' 
      }),
      timestamp: serverTimestamp()
    }, { merge: true });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro na API de Update:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
