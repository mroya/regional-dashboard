const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
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
  const email = 'test-diagnostic@example.com';
  const password = 'TestPassword123!';
  await signInWithEmailAndPassword(auth, email, password);
  
  const dates = ['2026-05-23', '2026-05-22'];
  for (const d of dates) {
    const docRef = doc(db, 'reports', d);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      console.log(`\n=================== DEPARTAMENTOS: ${d} ===================`);
      console.log(data.departamentos);
    }
  }
}

run().catch(console.error);
