import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, push, set, onValue } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { remove } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// my pronouns are U/S/A
const firebaseConfig = {
  apiKey: "AIzaSyAXxl4NlGp2-7XJQ1AOKRoO700Ap8D3wKs",
  authDomain: "geometrydashpastebin.firebaseapp.com",
  projectId: "geometrydashpastebin",
  storageBucket: "geometrydashpastebin.appspot.com",
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
canvas.width = window.innerWidth - 20;
canvas.height = window.innerHeight - 100;

// камера
let camera = { x: 0, y: 0, zoom: 1 };
let isDragging = false;
let lastMouseX = 0, lastMouseY = 0;
let selectedId = null;
let atlas = null;
let globalData = null;
let cameramove = false;
let selectedObjectKey = null;
let selectedObject = null;
let justDragged = false;

const image = new Image();
image.src = "spritesheet.png";
const backgroundImage = new Image();
backgroundImage.src = "background.jpg";

window.addEventListener('keydown', (e) => {
  if (e.code == 'ShiftLeft') {
    cameramove = true;
  }
});
window.addEventListener('keyup', (e) => {
  if (e.code == 'ShiftLeft') {
    cameramove = false
  }
});

canvas.addEventListener('mousedown', e => {
  if (!cameramove) return;
  isDragging = true;
  justDragged = true;
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
  canvas.style.cursor = 'grabbing';
});

canvas.addEventListener('mouseup', () => {
  if (!cameramove) return;
  isDragging = false;
  setTimeout(() => justDragged = false, 10); // сбрасываем чуть позже, чтобы click не сработал
  canvas.style.cursor = 'grab';
});

canvas.addEventListener('mouseleave', () => {
  isDragging = false;
  canvas.style.cursor = 'grab';
});

canvas.addEventListener('mousemove', e => {
  if (isDragging) {
    const dx = e.clientX - lastMouseX;
    const dy = e.clientY - lastMouseY;
    camera.x += dx / camera.zoom;
    camera.y += dy / camera.zoom;
    if (camera.x > 0) camera.x = 0;
    if (camera.y < -500) camera.y = -500;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    doRedraw();
  }
});

canvas.addEventListener('wheel', e => {
  //e.preventDefault();
  //const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
  //const oldZoom = camera.zoom;
  //camera.zoom = Math.max(0.1, Math.min(5, camera.zoom * zoomFactor));

  //const mouseX = e.clientX;
  //const mouseY = e.clientY;
  //camera.x += (mouseX / oldZoom - mouseX / camera.zoom);
  //camera.y += (mouseY / oldZoom - mouseY / camera.zoom);
  //doRedraw();
});

canvas.addEventListener('click', e => {
  // проверка на попадание в уже существующие объекты
  if (globalData) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const worldX = mouseX / camera.zoom - camera.x;
    const worldY = (canvas.height - mouseY) / camera.zoom + camera.y;

    const coordinateToPixel = canvas.width / 30 / 30;

    const entries = Object.entries(globalData).sort((a, b) => b[1].timestamp - a[1].timestamp);

    for (const [key, entry] of entries) {
      const objects = parseLevel(entry.text);
      for (let i = 0; i < objects.length; i++) {
        const obj = objects[i];
        const frame = atlas[`id_${obj.id}.png`];
        if (!frame) continue;

        const cellSize = 120;
        const scaleX = frame.frame.w / cellSize;
        const scaleY = frame.frame.h / cellSize;

        const gridCellSize = canvas.width / 30;
        const px = obj.x * coordinateToPixel;
        const py = obj.y * coordinateToPixel;

        const minX = px - (gridCellSize * scaleX) / 2;
        const maxX = px + (gridCellSize * scaleX) / 2;
        const minY = py - (gridCellSize * scaleY) / 2;
        const maxY = py + (gridCellSize * scaleY) / 2;

        if (worldX >= minX && worldX <= maxX && worldY >= minY && worldY <= maxY) {
          selectedObject = obj;
          selectedObjectKey = key;
          console.log("selected object:", obj);
          doRedraw();
          return;
        }
      }
    }
  }

  if (isDragging || justDragged || selectedId === null) return;

  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  // пересчёт в мировые координаты
  const worldX = mouseX / camera.zoom - camera.x;
  const worldY = (canvas.height - mouseY) / camera.zoom + camera.y;

  const gridCellSize = canvas.width / 30;
  const coordinateToPixel = gridCellSize / 30;

  // привязка к сетке
  const snappedX = Math.floor(worldX / gridCellSize) * gridCellSize / coordinateToPixel;
  const snappedY = Math.floor(worldY / gridCellSize) * gridCellSize / coordinateToPixel + 30;

  const levelString = `1,${selectedId},2,${snappedX.toFixed(1)},3,${snappedY.toFixed(1)}`;

  const postRef = push(ref(db, 'texts'));
  set(postRef, { text: levelString, timestamp: Date.now() }).then(() => {
  selectedObjectKey = postRef.key;
  });
});

function copyAllObjects() {
  if (!globalData) return;

  const entries = Object.entries(globalData).sort((a, b) => a[1].timestamp - b[1].timestamp);
  const allText = entries.map(([_, entry]) => entry.text.trim()).join(';');

  const output = document.getElementById('textOutput');
  output.value = allText;
  output.select();

  console.log('copied level:', allText);
}

fetch("spritesheet.json").then(res => res.json()).then(data => {
  atlas = data.frames;
  createPalette();
  subscribeToUpdates(); // подписываемся один раз
});

// рисует палитру объектов
function createPalette() {
  const palette = document.getElementById("objectPalette");
  for (const key in atlas) {
    const id = parseInt(key.match(/id_(\d+)\.png/)[1]);
    const frame = atlas[key];
    const { x: sx, y: sy, w, h } = frame.frame;

    const maxDim = Math.max(w, h);
    const canvas = document.createElement("canvas");
    canvas.width = maxDim;
    canvas.height = maxDim;
    const context = canvas.getContext("2d");

    // центрируем изображение
    const offsetX = (maxDim - w) / 2;
    const offsetY = (maxDim - h) / 2;

    context.drawImage(image, sx, sy, w, h, offsetX, offsetY, w, h);
    canvas.style.border = "1px solid gray";
    canvas.style.cursor = "pointer";
    canvas.style.width = "40px"; // скейлим палитру визуально
    canvas.style.height = "40px";

    canvas.onclick = () => {
      selectedId = id;
      document.querySelectorAll("#objectPalette canvas").forEach(c => c.style.border = "1px solid gray");
      canvas.style.border = "2px solid red";
    };

    palette.appendChild(canvas);
  }
}


function subscribeToUpdates() {
  onValue(ref(db, 'texts'), snapshot => {
    globalData = snapshot.val();
    doRedraw();
  });
}

function parseLevel(levelString) {
  const objects = [];
  const groups = levelString.split(';');
  for (const group of groups) {
    const parts = group.split(',');
    if (parts.length < 4) continue;

    let id = null, x = null, y = null, rotation = 0;
    for (let i = 0; i < parts.length; i += 2) {
      const key = parseInt(parts[i]);
      const value = parts[i + 1];
      if (key === 1) id = parseInt(value);
      if (key === 2) x = parseFloat(value);
      if (key === 3) y = parseFloat(value);
      if (key === 6) rotation = parseFloat(value);
    }

    if (id !== null && x !== null && y !== null) {
      objects.push({ id, x, y, rotation });
    }
  }
  return objects;
}

function drawGrid() {
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.lineWidth = 1;
  const gridCellSize = canvas.width / 30;

  ctx.save();
  ctx.translate(camera.x * camera.zoom, camera.y * camera.zoom);
  ctx.scale(camera.zoom, camera.zoom);

  const left = -camera.x;
  const right = left + canvas.width / camera.zoom;
  const top = -camera.y;
  const bottom = top + canvas.height / camera.zoom;

  const startX = Math.floor(left / gridCellSize) * gridCellSize;
  const endX = Math.ceil(right / gridCellSize) * gridCellSize;
  const startY = Math.floor(top / gridCellSize) * gridCellSize;
  const endY = Math.ceil(bottom / gridCellSize) * gridCellSize;

  for (let x = startX; x <= endX; x += gridCellSize) {
    ctx.beginPath();
    ctx.moveTo(x, top - gridCellSize);
    ctx.lineTo(x, bottom + gridCellSize);
    ctx.stroke();
  }
  for (let y = startY; y <= endY; y += gridCellSize) {
    ctx.beginPath();
    ctx.moveTo(left - gridCellSize, y);
    ctx.lineTo(right + gridCellSize, y);
    ctx.stroke();
  }

  ctx.restore();
}

function drawObject(obj) {
  if (!atlas) return;
  const spriteKey = `id_${obj.id}.png`;
  const frame = atlas[spriteKey];
  if (!frame) return;

  const { x: sx, y: sy, w, h } = frame.frame;
  const gridCellSize = canvas.width / 30;
  const coordinateToPixel = gridCellSize / 30;
  const canvasX = obj.x * coordinateToPixel;
  const canvasY = canvas.height - (obj.y * coordinateToPixel);
  const angle = obj.rotation ? obj.rotation * Math.PI / 180 : 0;

  // сколько пикселей в одной клетке
  const cellSize = 120;

  // масштаб изображения относительно клеток
  const scaleX = w / cellSize;
  const scaleY = h / cellSize;

  // итоговые размеры
  const drawW = gridCellSize * scaleX;
  const drawH = gridCellSize * scaleY;

  ctx.save();
  ctx.translate(camera.x * camera.zoom, camera.y * camera.zoom);
  ctx.scale(camera.zoom, camera.zoom);

  // центрируем по центру
  ctx.translate(canvasX + gridCellSize / 2, canvasY + gridCellSize / 2);
  ctx.rotate(angle);
  ctx.drawImage(image, sx, sy, w, h, -drawW / 2, -drawH / 2, drawW, drawH);

  // если это выбранный объект — рисуем рамку
  if (selectedObject && obj === selectedObject) {
    ctx.strokeStyle = 'yellow';
    ctx.lineWidth = 2;
    ctx.strokeRect(-drawW / 2, -drawH / 2, drawW, drawH);
  }

  ctx.restore();
}

function doRedraw() {
  if (!atlas) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (backgroundImage.complete) {
    ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  drawGrid();

  ctx.save();
  ctx.translate(camera.x * camera.zoom, camera.y * camera.zoom);
  ctx.scale(camera.zoom, camera.zoom);

  ctx.strokeStyle = 'white';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, -100000);
  ctx.lineTo(0, 100000);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.translate(camera.x * camera.zoom, camera.y * camera.zoom);
  ctx.scale(camera.zoom, camera.zoom);
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 4;
  ctx.shadowColor = 'black';
  ctx.shadowBlur = 2;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;
  ctx.beginPath();
  ctx.moveTo(-100000, 890);
  ctx.lineTo(100000, 890);
  ctx.stroke();
  ctx.restore();

  if (!globalData) return;

  const entries = Object.entries(globalData).sort((a, b) => b[1].timestamp - a[1].timestamp);
  for (const [key, entry] of entries) {
    const objects = parseLevel(entry.text);
    for (const obj of objects) {
      drawObject(obj);
    }
  }
}

window.sendText = function () {
  const input = document.getElementById("textInput");
  const levelString = input.value.trim();
  if (!levelString) return;

  const path = selectedObjectKey
    ? ref(db, 'texts/' + selectedObjectKey)
    : push(ref(db, 'texts'));

  set(path, {
    text: levelString,
    timestamp: Date.now()
  });

  input.value = '';
  selectedObjectKey = null;
};

window.addEventListener("keydown", e => {
  if (e.code === "Delete" && selectedObject && selectedObjectKey && globalData[selectedObjectKey]) {
    const entry = globalData[selectedObjectKey];

    // обновляем в базе
    remove(ref(db, `texts/${selectedObjectKey}`));

    selectedObject = null;
    selectedObjectKey = null;
  }
});
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyE' && selectedObjectKey && globalData[selectedObjectKey]) {
    const input = document.getElementById("textInput");
    input.value = globalData[selectedObjectKey].text;
  }
});
window.addEventListener('keydown', (e) => {
  if ((e.code === 'KeyQ' || e.code === 'KeyX') && selectedObjectKey && globalData[selectedObjectKey]) {
      let entry = globalData[selectedObjectKey];
      if (!entry || !entry.text) return;

      // парсим строку в массив вида: ["1","3","2","120","3","150",...]
      let parts = entry.text.split(',');

      // ищем индекс 6 (rotation), если нет — добавим в конец
      let rotIndex = parts.findIndex(p => p === '6');
      if (rotIndex !== -1) {
        let oldRot = parseFloat(parts[rotIndex + 1]) || 0;
        parts[rotIndex + 1] = (
          (oldRot + (e.code === 'KeyZ' ? -90 : 90) + 360) % 360
        ).toString();
      } else {
        parts.push('6');
        parts.push((e.code === 'KeyZ' ? -90 + 360 : 90).toString());
      }

      // собираем обратно
      entry.text = parts.join(',');

      // сохраняем в Firebase
      set(ref(db, 'texts/' + selectedObjectKey), {
        text: entry.text,
        timestamp: Date.now()
      });
    }
  });
window.addEventListener('keydown', (e) => {
  if (!selectedObjectKey || !globalData[selectedObjectKey]) return;
  const entry = globalData[selectedObjectKey];
  if (!entry || !entry.text) return;

  let parts = entry.text.split(',');

  const getValue = (key) => {
    const i = parts.findIndex(p => p === key.toString());
    return i !== -1 ? { index: i + 1, value: parseFloat(parts[i + 1]) } : null;
  };

  const setValue = (key, newVal) => {
    const i = parts.findIndex(p => p === key.toString());
    if (i !== -1) parts[i + 1] = newVal.toFixed(1);
    else parts.push(key.toString(), newVal.toFixed(1));
  };

  switch (e.code) {
    case 'KeyW': {
      const y = getValue(3);
      if (y) setValue(3, y.value + 30);
      break;
    }
    case 'KeyS': {
      const y = getValue(3);
      if (y) setValue(3, y.value - 30);
      break;
    }
    case 'KeyA': {
      const x = getValue(2);
      if (x) setValue(2, x.value - 30);
      break;
    }
    case 'KeyD': {
      const x = getValue(2);
      if (x) setValue(2, x.value + 30);
      break;
    }
    default:
      return;
  }

  set(ref(db, 'texts/' + selectedObjectKey), {
    text: parts.join(','),
    timestamp: Date.now()
  });
});
window.copyAllObjects = copyAllObjects;
