const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');
const { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } = require('firebase/auth');
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
const auth = getAuth(app);

async function run() {
  console.log('Authenticating...');
  const email = 'test-diagnostic@example.com';
  const password = 'TestPassword123!';
  
  try {
    await signInWithEmailAndPassword(auth, email, password);
    console.log('Signed in successfully!');
  } catch (err) {
    if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
      console.log('User not found. Trying to register...');
      await createUserWithEmailAndPassword(auth, email, password);
      console.log('Registered and signed in successfully!');
    } else {
      throw err;
    }
  }

  // List of dates to query
  const dates = ['2026-05-07', '2026-05-23', '2026-05-24', '2026-05-22'];
  for (const d of dates) {
    const docRef = doc(db, 'reports', d);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      console.log(`\n=================== DOCUMENT: ${d} ===================`);
      console.log('Geral:', data.geral);
      console.log('Participacao:', data.participacao);
      console.log('Filiais count:', data.filiais ? data.filiais.length : 0);
      console.log('Departamentos count:', data.departamentos ? data.departamentos.length : 0);
      if (data.filiais && data.filiais.length > 0) {
        console.log('Sample Filial 0:', data.filiais[0]);
        console.log('Sample Filial 351:', data.filiais.find(f => f.id === '351'));
      }
    } else {
      console.log(`Document not found for date: ${d}`);
    }
  }
}

run().catch(console.error);
