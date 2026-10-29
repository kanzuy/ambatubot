// ============================================================
//  Logika game gambar (murni, tanpa jaringan) - Reduygenk-KantDev
//  Dipakai oleh server.js. Semua pengiriman lewat fungsi send().
// ============================================================
const KATA = require('./activity-kata');

const norm = (t) => String(t).toLowerCase().replace(/[^a-z0-9]/g, '');
const acak = (n) => Math.floor(Math.random() * n);

class Room {
  constructor({ id, now = () => Date.now(), kata = KATA, onReward = () => {}, durasi = 60, jeda = 6, maks = 8 } = {}) {
    this.id = id;
    this.now = now;
    this.kata = kata;
    this.onReward = onReward; // (userId, jumlah, alasan) -> void
    this.durasi = durasi * 1000;
    this.jeda = jeda * 1000;
    this.maks = maks;
    this.players = new Map();
    this.fase = 'lobby'; // lobby | menggambar | jeda | selesai
    this.ronde = 0;
    this.total = 0;
    this.urutan = [];
    this.drawer = null;
    this.kataIni = '';
    this.strokes = [];
    this.benar = []; // urutan id penebak benar
    this.mulaiAt = 0;
    this.akhirAt = 0;
    this.jedaSampai = 0;
    this.terbuka = new Set(); // indeks huruf yang dibuka sebagai petunjuk
    this.hadiahAktif = false;
    this.pesan = '';
  }

  // ---------- pemain ----------
  join(p, send) {
    const lama = this.players.get(p.id);
    if (!lama && this.players.size >= this.maks) return { ok: false, alasan: `Ruangan penuh (${this.maks} pemain).` };
    if (!lama && this.fase !== 'lobby' && this.fase !== 'selesai') {
      // boleh masuk di tengah game sebagai penebak
    }
    this.players.set(p.id, { id: p.id, nama: p.nama, avatar: p.avatar || '', skor: lama?.skor ?? 0, send, online: true });
    this.kirimSemua();
    const me = this.players.get(p.id);
    if (this.fase === 'menggambar') this.kirim(me, { t: 'strokes', s: this.strokes });
    return { ok: true };
  }
  leave(id) {
    const p = this.players.get(id);
    if (!p) return;
    this.players.delete(id);
    if (this.fase === 'menggambar' && id === this.drawer) {
      this.pesan = 'Penggambar keluar, ronde dilewati.';
      this.akhiriRonde(true);
      return;
    }
    if (this.fase === 'menggambar' && this.players.size < 2) {
      this.selesai('Pemain kurang dari 2, game berhenti.');
      return;
    }
    this.kirimSemua();
  }
  kosong() { return this.players.size === 0; }

  // ---------- alur game ----------
  mulai(oleh) {
    if (!this.players.has(oleh)) return { ok: false };
    if (this.fase === 'menggambar' || this.fase === 'jeda') return { ok: false, alasan: 'Game sudah jalan.' };
    if (this.players.size < 2) return { ok: false, alasan: 'Minimal 2 pemain.' };
    for (const p of this.players.values()) p.skor = 0;
    this.urutan = [...this.players.keys()].sort(() => Math.random() - 0.5);
    this.total = this.urutan.length;
    this.ronde = 0;
    this.hadiahAktif = this.players.size >= 3; // hadiah money cuma kalau minimal 3 pemain
    this.mulaiRonde();
    return { ok: true };
  }
  mulaiRonde() {
    // lewati pemain yang sudah keluar
    while (this.ronde < this.urutan.length && !this.players.has(this.urutan[this.ronde])) this.ronde++;
    if (this.ronde >= this.urutan.length) return this.selesai();
    this.drawer = this.urutan[this.ronde];
    this.kataIni = this.kata[acak(this.kata.length)];
    this.strokes = [];
    this.benar = [];
    this.terbuka = new Set();
    this.fase = 'menggambar';
    this.mulaiAt = this.now();
    this.akhirAt = this.mulaiAt + this.durasi;
    this.pesan = '';
    this.kirimSemua();
    for (const p of this.players.values()) this.kirim(p, { t: 'clear' });
  }
  stroke(id, s) {
    if (this.fase !== 'menggambar' || id !== this.drawer) return false;
    if (!s || !Array.isArray(s.pts) || s.pts.length < 1 || s.pts.length > 400) return false;
    const rapi = {
      c: /^#[0-9a-fA-F]{6}$/.test(s.c) ? s.c : '#000000',
      w: Math.max(1, Math.min(60, Number(s.w) || 6)),
      pts: s.pts.map((q) => [Math.max(0, Math.min(1, Number(q[0]) || 0)), Math.max(0, Math.min(1, Number(q[1]) || 0))]),
    };
    if (this.strokes.length >= 4000) return false;
    this.strokes.push(rapi);
    for (const p of this.players.values()) if (p.id !== id) this.kirim(p, { t: 'stroke', s: rapi });
    return true;
  }
  hapus(id) {
    if (this.fase !== 'menggambar' || id !== this.drawer) return false;
    this.strokes = [];
    for (const p of this.players.values()) this.kirim(p, { t: 'clear' });
    return true;
  }
  tebak(id, teks) {
    const p = this.players.get(id);
    if (!p || this.fase !== 'menggambar' || id === this.drawer || this.benar.includes(id)) return { ok: false };
    const t = String(teks ?? '').slice(0, 60).trim();
    if (!t) return { ok: false };
    if (norm(t) === norm(this.kataIni)) {
      this.benar.push(id);
      const sisaMs = Math.max(0, this.akhirAt - this.now());
      p.skor += 50 + Math.round((sisaMs / this.durasi) * 50);
      this.chat({ tipe: 'benar', nama: p.nama, teks: `${p.nama} berhasil menebak!` });
      this.kirimSemua();
      const penebak = this.players.size - 1;
      if (this.benar.length >= penebak) this.akhiriRonde(false);
      return { ok: true, benar: true };
    }
    this.chat({ tipe: 'tebak', nama: p.nama, teks: t });
    return { ok: true, benar: false };
  }
  chat(m) {
    for (const p of this.players.values()) this.kirim(p, { t: 'chat', ...m });
  }
  petunjuk() {
    const huruf = [...this.kataIni];
    return huruf.map((c, i) => (c === ' ' || c === '-' ? c : this.terbuka.has(i) ? c : '_')).join('');
  }
  tick() {
    const n = this.now();
    if (this.fase === 'menggambar') {
      const frac = (n - this.mulaiAt) / this.durasi;
      const buka = frac >= 0.75 ? 2 : frac >= 0.5 ? 1 : 0;
      const kandidat = [...this.kataIni].map((c, i) => i).filter((i) => this.kataIni[i] !== ' ' && this.kataIni[i] !== '-');
      while (this.terbuka.size < Math.min(buka, Math.max(0, kandidat.length - 2))) {
        this.terbuka.add(kandidat[acak(kandidat.length)]);
        this.kirimSemua();
      }
      if (n >= this.akhirAt) this.akhiriRonde(false);
    } else if (this.fase === 'jeda' && n >= this.jedaSampai) {
      this.ronde += 1;
      this.mulaiRonde();
    }
  }
  akhiriRonde(dilewati) {
    if (this.fase !== 'menggambar') return;
    const hadiahPenebak = [3000, 2000, 1000];
    if (!dilewati && this.hadiahAktif) {
      this.benar.forEach((id, k) => this.onReward(id, hadiahPenebak[Math.min(k, 2)], 'tebak'));
      if (this.benar.length) this.onReward(this.drawer, Math.min(3000, this.benar.length * 1000), 'gambar');
    }
    if (!dilewati) {
      const d = this.players.get(this.drawer);
      if (d) d.skor += this.benar.length * 30;
    }
    this.fase = 'jeda';
    this.jedaSampai = this.now() + this.jeda;
    this.pesan = dilewati ? this.pesan : `Katanya: ${this.kataIni}`;
    this.kirimSemua();
  }
  selesai(pesan = '') {
    this.fase = 'selesai';
    this.pesan = pesan;
    this.kirimSemua();
  }

  // ---------- kirim ----------
  keadaan(untuk) {
    const rahasia = untuk?.id === this.drawer || this.fase === 'jeda' || this.fase === 'selesai';
    return {
      t: 'state',
      fase: this.fase,
      ronde: Math.min(this.ronde + 1, this.total),
      total: this.total,
      drawer: this.drawer,
      hint: this.fase === 'menggambar' ? this.petunjuk() : '',
      kata: rahasia && this.fase !== 'lobby' ? this.kataIni : '',
      akhirAt: this.akhirAt,
      sekarang: this.now(),
      hadiah: this.hadiahAktif,
      pesan: this.pesan,
      players: [...this.players.values()].map((p) => ({ id: p.id, nama: p.nama, avatar: p.avatar, skor: p.skor, benar: this.benar.includes(p.id) })),
    };
  }
  kirim(p, msg) {
    try { p.send(msg); } catch { /* koneksi putus, diurus server */ }
  }
  kirimSemua() {
    for (const p of this.players.values()) this.kirim(p, this.keadaan(p));
  }
}

module.exports = { Room, norm };
