// Client game gambar (dibundel jadi app.js oleh esbuild) - Reduygenk-KantDev
import { DiscordSDK } from '@discord/embedded-app-sdk';

const $ = (id) => document.getElementById(id);
const CLIENT_ID = document.querySelector('meta[name=client-id]').content;
const status = (t) => { $('status').style.display = t ? 'flex' : 'none'; if (t) $('status').textContent = t; };
const toast = (t) => { const e = $('toast'); e.textContent = t; e.style.display = 'block'; setTimeout(() => (e.style.display = 'none'), 3500); };

let ws = null, saya = null, keadaan = null, skew = 0;
let warna = '#000000', lebar = 6, hapusMode = false;
const WARNA = ['#000000', '#e03131', '#f08c00', '#fcc419', '#2f9e44', '#1971c2', '#7048e8', '#e64980', '#795548', '#868e96'];
const UKURAN = [4, 8, 16];

const kanvas = $('c'), g = kanvas.getContext('2d');
function bersihkan() { g.fillStyle = '#fff'; g.fillRect(0, 0, kanvas.width, kanvas.height); }
function gambarStroke(s) {
  g.strokeStyle = s.c; g.fillStyle = s.c; g.lineWidth = s.w; g.lineCap = 'round'; g.lineJoin = 'round';
  const p = s.pts.map(([x, y]) => [x * kanvas.width, y * kanvas.height]);
  if (p.length === 1) { g.beginPath(); g.arc(p[0][0], p[0][1], s.w / 2, 0, Math.PI * 2); g.fill(); return; }
  g.beginPath(); g.moveTo(p[0][0], p[0][1]);
  for (let i = 1; i < p.length; i++) g.lineTo(p[i][0], p[i][1]);
  g.stroke();
}
bersihkan();

const kirim = (m) => ws && ws.readyState === 1 && ws.send(JSON.stringify(m));
const sayaPenggambar = () => keadaan && keadaan.fase === 'menggambar' && keadaan.drawer === saya;

// ---------- menggambar (hanya penggambar) ----------
let menggambar = false, buf = [], terakhirKirim = 0;
function titik(e) {
  const r = kanvas.getBoundingClientRect();
  return [Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), Math.max(0, Math.min(1, (e.clientY - r.top) / r.height))];
}
function kirimBuf(paksa) {
  if (!buf.length) return;
  if (!paksa && Date.now() - terakhirKirim < 50) return;
  const s = { c: hapusMode ? '#ffffff' : warna, w: hapusMode ? lebar * 2 : lebar, pts: buf };
  kirim({ t: 'stroke', s });
  buf = [buf[buf.length - 1]];
  terakhirKirim = Date.now();
}
kanvas.addEventListener('pointerdown', (e) => {
  if (!sayaPenggambar()) return;
  kanvas.setPointerCapture(e.pointerId);
  menggambar = true; buf = [titik(e)];
  gambarStroke({ c: hapusMode ? '#ffffff' : warna, w: hapusMode ? lebar * 2 : lebar, pts: [buf[0]] });
});
kanvas.addEventListener('pointermove', (e) => {
  if (!menggambar) return;
  const p = titik(e);
  const dari = buf[buf.length - 1];
  gambarStroke({ c: hapusMode ? '#ffffff' : warna, w: hapusMode ? lebar * 2 : lebar, pts: [dari, p] });
  buf.push(p);
  if (buf.length >= 6) kirimBuf(false);
});
const lepas = () => { if (!menggambar) return; menggambar = false; kirimBuf(true); buf = []; };
kanvas.addEventListener('pointerup', lepas);
kanvas.addEventListener('pointercancel', lepas);

// ---------- UI ----------
function bangunAlat() {
  const a = $('alat'); a.innerHTML = '';
  WARNA.forEach((c) => {
    const d = document.createElement('div'); d.className = 'warna' + (!hapusMode && c === warna ? ' aktif' : ''); d.style.background = c;
    d.onclick = () => { warna = c; hapusMode = false; bangunAlat(); }; a.appendChild(d);
  });
  UKURAN.forEach((u) => { const b = document.createElement('button'); b.className = 'sek'; b.textContent = u === lebar ? `● ${u}` : String(u); b.onclick = () => { lebar = u; bangunAlat(); }; a.appendChild(b); });
  const h = document.createElement('button'); h.className = 'sek'; h.textContent = hapusMode ? 'Penghapus ✓' : 'Penghapus'; h.onclick = () => { hapusMode = !hapusMode; bangunAlat(); }; a.appendChild(h);
  const c = document.createElement('button'); c.className = 'sek'; c.textContent = 'Bersihkan'; c.onclick = () => { bersihkan(); kirim({ t: 'hapus' }); }; a.appendChild(c);
}
function chat(teks, kelas = '') {
  const c = $('chat'); const d = document.createElement('div'); if (kelas) d.className = kelas; d.textContent = teks; c.appendChild(d); c.scrollTop = c.scrollHeight;
}
function pemainChip(p) {
  const d = document.createElement('div'); d.className = 'pemain';
  const i = document.createElement('img'); i.src = p.avatar; i.onerror = () => (i.style.visibility = 'hidden');
  const s = document.createElement('span'); s.textContent = p.nama; d.append(i, s); return d;
}
function render() {
  const k = keadaan; if (!k) return;
  const lobi = k.fase === 'lobby';
  $('lobby').style.display = lobi ? 'block' : 'none';
  $('kolGame').style.display = lobi ? 'none' : 'flex';
  $('panel').style.display = lobi ? 'none' : 'flex';
  $('hasil').style.display = k.fase === 'selesai' ? 'block' : 'none';
  $('alat').style.display = sayaPenggambar() ? 'flex' : 'none';
  $('formTebak').style.display = k.fase === 'menggambar' && k.drawer !== saya ? 'flex' : 'none';
  if (lobi) {
    const d = $('daftar'); d.innerHTML = ''; k.players.forEach((p) => d.appendChild(pemainChip(p)));
    $('mulai').disabled = k.players.length < 2;
    $('catatan').textContent = k.players.length < 2 ? 'Butuh minimal 2 pemain.' : k.players.length < 3 ? 'Hadiah money cuma berlaku kalau pemain minimal 3.' : 'Hadiah money aktif (batas 40.000 per hari dari game).';
  }
  const pg = k.players.find((p) => p.id === k.drawer);
  const info = $('info'); info.innerHTML = '';
  if (k.fase === 'menggambar' || k.fase === 'jeda') {
    const r = document.createElement('span'); r.textContent = `Ronde ${k.ronde}/${k.total}`;
    const w = document.createElement('span'); w.textContent = sayaPenggambar() ? `Kamu menggambar: ${k.kata}` : `Penggambar: ${pg ? pg.nama : '-'}`;
    info.append(r, w);
    if (k.fase === 'menggambar') {
      if (k.drawer !== saya) { const h = document.createElement('span'); h.id = 'hint'; h.textContent = k.hint; info.append(h); }
      const t = document.createElement('span'); t.id = 'timer'; info.append(t);
    } else { const j = document.createElement('span'); j.textContent = k.pesan; info.append(j); }
  } else if (k.pesan) info.textContent = k.pesan;
  const skor = $('skor'); skor.innerHTML = '';
  [...k.players].sort((a, b) => b.skor - a.skor).forEach((p) => {
    const d = document.createElement('div'); if (p.id === k.drawer && k.fase === 'menggambar') d.className = 'gambar'; else if (p.benar) d.className = 'benar';
    const a = document.createElement('span'); a.textContent = (p.id === k.drawer && k.fase === 'menggambar' ? '✏️ ' : p.benar ? '✔ ' : '') + p.nama;
    const b = document.createElement('span'); b.textContent = p.skor; d.append(a, b); skor.appendChild(d);
  });
  if (k.fase === 'selesai') {
    const h = $('hasil'); h.innerHTML = '<h2 style="margin:0 0 8px;color:var(--emas2)">Game selesai</h2>';
    [...k.players].sort((a, b) => b.skor - a.skor).forEach((p, i) => { const d = document.createElement('div'); d.textContent = `${i + 1}. ${p.nama} — ${p.skor} poin`; h.appendChild(d); });
    const b = document.createElement('button'); b.textContent = 'Main lagi'; b.style.marginTop = '12px'; b.onclick = () => kirim({ t: 'mulai' }); h.appendChild(b);
    if (k.pesan) { const d = document.createElement('div'); d.style.cssText = 'margin-top:8px;color:var(--redup)'; d.textContent = k.pesan; h.appendChild(d); }
  }
}
setInterval(() => {
  const t = $('timer'); if (!t || !keadaan) return;
  t.textContent = `${Math.max(0, Math.ceil((keadaan.akhirAt - (Date.now() + skew)) / 1000))}s`;
}, 250);

$('mulai').onclick = () => kirim({ t: 'mulai' });
$('formTebak').onsubmit = (e) => { e.preventDefault(); const i = $('tebak'); if (i.value.trim()) kirim({ t: 'tebak', teks: i.value }); i.value = ''; };

function sambung(token, sdk) {
  ws = new WebSocket(`wss://${location.host}/.proxy/ws`);
  ws.onopen = () => kirim({ t: 'join', token, instanceId: sdk.instanceId, guildId: sdk.guildId });
  ws.onclose = () => status('Koneksi terputus. Tutup dan buka lagi Activity-nya.');
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.t === 'siap') { saya = m.id; status(''); bangunAlat(); }
    else if (m.t === 'error') status(m.pesan);
    else if (m.t === 'state') { const lama = keadaan; keadaan = m; skew = m.sekarang - Date.now(); if (!lama || lama.ronde !== m.ronde || lama.fase !== m.fase) { if (m.fase === 'menggambar') chat(`Ronde ${m.ronde} dimulai!`, 'sistem'); if (m.fase === 'jeda') chat(m.pesan, 'sistem'); } render(); }
    else if (m.t === 'stroke') gambarStroke(m.s);
    else if (m.t === 'strokes') { bersihkan(); m.s.forEach(gambarStroke); }
    else if (m.t === 'clear') bersihkan();
    else if (m.t === 'chat') chat(m.tipe === 'benar' ? m.teks : `${m.nama}: ${m.teks}`, m.tipe === 'benar' ? 'benar' : '');
    else if (m.t === 'hadiah') toast(m.jumlah > 0 ? `+${m.jumlah.toLocaleString('id-ID')} money` : 'Batas money game hari ini tercapai');
  };
}

(async () => {
  try {
    const sdk = new DiscordSDK(CLIENT_ID);
    await sdk.ready();
    const { code } = await sdk.commands.authorize({ client_id: CLIENT_ID, response_type: 'code', state: '', prompt: 'none', scope: ['identify', 'guilds'] });
    const r = await fetch('/.proxy/api/token', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) });
    const { access_token } = await r.json();
    if (!access_token) throw new Error('token kosong');
    await sdk.commands.authenticate({ access_token });
    sambung(access_token, sdk);
  } catch (e) {
    status('Gagal memuat: ' + (e && e.message ? e.message : e));
  }
})();
