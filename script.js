import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, push, set, onValue } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAXxl4NlGp2-7XJQ1AOKRoO700Ap8D3wKs",
  authDomain: "geometrydashpastebin.firebaseapp.com",
  projectId: "geometrydashpastebin",
  storageBucket: "geometrydashpastebin.firebasestorage.app",
  messagingSenderId: "165226981105",
  appId: "1:165226981105:web:db8e3a29f5e0ad8b212b50",
  measurementId: "G-MMX2NXFQ7V",
  databaseURL: "https://geometrydashpastebin-default-rtdb.europe-west1.firebasedatabase.app"
};

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

// отображение всех текстов
const listDiv = document.getElementById("textList");

onValue(ref(db, 'texts'), (snapshot) => {
  const data = snapshot.val();
  listDiv.innerHTML = ''; // очистить список

  if (!data) {
    listDiv.innerText = 'ничего нет';
    return;
  }

  // собираем и сортируем по времени
  const entries = Object.entries(data).sort((a, b) => b[1].timestamp - a[1].timestamp);

  for (const [id, entry] of entries) {
    const div = document.createElement("div");
    div.textContent = entry.text;
    listDiv.appendChild(div);
  }
});
