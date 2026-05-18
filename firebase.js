npm install firebase

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA5LfvIlhlwobzhqBMsKrc-jgf4SEde1I4",
  authDomain: "duplamissionaria.firebaseapp.com",
  projectId: "duplamissionaria",
  storageBucket: "duplamissionaria.firebasestorage.app",
  messagingSenderId: "701981635159",
  appId: "1:701981635159:web:660fb0d8d2a908c91fe912",
  measurementId: "G-TZVKWSXDPD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);