// ============================================================
//  Mesin gambar - Reduygenk-KantDev
//  Semua gambar dibuat dari SVG lalu diubah jadi PNG pakai sharp.
//  Font dibundel di folder /fonts supaya teks tetap muncul di server
//  yang nggak punya font sistem (misal Railway).
// ============================================================
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// ---- font: tulis font bundel ke folder sementara & arahkan fontconfig ke sana ----
(() => {
  try {
    const dir = path.join(os.tmpdir(), 'ramadan-fonts');
    fs.mkdirSync(dir, { recursive: true });
    const f = require('./fontdata');
    for (const [nama, b64] of [['DejaVuSans.ttf', f.regular], ['DejaVuSans-Bold.ttf', f.bold]]) {
      const p = path.join(dir, nama);
      if (!fs.existsSync(p)) fs.writeFileSync(p, Buffer.from(b64, 'base64'));
    }
    const conf = path.join(os.tmpdir(), 'ramadan-fonts.conf');
    fs.writeFileSync(
      conf,
      `<?xml version="1.0"?>\n<fontconfig>\n<dir>${dir}</dir>\n<cachedir>${path.join(os.tmpdir(), 'ramadan-fontcache')}</cachedir>\n` +
        `<alias><family>sans-serif</family><prefer><family>DejaVu Sans</family></prefer></alias>\n</fontconfig>\n`,
    );
    process.env.FONTCONFIG_FILE = conf;
  } catch (e) {
    console.warn('[gambar] gagal siapkan font:', e.message);
  }
})();
const sharp = require('sharp');

const RAW = 'https://raw.githubusercontent.com/kanzuy/ambatubot/refs/heads/main/';
// Link gambar. Kosongkan '' kalau mau pakai default hijau tua & emas.
const ASSETS = {
  LOG_GIF: RAW + '364ea6cd7bfd00a0260aaf6e2602cd4d.gif', // GIF di atas log yang ada orang dapat money
  BANNER_QUEST: RAW + 'b3f641ddaf9c21097a603d7b54a5ec71.jpg',
  BANNER_GACHA: RAW + '8d2d08472ae3e4e0be1d348d921a8926.jpg',
  BANNER_MENANG: RAW + '3c8688f2308ca23735cc1b824a68c62a.jpg',
  BANNER_KALAH: RAW + 'ad0cedd821b921f520ae8a159aeec58a.jpg',
  BANNER_LEVEL: RAW + '9c4e0047f026081c4bcf955dee4325d0.jpg',
  BG_PASAR: RAW + '28fb0f6ceef6852d08fe51e5402f6c38.jpg',
  BG_GACHA: '',
  BG_LOG: '',
  BG_GAME: '',
  BANNER_PASAR: '',
  BANNER_ABSEN: '',
  BANNER_INVITE: '',
};

const C = {
  hijau0: '#06281d', hijau1: '#0b3d2e', hijau2: '#145a43',
  emas: '#d4af37', emas2: '#f4d97a', teks: '#f7f2de', redup: '#b9c9bd',
  merah: '#d9534f', hijauT: '#3fbf7f', kuning: '#e6b800', abu: '#4a5a52', ungu: '#9b59b6',
};
const FONT = 'font-family="DejaVu Sans, sans-serif"';

// ---------- util ----------
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const bersih = (s, max = 22) => {
  const t = String(s ?? '').replace(/[\p{Extended_Pictographic}\uFE0F\u200D\u20E3]/gu, '').replace(/\s+/g, ' ').trim().slice(0, max);
  return t || 'Pemain';
};
const fmt = (n) => Number(n).toLocaleString('id-ID');
function T(x, y, text, { size = 24, fill = C.teks, weight = 'normal', anchor = 'start', opacity = 1 } = {}) {
  return `<text x="${x}" y="${y}" ${FONT} font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" opacity="${opacity}">${esc(text)}</text>`;
}
function wrap(text, maxChars) {
  const kata = String(text).split(/\s+/);
  const baris = [];
  let cur = '';
  for (const k of kata) {
    if ((cur + ' ' + k).trim().length > maxChars && cur) { baris.push(cur); cur = k; } else cur = (cur + ' ' + k).trim();
  }
  if (cur) baris.push(cur);
  return baris;
}
const rect = (x, y, w, h, fill, { rx = 0, stroke = '', sw = 0, opacity = 1 } = {}) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" opacity="${opacity}"${stroke ? ` stroke="${stroke}" stroke-width="${sw}"` : ''}/>`;
const svgDoc = (w, h, inner) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${inner}</svg>`);

// ---------- unduh gambar (cache) ----------
const cache = new Map();
async function ambilGambar(url) {
  if (!url) return null;
  if (cache.has(url)) return cache.get(url);
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (cache.size > 80) cache.delete(cache.keys().next().value);
    cache.set(url, buf);
    return buf;
  } catch (e) {
    console.warn(`[gambar] gagal ambil ${String(url).slice(-40)}: ${e.message}`);
    return null;
  }
}

// ---------- dekorasi ----------
function bulanSabit(cx, cy, r, opacity = 0.9) {
  const id = 'm' + Math.abs(Math.round(cx * 7 + cy * 13));
  return `<mask id="${id}"><rect width="100%" height="100%" fill="black"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="white"/><circle cx="${cx + r * 0.45}" cy="${cy - r * 0.12}" r="${r * 0.85}" fill="black"/></mask>` +
    `<rect width="100%" height="100%" fill="${C.emas}" mask="url(#${id})" opacity="${opacity}"/>`;
}
function bintang(w, h, seed = 7) {
  let s = seed, out = '';
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < 26; i++) out += `<circle cx="${(rnd() * w).toFixed(0)}" cy="${(rnd() * h).toFixed(0)}" r="${(0.8 + rnd() * 1.6).toFixed(1)}" fill="${C.emas2}" opacity="${(0.25 + rnd() * 0.45).toFixed(2)}"/>`;
  return out;
}
const dasar = (w, h) =>
  svgDoc(w, h, `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.hijau1}"/><stop offset="1" stop-color="${C.hijau0}"/></linearGradient></defs>` +
    `<rect width="100%" height="100%" fill="url(#g)"/>${bintang(w, h)}${bulanSabit(w - 70, 62, 34, 0.55)}`);
const lapisGelap = (w, h, a = 0.6) => svgDoc(w, h, `<rect width="100%" height="100%" fill="${C.hijau0}" opacity="${a}"/>`);
const bingkai = (w, h) => svgDoc(w, h, `<rect x="4" y="4" width="${w - 8}" height="${h - 8}" rx="20" fill="none" stroke="${C.emas}" stroke-width="3" opacity="0.95"/>`);
const topengBulat = (w, h) => svgDoc(w, h, `<rect width="${w}" height="${h}" rx="22" fill="#fff"/>`);

async function avatarBulat(buf, s) {
  const r = s / 2;
  let isi = buf;
  if (!isi) {
    isi = await sharp(svgDoc(s, s, `<rect width="100%" height="100%" fill="${C.hijau2}"/>${T(r, r + s * 0.17, '?', { size: s * 0.5, fill: C.emas2, weight: 'bold', anchor: 'middle' })}`)).png().toBuffer();
  }
  const bulat = await sharp(isi).resize(s, s, { fit: 'cover' }).composite([{ input: svgDoc(s, s, `<circle cx="${r}" cy="${r}" r="${r}" fill="#fff"/>`), blend: 'dest-in' }]).png().toBuffer();
  return sharp(bulat).composite([{ input: svgDoc(s, s, `<circle cx="${r}" cy="${r}" r="${r - 2}" fill="none" stroke="${C.emas}" stroke-width="4"/>`) }]).png().toBuffer();
}

// ---------- perakit utama ----------
// body: SVG isi (string). avatars: [{url, x, y, s}]. bannerUrl: gambar atas (tinggi bannerH).
async function rakit({ w, h, bgUrl = '', bannerUrl = '', bannerH = 0, body = '', avatars = [] }) {
  const layers = [];
  const bg = await ambilGambar(bgUrl);
  if (bg) {
    layers.push({ input: await sharp(bg).resize(w, h, { fit: 'cover' }).png().toBuffer(), left: 0, top: 0 });
    layers.push({ input: lapisGelap(w, h, 0.62), left: 0, top: 0 });
  }
  const ban = bannerUrl && bannerH ? await ambilGambar(bannerUrl) : null;
  if (ban) {
    layers.push({ input: await sharp(ban).resize(w, bannerH, { fit: 'cover' }).png().toBuffer(), left: 0, top: 0 });
    layers.push({ input: svgDoc(w, bannerH, `<defs><linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset="0.65" stop-color="${C.hijau0}" stop-opacity="0"/><stop offset="1" stop-color="${C.hijau0}" stop-opacity="0.9"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#f)"/>`), left: 0, top: 0 });
  }
  layers.push({ input: svgDoc(w, h, body), left: 0, top: 0 });
  for (const a of avatars) {
    const buf = await ambilGambar(a.url);
    layers.push({ input: await avatarBulat(buf, a.s), left: Math.round(a.x), top: Math.round(a.y) });
  }
  layers.push({ input: bingkai(w, h), left: 0, top: 0 });
  const hasil = await sharp(dasar(w, h)).composite(layers).png().toBuffer();
  return sharp(hasil).composite([{ input: topengBulat(w, h), blend: 'dest-in' }]).png().toBuffer();
}
const judulBar = (w, teks, y = 62, size = 40) => T(40, y, teks, { size, fill: C.emas2, weight: 'bold' });
const KUNCI = (k, v, x, y, { vf = C.teks } = {}) => T(x, y, k, { size: 22, fill: C.redup }) + T(x + 230, y, v, { size: 24, fill: vf, weight: 'bold' });

// =========================================================
// 1. PASAR
// =========================================================
async function renderPasar({ price, prev, label, hist, tinggi, rendah, berubahJam, min = 8000, max = 15000, step = 1000 }) {
  const w = 1000, h = 560;
  const warnaLabel = label === 'Murah' ? C.hijauT : label === 'Normal' ? C.kuning : C.merah;
  const delta = prev == null ? 0 : price - prev;
  const pct = prev ? Math.round((Math.abs(delta) / prev) * 100) : 0;
  const ketDelta = prev == null ? 'harga awal' : delta === 0 ? 'tetap' : `${delta > 0 ? 'naik' : 'turun'} ${fmt(Math.abs(delta))} (${delta > 0 ? '+' : '-'}${pct}%)`;
  const warnaDelta = delta > 0 ? C.merah : delta < 0 ? C.hijauT : C.redup; // naik = mahal (merah), turun = murah (hijau)
  let b = judulBar(w, 'PASAR GACHA', 66, 44) + T(40, 102, 'Harga berubah acak tiap 1 jam', { size: 22, fill: C.redup });
  b += T(40, 168, 'Harga sekarang', { size: 22, fill: C.redup });
  const teksHarga = fmt(price);
  const titik = teksHarga.split('.').length - 1;
  const lebarHarga = ((teksHarga.length - titik) * 0.696 + titik * 0.38) * 86;
  b += T(40, 262, teksHarga, { size: 86, fill: C.teks, weight: 'bold' });
  b += T(40 + lebarHarga + 12, 262, 'money', { size: 28, fill: C.emas2, weight: 'bold' });
  const ketW = 24 + ketDelta.length * 13;
  b += rect(40, 290, ketW, 40, warnaDelta, { rx: 20, opacity: 0.28, stroke: warnaDelta, sw: 2 }) + T(40 + ketW / 2, 317, ketDelta, { size: 22, fill: C.teks, weight: 'bold', anchor: 'middle' });
  b += rect(40 + ketW + 14, 290, 20 + label.length * 15, 40, warnaLabel, { rx: 20 }) + T(40 + ketW + 14 + (20 + label.length * 15) / 2, 317, label, { size: 22, fill: '#102418', weight: 'bold', anchor: 'middle' });
  const n = Math.round((max - min) / step) + 1;
  const gx = 40, gw = 440, sw = gw / n;
  for (let i = 0; i < n; i++) {
    const p = min + i * step;
    const warna = p <= 10000 ? C.hijauT : p <= 12000 ? C.kuning : C.merah;
    b += rect(gx + i * sw + 2, 372, sw - 4, 20, warna, { rx: 4, opacity: p === price ? 1 : 0.45 });
  }
  const idx = Math.round((price - min) / step);
  const mx = gx + idx * sw + sw / 2;
  b += `<polygon points="${mx - 10},362 ${mx + 10},362 ${mx},350" fill="${C.teks}"/>`;
  b += T(gx, 418, `${min / 1000}k murah`, { size: 18, fill: C.redup }) + T(gx + gw, 418, `${max / 1000}k mahal`, { size: 18, fill: C.redup, anchor: 'end' });
  const cx0 = 540, cw = 420, cy0 = 150, ch = 190;
  b += T(cx0, 130, `Grafik ${hist.length} jam terakhir`, { size: 20, fill: C.redup });
  b += rect(cx0 - 10, cy0 - 10, cw + 20, ch + 50, C.hijau0, { rx: 14, opacity: 0.45 });
  const bw = cw / Math.max(hist.length, 1);
  hist.forEach((v, i) => {
    const tinggiBar = 30 + ((v - min) / (max - min)) * (ch - 40);
    const warna = i === 0 ? '#7d8b83' : v > hist[i - 1] ? C.merah : v < hist[i - 1] ? C.hijauT : '#7d8b83';
    b += rect(cx0 + i * bw + 4, cy0 + ch - tinggiBar, bw - 8, tinggiBar, warna, { rx: 5, opacity: i === hist.length - 1 ? 1 : 0.75 });
    b += T(cx0 + i * bw + bw / 2, cy0 + ch + 24, `${v / 1000}`, { size: 15, fill: C.redup, anchor: 'middle' });
  });
  const sy = 452;
  const box = (x, k, v) => rect(x, sy, 290, 78, C.hijau0, { rx: 14, opacity: 0.55, stroke: C.emas, sw: 1.5 }) + T(x + 18, sy + 30, k, { size: 18, fill: C.redup }) + T(x + 18, sy + 62, v, { size: 28, fill: C.teks, weight: 'bold' });
  b += box(40, 'Tertinggi (24 jam)', fmt(tinggi)) + box(355, 'Terendah (24 jam)', fmt(rendah)) + box(670, 'Berubah lagi', berubahJam);
  return rakit({ w, h, bgUrl: ASSETS.BG_PASAR, bannerUrl: ASSETS.BANNER_PASAR, bannerH: 0, body: b });
}

// =========================================================
// 2. PANEL GACHA + 3. KARTU HASIL GACHA
// =========================================================
async function renderGachaPanel() {
  const w = 900, bh = 170, h = 580;
  let b = T(w / 2, bh + 62, 'GACHA RAMADAN', { size: 46, fill: C.emas2, weight: 'bold', anchor: 'middle' }) + T(w / 2, bh + 98, 'Coba peruntunganmu hari ini', { size: 22, fill: C.redup, anchor: 'middle' });
  const baris = [
    ['Harga ngikutin pasar', 'Bayar sesuai harga saat kamu menekan tombol'],
    ['Bayar pakai money', 'Poin leaderboard kamu nggak berkurang'],
    ['Hadiah poin, money, dan robux', 'Ada juga gacha gratis yang bisa berantai'],
    ['Semua tercatat', 'Setiap gacha masuk ke log'],
  ];
  baris.forEach(([k, v], i) => {
    const y = bh + 150 + i * 62;
    b += `<circle cx="70" cy="${y - 8}" r="15" fill="${C.emas}"/>` + T(70, y - 1, String(i + 1), { size: 20, fill: C.hijau0, weight: 'bold', anchor: 'middle' });
    b += T(104, y - 8, k, { size: 26, fill: C.teks, weight: 'bold' }) + T(104, y + 18, v, { size: 19, fill: C.redup });
  });
  b += T(w / 2, h - 26, 'Tekan tombol Gacha sekarang di bawah gambar ini', { size: 19, fill: C.emas2, anchor: 'middle' });
  return rakit({ w, h, bgUrl: ASSETS.BG_GACHA, bannerUrl: ASSETS.BANNER_GACHA, bannerH: bh, body: b });
}
const WARNA_TIPE = { zonk: C.abu, poin: C.hijauT, free: C.ungu, robux: C.emas };
async function renderGachaHasil({ nama, avatarUrl, tipe, hadiah, detail, bayar, sisa, tokenSisa = 0, hariIni }) {
  const w = 900, bh = 170, h = 560;
  let b = T(200, bh + 58, bersih(nama), { size: 38, fill: C.teks, weight: 'bold' }) + T(200, bh + 92, 'baru saja membuka kotak gacha', { size: 22, fill: C.redup });
  const wr = WARNA_TIPE[tipe] || C.abu;
  const gelap = tipe === 'robux' || tipe === 'poin';
  b += rect(40, bh + 130, w - 80, 120, wr, { rx: 22, opacity: tipe === 'zonk' ? 0.55 : 0.9 });
  b += T(w / 2, bh + 190, hadiah, { size: 50, fill: gelap ? '#0b2216' : C.teks, weight: 'bold', anchor: 'middle' });
  if (detail) b += T(w / 2, bh + 228, detail, { size: 22, fill: gelap ? '#0b2216' : C.teks, anchor: 'middle' });
  b += KUNCI('Bayar', bayar, 60, bh + 292) + KUNCI('Sisa money', sisa, 60, bh + 330);
  b += KUNCI('Berbayar hari ini', hariIni, 60, bh + 368);
  if (tokenSisa > 0) b += KUNCI('Gacha gratis tersisa', `${tokenSisa}x`, 60, bh + 406, { vf: C.ungu });
  if (tipe === 'robux') b += T(w / 2, h - 28, 'DM owner buat redeem robux kamu', { size: 24, fill: C.emas2, weight: 'bold', anchor: 'middle' });
  return rakit({ w, h, bgUrl: ASSETS.BG_GACHA, bannerUrl: ASSETS.BANNER_GACHA, bannerH: bh, body: b, avatars: [{ url: avatarUrl, x: 60, y: bh + 14, s: 104 }] });
}

// =========================================================
// 4. LOG (absen, quest, invite, gacha)
// =========================================================
async function renderLog({ judul, nama, avatarUrl, baris = [], bannerUrl = '', warna = C.hijauT }) {
  const w = 900, bh = bannerUrl ? 150 : 0;
  const n = Math.max(baris.length, 2);
  const h = bh + 200 + (n - 1) * 40;
  let b = rect(24, bh + 24, 8, h - bh - 48, warna, { rx: 4 }) + T(60, bh + 58, judul, { size: 28, fill: C.emas2, weight: 'bold' });
  b += T(220, bh + 112, bersih(nama), { size: 40, fill: C.teks, weight: 'bold' });
  baris.forEach(([k, v, vf], i) => { b += KUNCI(k, v, 220, bh + 160 + i * 40, { vf: vf || C.teks }); });
  return rakit({ w, h, bgUrl: ASSETS.BG_LOG, bannerUrl, bannerH: bh, body: b, avatars: [{ url: avatarUrl, x: 60, y: bh + 78, s: 130 }] });
}

// =========================================================
// 5. WORDLE
// =========================================================
async function renderWordle({ guesses, feedback, selesai, menang, pesan = '', bannerUrl = '' }) {
  const w = 800, bh = bannerUrl ? 150 : 0, ts = 96, gap = 12;
  const head = bh || 110;
  const h = head + 6 * ts + 5 * gap + 120;
  const gx = (w - (5 * ts + 4 * gap)) / 2;
  let b = bh ? '' : T(w / 2, 62, 'WORDLE RAMADHAN', { size: 40, fill: C.emas2, weight: 'bold', anchor: 'middle' });
  if (!bh) b += T(w / 2, 92, 'Tebak kata 5 huruf bertema Ramadan', { size: 20, fill: C.redup, anchor: 'middle' });
  const warna = { g: C.hijauT, y: C.kuning, x: '#5b6a62' };
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 5; c++) {
      const x = gx + c * (ts + gap), y = head + 20 + r * (ts + gap);
      const huruf = guesses[r]?.[c];
      if (huruf) {
        b += rect(x, y, ts, ts, warna[feedback[r][c]], { rx: 12 }) + T(x + ts / 2, y + ts / 2 + 19, huruf, { size: 56, fill: feedback[r][c] === 'y' ? '#1b1b1b' : '#fff', weight: 'bold', anchor: 'middle' });
      } else b += rect(x, y, ts, ts, C.hijau0, { rx: 12, opacity: 0.45, stroke: C.emas, sw: 1.5 });
    }
  }
  const [p1, p2] = String(pesan).split('\n');
  b += T(w / 2, h - 52, p1 || '', { size: 26, fill: selesai ? (menang ? C.hijauT : C.merah) : C.teks, weight: 'bold', anchor: 'middle' });
  if (p2) b += T(w / 2, h - 22, p2, { size: 20, fill: C.redup, anchor: 'middle' });
  return rakit({ w, h, bgUrl: ASSETS.BG_GAME, bannerUrl, bannerH: bh, body: b });
}

// =========================================================
// 6. BINGO
// =========================================================
async function renderBingo({ nama, avatarUrl, misi, done, garis, penuh }) {
  const w = 800, cw = 236, chh = 168, gap = 14, top = 150;
  const h = top + 3 * chh + 2 * gap + 90;
  let b = T(190, 66, 'RAMADHAN BINGO', { size: 38, fill: C.emas2, weight: 'bold' }) + T(190, 104, bersih(nama), { size: 26, fill: C.teks, weight: 'bold' });
  misi.forEach((m, i) => {
    const x = 28 + (i % 3) * (cw + gap), y = top + Math.floor(i / 3) * (chh + gap);
    b += rect(x, y, cw, chh, done[i] ? C.hijauT : C.hijau0, { rx: 16, opacity: done[i] ? 0.85 : 0.55, stroke: C.emas, sw: 2 });
    const bar = wrap(m, 15).slice(0, 4);
    const y0 = y + chh / 2 - ((bar.length - 1) * 30) / 2 + 8;
    bar.forEach((l, k) => { b += T(x + cw / 2, y0 + k * 30, l, { size: 24, fill: done[i] ? '#0b2216' : C.teks, weight: 'bold', anchor: 'middle' }); });
    if (done[i]) b += `<path d="M ${x + cw - 52} ${y + chh - 30} l 12 14 l 24 -28" fill="none" stroke="#0b2216" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`;
    else b += T(x + 16, y + 30, String(i + 1), { size: 20, fill: C.emas, weight: 'bold' });
  });
  b += T(w / 2, h - 40, `Garis selesai: ${garis}   |   Kartu penuh: ${penuh ? 'ya' : 'belum'}`, { size: 24, fill: C.teks, weight: 'bold', anchor: 'middle' });
  b += T(w / 2, h - 14, '1 garis = 5.000 money, kartu penuh = 15.000 money', { size: 17, fill: C.redup, anchor: 'middle' });
  return rakit({ w, h, bgUrl: ASSETS.BG_GAME, body: b, avatars: [{ url: avatarUrl, x: 40, y: 32, s: 100 }] });
}

// =========================================================
// 7. TIC-TAC-TOE
// =========================================================
async function renderTTT({ board, a, b: pb, giliran, garis = null, selesai = false, seri = false }) {
  const w = 640, cs = 150, gap = 10, top = 150;
  const h = top + 3 * cs + 2 * gap + 90;
  const gx = (w - (3 * cs + 2 * gap)) / 2;
  let s = T(150, 56, 'X', { size: 34, fill: C.merah, weight: 'bold' }) + T(186, 56, bersih(a.nama, 14), { size: 26, fill: C.teks, weight: 'bold' });
  s += T(w - 150, 56, 'O', { size: 34, fill: C.emas2, weight: 'bold', anchor: 'end' }) + T(w - 186, 56, bersih(pb.nama, 14), { size: 26, fill: C.teks, weight: 'bold', anchor: 'end' });
  s += T(w / 2, 62, 'VS', { size: 22, fill: C.redup, anchor: 'middle' });
  const info = seri ? 'Seri!' : selesai ? 'Permainan selesai' : `Giliran: ${bersih(giliran === 'x' ? a.nama : pb.nama, 14)} (${giliran === 'x' ? 'X' : 'O'})`;
  s += T(w / 2, 124, info, { size: 28, fill: C.emas2, weight: 'bold', anchor: 'middle' });
  for (let k = 0; k < 9; k++) {
    const x = gx + (k % 3) * (cs + gap), y = top + Math.floor(k / 3) * (cs + gap);
    const menangSel = garis && garis.includes(k);
    s += rect(x, y, cs, cs, menangSel ? C.hijauT : C.hijau0, { rx: 16, opacity: menangSel ? 0.55 : 0.5, stroke: C.emas, sw: 2 });
    const cx = x + cs / 2, cy = y + cs / 2;
    if (board[k] === 'x') s += `<path d="M ${cx - 38} ${cy - 38} L ${cx + 38} ${cy + 38} M ${cx + 38} ${cy - 38} L ${cx - 38} ${cy + 38}" stroke="${C.merah}" stroke-width="16" stroke-linecap="round"/>`;
    else if (board[k] === 'o') s += `<circle cx="${cx}" cy="${cy}" r="42" fill="none" stroke="${C.emas2}" stroke-width="16"/>`;
    else s += T(x + 14, y + 30, String(k + 1), { size: 20, fill: C.redup, opacity: 0.6 });
  }
  return rakit({ w, h, bgUrl: ASSETS.BG_GAME, body: s, avatars: [{ url: a.avatarUrl, x: 30, y: 22, s: 90 }, { url: pb.avatarUrl, x: w - 120, y: 22, s: 90 }] });
}

// =========================================================
// 8. HASIL GAME (solo & duel)
// =========================================================
const STATUS = {
  menang: { teks: 'MENANG', warna: C.hijauT, banner: () => ASSETS.BANNER_MENANG },
  kalah: { teks: 'KALAH', warna: C.merah, banner: () => ASSETS.BANNER_KALAH },
  seri: { teks: 'SERI', warna: C.kuning, banner: () => '' },
};
async function renderHasil({ status, judul, nama, avatarUrl, baris = [] }) {
  const st = STATUS[status] || STATUS.seri;
  const bannerUrl = st.banner();
  const bh = bannerUrl ? 170 : 0;
  const h = bh + 218 + (Math.max(baris.length, 1) - 1) * 38 + 36;
  let b = T(40, bh + 56, judul, { size: 26, fill: C.redup, weight: 'bold' });
  b += T(220, bh + 112, bersih(nama), { size: 40, fill: C.teks, weight: 'bold' });
  b += rect(220, bh + 128, 20 + st.teks.length * 20, 40, st.warna, { rx: 20 }) + T(220 + (20 + st.teks.length * 20) / 2, bh + 156, st.teks, { size: 24, fill: '#0b2216', weight: 'bold', anchor: 'middle' });
  baris.forEach(([k, v, vf], i) => { b += KUNCI(k, v, 60, bh + 218 + i * 38, { vf: vf || C.teks }); });
  return rakit({ w: 900, h, bgUrl: ASSETS.BG_GAME, bannerUrl, bannerH: bh, body: b, avatars: [{ url: avatarUrl, x: 60, y: bh + 70, s: 130 }] });
}
async function renderDuel({ judul, pemenang, kalah, seri = false, baris = [] }) {
  const w = 900, pw = 420, bh = 150, top = 70;
  const h = top + bh + 300 + Math.max(baris.length, 0) * 34;
  let b = T(w / 2, 46, judul, { size: 30, fill: C.emas2, weight: 'bold', anchor: 'middle' });
  const panel = (x, p, st) => {
    let s = rect(x, top, pw, h - top - 20, C.hijau0, { rx: 18, opacity: 0.45, stroke: C.emas, sw: 1.5 });
    s += T(x + pw / 2, top + bh + 160, bersih(p.nama, 16), { size: 30, fill: C.teks, weight: 'bold', anchor: 'middle' });
    s += rect(x + pw / 2 - (30 + st.teks.length * 11), top + bh + 178, 60 + st.teks.length * 22, 38, st.warna, { rx: 19 }) + T(x + pw / 2, top + bh + 205, st.teks, { size: 22, fill: '#0b2216', weight: 'bold', anchor: 'middle' });
    if (p.baris) p.baris.forEach((l, i) => { s += T(x + pw / 2, top + bh + 250 + i * 28, l, { size: 20, fill: C.redup, anchor: 'middle' }); });
    return s;
  };
  const kiri = seri ? STATUS.seri : STATUS.menang, kanan = seri ? STATUS.seri : STATUS.kalah;
  const xKanan = w - 20 - pw;
  b += panel(20, pemenang, kiri) + panel(xKanan, kalah, kanan);
  b += `<circle cx="${w / 2}" cy="${top + bh + 40}" r="28" fill="${C.hijau0}" stroke="${C.emas}" stroke-width="3"/>` + T(w / 2, top + bh + 49, 'VS', { size: 22, fill: C.emas2, weight: 'bold', anchor: 'middle' });
  baris.forEach(([k, v], i) => { b += T(w / 2, h - 30 - (baris.length - 1 - i) * 34, `${k}: ${v}`, { size: 22, fill: C.teks, weight: 'bold', anchor: 'middle' }); });
  const avatars = [
    { url: pemenang.avatarUrl, x: 20 + pw / 2 - 50, y: top + bh + 14, s: 100 },
    { url: kalah.avatarUrl, x: xKanan + pw / 2 - 50, y: top + bh + 14, s: 100 },
  ];
  const dasarBuf = await rakit({ w, h, bgUrl: ASSETS.BG_GAME, body: b, avatars });
  const bk = !seri ? await ambilGambar(ASSETS.BANNER_MENANG) : null;
  const bl = !seri ? await ambilGambar(ASSETS.BANNER_KALAH) : null;
  const tambah = [];
  if (bk) tambah.push({ input: await sharp(bk).resize(pw - 4, bh, { fit: 'cover' }).png().toBuffer(), left: 22, top: top + 2 });
  if (bl) tambah.push({ input: await sharp(bl).resize(pw - 4, bh, { fit: 'cover' }).png().toBuffer(), left: xKanan + 2, top: top + 2 });
  return tambah.length ? sharp(dasarBuf).composite(tambah).png().toBuffer() : dasarBuf;
}

// =========================================================
// 9. NAIK LEVEL
// =========================================================
async function renderLevel({ nama, avatarUrl, level, reward, xp, perluXp }) {
  const w = 900, bh = 170, h = 480;
  let b = T(260, bh + 62, 'NAIK LEVEL!', { size: 44, fill: C.emas2, weight: 'bold' }) + T(260, bh + 106, bersih(nama), { size: 34, fill: C.teks, weight: 'bold' });
  b += rect(260, bh + 124, 250, 112, C.emas, { rx: 20 }) + T(385, bh + 156, 'LEVEL', { size: 22, fill: C.hijau0, weight: 'bold', anchor: 'middle' }) + T(385, bh + 214, String(level), { size: 58, fill: C.hijau0, weight: 'bold', anchor: 'middle' });
  if (reward) b += T(540, bh + 170, 'Hadiah naik level', { size: 22, fill: C.redup }) + T(540, bh + 210, `+${fmt(reward)} money`, { size: 32, fill: C.hijauT, weight: 'bold' });
  b += T(60, h - 22, `Total XP: ${fmt(xp)}   |   Level berikutnya di ${fmt(perluXp)} XP`, { size: 20, fill: C.redup });
  return rakit({ w, h, bannerUrl: ASSETS.BANNER_LEVEL, bannerH: bh, body: b, avatars: [{ url: avatarUrl, x: 60, y: bh + 38, s: 160 }] });
}

// =========================================================
// 10. TEBAK BENDERA
// =========================================================
async function renderBendera({ kode, nomor, total }) {
  const w = 760, h = 520;
  const bendera = await ambilGambar(`https://flagcdn.com/w640/${String(kode).toLowerCase()}.png`);
  let b = T(w / 2, 62, 'TEBAK BENDERA', { size: 42, fill: C.emas2, weight: 'bold', anchor: 'middle' }) + T(w / 2, 98, 'Bendera negara apa ini?', { size: 22, fill: C.redup, anchor: 'middle' });
  b += rect(w / 2 - 250, 126, 500, 310, C.hijau0, { rx: 14, opacity: 0.5, stroke: C.emas, sw: 3 });
  if (!bendera) b += T(w / 2, 290, '(bendera gagal dimuat)', { size: 24, fill: C.redup, anchor: 'middle' });
  if (nomor) b += T(w / 2, h - 36, `Soal ${nomor}${total ? `/${total}` : ''}`, { size: 22, fill: C.redup, anchor: 'middle' });
  const dasarBuf = await rakit({ w, h, bgUrl: ASSETS.BG_GAME, body: b });
  if (!bendera) return dasarBuf;
  const fl = await sharp(bendera).resize(488, 298, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  return sharp(dasarBuf).composite([{ input: fl, left: w / 2 - 244, top: 132 }]).png().toBuffer();
}

module.exports = {
  ASSETS, ambilGambar, bersih,
  renderPasar, renderGachaPanel, renderGachaHasil, renderLog, renderWordle, renderBingo,
  renderTTT, renderHasil, renderDuel, renderLevel, renderBendera,
};
