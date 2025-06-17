// firebase импорты
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, push, set } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// конфиг
const firebaseConfig = {
  apiKey: "AIzaSyAXxl4NlGp2-7XJQ1AOKRoO700Ap8D3wKs",
  authDomain: "geometrydashpastebin.firebaseapp.com",
  projectId: "geometrydashpastebin",
  storageBucket: "geometrydashpastebin.firebasestorage.app",
  messagingSenderId: "165226981105",
  appId: "1:165226981105:web:db8e3a29f5e0ad8b212b50",
  measurementId: "G-MMX2NXFQ7V",
  databaseURL: "https://geometrydashpastebin-default-rtdb.firebaseio.com"
};

// инициализация
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// отправка текста
window.sendText = function () {
  const input = document.getElementById("textInput");
  const text = input.value.trim();
  if (!text) return;

  const postRef = push(ref(db, 'texts'));
  set(postRef, {
    text: text,
    timestamp: Date.now()
  });

  input.value = '';
};
