// Filters receive RGBA pixels and return equally sized pixels without mutating
// the input. No DOM dependencies: new filters can be tested with `npm test`.
const copy = (frame) => ({ width: frame.width, height: frame.height, data: new Uint8ClampedArray(frame.data) });
const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
const luminance = (d, i) => d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
const noise = (n) => {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

function pixel(frame, { intensity }) {
  const out = copy(frame);
  const { width, height, data } = frame;
  const size = Math.max(2, Math.round(3 + intensity * 19));
  for (let y = 0; y < height; y += size) {
    for (let x = 0; x < width; x += size) {
      const sample = (Math.min(height - 1, y + (size >> 1)) * width + Math.min(width - 1, x + (size >> 1))) * 4;
      for (let yy = y; yy < Math.min(y + size, height); yy++) {
        for (let xx = x; xx < Math.min(x + size, width); xx++) {
          const p = (yy * width + xx) * 4;
          for (let c = 0; c < 3; c++) out.data[p + c] = data[sample + c];
        }
      }
    }
  }
  return out;
}

function vhs(frame, { intensity, time }) {
  const out = copy(frame);
  const { width, height, data } = frame;
  const tick = Math.floor(time * 15);
  for (let y = 0; y < height; y++) {
    const wobble = Math.round(Math.sin(y * 0.035 + time * 2) * intensity * 5);
    const scan = y % 3 === 0 ? 1 - intensity * 0.32 : 1;
    for (let x = 0; x < width; x++) {
      const p = (y * width + x) * 4;
      const q = (y * width + clamp(x + wobble, 0, width - 1)) * 4;
      const red = (y * width + clamp(x + wobble + Math.round(intensity * 5), 0, width - 1)) * 4;
      const grain = (noise(p + tick) - 0.5) * intensity * 34;
      out.data[p] = data[red] * scan + grain;
      out.data[p + 1] = data[q + 1] * scan + grain;
      out.data[p + 2] = data[q + 2] * scan + grain + intensity * 9;
    }
  }
  return out;
}

function comic(frame, { intensity }) {
  const out = copy(frame);
  const { width, height, data } = frame;
  const levels = 7 - Math.round(intensity * 4);
  const step = 255 / levels;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = (y * width + x) * 4;
      const right = (y * width + Math.min(x + 1, width - 1)) * 4;
      const down = (Math.min(y + 1, height - 1) * width + x) * 4;
      const edge = Math.abs(luminance(data, p) - luminance(data, right)) + Math.abs(luminance(data, p) - luminance(data, down));
      const ink = edge > 50 - intensity * 20 ? 1 - intensity * 0.94 : 1;
      for (let c = 0; c < 3; c++) out.data[p + c] = Math.round(data[p + c] / step) * step * ink;
    }
  }
  return out;
}

function glitch(frame, { intensity, time }) {
  const out = copy(frame);
  const { width, height, data } = frame;
  const tick = Math.floor(time * 7);
  const split = Math.round(intensity * 13);
  for (let y = 0; y < height; y++) {
    const band = Math.floor(y / 18);
    const broken = noise(band + tick * 17) > 0.78;
    const shift = broken ? Math.round((noise(band + tick) - 0.5) * intensity * width * 0.28) : 0;
    for (let x = 0; x < width; x++) {
      const p = (y * width + x) * 4;
      const q = (y * width + clamp(x + shift, 0, width - 1)) * 4;
      const r = (y * width + clamp(x + shift + split, 0, width - 1)) * 4;
      const b = (y * width + clamp(x + shift - split, 0, width - 1)) * 4;
      out.data[p] = data[r];
      out.data[p + 1] = data[q + 1];
      out.data[p + 2] = data[b + 2];
    }
  }
  return out;
}

function noir(frame, { intensity }) {
  const out = copy(frame);
  for (let p = 0; p < frame.data.length; p += 4) {
    const light = (luminance(frame.data, p) - 128) * (1 + intensity * 1.4) + 128;
    for (let c = 0; c < 3; c++) out.data[p + c] = light;
  }
  return out;
}


function duotone(frame, { intensity }) {
  const out = copy(frame);

  const shadow = [32, 16, 79]; // red green blue (RGB) - Dark purple
  const highlight = [255, 204, 112]; // Warm Yellow

  // const shadow = [105, 38, 12]; // dark orange
  // const highlight = [255, 204, 150]; // light orange

  for (let p = 0; p < frame.data.length; p += 4) {
    const brightness = luminance(frame.data, p) / 255;

    for (let c = 0; c < 3; c++) {
      const mapped =
        shadow[c] + (highlight[c] - shadow[c]) * brightness;

      out.data[p + c] =
        frame.data[p + c] * (1 - intensity) + mapped * intensity;
    }
  }

  return out;
}


export const effects = [
  { id: 'original', name: 'Original', tag: 'As you are', description: 'A clean slate. Your source, without any processing.', color: '#d5d1ca', render: copy },
  { id: 'pixel', name: 'Pixel', tag: 'Less is more', description: 'Big pixels. Small details. A little love for the 8-bit era.', color: '#c4f36b', render: pixel },
  { id: 'vhs', name: 'VHS', tag: 'Back to ’94', description: 'Soft tracking, analog grain, and a tape that has seen better days.', color: '#c4b2ff', render: vhs },
  { id: 'comic', name: 'Comic', tag: 'Off the page', description: 'Posterized color and inky edges, straight out of a graphic novel.', color: '#ffbd78', render: comic },
  { id: 'glitch', name: 'Glitch', tag: 'Happy accidents', description: 'Split channels and scrambled lines. A beautiful signal failure.', color: '#ff8eb7', render: glitch },
  { id: 'noir', name: 'Noir', tag: 'After hours', description: 'Deep shadows and bright highlights. Everything in black and white.', color: '#b6d5dd', render: noir },
  { id: 'duotone', name: 'Duotone', tag: 'Two of a kind', description: 'Deep purple shadows and warm yellow highlights.', color: '#ffcc70', render: duotone },
];

export function applyEffect(id, frame, options = {}) {
  const effect = effects.find((item) => item.id === id);
  if (!effect) throw new Error(`Unknown effect: ${id}`);
  const intensity = clamp(Number.isFinite(options.intensity) ? options.intensity : 0.65, 0, 1);
  if (intensity === 0) return copy(frame);
  return effect.render(frame, { intensity, time: Number.isFinite(options.time) ? options.time : 0 });
}
