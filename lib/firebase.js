import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDHm7GXvdJ3eSra1_Z5Z73dpfS82D-YXqU",
  authDomain: "dashboard-coordenador.firebaseapp.com",
  projectId: "dashboard-coordenador",
  storageBucket: "dashboard-coordenador.firebasestorage.app",
  messagingSenderId: "522205207176",
  appId: "1:522205207176:web:fc55ba595d3cbf706ddd3d",
  measurementId: "G-6EQX5HGQ4T"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };
