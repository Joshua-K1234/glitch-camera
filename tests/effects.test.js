import test from 'node:test';
import assert from 'node:assert/strict';
import { effects, applyEffect } from '../dist/effects/index.js';

function fixture(width = 37, height = 23) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let p = 0; p < data.length; p += 4) {
    data[p] = (p * 13) % 256; data[p + 1] = (p * 7 + 71) % 256;
    data[p + 2] = (p * 19 + 41) % 256; data[p + 3] = (p / 4) % 256;
  }
  return { width, height, data };
}

for (const effect of effects) {
  test(`${effect.id}: keeps dimensions, alpha, and source pixels intact`, () => {
    const frame = fixture(); const before = new Uint8ClampedArray(frame.data);
    const output = applyEffect(effect.id, frame, { intensity: 0.85, time: 2 });
    assert.equal(output.width, frame.width); assert.equal(output.height, frame.height);
    assert.equal(output.data.length, frame.data.length);
    assert.deepEqual(frame.data, before); assert.notEqual(output.data, frame.data);
    for (let p = 3; p < output.data.length; p += 4) assert.equal(output.data[p], before[p]);
    if (effect.id !== 'original') assert.notDeepEqual(output.data, before);
  });
  test(`${effect.id}: zero intensity reproduces the source exactly`, () => {
    const frame = fixture(); assert.deepEqual(applyEffect(effect.id, frame, { intensity: 0 }).data, frame.data);
  });
  test(`${effect.id}: handles a one-pixel image and clamps intensity`, () => {
    const frame = fixture(1, 1);
    assert.equal(applyEffect(effect.id, frame, { intensity: 1 }).data.length, 4);
    assert.deepEqual(applyEffect(effect.id, frame, { intensity: -2 }).data, frame.data);
    assert.deepEqual(applyEffect(effect.id, frame, { intensity: 20 }).data, applyEffect(effect.id, frame, { intensity: 1 }).data);
  });
}

test('duotone: maps dark and light pixels to the chosen colours', () => {
  const frame = {
    width: 2,
    height: 1,
    data: new Uint8ClampedArray([
      0, 0, 0, 123,
      255, 255, 255, 234,
    ]),
  };

  const output = applyEffect('duotone', frame, { intensity: 1 });

  assert.deepEqual(Array.from(output.data), [
    32, 16, 79, 123,
    255, 204, 112, 234,
  ]);
});

test('unknown effects fail with an actionable error', () => {
  assert.throws(() => applyEffect('missing', fixture()), /Unknown effect: missing/);
});
test('supports browser ImageData-style properties that are not enumerable', () => {
  const input = fixture();
  const frame = Object.create(Object.defineProperties({}, {
    width: { get: () => input.width }, height: { get: () => input.height }, data: { get: () => input.data },
  }));
  for (const effect of effects) {
    const result = applyEffect(effect.id, frame);
    assert.equal(result.width, input.width); assert.equal(result.height, input.height);
    assert.equal(result.data.length, input.data.length);
  }
});
test('time-based filters change over time and remain deterministic', () => {
  for (const id of ['glitch', 'vhs']) {
    const frame = fixture(80, 80);
    const first = applyEffect(id, frame, { time: 1 });
    assert.deepEqual(first.data, applyEffect(id, frame, { time: 1 }).data);
    assert.notDeepEqual(first.data, applyEffect(id, frame, { time: 2 }).data);
  }
});
