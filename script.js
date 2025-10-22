// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDIMwFfRqgkraB55_aPFZDq-IgOKzDXo0A",
  authDomain: "horaire-marthelinois.firebaseapp.com",
  databaseURL: "https://horaire-marthelinois-default-rtdb.firebaseio.com",
  projectId: "horaire-marthelinois",
  storageBucket: "horaire-marthelinois.firebasestorage.app",
  messagingSenderId: "1040288155989",
  appId: "1:1040288155989:web:a53015946b9f0210ef47dc"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);