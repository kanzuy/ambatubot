// ============================================================
//  Bot Ramadan  |  Reduygenk-KantDev
//  Fitur: absen sahur, notif sahur/buka, pengingat ibadah,
//         kirim rules (form), quest tebak surat, poin & leaderboard (panel otomatis),
//         getrole, clear chat
// ============================================================
require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  Events,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  SlashCommandBuilder,
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  SeparatorBuilder,
} = require('discord.js');
const { DatabaseSync } = require('node:sqlite'); // SQLite bawaan Node (tanpa kompilasi, aman di Termux)
const soal = require('./soal');

// ======================= KONFIGURASI =======================
const WATERMARK = 'Reduygenk-KantDev';
const TOKEN = process.env.DISCORD_TOKEN;
const PREFIX = '.';

const ADMIN_ROLE_ID = '1475924666844446801'; // akses .setpoin + semua command setup
const MEMBER_ROLE_ID = '1481864370857447475'; // role hasil getrole (syarat /quest & .point)
const ABSEN_LOG_CHANNEL_ID = '1559567766040612945';
const QUEST_LOG_CHANNEL_ID = '1559588136936407110';

const QUEST_PER_DAY = 5;
const QUEST_POINTS = 10;

// Banner panel (link gambar/GIF langsung). Kosongkan '' kalau nggak mau pakai banner.
const GETROLE_BANNER = 'https://raw.githubusercontent.com/kanzuy/ambatubot/refs/heads/main/127ef50a9e6bc3cbe762cf6d3ae4987e.gif';
const LEADERBOARD_BANNER = '';
const ABSEN_BANNER = '';

// Absen sahur (menit dari jam 00:00 WIB)
const ABSEN_START = 2 * 60 + 45; // 02:45
const ABSEN_END = 3 * 60 + 45; // 03:45

const COLOR = 0xe67e22;
// ===========================================================

// ======================= DATABASE ==========================
const db = new DatabaseSync(process.env.DB_PATH || 'ramadan.db');
db.exec('PRAGMA journal_mode = WAL');
db.exec(`
CREATE TABLE IF NOT EXISTS config (key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE IF NOT EXISTS points (
  user_id TEXT PRIMARY KEY,
  quest_points INTEGER NOT NULL DEFAULT 0,
  bonus INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS absen (user_id TEXT, day TEXT, at TEXT, PRIMARY KEY (user_id, day));
CREATE TABLE IF NOT EXISTS daily_quest (day TEXT, slot INTEGER, qid TEXT, data TEXT, PRIMARY KEY (day, slot));
CREATE TABLE IF NOT EXISTS used_quest (qid TEXT PRIMARY KEY);
CREATE TABLE IF NOT EXISTS quest_answers (
  user_id TEXT, day TEXT, slot INTEGER, chosen INTEGER, correct INTEGER,
  PRIMARY KEY (user_id, day, slot)
);
CREATE TABLE IF NOT EXISTS schedule (day TEXT, prov TEXT, data TEXT, PRIMARY KEY (day, prov));
CREATE TABLE IF NOT EXISTS sent (day TEXT, event TEXT, PRIMARY KEY (day, event));
`);

const q = {
  getCfg: db.prepare('SELECT value FROM config WHERE key = ?'),
  setCfg: db.prepare('INSERT INTO config(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'),
  addQuestPts: db.prepare(
    'INSERT INTO points(user_id, quest_points) VALUES(?, ?) ON CONFLICT(user_id) DO UPDATE SET quest_points = quest_points + excluded.quest_points',
  ),
  getPts: db.prepare('SELECT quest_points, bonus FROM points WHERE user_id = ?'),
  setBonus: db.prepare(
    'INSERT INTO points(user_id, bonus) VALUES(?, ?) ON CONFLICT(user_id) DO UPDATE SET bonus = excluded.bonus',
  ),
  topPts: db.prepare('SELECT user_id, quest_points FROM points WHERE quest_points > 0 ORDER BY quest_points DESC LIMIT 100'),
  insAbsen: db.prepare('INSERT OR IGNORE INTO absen(user_id, day, at) VALUES(?, ?, ?)'),
  countAbsen: db.prepare('SELECT COUNT(*) AS c FROM absen WHERE user_id = ?'),
  dailyRows: db.prepare('SELECT slot, qid, data FROM daily_quest WHERE day = ? ORDER BY slot'),
  insDaily: db.prepare('INSERT OR IGNORE INTO daily_quest(day, slot, qid, data) VALUES(?, ?, ?, ?)'),
  usedAll: db.prepare('SELECT qid FROM used_quest'),
  insUsed: db.prepare('INSERT OR IGNORE INTO used_quest(qid) VALUES(?)'),
  clearUsed: db.prepare('DELETE FROM used_quest'),
  insAnswer: db.prepare('INSERT OR IGNORE INTO quest_answers(user_id, day, slot, chosen, correct) VALUES(?, ?, ?, ?, ?)'),
  answersOf: db.prepare('SELECT slot, correct FROM quest_answers WHERE user_id = ? AND day = ?'),
  getSched: db.prepare('SELECT prov, data FROM schedule WHERE day = ?'),
  insSched: db.prepare('INSERT OR REPLACE INTO schedule(day, prov, data) VALUES(?, ?, ?)'),
  insSent: db.prepare('INSERT OR IGNORE INTO sent(day, event) VALUES(?, ?)'),
  isSent: db.prepare('SELECT 1 FROM sent WHERE day = ? AND event = ?'),
};
const getCfg = (k) => q.getCfg.get(k)?.value ?? null;
const setCfg = (k, v) => q.setCfg.run(k, String(v));

function getPoints(uid) {
  const r = q.getPts.get(uid) || { quest_points: 0, bonus: 0 };
  return { quest: r.quest_points, bonus: r.bonus, total: r.quest_points + r.bonus };
}
// ===========================================================

// ======================= UTIL WAKTU ========================
const pad = (n) => String(n).padStart(2, '0');
const hm = (min) => `${pad(Math.floor(min / 60) % 24)}:${pad(min % 60)}`;

function wibNow() {
  const d = new Date(Date.now() + 7 * 3600 * 1000);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  const dd = d.getUTCDate();
  return { y, m, d: dd, min: d.getUTCHours() * 60 + d.getUTCMinutes(), day: `${y}-${pad(m)}-${pad(dd)}` };
}
function tglIndo(dayStr) {
  const [y, m, d] = dayStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
// ===========================================================

// ======================= UTIL DISCORD ======================
const EPHEMERAL = MessageFlags.Ephemeral;
const isAdmin = (member) => !!member?.roles?.cache?.has(ADMIN_ROLE_ID);
const hasMemberRole = (member) => !!member?.roles?.cache?.has(MEMBER_ROLE_ID);

const baseEmbed = (title, desc, color = COLOR) => {
  const e = new EmbedBuilder().setColor(color).setFooter({ text: WATERMARK });
  if (title) e.setTitle(title);
  if (desc) e.setDescription(desc);
  return e;
};

const okEmbed = (text) => baseEmbed(null, `✅ ${text}`, 0x2ecc71);
const errEmbed = (text) => baseEmbed(null, `⛔ ${text}`, 0xe74c3c);
const txt = (content) => new TextDisplayBuilder().setContent(content);
const bannerGallery = (url) => new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(url));

async function sendTo(channelId, payload) {
  try {
    const ch = await client.channels.fetch(channelId);
    if (!ch || !ch.isTextBased()) throw new Error('channel tidak ditemukan / bukan teks');
    return await ch.send(payload);
  } catch (e) {
    console.error(`[sendTo ${channelId}]`, e.message);
    return null;
  }
}
// ===========================================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // buat command prefix titik
    GatewayIntentBits.GuildMembers, // buat filter leaderboard
  ],
});

// ======================= ABSEN SAHUR =======================
const absenRow = (disabled = false) =>
  new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('absen:hadir')
      .setLabel('Hadir')
      .setEmoji('✅')
      .setStyle(ButtonStyle.Success)
      .setDisabled(disabled),
  );

// Panel utama = container (Components V2)
function absenPanelPayload(closed = false) {
  const c = new ContainerBuilder().setAccentColor(closed ? 0x95a5a6 : 0x5865f2);
  if (!closed && ABSEN_BANNER) c.addMediaGalleryComponents(bannerGallery(ABSEN_BANNER));
  c.addTextDisplayComponents(
    txt(
      closed
        ? '## 🌙 Absen sahur ditutup\nAbsen sahur hari ini sudah ditutup. Sampai ketemu besok!'
        : '## 🌙 Absen sahur\nSahur bareng yuk! Klik tombol **Hadir** kalau kamu bangun sahur.\n\n⏰ Dibuka **02:45 – 03:45 WIB**',
    ),
  );
  c.addSeparatorComponents(new SeparatorBuilder());
  c.addActionRowComponents(absenRow(closed));
  c.addTextDisplayComponents(txt(`-# ${WATERMARK}`));
  return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

async function handleAbsen(i) {
  const now = wibNow();
  if (now.min < ABSEN_START || now.min >= ABSEN_END) {
    return i.reply({ embeds: [errEmbed('Absen sahur cuma bisa dipakai jam **02:45 – 03:45 WIB**.')], flags: EPHEMERAL });
  }
  const waktu = hm(now.min);
  const r = q.insAbsen.run(i.user.id, now.day, waktu);
  if (r.changes === 0) {
    return i.reply({ embeds: [okEmbed('Kamu sudah absen sahur hari ini.')], flags: EPHEMERAL });
  }
  const total = q.countAbsen.get(i.user.id).c;
  await i.reply({
    embeds: [baseEmbed('🌙 Absen tercatat', `Hadir sahur jam **${waktu} WIB**\nTotal kehadiran kamu: **${total}x**`, 0x2ecc71)],
    flags: EPHEMERAL,
  });

  await sendTo(ABSEN_LOG_CHANNEL_ID, {
    embeds: [
      baseEmbed('📝 Log Absen Sahur', `${i.user} hadir sahur\n🕒 Jam: **${waktu} WIB**\n📅 ${tglIndo(now.day)}\n🔢 Total hadir: **${total}x**`, 0x2ecc71),
    ],
    allowedMentions: { parse: [] },
  });
}

async function runAbsen() {
  const chId = getCfg('absen_channel');
  if (!chId) return;
  const now = wibNow();

  if (now.min >= ABSEN_START && now.min < ABSEN_END && getCfg('absen_sent') !== now.day) {
    setCfg('absen_sent', now.day);
    const msg = await sendTo(chId, absenPanelPayload());
    if (msg) setCfg('absen_msg', JSON.stringify({ channel: chId, message: msg.id, day: now.day, closed: false, v: 2 }));
  }

  const raw = getCfg('absen_msg');
  if (!raw) return;
  const info = JSON.parse(raw);
  if (info.closed) return;
  if (info.day < now.day || (info.day === now.day && now.min >= ABSEN_END)) {
    info.closed = true;
    setCfg('absen_msg', JSON.stringify(info));
    try {
      const ch = await client.channels.fetch(info.channel);
      const msg = await ch.messages.fetch(info.message);
      // pesan absen versi lama (embed) tetap bisa ditutup
      const payload =
        info.v === 2
          ? absenPanelPayload(true)
          : { embeds: [baseEmbed('🌙 Absen Sahur', 'Absen sahur hari ini sudah **ditutup**. Sampai ketemu besok!', 0x95a5a6)], components: [absenRow(true)] };
      await msg.edit(payload);
    } catch (e) {
      console.error('[tutup absen]', e.message);
    }
  }
}
// ===========================================================

// ================= JADWAL, NOTIF & PENGINGAT ===============
// [nama, lat, lon, zona]  (ibu kota provinsi)
const PROVINCES = [
  ['Aceh', 5.5483, 95.3238, 'WIB'],
  ['Sumatera Utara', 3.5952, 98.6722, 'WIB'],
  ['Sumatera Barat', -0.9471, 100.4172, 'WIB'],
  ['Riau', 0.5071, 101.4478, 'WIB'],
  ['Kepulauan Riau', 0.9188, 104.4469, 'WIB'],
  ['Jambi', -1.6101, 103.6131, 'WIB'],
  ['Sumatera Selatan', -2.9761, 104.7754, 'WIB'],
  ['Bangka Belitung', -2.1316, 106.1169, 'WIB'],
  ['Bengkulu', -3.8004, 102.2655, 'WIB'],
  ['Lampung', -5.4294, 105.261, 'WIB'],
  ['DKI Jakarta', -6.2088, 106.8456, 'WIB'],
  ['Banten', -6.12, 106.1503, 'WIB'],
  ['Jawa Barat', -6.9175, 107.6191, 'WIB'],
  ['Jawa Tengah', -6.9667, 110.4167, 'WIB'],
  ['DI Yogyakarta', -7.7956, 110.3695, 'WIB'],
  ['Jawa Timur', -7.2575, 112.7521, 'WIB'],
  ['Kalimantan Barat', -0.0263, 109.3425, 'WIB'],
  ['Kalimantan Tengah', -2.21, 113.92, 'WIB'],
  ['Bali', -8.6705, 115.2126, 'WITA'],
  ['Nusa Tenggara Barat', -8.5833, 116.1167, 'WITA'],
  ['Nusa Tenggara Timur', -10.1772, 123.607, 'WITA'],
  ['Kalimantan Selatan', -3.3194, 114.5908, 'WITA'],
  ['Kalimantan Timur', -0.5022, 117.1536, 'WITA'],
  ['Kalimantan Utara', 2.8375, 117.3689, 'WITA'],
  ['Sulawesi Utara', 1.4748, 124.8421, 'WITA'],
  ['Gorontalo', 0.5435, 123.0568, 'WITA'],
  ['Sulawesi Tengah', -0.8917, 119.8707, 'WITA'],
  ['Sulawesi Barat', -2.6745, 118.8888, 'WITA'],
  ['Sulawesi Selatan', -5.1477, 119.4327, 'WITA'],
  ['Sulawesi Tenggara', -3.9985, 122.5129, 'WITA'],
  ['Maluku', -3.6954, 128.1814, 'WIT'],
  ['Maluku Utara', 0.7333, 127.5667, 'WIT'],
  ['Papua', -2.5337, 140.7181, 'WIT'],
  ['Papua Barat', -0.8615, 134.062, 'WIT'],
  ['Papua Barat Daya', -0.8762, 131.2558, 'WIT'],
  ['Papua Tengah', -3.3667, 135.4833, 'WIT'],
  ['Papua Pegunungan', -4.095, 138.95, 'WIT'],
  ['Papua Selatan', -8.4932, 140.4018, 'WIT'],
];
const ZONES = ['WIB', 'WITA', 'WIT'];
const OFFSET = { WIB: 7, WITA: 8, WIT: 9 };
const TZNAME = { WIB: 'Asia/Jakarta', WITA: 'Asia/Makassar', WIT: 'Asia/Jayapura' };

const toMin = (s) => {
  const m = /(\d{1,2}):(\d{2})/.exec(s);
  return Number(m[1]) * 60 + Number(m[2]);
};

// lead = berapa menit sebelum provinsi paling awal pesan dikirim
const EVENTS = [
  { key: 'sahur', ch: 'notif', emoji: '🌙', title: 'Waktunya Sahur', note: 'Jam **Imsak** tiap provinsi. Yuk bangun sahur!', lead: 60, color: 0x5865f2, at: (t) => toMin(t.Imsak) },
  { key: 'buka', ch: 'notif', emoji: '🌅', title: 'Waktunya Berbuka Puasa', note: 'Jam **Maghrib** tiap provinsi. Selamat berbuka!', lead: 20, color: 0xe67e22, at: (t) => toMin(t.Maghrib) },
  { key: 'subuh', ch: 'ibadah', emoji: '🌌', title: 'Pengingat Sholat Subuh', note: 'Jam **Subuh** tiap provinsi.', lead: 10, color: 0x34495e, at: (t) => toMin(t.Fajr) },
  { key: 'dhuha', ch: 'ibadah', emoji: '🌤️', title: 'Pengingat Sholat Dhuha', note: 'Perkiraan awal waktu **Dhuha** (±20 menit setelah matahari terbit).', lead: 10, color: 0xf1c40f, at: (t) => toMin(t.Sunrise) + 20 },
  { key: 'dzuhur', ch: 'ibadah', emoji: '☀️', title: 'Pengingat Sholat Dzuhur', note: 'Jam **Dzuhur** tiap provinsi.', lead: 10, color: 0xf39c12, at: (t) => toMin(t.Dhuhr) },
  { key: 'ashar', ch: 'ibadah', emoji: '🌇', title: 'Pengingat Sholat Ashar', note: 'Jam **Ashar** tiap provinsi.', lead: 10, color: 0xe67e22, at: (t) => toMin(t.Asr) },
  { key: 'maghrib', ch: 'ibadah', emoji: '🌆', title: 'Pengingat Sholat Maghrib', note: 'Jam **Maghrib** tiap provinsi.', lead: 10, color: 0xd35400, at: (t) => toMin(t.Maghrib) },
  { key: 'isya', ch: 'ibadah', emoji: '🌃', title: 'Pengingat Sholat Isya', note: 'Jam **Isya** tiap provinsi.', lead: 10, color: 0x2c3e50, at: (t) => toMin(t.Isha) },
  { key: 'tarawih', ch: 'ibadah', emoji: '🕌', title: 'Pengingat Sholat Tarawih', note: 'Perkiraan mulai **Tarawih** (±15 menit setelah Isya).', lead: 10, color: 0x16a085, at: (t) => toMin(t.Isha) + 15 },
  { key: 'tahajud', ch: 'ibadah', emoji: '🌙', title: 'Pengingat Sholat Tahajud', note: 'Awal **sepertiga malam terakhir** tiap provinsi.', lead: 10, color: 0x8e44ad, at: (t) => (t.Lastthird ? toMin(t.Lastthird) : toMin(t.Fajr) - 90) },
];

const scheduleCache = new Map(); // day -> { namaProvinsi: timings }
const lastFetch = new Map(); // day -> timestamp percobaan terakhir

async function fetchProv(dayStr, [name, lat, lon, zone]) {
  const [y, m, d] = dayStr.split('-');
  const url = `https://api.aladhan.com/v1/timings/${d}-${m}-${y}?latitude=${lat}&longitude=${lon}&method=20&timezonestring=${TZNAME[zone]}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const t = (await res.json()).data.timings;
  return { Imsak: t.Imsak, Fajr: t.Fajr, Sunrise: t.Sunrise, Dhuhr: t.Dhuhr, Asr: t.Asr, Maghrib: t.Maghrib, Isha: t.Isha, Lastthird: t.Lastthird || null };
}

async function ensureSchedule(dayStr) {
  let cache = scheduleCache.get(dayStr);
  if (!cache) {
    cache = {};
    for (const r of q.getSched.all(dayStr)) cache[r.prov] = JSON.parse(r.data);
    scheduleCache.set(dayStr, cache);
  }
  let missing = PROVINCES.filter((p) => !cache[p[0]]);
  if (!missing.length) return cache;

  if (Date.now() - (lastFetch.get(dayStr) || 0) < 5 * 60 * 1000) return null; // jangan spam API
  lastFetch.set(dayStr, Date.now());

  for (let i = 0; i < missing.length; i += 5) {
    await Promise.all(
      missing.slice(i, i + 5).map(async (p) => {
        try {
          const t = await fetchProv(dayStr, p);
          cache[p[0]] = t;
          q.insSched.run(dayStr, p[0], JSON.stringify(t));
        } catch (e) {
          console.warn(`[jadwal] gagal ${p[0]}: ${e.message}`);
        }
      }),
    );
  }
  missing = PROVINCES.filter((p) => !cache[p[0]]);
  return missing.length ? null : cache;
}

function scheduleEmbed(ev, dayStr, menitPerProv) {
  const e = baseEmbed(
    `${ev.emoji} ${ev.title}`,
    `📅 ${tglIndo(dayStr)}\n${ev.note}\n-# Sumber jadwal: Aladhan (metode Kemenag RI). Bisa beda beberapa menit dengan jadwal resmi daerah.`,
    ev.color,
  );
  for (const zone of ZONES) {
    const lines = PROVINCES.filter((p) => p[3] === zone).map((p) => `**${p[0]}** — \`${hm(menitPerProv[p[0]])}\``);
    e.addFields({ name: `🕒 ${zone}`, value: lines.join('\n') });
  }
  return e;
}

async function runNotifs() {
  const notifCh = getCfg('notif_channel');
  const ibadahCh = getCfg('pengingat_channel');
  if (!notifCh && !ibadahCh) return;

  const now = wibNow();
  const pending = EVENTS.filter((ev) => (ev.ch === 'notif' ? notifCh : ibadahCh) && !q.isSent.get(now.day, ev.key));
  if (!pending.length) return;

  const sched = await ensureSchedule(now.day);
  if (!sched) return;

  const [y, m, d] = [now.y, now.m, now.d];
  const t0 = Date.UTC(y, m - 1, d, 0, 0);
  const nowMs = Date.now();

  for (const ev of pending) {
    const menit = {};
    const instan = [];
    for (const p of PROVINCES) {
      const mm = ev.at(sched[p[0]]);
      menit[p[0]] = mm;
      instan.push(t0 + mm * 60000 - OFFSET[p[3]] * 3600000);
    }
    const paling = Math.min(...instan);
    const terakhir = Math.max(...instan);
    if (nowMs < paling - ev.lead * 60000) continue; // belum waktunya

    q.insSent.run(now.day, ev.key); // tandai dulu biar nggak dobel
    if (nowMs > terakhir) continue; // sudah lewat semua (bot baru nyala), skip

    await sendTo(ev.ch === 'notif' ? notifCh : ibadahCh, { embeds: [scheduleEmbed(ev, now.day, menit)] });
  }
}
// ===========================================================

// ======================= QUEST =============================
function ensureDaily(day) {
  const rows = q.dailyRows.all(day);
  if (rows.length < QUEST_PER_DAY) {
    const have = new Set(rows.map((r) => r.slot));
    const butuh = QUEST_PER_DAY - have.size;

    const terpakai = new Set(q.usedAll.all().map((r) => r.qid));
    let pool = soal.ALL_QIDS.filter((id) => !terpakai.has(id));
    if (pool.length < butuh) {
      q.clearUsed.run(); // semua soal sudah terpakai, putar ulang
      pool = [...soal.ALL_QIDS];
    }

    // usahakan 5 soal beda tipe dalam sehari
    const perTipe = {};
    for (const id of pool) (perTipe[id.split(':')[0]] ||= []).push(id);
    const tipe = Object.keys(perTipe).sort(() => Math.random() - 0.5);
    const picks = tipe.slice(0, butuh).map((t) => perTipe[t][Math.floor(Math.random() * perTipe[t].length)]);
    while (picks.length < butuh) {
      const id = pool[Math.floor(Math.random() * pool.length)];
      if (!picks.includes(id)) picks.push(id);
    }

    db.exec('BEGIN');
    try {
      let k = 0;
      for (let slot = 0; slot < QUEST_PER_DAY; slot++) {
        if (have.has(slot)) continue;
        const qid = picks[k++];
        q.insDaily.run(day, slot, qid, JSON.stringify(soal.makeQuestion(qid)));
        q.insUsed.run(qid);
      }
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  }
  return q.dailyRows.all(day).map((r) => JSON.parse(r.data));
}

function questButtons(uid, day, slot, qdata, state) {
  // state: null (belum dijawab) | { chosen } setelah dijawab
  const rows = [];
  qdata.options.forEach((opt, idx) => {
    if (idx % 2 === 0) rows.push(new ActionRowBuilder());
    const btn = new ButtonBuilder().setCustomId(`quest:${uid}:${day}:${slot}:${idx}`).setLabel(String(opt).slice(0, 80));
    if (!state) {
      btn.setStyle(ButtonStyle.Secondary);
    } else {
      btn.setDisabled(true);
      if (idx === qdata.answer) btn.setStyle(ButtonStyle.Success);
      else if (idx === state.chosen) btn.setStyle(ButtonStyle.Danger);
      else btn.setStyle(ButtonStyle.Secondary);
    }
    rows[rows.length - 1].addComponents(btn);
  });
  return rows;
}

async function handleQuest(i) {
  if (!i.inGuild()) return i.reply({ content: 'Pakai command ini di server ya.', flags: EPHEMERAL });
  if (!hasMemberRole(i.member)) {
    return i.reply({ content: '⛔ Kamu harus punya role dulu buat main quest. Ambil lewat tombol **getrole** ya!', flags: EPHEMERAL });
  }
  const day = wibNow().day;
  const qs = ensureDaily(day);
  const done = new Map(q.answersOf.all(i.user.id, day).map((r) => [r.slot, r.correct]));
  const slot = [...Array(QUEST_PER_DAY).keys()].find((s) => !done.has(s));

  if (slot === undefined) {
    const benar = [...done.values()].reduce((a, b) => a + b, 0);
    return i.reply({
      embeds: [baseEmbed('✅ Quest Hari Ini Selesai', `Kamu sudah menjawab semua **${QUEST_PER_DAY} soal**.\nBenar: **${benar}/${QUEST_PER_DAY}** (+${benar * QUEST_POINTS} poin)\n\nSoal baru muncul besok!`, 0x2ecc71)],
      flags: EPHEMERAL,
    });
  }
  const qd = qs[slot];
  const embed = baseEmbed(`📖 Soal ${slot + 1}/${QUEST_PER_DAY}`, `**${qd.q}**\n\n💰 Benar = **+${QUEST_POINTS} poin**\n⚠️ Salah = soal hangus, nggak bisa coba lagi.`);
  return i.reply({ embeds: [embed], components: questButtons(i.user.id, day, slot, qd, null), flags: EPHEMERAL });
}

async function handleQuestAnswer(i) {
  const [, uid, day, slotS, idxS] = i.customId.split(':');
  const slot = Number(slotS);
  const idx = Number(idxS);
  if (uid !== i.user.id) return i.reply({ content: 'Ini bukan soal kamu.', flags: EPHEMERAL });
  if (day !== wibNow().day) {
    return i.update({ embeds: [baseEmbed('⌛ Soal kedaluwarsa', 'Soal ini sudah lewat hari. Ketik `/quest` lagi buat soal hari ini.')], components: [] });
  }
  const row = q.dailyRows.all(day).find((r) => r.slot === slot);
  if (!row) return i.update({ content: 'Soal tidak ditemukan.', embeds: [], components: [] });
  const qd = JSON.parse(row.data);

  const benar = idx === qd.answer;
  const r = q.insAnswer.run(uid, day, slot, idx, benar ? 1 : 0);
  if (r.changes === 0) {
    return i.update({ embeds: [baseEmbed('Soal ini sudah kamu jawab', 'Ketik `/quest` buat lanjut ke soal berikutnya.')], components: [] });
  }
  const poin = benar ? QUEST_POINTS : 0;
  if (poin) {
    q.addQuestPts.run(uid, poin);
    scheduleLeaderboardRefresh();
  }
  const { total } = getPoints(uid);

  const hasil = benar
    ? baseEmbed('✅ Jawaban Benar!', `**${qd.q}**\n\n${qd.info}\n\n💰 **+${poin} poin** (total: ${total})`, 0x2ecc71)
    : baseEmbed('❌ Jawaban Salah', `**${qd.q}**\n\nJawaban benar: **${qd.options[qd.answer]}**\n${qd.info}\n\n💰 +0 poin (total: ${total})`, 0xe74c3c);
  const sisa = QUEST_PER_DAY - q.answersOf.all(uid, day).length;
  hasil.addFields({ name: 'Sisa soal hari ini', value: sisa > 0 ? `${sisa} soal lagi. Ketik \`/quest\` buat lanjut.` : 'Semua soal hari ini sudah selesai 🎉' });

  await i.update({ embeds: [hasil], components: questButtons(uid, day, slot, qd, { chosen: idx }) });

  await sendTo(QUEST_LOG_CHANNEL_ID, {
    embeds: [
      baseEmbed(
        '📜 Log Quest',
        `${benar ? '✅' : '❌'} ${i.user} menjawab **Soal ${slot + 1}/${QUEST_PER_DAY}** (${benar ? 'benar' : 'salah'})\n💰 Dapat: **+${poin} poin**\n🏅 Total poin: **${total}**`,
        benar ? 0x2ecc71 : 0xe74c3c,
      ),
    ],
    allowedMentions: { parse: [] },
  });
}
// ===========================================================

// ======================= GETROLE ===========================
function getrolePayload() {
  const c = new ContainerBuilder().setAccentColor(COLOR);
  if (GETROLE_BANNER) c.addMediaGalleryComponents(bannerGallery(GETROLE_BANNER));
  c.addTextDisplayComponents(
    txt(`## Selamat datang, Warga!\nSatu klik buat dapat role <@&${MEMBER_ROLE_ID}> dan mulai ikut kegiatan Ramadan di server.`),
  );
  c.addSeparatorComponents(new SeparatorBuilder());
  c.addTextDisplayComponents(
    txt(
      '📖 **Quest tebak surat**\n-# Jawab 5 soal tiap hari pakai `/quest`\n\n' +
        '💰 **Kumpulin poin**\n-# Cek poin kamu kapan aja pakai `.point`\n\n' +
        '🏆 **Masuk leaderboard**\n-# Adu poin sama member lain',
    ),
  );
  c.addSeparatorComponents(new SeparatorBuilder());
  c.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('getrole:ambil').setLabel('Ambil Role').setEmoji('🌙').setStyle(ButtonStyle.Primary),
    ),
  );
  c.addTextDisplayComponents(txt(`-# ${WATERMARK}`));
  return { components: [c], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } };
}

async function handleGetRole(i) {
  const role = i.guild.roles.cache.get(MEMBER_ROLE_ID);
  if (!role) return i.reply({ embeds: [errEmbed('Role-nya nggak ketemu. Hubungi admin.')], flags: EPHEMERAL });
  if (i.member.roles.cache.has(role.id)) {
    return i.reply({ embeds: [okEmbed(`Kamu sudah punya role ${role}.`)], flags: EPHEMERAL });
  }
  try {
    await i.member.roles.add(role, 'Getrole via tombol');
    return i.reply({ embeds: [baseEmbed('🌙 Role didapat', `Kamu dapat role ${role}!\nCoba ketik \`/quest\` buat mulai.`, 0x2ecc71)], flags: EPHEMERAL });
  } catch (e) {
    console.error('[getrole]', e.message);
    return i.reply({
      embeds: [errEmbed('Bot nggak bisa kasih role. Admin: pastikan role bot posisinya di atas role ini dan punya izin Manage Roles.')],
      flags: EPHEMERAL,
    });
  }
}
// ===========================================================

// ======================= RULES (FORM) ======================
function parseLinks(text) {
  return (text || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [label, ...rest] = l.split('|');
      return { label: label.trim().slice(0, 80), url: rest.join('|').trim() };
    })
    .filter((l) => l.label && /^https?:\/\//i.test(l.url))
    .slice(0, 5);
}
const parseImages = (text) =>
  (text || '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => /^https?:\/\//i.test(l));

async function sendRules(channel, { title, desc, rules, links, top, bottom }) {
  // Tampilan utama: Components V2 (mirip screenshot)
  try {
    const container = new ContainerBuilder().setAccentColor(COLOR);
    if (top) container.addMediaGalleryComponents(new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(top)));
    container.addSeparatorComponents(new SeparatorBuilder());
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${title}${desc ? `\n${desc}` : ''}`));
    if (links.length) {
      container.addActionRowComponents(
        new ActionRowBuilder().addComponents(
          links.map((l) => new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel(l.label).setURL(l.url)),
        ),
      );
    }
    container.addSeparatorComponents(new SeparatorBuilder());
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(rules));
    if (bottom) {
      container.addSeparatorComponents(new SeparatorBuilder());
      container.addMediaGalleryComponents(new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(bottom)));
    }
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# ${WATERMARK}`));
    return await channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
  } catch (e) {
    console.warn('[rules] Components V2 gagal, pakai embed biasa:', e.message);
  }
  // Cadangan: embed biasa
  const embed = baseEmbed(title, [desc, rules].filter(Boolean).join('\n\n').slice(0, 4000));
  if (top || bottom) embed.setImage(top || bottom);
  const payload = { embeds: [embed] };
  if (links.length) {
    payload.components = [
      new ActionRowBuilder().addComponents(links.map((l) => new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel(l.label).setURL(l.url))),
    ];
  }
  return channel.send(payload);
}

async function handleRulesOpen(i) {
  const [, , channelId, authorId] = i.customId.split(':');
  if (i.user.id !== authorId || !isAdmin(i.member)) {
    return i.reply({ content: '⛔ Cuma admin yang bikin command ini yang bisa buka form.', flags: EPHEMERAL });
  }
  const input = (id, label, style, required, max, placeholder) =>
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId(id).setLabel(label).setStyle(style).setRequired(required).setMaxLength(max).setPlaceholder(placeholder),
    );
  const modal = new ModalBuilder()
    .setCustomId(`rules:modal:${channelId}`)
    .setTitle('Kirim Rules')
    .addComponents(
      input('judul', 'Judul', TextInputStyle.Short, true, 100, 'WELCOME TO SERVER KAMU'),
      input('deskripsi', 'Deskripsi singkat (opsional)', TextInputStyle.Paragraph, false, 500, 'Halo guys, wajib baca rules ya...'),
      input('rules', 'Rules', TextInputStyle.Paragraph, true, 2500, '1. Rules pertama\n2. Rules kedua'),
      input('link', 'Link tombol (Label|URL, 1 per baris)', TextInputStyle.Paragraph, false, 500, 'Open Ticket|https://discord.com/channels/...'),
      input('gambar', 'Gambar (baris 1 atas, baris 2 bawah)', TextInputStyle.Paragraph, false, 500, 'https://link-banner-atas.png\nhttps://link-banner-bawah.png'),
    );
  return i.showModal(modal);
}

async function handleRulesModal(i) {
  if (!isAdmin(i.member)) return i.reply({ content: '⛔ Kamu nggak punya akses.', flags: EPHEMERAL });
  await i.deferReply({ flags: EPHEMERAL });
  const channelId = i.customId.split(':')[2];
  const imgs = parseImages(i.fields.getTextInputValue('gambar'));
  try {
    const ch = await i.guild.channels.fetch(channelId);
    await sendRules(ch, {
      title: i.fields.getTextInputValue('judul').trim(),
      desc: i.fields.getTextInputValue('deskripsi').trim(),
      rules: i.fields.getTextInputValue('rules').trim(),
      links: parseLinks(i.fields.getTextInputValue('link')),
      top: imgs[0] || null,
      bottom: imgs[1] || null,
    });
    return i.editReply(`✅ Rules terkirim ke ${ch}.`);
  } catch (e) {
    console.error('[rules]', e);
    return i.editReply(`❌ Gagal kirim rules: ${e.message}`);
  }
}
// ===========================================================

// ================== LEADERBOARD (PANEL) ====================
async function leaderboardLines(guild, limit) {
  const rows = q.topPts.all();
  if (!rows.length) return [];
  const members = await guild.members.fetch({ user: rows.map((r) => r.user_id) }).catch(() => null);
  const lines = [];
  for (const r of rows) {
    const m = members?.get(r.user_id);
    if (!m || isAdmin(m)) continue; // pemegang role admin nggak masuk leaderboard
    const rank = lines.length;
    const medal = ['🥇', '🥈', '🥉'][rank] || `\`${String(rank + 1).padStart(2, ' ')}.\``;
    lines.push(`${medal} <@${r.user_id}> — **${r.quest_points}** poin`);
    if (lines.length === limit) break;
  }
  return lines;
}

async function leaderboardPayload(guild) {
  const lines = await leaderboardLines(guild, 20);
  const c = new ContainerBuilder().setAccentColor(0xf1c40f);
  if (LEADERBOARD_BANNER) c.addMediaGalleryComponents(bannerGallery(LEADERBOARD_BANNER));
  c.addTextDisplayComponents(txt('## 🏆 Leaderboard quest Ramadan\nTop 20 poin tertinggi'));
  c.addSeparatorComponents(new SeparatorBuilder());
  c.addTextDisplayComponents(txt(lines.length ? lines.join('\n') : 'Belum ada yang punya poin. Yuk mulai pakai `/quest`!'));
  c.addSeparatorComponents(new SeparatorBuilder());
  c.addTextDisplayComponents(txt(`-# Diupdate otomatis • terakhir <t:${Math.floor(Date.now() / 1000)}:R> • ${WATERMARK}`));
  return { components: [c], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } };
}

async function refreshLeaderboardPanel() {
  const raw = getCfg('lb_panel');
  if (!raw) return;
  const info = JSON.parse(raw);
  let msg;
  try {
    const ch = await client.channels.fetch(info.channel);
    msg = await ch.messages.fetch(info.message);
  } catch (e) {
    console.warn('[panel leaderboard] pesan/channel nggak ketemu:', e.message);
    if (e.code === 10008 || e.code === 10003) setCfg('lb_panel', ''); // panel sudah dihapus
    return;
  }
  await msg.edit(await leaderboardPayload(msg.guild));
}

// Update "langsung", tapi digabung beberapa detik biar nggak kena batas Discord
let lbTimer = null;
function scheduleLeaderboardRefresh() {
  if (lbTimer) return;
  lbTimer = setTimeout(async () => {
    lbTimer = null;
    try {
      await refreshLeaderboardPanel();
    } catch (e) {
      console.error('[panel leaderboard]', e.message);
    }
  }, 3000);
}
// ===========================================================

// ======================= CLEAR CHAT ========================
const clearing = new Set();

async function clearChannel(channel) {
  const batasBulk = Date.now() - 14 * 24 * 3600 * 1000 + 60 * 1000; // bulk delete cuma untuk < 14 hari
  let dihapus = 0;
  let before;
  for (;;) {
    const batch = await channel.messages.fetch({ limit: 100, ...(before ? { before } : {}) });
    if (!batch.size) break;
    before = batch.last().id;
    const baru = batch.filter((m) => m.createdTimestamp > batasBulk);
    const lama = batch.filter((m) => m.createdTimestamp <= batasBulk);

    if (baru.size > 1) {
      const r = await channel.bulkDelete(baru, true);
      dihapus += r.size;
    } else if (baru.size === 1) {
      await baru.first().delete();
      dihapus += 1;
    }
    for (const m of lama.values()) {
      try {
        await m.delete();
        dihapus += 1;
      } catch (e) {
        console.warn('[clear] gagal hapus satu pesan:', e.message);
      }
    }
  }
  return dihapus;
}

async function handleClear(i) {
  const [, aksi, channelId, authorId] = i.customId.split(':');
  if (i.user.id !== authorId || !isAdmin(i.member)) {
    return i.reply({ embeds: [errEmbed('Cuma admin yang menjalankan command ini yang bisa pakai tombol ini.')], flags: EPHEMERAL });
  }
  if (aksi === 'no') {
    return i.update({ embeds: [baseEmbed('Dibatalkan', 'Nggak ada pesan yang dihapus.', 0x95a5a6)], components: [] });
  }
  if (clearing.has(channelId)) {
    return i.reply({ embeds: [errEmbed('Channel ini lagi dibersihkan, tunggu sebentar.')], flags: EPHEMERAL });
  }
  clearing.add(channelId);
  await i.update({
    embeds: [baseEmbed('🧹 Menghapus pesan...', 'Tunggu sebentar. Kalau pesannya banyak atau umurnya lebih dari 14 hari, butuh waktu lebih lama.', COLOR)],
    components: [],
  });
  const ch = await i.guild.channels.fetch(channelId);
  try {
    const jumlah = await clearChannel(ch);
    const done = await ch.send({ embeds: [baseEmbed('✅ Selesai', `**${jumlah}** pesan dihapus.`, 0x2ecc71)] });
    setTimeout(() => done.delete().catch(() => {}), 8000);
  } catch (e) {
    console.error('[clear]', e);
    const gagal = await ch
      .send({ embeds: [errEmbed(`Gagal menghapus: ${e.message}\nPastikan bot punya izin Manage Messages dan Read Message History.`)] })
      .catch(() => null);
    if (gagal) setTimeout(() => gagal.delete().catch(() => {}), 15000);
  } finally {
    clearing.delete(channelId);
  }
}
// ===========================================================

// ================= COMMAND PREFIX (.) ======================
const targetChannel = (msg) => {
  const ch = msg.mentions.channels.first() || msg.channel;
  return ch?.isTextBased() ? ch : null;
};
const balas = (msg, payload) =>
  msg.reply({ ...(typeof payload === 'string' ? { content: payload } : payload), allowedMentions: { repliedUser: false, parse: [] } });
const balasEmbed = (msg, embed) => balas(msg, { embeds: [embed] });

const commands = {
  // ---- member (butuh role getrole) ----
  async point(msg) {
    if (!hasMemberRole(msg.member)) return balasEmbed(msg, errEmbed('Kamu harus punya role dulu. Ambil lewat tombol **getrole**.'));
    const { total } = getPoints(msg.author.id);
    return balasEmbed(msg, baseEmbed('💰 Poin kamu', `${msg.author}, poin kamu saat ini: **${total}**`, 0xf1c40f));
  },

  // ---- semua orang ----
  async leaderboard(msg) {
    const lines = await leaderboardLines(msg.guild, 10);
    return balasEmbed(msg, baseEmbed('🏆 Leaderboard quest Ramadan', lines.length ? lines.join('\n') : 'Belum ada yang punya poin.', 0xf1c40f));
  },

  // ---- admin ----
  async setpoin(msg, args) {
    const user = msg.mentions.users.first();
    const angka = args.find((a) => /^\d+$/.test(a));
    if (!user || angka === undefined) return balasEmbed(msg, errEmbed('Format: `.setpoin @user jumlah`'));
    const jumlah = Number(angka);
    if (jumlah > 10_000_000) return balasEmbed(msg, errEmbed('Jumlahnya kegedean.'));
    // atur poin total jadi persis "jumlah" lewat poin tambahan (nggak masuk leaderboard)
    const { quest } = getPoints(user.id);
    q.setBonus.run(user.id, jumlah - quest);
    return balasEmbed(msg, baseEmbed('✅ Poin diatur', `Poin ${user} sekarang: **${jumlah}**\n-# Poin hasil setpoin tidak masuk leaderboard.`, 0x2ecc71));
  },

  async setupabsen(msg) {
    const ch = targetChannel(msg);
    if (!ch) return balasEmbed(msg, errEmbed('Channel tidak valid.'));
    setCfg('absen_channel', ch.id);
    return balasEmbed(msg, okEmbed(`Absen sahur akan dikirim otomatis tiap hari jam **02:45 WIB** ke ${ch}.`));
  },
  async setupnotif(msg) {
    const ch = targetChannel(msg);
    if (!ch) return balasEmbed(msg, errEmbed('Channel tidak valid.'));
    setCfg('notif_channel', ch.id);
    return balasEmbed(msg, okEmbed(`Notif sahur dan buka puasa akan dikirim ke ${ch}.`));
  },
  async setuppengingat(msg) {
    const ch = targetChannel(msg);
    if (!ch) return balasEmbed(msg, errEmbed('Channel tidak valid.'));
    setCfg('pengingat_channel', ch.id);
    return balasEmbed(msg, okEmbed(`Pengingat ibadah akan dikirim ke ${ch}.`));
  },
  async setupgetrole(msg) {
    const ch = targetChannel(msg);
    if (!ch) return balasEmbed(msg, errEmbed('Channel tidak valid.'));
    await ch.send(getrolePayload());
    return ch.id === msg.channel.id ? null : balasEmbed(msg, okEmbed(`Panel getrole terkirim ke ${ch}.`));
  },
  async setupleaderboard(msg) {
    const ch = targetChannel(msg);
    if (!ch) return balasEmbed(msg, errEmbed('Channel tidak valid.'));
    const sent = await ch.send(await leaderboardPayload(msg.guild));
    setCfg('lb_panel', JSON.stringify({ channel: ch.id, message: sent.id }));
    return ch.id === msg.channel.id ? null : balasEmbed(msg, okEmbed(`Panel leaderboard dipasang di ${ch} dan akan update otomatis.`));
  },
  async rules(msg) {
    const ch = targetChannel(msg);
    if (!ch) return balasEmbed(msg, errEmbed('Channel tidak valid.'));
    return balas(msg, {
      content: `Klik tombol di bawah buat isi form rules (dikirim ke ${ch}).`,
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`rules:open:${ch.id}:${msg.author.id}`).setLabel('Isi Form Rules').setEmoji('📝').setStyle(ButtonStyle.Primary),
        ),
      ],
    });
  },
  async clear(msg) {
    return balas(msg, {
      embeds: [
        baseEmbed(
          '⚠️ Hapus semua pesan?',
          `Semua pesan di ${msg.channel} akan dihapus, **termasuk panel bot dan pesan yang di-pin**.\nTindakan ini nggak bisa dibatalin.`,
          0xe74c3c,
        ),
      ],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`clear:yes:${msg.channel.id}:${msg.author.id}`).setLabel('Ya, hapus semua').setEmoji('🗑️').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId(`clear:no:${msg.channel.id}:${msg.author.id}`).setLabel('Batal').setStyle(ButtonStyle.Secondary),
        ),
      ],
    });
  },
};
commands.lb = commands.leaderboard;
const ADMIN_ONLY = new Set(['setpoin', 'setupabsen', 'setupnotif', 'setuppengingat', 'setupgetrole', 'setupleaderboard', 'rules', 'clear']);

client.on(Events.MessageCreate, async (msg) => {
  try {
    if (msg.author.bot || !msg.guild || !msg.content.startsWith(PREFIX)) return;
    const [name, ...args] = msg.content.slice(PREFIX.length).trim().split(/\s+/);
    const cmd = name?.toLowerCase();
    const handler = commands[cmd];
    if (!handler) return;
    if (ADMIN_ONLY.has(cmd) && !isAdmin(msg.member)) return balasEmbed(msg, errEmbed('Kamu nggak punya akses buat command ini.'));
    await handler(msg, args);
  } catch (e) {
    console.error('[command]', e);
    msg.reply('❌ Ada error, coba lagi nanti.').catch(() => {});
  }
});
// ===========================================================

// ======================= INTERAKSI =========================
client.on(Events.InteractionCreate, async (i) => {
  try {
    if (i.isChatInputCommand() && i.commandName === 'quest') return await handleQuest(i);
    if (i.isButton()) {
      const id = i.customId;
      if (id === 'absen:hadir') return await handleAbsen(i);
      if (id === 'getrole:ambil') return await handleGetRole(i);
      if (id.startsWith('rules:open:')) return await handleRulesOpen(i);
      if (id.startsWith('quest:')) return await handleQuestAnswer(i);
      if (id.startsWith('clear:')) return await handleClear(i);
    }
    if (i.isModalSubmit() && i.customId.startsWith('rules:modal:')) return await handleRulesModal(i);
  } catch (e) {
    console.error('[interaction]', e);
    const payload = { content: '❌ Ada error, coba lagi nanti.', flags: EPHEMERAL };
    if (i.deferred || i.replied) i.followUp(payload).catch(() => {});
    else i.reply(payload).catch(() => {});
  }
});
// ===========================================================

// ======================= START =============================
let schedulerBusy = false;
async function tick() {
  if (schedulerBusy) return;
  schedulerBusy = true;
  try {
    await runAbsen();
    await runNotifs();
  } catch (e) {
    console.error('[scheduler]', e);
  } finally {
    schedulerBusy = false;
  }
}

client.once(Events.ClientReady, async (c) => {
  console.log(`Login sebagai ${c.user.tag} | ${WATERMARK}`);
  await c.application.commands.set([
    new SlashCommandBuilder().setName('quest').setDescription('Jawab soal quest tebak surat hari ini').toJSON(),
  ]);
  refreshLeaderboardPanel().catch((e) => console.warn('[panel leaderboard]', e.message));
  setInterval(tick, 30 * 1000);
  tick();
});

process.on('unhandledRejection', (e) => console.error('[unhandledRejection]', e));

if (!TOKEN) {
  console.error('DISCORD_TOKEN belum diisi. Isi di file .env (lihat .env.example).');
  process.exit(1);
}
client.login(TOKEN);
