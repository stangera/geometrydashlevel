import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, push, set, onValue } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// firebase конфиг
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

// канвас
const canvas = document.getElementById("textCanvas");
const ctx = canvas.getContext("2d");

// спрайт + json
const image = new Image();
image.src = "spritesheet.png";

let atlas = null;

fetch("spritesheet.json")
  .then(res => res.json())
  .then(data => {
    atlas = data.frames;
    redraw(); // начальная отрисовка
  });

// рисуем строку на канвас
function drawText(text, x, y) {
  if (!atlas) return;
  let offsetX = x;

  for (let char of text.toUpperCase()) {
    let key = `chars/${char}.png`;
    if (!(key in atlas)) key = "chars/UNKNOWN.png";
    const frame = atlas[key];
    if (!frame) continue;

    const { x: sx, y: sy, w, h } = frame.frame;
    ctx.drawImage(image, sx, sy, w, h, offsetX, y, w, h);
    offsetX += w + 2;
  }
}

// отрисовка всех сообщений
function redraw() {
  if (!atlas) return;

  onValue(ref(db, 'texts'), (snapshot) => {
    const data = snapshot.val();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!data) {
      drawText("ничего нет", 10, 10);
      return;
    }

    const entries = Object.entries(data).sort((a, b) => b[1].timestamp - a[1].timestamp);
    let y = 10;

    for (const [_, entry] of entries) {
      drawText(entry.text, 10, y);
      y += 20;
    }
  }, { onlyOnce: false });
}

// отправка нового текста
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
