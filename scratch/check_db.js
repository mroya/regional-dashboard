const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');

function getEnvVar(name) {
  const match = envContent.match(new RegExp(`${name}\\s*=\\s*(.*)`));
  return (match && match[1] && match[1].replace(/"/g, '').trim()) || '';
}

const firebaseConfig = {
  apiKey: getEnvVar('NEXT_PUBLIC_FIREBASE_API_KEY'),
  authDomain: getEnvVar('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnvVar('NEXT_PUBLIC_FIREBASE_PROJECT_ID'),
  storageBucket: getEnvVar('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnvVar('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnvVar('NEXT_PUBLIC_FIREBASE_APP_ID')
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const dateStr = '2026-05-24'; // wait, what date did they use? Let's check all or print the list.
  console.log('Connecting to Firebase with project:', firebaseConfig.projectId);
  
  // Let's try to read the document for the default date (yesterday relative to system metadata)
  // The system metadata says: The current local time is: 2026-05-24T19:16:53-03:00.
  // Yesterday's date would be: 2026-05-23
  const datesToTry = ['2026-05-23', '2026-05-24', '2026-05-22', '2026-05-07'];
  for (const d of datesToTry) {
    const docRef = doc(db, 'reports', d);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      console.log(`\nFound document for date: ${d}`);
      console.log('- Geral:', data.geral);
      console.log('- Filiais Count:', data.filiais ? data.filiais.length : 0);
      console.log('- Departamentos Count:', data.departamentos ? data.departamentos.length : 0);
      if (data.filiais && data.filiais.length > 0) {
        console.log('- Sample Filial:', data.filiais[0]);
      }
    } else {
      console.log(`No document for date: ${d}`);
    }
  }
}

run().catch(console.error);
