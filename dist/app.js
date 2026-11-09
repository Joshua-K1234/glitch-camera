import { effects, applyEffect } from './effects/index.js';

const $ = (id) => document.getElementById(id);
const preview = $('preview');
const context = preview.getContext('2d');
const source = document.createElement('canvas');
const processed = document.createElement('canvas');
source.width = processed.width = preview.width;
source.height = processed.height = preview.height;
const sourceContext = source.getContext('2d', { willReadFrequently: true });
const processedContext = processed.getContext('2d');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const state = {
  effect: 'pixel', intensity: 0.65, mirror: false, motion: !reducedMotion,
  paused: false, source: 'demo', image: null, stream: null, time: 0,
  captures: [], operation: 0, lastFrame: 0, messageTimer: null, capturePending: false,
};
$('motion').checked = state.motion;

function message(text) {
  clearTimeout(state.messageTimer);
  $('message').textContent = text;
  state.messageTimer = setTimeout(() => { $('message').textContent = ''; }, 6500);
}

// A generated demo means visitors can explore the app without camera access,
// external assets, network requests, or a permission prompt.
function drawDemo(ctx, time = 0) {
  const { width, height } = ctx.canvas;
  ctx.save();
  ctx.scale(width / 960, height / 600);
  const sky = ctx.createLinearGradient(0, 0, 960, 600);
  sky.addColorStop(0, '#23156b'); sky.addColorStop(0.55, '#4b1bc2'); sky.addColorStop(1, '#df537a');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, 960, 600);
  ctx.strokeStyle = '#b995ff26'; ctx.lineWidth = 1;
  for (let x = 0; x < 960; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 600); ctx.stroke(); }
  for (let y = 0; y < 600; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(960, y); ctx.stroke(); }
  const sunY = 245 + Math.sin(time * 0.6) * 13;
  const sun = ctx.createLinearGradient(0, sunY - 160, 0, sunY + 160);
  sun.addColorStop(0, '#fff6a9'); sun.addColorStop(0.5, '#ffb66b'); sun.addColorStop(1, '#fc518c');
  ctx.fillStyle = sun; ctx.beginPath(); ctx.arc(704, sunY, 167, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(704, sunY, 167, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = '#5721a0';
  for (let y = 285; y < 430; y += 18) ctx.fillRect(520, y, 370, 3 + (y - 285) / 15);
  ctx.restore();
  ctx.fillStyle = '#1c1247'; ctx.beginPath(); ctx.moveTo(0, 486); ctx.lineTo(200, 342); ctx.lineTo(350, 480); ctx.lineTo(477, 385); ctx.lineTo(680, 508); ctx.lineTo(835, 421); ctx.lineTo(960, 461); ctx.lineTo(960, 600); ctx.lineTo(0, 600); ctx.fill();
  ctx.fillStyle = '#31115c'; ctx.beginPath(); ctx.moveTo(0, 535); ctx.lineTo(280, 458); ctx.lineTo(520, 543); ctx.lineTo(810, 470); ctx.lineTo(960, 530); ctx.lineTo(960, 600); ctx.lineTo(0, 600); ctx.fill();
  ctx.strokeStyle = '#b174cb55';
  for (let x = -600; x <= 1500; x += 100) { ctx.beginPath(); ctx.moveTo(480, 450); ctx.lineTo(x, 600); ctx.stroke(); }
  for (let y = 490; y < 600; y += 25) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(960, y); ctx.stroke(); }
  ctx.fillStyle = '#f8eedc'; ctx.font = 'bold 104px Arial, sans-serif'; ctx.textBaseline = 'top';
  ctx.fillText('STAY', 64, 140); ctx.fillText('STRANGE.', 58, 239);
  ctx.fillStyle = '#c4f36b'; ctx.font = '14px monospace'; ctx.fillText('A DIFFERENT KIND OF ORDINARY', 67, 368);
  ctx.strokeStyle = '#c4f36b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(897, 510, 17, 0, Math.PI * 2); ctx.stroke();
  ctx.font = '21px monospace'; ctx.fillText('↗', 887, 499);
  ctx.restore();
}

function drawCover(ctx, image) {
  const width = image.videoWidth || image.naturalWidth;
  const height = image.videoHeight || image.naturalHeight;
  if (!width || !height) return;
  const scale = Math.max(source.width / width, source.height / height);
  ctx.drawImage(image, (source.width - width * scale) / 2, (source.height - height * scale) / 2, width * scale, height * scale);
}

function updateSource() {
  if (state.source === 'demo') drawDemo(sourceContext, state.time);
  else if (state.source === 'image' && state.image) drawCover(sourceContext, state.image);
  else if (state.source === 'camera' && $('video').readyState >= 2) drawCover(sourceContext, $('video'));
}

function render(refreshSource = !state.paused) {
  if (refreshSource) updateSource();
  const frame = sourceContext.getImageData(0, 0, source.width, source.height);
  const result = applyEffect(state.effect, frame, { intensity: state.intensity, time: state.motion ? state.time : 0 });
  processedContext.putImageData(new ImageData(result.data, result.width, result.height), 0, 0);
  context.save();
  if (state.mirror) { context.translate(preview.width, 0); context.scale(-1, 1); }
  context.drawImage(processed, 0, 0);
  context.restore();
}

function animate(now) {
  if (!document.hidden && now - state.lastFrame >= 1000 / 24) {
    const elapsed = Math.min((now - state.lastFrame) / 1000, 0.1);
    state.lastFrame = now;
    if (!state.paused) {
      if (state.motion) state.time += elapsed;
      if (state.source === 'camera' || (state.motion && (state.source === 'demo' || ['vhs', 'glitch'].includes(state.effect)))) render();
    }
  }
  requestAnimationFrame(animate);
}

function renderThumbnails() {
  const tiny = document.createElement('canvas'); tiny.width = 240; tiny.height = 150;
  const ctx = tiny.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(source, 0, 0, tiny.width, tiny.height);
  const frame = ctx.getImageData(0, 0, tiny.width, tiny.height);
  for (const effect of effects) {
    const result = applyEffect(effect.id, frame, { intensity: 0.65, time: 0.7 });
    document.querySelector(`[data-effect="${effect.id}"] canvas`).getContext('2d').putImageData(new ImageData(result.data, result.width, result.height), 0, 0);
  }
}

function selectEffect(id) {
  state.effect = id;
  const effect = effects.find((item) => item.id === id);
  for (const button of document.querySelectorAll('[data-effect]')) button.setAttribute('aria-pressed', String(button.dataset.effect === id));
  $('effect-name').replaceChildren(document.createTextNode(effect.name));
  const dot = document.createElement('span'); dot.textContent = '.'; $('effect-name').append(dot);
  $('effect-number').textContent = `FILTER NO. ${String(effects.indexOf(effect)).padStart(2, '0')}`;
  $('effect-description').textContent = effect.description;
  $('effect-caption').textContent = `GLITCH CAMERA / ${effect.name.toUpperCase()}`;
  $('intensity').disabled = id === 'original';
  $('intensity-output').textContent = id === 'original' ? '—' : `${Math.round(state.intensity * 100)}%`;
  updatePreviewLabel(); render(false);
}

function updatePreviewLabel() {
  const effect = effects.find((item) => item.id === state.effect);
  preview.setAttribute('aria-label', `${effect.name} effect preview: ${state.source === 'demo' ? 'built-in animated demo' : state.source === 'camera' ? 'live camera' : 'imported image'}`);
}

function setPaused(paused) {
  state.paused = paused;
  $('pause').textContent = paused ? '▶' : 'Ⅱ';
  $('pause').setAttribute('aria-label', paused ? 'Resume preview' : 'Pause preview');
  $('pause').setAttribute('aria-pressed', String(paused));
  if (!paused) render();
}

function updateSourceUI() {
  const label = { demo: 'DEMO', camera: 'LIVE', image: 'IMAGE' }[state.source];
  $('source-status').textContent = `${label} SIGNAL`;
  $('preview-badge').replaceChildren();
  const dot = document.createElement('span'); dot.className = 'status-dot';
  $('preview-badge').append(dot, document.createTextNode(` ${label}`));
  $('camera').innerHTML = state.source === 'camera' ? '<span aria-hidden="true">◉</span> Stop camera' : '<span aria-hidden="true">◉</span> Enable camera';
  $('demo').setAttribute('aria-pressed', String(state.source === 'demo'));
  updatePreviewLabel();
  setPaused(false); renderThumbnails();
}

function stopCamera() {
  if (state.stream) state.stream.getTracks().forEach((track) => track.stop());
  state.stream = null;
  $('video').srcObject = null;
}

function useDemo() {
  state.operation++; stopCamera();
  state.source = 'demo'; state.image = null; updateSourceUI();
}

async function startCamera() {
  if (state.source === 'camera') { useDemo(); message('Camera stopped. Back to the demo.'); return; }
  if (!navigator.mediaDevices?.getUserMedia) {
    message('Camera access needs HTTPS or localhost and a supported browser. You can still open an image or try the demo.'); return;
  }
  const operation = ++state.operation;
  $('camera').disabled = true;
  let stream;
  let timer;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 800 }, facingMode: 'user' }, audio: false });
    if (operation !== state.operation) { stream.getTracks().forEach((track) => track.stop()); return; }
    stopCamera();
    state.stream = stream; $('video').srcObject = stream;
    await Promise.race([
      $('video').play(),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Camera playback timed out')), 10000); }),
    ]);
    if (operation !== state.operation) { stream.getTracks().forEach((track) => track.stop()); return; }
    state.source = 'camera'; state.image = null; updateSourceUI();
    for (const track of stream.getVideoTracks()) track.addEventListener('ended', () => {
      if (state.stream === stream) { useDemo(); message('Camera disconnected. The demo is ready to use.'); }
    });
    message('Camera connected. Everything stays on your device.');
  } catch (error) {
    stream?.getTracks().forEach((track) => track.stop());
    if (operation !== state.operation) return;
    stopCamera();
    const messages = {
      NotAllowedError: 'Camera permission was denied. Allow it in your browser settings, or use an image instead.',
      NotFoundError: 'No camera found. Connect a camera, or open an image instead.',
      NotReadableError: 'Your camera is unavailable. Close other apps using it and try again.',
      SecurityError: 'Camera access is blocked here. Open the app directly in a browser, or use an image.',
    };
    message(messages[error.name] || 'Could not start the camera. Try again, or open an image instead.');
  } finally {
    clearTimeout(timer); $('camera').disabled = false;
  }
}

async function loadImage(file) {
  if (!file) return;
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'].includes(file.type)) {
    message('Choose a JPG, PNG, WebP, AVIF, or GIF image.'); return;
  }
  if (file.size > 20 * 1024 * 1024) { message('That image is a little large. Choose a file under 20 MB.'); return; }
  const operation = ++state.operation;
  const url = URL.createObjectURL(file);
  try {
    const image = new Image(); image.src = url; await image.decode();
    if (operation !== state.operation) return;
    if (image.naturalWidth * image.naturalHeight > 24000000) { message('Choose an image under 24 megapixels to keep the studio responsive.'); return; }
    stopCamera(); state.image = image; state.source = 'image'; updateSourceUI();
    message('Image loaded. The preview crops to fill the frame.');
  } catch {
    if (operation === state.operation) message('That image could not be opened. Try a different JPG or PNG.');
  } finally { URL.revokeObjectURL(url); }
}

function renderGallery() {
  $('gallery').replaceChildren();
  if (!state.captures.length) {
    const empty = document.createElement('p'); empty.id = 'gallery-empty';
    empty.textContent = 'Good accidents deserve a save. Your captures will appear here.';
    $('gallery').append(empty);
  }
  for (const capture of state.captures) {
    const figure = document.createElement('figure'); figure.className = 'capture-card';
    const image = document.createElement('img'); image.src = capture.url; image.alt = `${capture.effect} capture ${capture.number}`;
    const caption = document.createElement('figcaption');
    const label = document.createElement('span'); label.textContent = `${capture.effect.toUpperCase()} / ${String(capture.number).padStart(2, '0')}`;
    const link = document.createElement('a'); link.href = capture.url; link.download = capture.filename;
    link.textContent = 'Save ↓'; link.setAttribute('aria-label', `Download ${capture.effect} capture ${capture.number} as PNG`);
    caption.append(label, link); figure.append(image, caption); $('gallery').append(figure);
  }
  $('capture-count').textContent = String(state.captures.length).padStart(2, '0');
  $('clear').hidden = !state.captures.length;
}

let captureNumber = 0;
function capturePhoto() {
  if (state.capturePending) return;
  if (state.captures.length >= 24) { message('Your session has 24 captures. Download your favorites, then clear the gallery to make room.'); return; }
  state.capturePending = true; $('capture').disabled = true;
  const effect = effects.find((item) => item.id === state.effect).name;
  const capturedAt = new Date().toISOString().replace(/[:.]/g, '-');
  preview.toBlob((blob) => {
    state.capturePending = false; $('capture').disabled = false;
    if (!blob) { message('Could not capture this frame. Please try again.'); return; }
    const number = ++captureNumber;
    state.captures.unshift({ url: URL.createObjectURL(blob), effect, number, filename: `glitch-camera-${effect.toLowerCase()}-${capturedAt}.png` });
    renderGallery();
    $('viewfinder').classList.remove('flash');
    void $('viewfinder').offsetWidth;
    $('viewfinder').classList.add('flash');
    message('Captured. Find your photo in The Keepers below.');
  }, 'image/png');
}

for (const effect of effects) {
  const button = document.createElement('button'); button.className = 'filter-card'; button.dataset.effect = effect.id;
  button.setAttribute('aria-pressed', String(effect.id === state.effect)); button.setAttribute('aria-label', `${effect.name} effect: ${effect.tag}`);
  const thumbnail = document.createElement('canvas'); thumbnail.width = 240; thumbnail.height = 150; thumbnail.setAttribute('aria-hidden', 'true');
  const name = document.createElement('span'); name.className = 'filter-name'; name.textContent = effect.name;
  const check = document.createElement('span'); check.className = 'filter-check'; check.textContent = '✓'; check.setAttribute('aria-hidden', 'true'); name.append(check);
  const tag = document.createElement('span'); tag.className = 'filter-tag'; tag.textContent = effect.tag;
  button.append(thumbnail, name, tag); button.addEventListener('click', () => selectEffect(effect.id)); $('filters').append(button);
}
$('intensity').addEventListener('input', (event) => {
  state.intensity = Number(event.target.value) / 100;
  $('intensity-output').textContent = `${event.target.value}%`;
  event.target.style.background = `linear-gradient(to right,var(--lime) ${event.target.value}%,#464646 ${event.target.value}%)`;
  render(false);
});
$('mirror').addEventListener('change', (event) => { state.mirror = event.target.checked; render(false); });
$('motion').addEventListener('change', (event) => { state.motion = event.target.checked; render(false); });
$('pause').addEventListener('click', () => setPaused(!state.paused));
$('camera').addEventListener('click', startCamera);
$('demo').addEventListener('click', useDemo);
$('upload').addEventListener('click', () => $('file').click());
$('file').addEventListener('change', (event) => { loadImage(event.target.files[0]); event.target.value = ''; });
$('capture').addEventListener('click', capturePhoto);
$('clear').addEventListener('click', () => {
  state.captures.forEach((capture) => URL.revokeObjectURL(capture.url)); state.captures = []; renderGallery(); message('Session captures cleared.');
});
document.addEventListener('keydown', (event) => {
  let buttons = document.querySelectorAll('[data-effect]');

  const focused = document.activeElement;

  if (focused.matches('.filter-card')) {
      const buttons = [...document.querySelectorAll('.filter-card')];

      const currentIndex = buttons.indexOf(focused);

      if (event.code === 'ArrowLeft') {
        event.preventDefault();

        const previousIndex = (currentIndex - 1 + buttons.length) % buttons.length;

        buttons[previousIndex].focus();
        selectEffect(effects[previousIndex].id);
      }

      if (event.code === 'ArrowRight') {
        event.preventDefault();

        const nextIndex = (currentIndex + 1) % buttons.length;

        buttons[nextIndex].focus();
        selectEffect(effects[nextIndex].id);
    }
    // First filter
        if (event.code === 'Home') {
          event.preventDefault();

          buttons[0].focus();
          selectEffect(effects[0].id);
        }

        // Last filter
        if (event.code === 'End') {
          event.preventDefault();

          const lastIndex = buttons.length - 1;

          buttons[lastIndex].focus();
          selectEffect(effects[lastIndex].id);
        }
    }

  const interactive = event.target.closest('button, a, input, select, textarea, [contenteditable]');
  if (event.code === 'Space' && !interactive && !event.repeat) { event.preventDefault(); capturePhoto(); }
});
window.addEventListener('pagehide', () => {
  state.operation++; stopCamera();
  if (state.source === 'camera') { state.source = 'demo'; updateSourceUI(); }
});
window.addEventListener('beforeunload', (event) => {
  if (state.captures.length) { event.preventDefault(); event.returnValue = ''; }
});
updateSource(); renderThumbnails(); selectEffect(state.effect); requestAnimationFrame(animate);
