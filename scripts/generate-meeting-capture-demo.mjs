// Reproducible prototype footage: an original canvas slide + the existing demo audio.
// No screen, camera, microphone, external service or personal data is captured.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage();
  const wav = (await readFile('src/prototype/one-to-one-reference/assets/meeting-demo.wav')).toString('base64');
  const result = await page.evaluate(async wav => {
    const canvas = document.createElement('canvas'); canvas.width = 960; canvas.height = 540;
    const c = canvas.getContext('2d');
    const draw = (progress = 0) => {
      c.fillStyle = '#f5f7fb'; c.fillRect(0, 0, 960, 540);
      c.fillStyle = '#fff'; c.fillRect(0, 0, 960, 54);
      c.fillStyle = '#344266'; c.font = '600 18px sans-serif'; c.fillText('EurekaMind  /  Product review', 36, 34);
      c.fillStyle = '#e8edf7'; c.fillRect(36, 92, 112, 28);
      c.fillStyle = '#46609a'; c.font = '13px sans-serif'; c.fillText('WEEKLY SYNC', 46, 111);
      c.fillStyle = '#26344e'; c.font = '600 40px sans-serif'; c.fillText('Make every meeting count.', 36, 180);
      c.fillStyle = '#65718a'; c.font = '18px sans-serif'; c.fillText('Align on priorities. Capture decisions. Move work forward.', 36, 217);
      ['01  Goals', '02  Decisions', '03  Next steps'].forEach((label, i) => {
        const x = 36 + i * 300;
        c.fillStyle = '#fff'; c.fillRect(x, 262, 280, 174);
        c.fillStyle = '#344266'; c.font = '600 20px sans-serif'; c.fillText(label, x + 20, 298);
        ['Review the release plan', 'Confirm owners & timeline', 'Keep the team in sync'].slice(i, i + 1).forEach(line => {
          c.fillStyle = '#65718a'; c.font = '15px sans-serif'; c.fillText(line, x + 20, 332);
        });
        c.fillStyle = '#e8edf7'; c.fillRect(x + 20, 361, 212, 8); c.fillRect(x + 20, 381, 156, 8);
      });
      c.fillStyle = '#dfe6f2'; c.fillRect(36, 488, 888, 4);
      c.fillStyle = '#5075bf'; c.fillRect(36, 488, 888 * progress, 4);
      c.fillStyle = '#65718a'; c.font = '12px sans-serif'; c.fillText('EurekaMind · Meeting recording preview', 36, 520);
    };
    draw(); const poster = canvas.toDataURL('image/png').split(',')[1];
    const ac = new AudioContext(); await ac.resume();
    const bytes = Uint8Array.from(atob(wav), ch => ch.charCodeAt(0));
    const buffer = await ac.decodeAudioData(bytes.buffer), sound = ac.createBufferSource();
    sound.buffer = buffer; sound.loop = true; const dest = ac.createMediaStreamDestination(); sound.connect(dest);
    const stream = canvas.captureStream(12); dest.stream.getAudioTracks().forEach(track => stream.addTrack(track));
    const mimeType = 'video/webm;codecs=vp8,opus';
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 400000 });
    const chunks = []; recorder.ondataavailable = e => chunks.push(e.data);
    const done = new Promise(resolve => { recorder.onstop = resolve; });
    recorder.start(); sound.start();
    const start = performance.now(); const timer = setInterval(() => draw(Math.min((performance.now() - start) / 6000, 1)), 80);
    await new Promise(resolve => setTimeout(resolve, 6000)); recorder.stop(); await done;
    clearInterval(timer); sound.stop(); stream.getTracks().forEach(track => track.stop()); await ac.close();
    const video = await new Promise(resolve => { const r = new FileReader(); r.onload = () => resolve(r.result.slice(r.result.indexOf('base64,') + 7)); r.readAsDataURL(new Blob(chunks, { type: mimeType })); });
    return { poster, video };
  }, wav);
  const dir = 'public/assets/meeting-capture'; await mkdir(dir, { recursive: true });
  await writeFile(`${dir}/preview.png`, Buffer.from(result.poster, 'base64'));
  await writeFile(`${dir}/meeting-demo.webm`, Buffer.from(result.video, 'base64'));
  process.stdout.write('Generated meeting preview PNG and six-second WebM fixture.\n');
} finally { await browser.close(); }
