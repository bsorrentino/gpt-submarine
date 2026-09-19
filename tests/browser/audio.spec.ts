import { test, expect } from '@playwright/test';

test('sound toggle enables synthesized gameplay audio and mutes active effects', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    const captured: AudioBufferSourceNode[] = [];
    Object.assign(window, { capturedAudio: captured });
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args) {
      captured.push(this);
      return start.apply(this, args);
    };
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Take command' }).click();
  await page.keyboard.down('q');
  await expect(page.locator('#shots')).toHaveText('01');
  await page.keyboard.up('q');
  const count = () => page.evaluate(() => (window as any).capturedAudio.length);
  expect(await count()).toBe(0);
  await page.getByRole('button', { name: 'Sound off', exact: true }).click();
  await expect(page.locator('#sound')).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.down('e');
  await expect.poll(count).toBeGreaterThan(0);
  await page.keyboard.up('e');
  await page.getByRole('button', { name: 'Sound on', exact: true }).click();
  await expect(page.locator('#sound')).toHaveAttribute('aria-pressed', 'false');
  const mutedCount = await count();
  await page.keyboard.down('q');
  await page.waitForTimeout(1000);
  await page.keyboard.up('q');
  expect(await count()).toBe(mutedCount);

  // Exercise each patch through the real browser AudioContext and inspect its PCM.
  const result = await page.evaluate(async () => {
    const path = '/src/audio.ts';
    const { AudioEngine } = await import(path);
    const engine = new AudioEngine();
    const captured = (window as any).capturedAudio as AudioBufferSourceNode[];
    const initial = captured.length;
    await engine.toggle();
    const kinds = ['charge-launch', 'charge-splash', 'torpedo-surface', 'ship-hit', 'sub-hit', 'charge-miss'];
    for (const kind of kinds) engine.play(kind);
    const voices = captured.slice(initial);
    const buffers = voices.map(source => {
      const samples = source.buffer!.getChannelData(0);
      return {
        duration: source.buffer!.duration,
        energy: samples.reduce((sum, sample) => sum + sample * sample, 0),
        finite: samples.every(sample => Number.isFinite(sample) && Math.abs(sample) <= .3 + 1e-6),
        attack: samples[0], tail: samples[samples.length - 1],
      };
    });
    const ended = Promise.all(voices.map(voice => new Promise<void>(resolve => voice.addEventListener('ended', () => resolve(), { once: true }))));
    await engine.toggle();
    await ended;
    engine.play('charge-launch');
    const afterMute = captured.length - initial;
    await engine.toggle();
    engine.play('charge-launch');
    const afterResume = captured.length - initial;
    await engine.toggle();
    await engine.context.close();
    return { buffers, afterMute, afterResume };
  });
  expect(result.buffers).toHaveLength(6);
  expect(new Set(result.buffers.map(buffer => buffer.duration)).size).toBe(6);
  for (const buffer of result.buffers) {
    expect(buffer.energy).toBeGreaterThan(1);
    expect(buffer.finite).toBe(true);
    expect(buffer.attack).toBe(0);
    expect(Math.abs(buffer.tail)).toBeLessThan(.001);
  }
  expect(result.afterMute).toBe(6);
  expect(result.afterResume).toBe(7);
  expect(errors).toEqual([]);
});
