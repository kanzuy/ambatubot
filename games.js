// ============================================================
//  11 game Ramadan - Reduygenk-KantDev
//  Hadiah semua berupa money (poin leaderboard nggak ikut).
//  Batas money dari game: GAME_DAILY_CAP per orang per hari.
// ============================================================
const crypto = require('node:crypto');
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  Events,
} = require('discord.js');
const D = require('./data');

module.exports = function games(ctx) {
  const {
    client, db, baseEmbed, errEmbed, EPHEMERAL, hasMemberRole, wibNow, fmt, track, didToday,
    addMoney, getCfg, setCfg, sendTo, balas, balasEmbed, commands, adminCommands, GAME_DAILY_CAP,
  } = ctx;
  const { Primary, Secondary, Success, Danger } = ButtonStyle;

  db.exec(`
    CREATE TABLE IF NOT EXISTS game_earn (user_id TEXT, day TEXT, total INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (user_id, day));
    CREATE TABLE IF NOT EXISTS pvp_pair (day TEXT, pair TEXT, PRIMARY KEY (day, pair));
    CREATE TABLE IF NOT EXISTS wordle (user_id TEXT, day TEXT, guesses TEXT NOT NULL DEFAULT '[]', done INTEGER NOT NULL DEFAULT 0, won INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (user_id, day));
    CREATE TABLE IF NOT EXISTS spin_daily (user_id TEXT, day TEXT, PRIMARY KEY (user_id, day));
    CREATE TABLE IF NOT EXISTS trivia_daily (user_id TEXT, day TEXT, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (user_id, day));
    CREATE TABLE IF NOT EXISTS trivia_stats (user_id TEXT PRIMARY KEY, correct INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS bingo_claim (user_id TEXT, day TEXT, kind TEXT, PRIMARY KEY (user_id, day, kind));
  `);
  const st = {
    getEarn: db.prepare('SELECT total FROM game_earn WHERE user_id = ? AND day = ?'),
    setEarn: db.prepare('INSERT INTO game_earn(user_id, day, total) VALUES(?, ?, ?) ON CONFLICT(user_id, day) DO UPDATE SET total = excluded.total'),
    insPair: db.prepare('INSERT OR IGNORE INTO pvp_pair(day, pair) VALUES(?, ?)'),
    getWordle: db.prepare('SELECT guesses, done, won FROM wordle WHERE user_id = ? AND day = ?'),
    setWordle: db.prepare('INSERT INTO wordle(user_id, day, guesses, done, won) VALUES(?, ?, ?, ?, ?) ON CONFLICT(user_id, day) DO UPDATE SET guesses = excluded.guesses, done = excluded.done, won = excluded.won'),
    insSpin: db.prepare('INSERT OR IGNORE INTO spin_daily(user_id, day) VALUES(?, ?)'),
    getTv: db.prepare('SELECT n FROM trivia_daily WHERE user_id = ? AND day = ?'),
    incTv: db.prepare('INSERT INTO trivia_daily(user_id, day, n) VALUES(?, ?, 1) ON CONFLICT(user_id, day) DO UPDATE SET n = n + 1'),
    incTvStat: db.prepare('INSERT INTO trivia_stats(user_id, correct) VALUES(?, 1) ON CONFLICT(user_id) DO UPDATE SET correct = correct + 1'),
    topTv: db.prepare('SELECT user_id, correct FROM trivia_stats ORDER BY correct DESC LIMIT 10'),
    getClaim: db.prepare('SELECT 1 FROM bingo_claim WHERE user_id = ? AND day = ? AND kind = ?'),
    insClaim: db.prepare('INSERT OR IGNORE INTO bingo_claim(user_id, day, kind) VALUES(?, ?, ?)'),
  };

  // ---------- util ----------
  const pick = (arr) => arr[crypto.randomInt(arr.length)];
  const shuffle = (arr, rnd = (n) => crypto.randomInt(n)) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = rnd(i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const row = (...b) => new ActionRowBuilder().addComponents(...b);
  const btn = (id, label, style, emoji, disabled = false) => {
    const b = new ButtonBuilder().setCustomId(id).setLabel(label).setStyle(style).setDisabled(disabled);
    if (emoji) b.setEmoji(emoji);
    return b;
  };
  const deny = (i, text) => i.reply({ embeds: [errEmbed(text)], flags: EPHEMERAL });
  const butuhRole = (msg) => {
    if (hasMemberRole(msg.member)) return true;
    balasEmbed(msg, errEmbed('Kamu harus punya role dulu buat main game. Ambil lewat tombol **getrole**.'));
    return false;
  };
  const butuhRoleI = (i) => {
    if (hasMemberRole(i.member)) return true;
    deny(i, 'Kamu harus punya role dulu buat main game. Ambil lewat tombol **getrole**.');
    return false;
  };
  const respond = (i, payload) => (i.isFromMessage?.() ? i.update(payload) : i.reply(payload));

  // Money dari game, dibatasi per hari
  function giveGameMoney(uid, amount) {
    const day = wibNow().day;
    const sudah = st.getEarn.get(uid, day)?.total ?? 0;
    const granted = Math.max(0, Math.min(amount, GAME_DAILY_CAP - sudah));
    if (granted > 0) {
      st.setEarn.run(uid, day, sudah + granted);
      addMoney(uid, granted);
    }
    return { granted, capped: granted < amount };
  }
  const uang = (r) =>
    r.granted === 0
      ? `💵 Batas money game hari ini (${fmt(GAME_DAILY_CAP)}) sudah tercapai.`
      : `💵 **+${fmt(r.granted)} money**${r.capped ? ' (kena batas harian)' : ''}`;
  // Hadiah lawan: 1x per pasangan per hari (biar nggak bisa digilir dua akun)
  function pairOnce(a, b) {
    const pair = [a, b].sort().join(':');
    return st.insPair.run(wibNow().day, pair).changes === 1;
  }
  function hadiahPvp(winner, loser, amount) {
    track(winner, 'game'); track(loser, 'game'); track(winner, 'menang');
    if (!pairOnce(winner, loser)) return '💵 Hadiah buat pasangan ini sudah diambil hari ini.';
    return uang(giveGameMoney(winner, amount));
  }

  // =========================================================
  // 1. TEBAK HARGA
  // =========================================================
  const tebakHarga = new Map();
  commands.tebakharga = async (msg) => {
    if (!butuhRole(msg)) return;
    const item = pick(D.HARGA);
    const m = await balas(msg, {
      embeds: [baseEmbed('💸 Tebak harga', `Berapa harga **${item.nama}**?\nBenar kalau selisihnya maksimal **10%** dari harga sebenarnya.\n-# Harga perkiraan umum. Waktu 2 menit.`, 0xf1c40f)],
      components: [row(btn(`g:th:${msg.author.id}`, 'Tebak', Primary, '💸'))],
    });
    tebakHarga.set(m.id, { uid: msg.author.id, item, exp: Date.now() + 120000 });
  };
  ctx.onButton('g:th:', async (i) => {
    const uid = i.customId.split(':')[2];
    if (i.user.id !== uid) return deny(i, 'Ini bukan soal kamu. Ketik `.tebakharga` buat main sendiri.');
    const s = tebakHarga.get(i.message.id);
    if (!s || Date.now() > s.exp) {
      return i.update({ embeds: [baseEmbed('⌛ Kedaluwarsa', 'Soal ini sudah kedaluwarsa. Ketik `.tebakharga` lagi.', 0x95a5a6)], components: [] });
    }
    const modal = new ModalBuilder()
      .setCustomId(`g:thm:${i.message.id}`)
      .setTitle('Tebak harga')
      .addComponents(
        row(new TextInputBuilder().setCustomId('angka').setLabel('Tebakan harga (Rp)').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(12).setPlaceholder('contoh: 15000 atau 15k')),
      );
    return i.showModal(modal);
  });
  const parseUang = (raw) => {
    const t = String(raw).toLowerCase().replace(/rp|\s/g, '');
    if (t.endsWith('k')) return Math.round(parseFloat(t.slice(0, -1).replace(',', '.')) * 1000);
    return parseInt(t.replace(/[.,]/g, ''), 10);
  };
  ctx.onModal('g:thm:', async (i) => {
    const mid = i.customId.split(':')[2];
    const s = tebakHarga.get(mid);
    if (!s || i.user.id !== s.uid || Date.now() > s.exp) return deny(i, 'Soal ini sudah kedaluwarsa.');
    const tebakan = parseUang(i.fields.getTextInputValue('angka'));
    if (!Number.isFinite(tebakan) || tebakan <= 0) return deny(i, 'Angka tebakan nggak valid.');
    tebakHarga.delete(mid);
    const benar = Math.abs(tebakan - s.item.harga) <= s.item.harga * 0.1;
    track(i.user.id, 'game'); track(i.user.id, 'tebakharga');
    const hadiah = benar ? uang(giveGameMoney(i.user.id, 3000)) : '💵 +0 money';
    const e = baseEmbed(benar ? '✅ Tebakan tepat!' : '❌ Belum tepat', `**${s.item.nama}**\nTebakan kamu: **Rp${fmt(tebakan)}**\nHarga sebenarnya: **Rp${fmt(s.item.harga)}**\n\n${hadiah}`, benar ? 0x2ecc71 : 0xe74c3c);
    return respond(i, { embeds: [e], components: [] });
  });

  // =========================================================
  // 2. WORDLE RAMADHAN (1x per hari, kata sama buat semua)
  // =========================================================
  const mulberry32 = (a) => () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const hashStr = (s) => {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  };
  const kataWordle = (day) => {
    const [y, m, d] = day.split('-').map(Number);
    const idx = Math.floor(Date.UTC(y, m - 1, d) / 86400000);
    const rnd = mulberry32(1337);
    const urutan = shuffle(D.WORDLE_WORDS, (n) => Math.floor(rnd() * n));
    return urutan[idx % urutan.length];
  };
  function wordleFeedback(tebakan, target) {
    const res = Array(5).fill('x');
    const sisa = {};
    for (let i = 0; i < 5; i++) {
      if (tebakan[i] === target[i]) res[i] = 'g';
      else sisa[target[i]] = (sisa[target[i]] || 0) + 1;
    }
    for (let i = 0; i < 5; i++) {
      if (res[i] !== 'g' && sisa[tebakan[i]] > 0) { res[i] = 'y'; sisa[tebakan[i]]--; }
    }
    return res;
  }
  const WD_EMO = { g: '🟩', y: '🟨', x: '⬛' };
  function wordleEmbed(guesses, target, done, won, hadiah = '') {
    const baris = guesses.map((g) => `${wordleFeedback(g, target).map((c) => WD_EMO[c]).join('')}  \`${g.split('').join(' ')}\``);
    for (let k = guesses.length; k < 6; k++) baris.push('⬜⬜⬜⬜⬜');
    let judul = '🟩 Wordle Ramadhan';
    let warna = 0x5865f2;
    let tambah = `Tebak kata 5 huruf bertema Ramadan. Sisa kesempatan: **${6 - guesses.length}**`;
    if (done) {
      judul = won ? '🎉 Wordle: berhasil!' : '😢 Wordle: gagal';
      warna = won ? 0x2ecc71 : 0xe74c3c;
      tambah = `${won ? 'Kamu menebak' : 'Katanya adalah'} **${target}**.\n${hadiah}\nWordle baru muncul besok.`;
    }
    return baseEmbed(judul, `${baris.join('\n')}\n\n${tambah}`, warna);
  }
  commands.wordle = async (msg) => {
    if (!butuhRole(msg)) return;
    return balas(msg, {
      embeds: [baseEmbed('🟩 Wordle Ramadhan', 'Tebak kata harian bertema Ramadan, 5 huruf, 6 kesempatan.\nSatu kali main per hari. Makin cepat benar, makin besar hadiahnya (sampai **6.000 money**).', 0x5865f2)],
      components: [row(btn('g:wd:open', 'Main Wordle hari ini', Primary, '🟩'))],
    });
  };
  ctx.onButton('g:wd:open', async (i) => {
    if (!butuhRoleI(i)) return;
    const day = wibNow().day;
    const target = kataWordle(day);
    const r = st.getWordle.get(i.user.id, day);
    const guesses = r ? JSON.parse(r.guesses) : [];
    const done = !!r?.done;
    return i.reply({
      embeds: [wordleEmbed(guesses, target, done, !!r?.won)],
      components: done ? [] : [row(btn('g:wd:guess', 'Tebak', Primary, '✏️'))],
      flags: EPHEMERAL,
    });
  });
  ctx.onButton('g:wd:guess', async (i) => {
    const modal = new ModalBuilder()
      .setCustomId('g:wdm')
      .setTitle('Tebak kata')
      .addComponents(row(new TextInputBuilder().setCustomId('kata').setLabel('Kata 5 huruf').setStyle(TextInputStyle.Short).setRequired(true).setMinLength(5).setMaxLength(5).setPlaceholder('SAHUR')));
    return i.showModal(modal);
  });
  ctx.onModal('g:wdm', async (i) => {
    const day = wibNow().day;
    const target = kataWordle(day);
    const kata = i.fields.getTextInputValue('kata').trim().toUpperCase();
    const r = st.getWordle.get(i.user.id, day);
    const guesses = r ? JSON.parse(r.guesses) : [];
    if (r?.done) return deny(i, 'Wordle hari ini sudah selesai.');
    if (!/^[A-Z]{5}$/.test(kata)) return deny(i, 'Tebakan harus 5 huruf (A-Z).');
    if (guesses.includes(kata)) return deny(i, 'Kata itu sudah kamu tebak.');
    guesses.push(kata);
    const menang = kata === target;
    const selesai = menang || guesses.length >= 6;
    let hadiah = '';
    if (menang) hadiah = uang(giveGameMoney(i.user.id, Math.max(1000, 6000 - (guesses.length - 1) * 1000)));
    st.setWordle.run(i.user.id, day, JSON.stringify(guesses), selesai ? 1 : 0, menang ? 1 : 0);
    track(i.user.id, 'wordle');
    if (selesai) track(i.user.id, 'game');
    return respond(i, {
      embeds: [wordleEmbed(guesses, target, selesai, menang, hadiah)],
      components: selesai ? [] : [row(btn('g:wd:guess', 'Tebak', Primary, '✏️'))],
    });
  });

  // =========================================================
  // 3. SAMBUNG KATA (bergiliran, hadiah kalau minimal 3 pemain)
  // =========================================================
  const sk = new Map(); // channelId -> game
  const SK_LOBBY = 30000;
  const SK_TURN = 20000;
  const lobbyEmbed = (g) =>
    baseEmbed('🔤 Sambung kata', `Klik **Gabung** buat ikut. Mulai otomatis dalam 30 detik.\n\n**Pemain (${g.players.length}/8):**\n${g.players.map((p) => `• <@${p}>`).join('\n')}\n\n-# Minimal 2 pemain. Hadiah **5.000 money** buat pemenang kalau pemain minimal 3.`, 0x3498db);

  commands.sambungkata = async (msg) => {
    if (!butuhRole(msg)) return;
    if (sk.has(msg.channel.id)) return balasEmbed(msg, errEmbed('Di channel ini lagi ada game sambung kata.'));
    const g = { ch: msg.channel, players: [msg.author.id], started: false, alive: [], turn: 0, last: '', used: new Set(), timer: null, total: 0 };
    sk.set(msg.channel.id, g);
    g.msg = await msg.channel.send({
      embeds: [lobbyEmbed(g)],
      components: [row(btn(`g:sk:join:${msg.channel.id}`, 'Gabung', Success, '✋'))],
      allowedMentions: { parse: [] },
    });
    g.lobbyTimer = setTimeout(() => skStart(g), SK_LOBBY);
  };
  ctx.onButton('g:sk:join:', async (i) => {
    const g = sk.get(i.customId.split(':')[3]);
    if (!g || g.started) return deny(i, 'Game ini sudah mulai atau selesai.');
    if (!butuhRoleI(i)) return;
    if (g.players.includes(i.user.id)) return deny(i, 'Kamu sudah bergabung.');
    if (g.players.length >= 8) return deny(i, 'Pemain sudah penuh (8).');
    g.players.push(i.user.id);
    return i.update({ embeds: [lobbyEmbed(g)] });
  });
  async function skStart(g) {
    if (g.players.length < 2) {
      sk.delete(g.ch.id);
      await g.msg.edit({ embeds: [baseEmbed('🔤 Sambung kata', 'Dibatalkan, pemain kurang dari 2.', 0x95a5a6)], components: [] }).catch(() => {});
      return;
    }
    g.started = true;
    g.total = g.players.length;
    g.alive = shuffle(g.players);
    g.last = pick(D.SAMBUNG_START);
    g.used.add(g.last);
    await g.msg.edit({ components: [] }).catch(() => {});
    await g.ch.send({ embeds: [baseEmbed('🔤 Sambung kata dimulai!', `Kata pertama: **${g.last}**\nSambung dengan kata yang diawali huruf terakhir (**${g.last.slice(-1).toUpperCase()}**). Minimal 3 huruf, nggak boleh ngulang kata. Waktu ${SK_TURN / 1000} detik per giliran.`, 0x3498db)] });
    skTurn(g);
  }
  function skTurn(g) {
    const id = g.alive[g.turn % g.alive.length];
    g.turn = g.turn % g.alive.length;
    g.ch.send({ content: `<@${id}> giliran kamu! Huruf awal: **${g.last.slice(-1).toUpperCase()}** (kata terakhir: ${g.last})`, allowedMentions: { users: [id] } }).catch(() => {});
    clearTimeout(g.timer);
    g.timer = setTimeout(() => skTimeout(g), SK_TURN);
  }
  async function skTimeout(g) {
    const id = g.alive[g.turn];
    g.alive.splice(g.turn, 1);
    await g.ch.send({ content: `⏰ <@${id}> kehabisan waktu dan tereliminasi.`, allowedMentions: { parse: [] } }).catch(() => {});
    if (g.alive.length === 1) return skEnd(g, g.alive[0]);
    skTurn(g);
  }
  async function skEnd(g, winner) {
    clearTimeout(g.timer);
    sk.delete(g.ch.id);
    g.players.forEach((p) => track(p, 'game'));
    let hadiah = 'Hadiah money cuma berlaku kalau pemain minimal 3.';
    if (g.total >= 3) hadiah = uang(giveGameMoney(winner, 5000));
    await g.ch.send({ embeds: [baseEmbed('🏆 Sambung kata selesai', `Pemenang: <@${winner}>\n${hadiah}`, 0x2ecc71)], allowedMentions: { parse: [] } }).catch(() => {});
  }
  client.on(Events.MessageCreate, async (msg) => {
    try {
      if (msg.author.bot || !msg.guild) return;
      const g = sk.get(msg.channel.id);
      if (!g?.started || msg.author.id !== g.alive[g.turn]) return;
      const kata = msg.content.trim().toLowerCase();
      if (!/^[a-z]+$/.test(kata)) return; // obrolan biasa, abaikan
      const tolak = async (alasan) => {
        await msg.react('❌').catch(() => {});
        await msg.reply({ content: alasan, allowedMentions: { repliedUser: false } }).catch(() => {});
      };
      if (kata.length < 3) return tolak('Minimal 3 huruf.');
      if (kata[0] !== g.last.slice(-1)) return tolak(`Harus diawali huruf **${g.last.slice(-1).toUpperCase()}**.`);
      if (g.used.has(kata)) return tolak('Kata itu sudah dipakai.');
      g.used.add(kata);
      g.last = kata;
      g.turn = (g.turn + 1) % g.alive.length;
      await msg.react('✅').catch(() => {});
      skTurn(g);
    } catch (e) {
      console.error('[sambungkata]', e.message);
    }
  });

  // =========================================================
  // Tantangan (suit, tic-tac-toe, battle quiz)
  // =========================================================
  const games = new Map(); // messageId -> state
  async function tantang(msg, kind, judul, deskripsi) {
    if (!butuhRole(msg)) return;
    const lawan = msg.mentions.members.first();
    if (!lawan || lawan.user.bot || lawan.id === msg.author.id) {
      return balasEmbed(msg, errEmbed(`Mention lawan kamu, contoh: \`.${kind} @user\`. Nggak bisa lawan diri sendiri atau bot.`));
    }
    if (!hasMemberRole(lawan)) return balasEmbed(msg, errEmbed(`${lawan} belum punya role getrole, jadi belum bisa diajak main.`));
    const m = await msg.reply({
      content: `${lawan}`,
      embeds: [baseEmbed(judul, `${msg.author} menantang ${lawan}!\n${deskripsi}\n\n${lawan}, terima tantangan ini?`, 0xe67e22)],
      components: [row(btn(`g:ch:acc:${kind}`, 'Terima', Success, '✅'), btn(`g:ch:rej:${kind}`, 'Tolak', Danger, '✖️'))],
      allowedMentions: { users: [lawan.id], repliedUser: false },
    });
    games.set(m.id, { kind, a: msg.author.id, b: lawan.id, accepted: false, exp: Date.now() + 5 * 60000 });
    setTimeout(() => {
      const s = games.get(m.id);
      if (s && !s.accepted) {
        games.delete(m.id);
        m.edit({ embeds: [baseEmbed(judul, 'Tantangan kedaluwarsa (nggak ada jawaban).', 0x95a5a6)], components: [] }).catch(() => {});
      }
    }, 5 * 60000);
  }
  ctx.onButton('g:ch:', async (i) => {
    const [, , aksi, kind] = i.customId.split(':');
    const s = games.get(i.message.id);
    if (!s || s.accepted) return deny(i, 'Tantangan ini sudah nggak berlaku.');
    if (i.user.id !== s.b) return deny(i, 'Cuma yang ditantang yang bisa menjawab.');
    if (aksi === 'rej') {
      games.delete(i.message.id);
      return i.update({ content: '', embeds: [baseEmbed('Tantangan ditolak', `<@${s.b}> menolak tantangan.`, 0x95a5a6)], components: [] });
    }
    s.accepted = true;
    if (kind === 'suit') return suitMulai(i, s);
    if (kind === 'ttt') return tttMulai(i, s);
    if (kind === 'battle') return battleMulai(i, s);
  });

  // ---------------- 4. SUIT ----------------
  commands.suit = (msg) => tantang(msg, 'suit', '✊ Suit', 'Batu, gunting, kertas! Pemenang dapat **2.000 money**.');
  const SUIT = { batu: '✊', gunting: '✌️', kertas: '✋' };
  const MENANG_ATAS = { batu: 'gunting', gunting: 'kertas', kertas: 'batu' };
  const suitMulai = (i, s) => {
    s.picks = {};
    return i.update({
      content: '',
      embeds: [baseEmbed('✊ Suit', `<@${s.a}> vs <@${s.b}>\nPilih sekarang! Pilihan kalian disembunyiin sampai dua-duanya milih.`, 0xe67e22)],
      components: [row(...Object.entries(SUIT).map(([k, e]) => btn(`g:su:${k}`, k[0].toUpperCase() + k.slice(1), Primary, e)))],
    });
  };
  ctx.onButton('g:su:', async (i) => {
    const s = games.get(i.message.id);
    if (!s || s.kind !== 'suit' || !s.accepted) return deny(i, 'Game ini sudah selesai.');
    if (![s.a, s.b].includes(i.user.id)) return deny(i, 'Kamu bukan pemain di game ini.');
    if (s.picks[i.user.id]) return deny(i, 'Kamu sudah memilih, tunggu lawan.');
    const pilih = i.customId.split(':')[2];
    s.picks[i.user.id] = pilih;
    if (Object.keys(s.picks).length < 2) {
      return i.reply({ embeds: [baseEmbed('Pilihan tercatat', `Pilihanmu: ${SUIT[pilih]} **${pilih}**. Menunggu lawan...`, 0x3498db)], flags: EPHEMERAL });
    }
    games.delete(i.message.id);
    const pa = s.picks[s.a], pb = s.picks[s.b];
    let hasil, teks = `<@${s.a}> ${SUIT[pa]} vs ${SUIT[pb]} <@${s.b}>\n\n`;
    if (pa === pb) {
      hasil = 'Seri!';
      [s.a, s.b].forEach((p) => track(p, 'game'));
      teks += `**${hasil}** Nggak ada pemenang.`;
    } else {
      const [w, l] = MENANG_ATAS[pa] === pb ? [s.a, s.b] : [s.b, s.a];
      teks += `Pemenang: <@${w}>\n${hadiahPvp(w, l, 2000)}`;
    }
    return i.update({ content: '', embeds: [baseEmbed('✊ Suit selesai', teks, 0x2ecc71)], components: [] });
  });

  // ---------------- 5. TIC-TAC-TOE ----------------
  commands.ttt = (msg) => tantang(msg, 'ttt', '⭕ Tic-Tac-Toe', 'Satu lawan satu. Pemenang dapat **2.000 money**.');
  const TTT_LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  const tttMenang = (b) => TTT_LINES.find((l) => b[l[0]] && b[l[0]] === b[l[1]] && b[l[0]] === b[l[2]]);
  const tttKomponen = (b, selesai) =>
    [0, 1, 2].map((r) =>
      row(...[0, 1, 2].map((c) => {
        const k = r * 3 + c;
        const v = b[k];
        return btn(`g:tt:${k}`, '\u200b', v === 'x' ? Danger : v === 'o' ? Primary : Secondary, v === 'x' ? '❌' : v === 'o' ? '⭕' : null, selesai || !!v);
      })),
    );
  const tttMulai = (i, s) => {
    s.board = Array(9).fill(null);
    s.turn = 'x';
    return i.update({
      content: '',
      embeds: [baseEmbed('⭕ Tic-Tac-Toe', `❌ <@${s.a}> vs ⭕ <@${s.b}>\nGiliran: ❌ <@${s.a}>`, 0xe67e22)],
      components: tttKomponen(s.board, false),
    });
  };
  ctx.onButton('g:tt:', async (i) => {
    const s = games.get(i.message.id);
    if (!s || s.kind !== 'ttt' || !s.board) return deny(i, 'Game ini sudah selesai.');
    const giliran = s.turn === 'x' ? s.a : s.b;
    if (![s.a, s.b].includes(i.user.id)) return deny(i, 'Kamu bukan pemain di game ini.');
    if (i.user.id !== giliran) return deny(i, 'Bukan giliran kamu.');
    const k = Number(i.customId.split(':')[2]);
    if (s.board[k]) return deny(i, 'Kotak itu sudah terisi.');
    s.board[k] = s.turn;
    const garis = tttMenang(s.board);
    const penuh = s.board.every(Boolean);
    if (garis || penuh) {
      games.delete(i.message.id);
      let teks = `❌ <@${s.a}> vs ⭕ <@${s.b}>\n\n`;
      if (garis) {
        const w = giliran, l = giliran === s.a ? s.b : s.a;
        teks += `Pemenang: <@${w}>\n${hadiahPvp(w, l, 2000)}`;
      } else {
        [s.a, s.b].forEach((p) => track(p, 'game'));
        teks += '**Seri!** Nggak ada pemenang.';
      }
      return i.update({ embeds: [baseEmbed('⭕ Tic-Tac-Toe selesai', teks, 0x2ecc71)], components: tttKomponen(s.board, true) });
    }
    s.turn = s.turn === 'x' ? 'o' : 'x';
    const next = s.turn === 'x' ? `❌ <@${s.a}>` : `⭕ <@${s.b}>`;
    return i.update({ embeds: [baseEmbed('⭕ Tic-Tac-Toe', `❌ <@${s.a}> vs ⭕ <@${s.b}>\nGiliran: ${next}`, 0xe67e22)], components: tttKomponen(s.board, false) });
  });

  // ---------------- 10. BATTLE QUIZ ----------------
  commands.battle = (msg) => tantang(msg, 'battle', '⚔️ Battle quiz', 'Duel 5 soal cepat. Yang paling cepat jawab benar dapat poin ronde. Pemenang dapat **3.000 money**.');
  const BT_RONDE = 5;
  const BT_WAKTU = 15000;
  const battleMulai = async (i, s) => {
    s.qlist = shuffle(D.TRIVIA).slice(0, BT_RONDE);
    s.round = 0; s.skor = { [s.a]: 0, [s.b]: 0 };
    s.locked = new Set(); s.resolved = false; s.message = i.message;
    await i.update({ content: '', embeds: [baseEmbed('⚔️ Battle quiz', `<@${s.a}> vs <@${s.b}>\nBersiap... ronde pertama dimulai!`, 0xe67e22)], components: [] });
    setTimeout(() => btRonde(s), 2000);
  };
  async function btRonde(s) {
    if (s.round >= BT_RONDE) return btSelesai(s);
    const t = s.qlist[s.round];
    s.locked.clear(); s.resolved = false;
    await s.message.edit({
      embeds: [baseEmbed(`⚔️ Ronde ${s.round + 1}/${BT_RONDE}`, `**${t.q}**\n\nSkor: <@${s.a}> **${s.skor[s.a]}** - **${s.skor[s.b]}** <@${s.b}>\n-# Waktu ${BT_WAKTU / 1000} detik. Jawab salah = keluar dari ronde ini.`, 0xe67e22)],
      components: [row(...t.o.map((o, k) => btn(`g:bt:${k}`, String(o).slice(0, 80), Secondary)))],
    }).catch(() => {});
    clearTimeout(s.timer);
    s.timer = setTimeout(() => btAkhiriRonde(s, null), BT_WAKTU);
  }
  async function btAkhiriRonde(s, pemenang) {
    if (s.resolved) return;
    s.resolved = true;
    clearTimeout(s.timer);
    const t = s.qlist[s.round];
    if (pemenang) s.skor[pemenang] += 1;
    await s.message.edit({
      embeds: [baseEmbed(`⚔️ Ronde ${s.round + 1}/${BT_RONDE} selesai`, `**${t.q}**\nJawaban: **${t.o[t.a]}**\n${pemenang ? `Poin ronde: <@${pemenang}>` : 'Nggak ada yang benar.'}\n\nSkor: <@${s.a}> **${s.skor[s.a]}** - **${s.skor[s.b]}** <@${s.b}>`, 0x3498db)],
      components: [row(...t.o.map((o, k) => btn(`g:bt:${k}`, String(o).slice(0, 80), k === t.a ? Success : Secondary, null, true)))],
    }).catch(() => {});
    s.round += 1;
    setTimeout(() => btRonde(s), 2500);
  }
  async function btSelesai(s) {
    games.delete(s.message.id);
    const [a, b] = [s.skor[s.a], s.skor[s.b]];
    let teks = `<@${s.a}> **${a}** - **${b}** <@${s.b}>\n\n`;
    if (a === b) {
      [s.a, s.b].forEach((p) => track(p, 'game'));
      teks += '**Seri!** Nggak ada pemenang.';
    } else {
      const [w, l] = a > b ? [s.a, s.b] : [s.b, s.a];
      teks += `Pemenang: <@${w}>\n${hadiahPvp(w, l, 3000)}`;
    }
    await s.message.edit({ embeds: [baseEmbed('⚔️ Battle quiz selesai', teks, 0x2ecc71)], components: [] }).catch(() => {});
  }
  ctx.onButton('g:bt:', async (i) => {
    const s = games.get(i.message.id);
    if (!s || s.kind !== 'battle' || !s.message) return deny(i, 'Game ini sudah selesai.');
    if (![s.a, s.b].includes(i.user.id)) return deny(i, 'Kamu bukan pemain di game ini.');
    if (s.resolved) return deny(i, 'Ronde ini sudah selesai.');
    if (s.locked.has(i.user.id)) return deny(i, 'Kamu sudah salah di ronde ini.');
    const t = s.qlist[s.round];
    const k = Number(i.customId.split(':')[2]);
    if (k === t.a) {
      await i.deferUpdate();
      return btAkhiriRonde(s, i.user.id);
    }
    s.locked.add(i.user.id);
    if (s.locked.size === 2) {
      await i.deferUpdate();
      return btAkhiriRonde(s, null);
    }
    return i.reply({ embeds: [errEmbed('Salah! Kamu keluar dari ronde ini.')], flags: EPHEMERAL });
  });

  // =========================================================
  // 6. TEBAK LAGU (petunjuk bertahap, tanpa lirik)
  // =========================================================
  const tl = new Map();
  const norm = (t) => String(t).toLowerCase().replace(/[^a-z0-9]/g, '');
  const tlEmbed = (s, akhir = null) => {
    const l = s.lagu;
    const huruf = norm(l.judul).length;
    const petunjuk = [`🎼 Genre: **${l.genre}**`, `🎤 Artis: **${l.artis}**`, `🔤 Judul **${huruf} huruf** (tanpa spasi/tanda baca), diawali huruf **${norm(l.judul)[0].toUpperCase()}**`];
    const tampil = petunjuk.slice(0, s.hints).join('\n');
    const hadiah = 4000 - (s.hints - 1) * 1000;
    if (akhir) return baseEmbed(akhir.judul, `Judulnya: **${l.judul}** (${l.artis})\n${akhir.teks}`, akhir.warna);
    return baseEmbed('🎵 Tebak lagu', `${tampil}\n\nHadiah kalau benar sekarang: **${fmt(hadiah)} money**\nKesempatan menjawab tersisa: **${2 - s.tries}**\n-# Tiap petunjuk tambahan mengurangi hadiah 1.000.`, 0x1abc9c);
  };
  const tlTombol = (uid, s) => row(btn(`g:tl:hint:${uid}`, 'Petunjuk berikutnya', Secondary, '💡', s.hints >= 3), btn(`g:tl:ans:${uid}`, 'Jawab', Primary, '🎵'));
  commands.tebaklagu = async (msg) => {
    if (!butuhRole(msg)) return;
    const s = { uid: msg.author.id, lagu: pick(D.LAGU), hints: 1, tries: 0, exp: Date.now() + 5 * 60000 };
    const m = await balas(msg, { embeds: [tlEmbed(s)], components: [tlTombol(s.uid, s)] });
    tl.set(m.id, s);
  };
  ctx.onButton('g:tl:', async (i) => {
    const [, , aksi, uid] = i.customId.split(':');
    if (i.user.id !== uid) return deny(i, 'Ini bukan game kamu. Ketik `.tebaklagu` buat main sendiri.');
    const s = tl.get(i.message.id);
    if (!s || Date.now() > s.exp) return i.update({ embeds: [baseEmbed('⌛ Kedaluwarsa', 'Game ini sudah kedaluwarsa. Ketik `.tebaklagu` lagi.', 0x95a5a6)], components: [] });
    if (aksi === 'hint') {
      s.hints = Math.min(3, s.hints + 1);
      return i.update({ embeds: [tlEmbed(s)], components: [tlTombol(uid, s)] });
    }
    const modal = new ModalBuilder()
      .setCustomId(`g:tlm:${i.message.id}`)
      .setTitle('Tebak lagu')
      .addComponents(row(new TextInputBuilder().setCustomId('judul').setLabel('Judul lagu').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(60)));
    return i.showModal(modal);
  });
  ctx.onModal('g:tlm:', async (i) => {
    const mid = i.customId.split(':')[2];
    const s = tl.get(mid);
    if (!s || i.user.id !== s.uid || Date.now() > s.exp) return deny(i, 'Game ini sudah kedaluwarsa.');
    const benar = norm(i.fields.getTextInputValue('judul')) === norm(s.lagu.judul);
    s.tries += 1;
    if (benar) {
      tl.delete(mid);
      track(s.uid, 'game'); track(s.uid, 'tebaklagu');
      const r = uang(giveGameMoney(s.uid, 4000 - (s.hints - 1) * 1000));
      return respond(i, { embeds: [tlEmbed(s, { judul: '✅ Benar!', teks: r, warna: 0x2ecc71 })], components: [] });
    }
    if (s.tries >= 2) {
      tl.delete(mid);
      track(s.uid, 'game'); track(s.uid, 'tebaklagu');
      return respond(i, { embeds: [tlEmbed(s, { judul: '❌ Kesempatan habis', teks: '💵 +0 money', warna: 0xe74c3c })], components: [] });
    }
    return respond(i, { embeds: [tlEmbed(s)], components: [tlTombol(s.uid, s)] });
  });

  // =========================================================
  // 7. LUCKY SPIN (1x per hari)
  // =========================================================
  const SPIN = [[1000, 30], [2000, 25], [3000, 18], [5000, 14], [7000, 8], [10000, 5]];
  function putarSpin() {
    let r = crypto.randomInt(100);
    for (const [hadiah, w] of SPIN) {
      if (r < w) return hadiah;
      r -= w;
    }
    return SPIN[0][0];
  }
  commands.spin = async (msg) => {
    if (!butuhRole(msg)) return;
    if (st.insSpin.run(msg.author.id, wibNow().day).changes === 0) {
      return balasEmbed(msg, errEmbed('Kamu sudah putar lucky spin hari ini. Coba lagi besok!'));
    }
    const hadiah = putarSpin();
    const m = await balas(msg, { embeds: [baseEmbed('🎰 Lucky spin', 'Memutar...\n🎰 ❔ ❔ ❔', 0x95a5a6)] });
    await sleep(1500);
    const r = giveGameMoney(msg.author.id, hadiah);
    track(msg.author.id, 'spin'); track(msg.author.id, 'game');
    await m.edit({ embeds: [baseEmbed('🎰 Lucky spin', `Kamu dapat **${fmt(hadiah)} money**!\n${uang(r)}\n-# 1x per hari.`, 0xf1c40f)] }).catch(() => {});
  };

  // =========================================================
  // 8. RAMADHAN BINGO (kartu misi harian)
  // =========================================================
  const GARIS = TTT_LINES;
  function kartuBingo(uid, day) {
    const rnd = mulberry32(hashStr(uid + day));
    return shuffle(Object.keys(D.MISI), (n) => Math.floor(rnd() * n)).slice(0, 9);
  }
  function statusBingo(uid) {
    const kartu = kartuBingo(uid, wibNow().day);
    const done = kartu.map((k) => didToday(uid, k));
    return { kartu, done, garis: GARIS.filter((l) => l.every((x) => done[x])).length, penuh: done.every(Boolean) };
  }
  commands.bingo = async (msg) => {
    if (!butuhRole(msg)) return;
    const s = statusBingo(msg.author.id);
    const grid = [0, 1, 2].map((r) => [0, 1, 2].map((c) => (s.done[r * 3 + c] ? '✅' : '⬜')).join('')).join('\n');
    const daftar = s.kartu.map((k, n) => `${s.done[n] ? '✅' : '⬜'} **${n + 1}.** ${D.MISI[k]}`).join('\n');
    return balas(msg, {
      embeds: [baseEmbed('🎯 Ramadhan bingo', `${grid}\n\n${daftar}\n\nGaris selesai: **${s.garis}** · Kartu penuh: **${s.penuh ? 'ya' : 'belum'}**\n-# 1 garis = 5.000 money, kartu penuh = 15.000 money. Kartu ganti tiap hari. Misi tercatat otomatis.`, 0x9b59b6)],
      components: [row(btn(`g:bg:claim:${msg.author.id}`, 'Klaim hadiah', Success, '🎁'))],
    });
  };
  ctx.onButton('g:bg:', async (i) => {
    const uid = i.customId.split(':')[3];
    if (i.user.id !== uid) return deny(i, 'Ini kartu bingo orang lain. Ketik `.bingo` buat kartu kamu.');
    const day = wibNow().day;
    const s = statusBingo(uid);
    const hasil = [];
    if (s.garis >= 1 && !st.getClaim.get(uid, day, 'garis')) {
      st.insClaim.run(uid, day, 'garis');
      hasil.push(`Garis: ${uang(giveGameMoney(uid, 5000))}`);
    }
    if (s.penuh && !st.getClaim.get(uid, day, 'penuh')) {
      st.insClaim.run(uid, day, 'penuh');
      hasil.push(`Kartu penuh: ${uang(giveGameMoney(uid, 15000))}`);
    }
    if (!hasil.length) return i.reply({ embeds: [baseEmbed('🎁 Klaim hadiah', 'Belum ada hadiah baru. Selesaikan satu garis (3 misi sejajar) atau seluruh kartu dulu.', 0x95a5a6)], flags: EPHEMERAL });
    return i.reply({ embeds: [baseEmbed('🎁 Hadiah diklaim', hasil.join('\n'), 0x2ecc71)], flags: EPHEMERAL });
  });

  // =========================================================
  // 9. DAILY TRIVIA (3x per hari) + leaderboard
  // =========================================================
  const tvDijawab = new Set();
  const TRIVIA_PER_HARI = 3;
  commands.trivia = async (msg) => {
    if (!butuhRole(msg)) return;
    const day = wibNow().day;
    const n = st.getTv.get(msg.author.id, day)?.n ?? 0;
    if (n >= TRIVIA_PER_HARI) return balasEmbed(msg, errEmbed(`Jatah trivia hari ini habis (${TRIVIA_PER_HARI}x). Coba lagi besok!`));
    st.incTv.run(msg.author.id, day);
    const idx = crypto.randomInt(D.TRIVIA.length);
    const t = D.TRIVIA[idx];
    return balas(msg, {
      embeds: [baseEmbed(`🧠 Daily trivia (${n + 1}/${TRIVIA_PER_HARI})`, `**${t.q}**\n\nBenar = **2.000 money**`, 0x1abc9c)],
      components: [row(...t.o.map((o, k) => btn(`g:tv:${msg.author.id}:${idx}:${k}`, String(o).slice(0, 80), Secondary)))],
    });
  };
  ctx.onButton('g:tv:', async (i) => {
    const [, , uid, idxS, kS] = i.customId.split(':');
    if (i.user.id !== uid) return deny(i, 'Ini soal orang lain. Ketik `.trivia` buat soal kamu.');
    if (tvDijawab.has(i.message.id)) return deny(i, 'Soal ini sudah dijawab.');
    tvDijawab.add(i.message.id);
    const t = D.TRIVIA[Number(idxS)];
    const benar = Number(kS) === t.a;
    track(uid, 'game');
    let hadiah = '💵 +0 money';
    if (benar) {
      st.incTvStat.run(uid);
      track(uid, 'trivia');
      hadiah = uang(giveGameMoney(uid, 2000));
    }
    return i.update({
      embeds: [baseEmbed(benar ? '✅ Benar!' : '❌ Salah', `**${t.q}**\nJawaban: **${t.o[t.a]}**\n\n${hadiah}`, benar ? 0x2ecc71 : 0xe74c3c)],
      components: [row(...t.o.map((o, k) => btn(`g:tv:x:${k}`, String(o).slice(0, 80), k === t.a ? Success : k === Number(kS) ? Danger : Secondary, null, true)))],
    });
  });
  commands.triviatop = async (msg) => {
    const rows = st.topTv.all();
    const lines = rows.map((r, n) => `${['🥇', '🥈', '🥉'][n] || `**${n + 1}.**`} <@${r.user_id}> — **${r.correct}** benar`);
    return balasEmbed(msg, baseEmbed('🏆 Leaderboard trivia', lines.length ? lines.join('\n') : 'Belum ada yang menjawab benar. Mulai pakai `.trivia`!', 0xf1c40f));
  };

  // =========================================================
  // 11. EVENT KILAT (bot buka game mendadak 3x per hari)
  // =========================================================
  commands.setupevent = async (msg) => {
    const ch = msg.mentions.channels.first() || msg.channel;
    if (!ch?.isTextBased()) return balasEmbed(msg, errEmbed('Channel tidak valid.'));
    setCfg('event_channel', ch.id);
    return balasEmbed(msg, ctx.okEmbed(`Event kilat akan muncul sekitar 3x per hari (09:00 - 21:00 WIB) di ${ch}.`));
  };
  adminCommands.add('setupevent');

  const events = new Map(); // messageId -> state
  function soalKilat() {
    if (crypto.randomInt(2)) {
      const t = pick(D.TRIVIA);
      return { judul: '⚡ Event kilat: Trivia!', q: t.q, o: t.o, a: t.a };
    }
    const op = pick(['+', '-', 'x']);
    let a = 10 + crypto.randomInt(40), b = 3 + crypto.randomInt(15), jawab;
    if (op === 'x') { a = 3 + crypto.randomInt(13); b = 3 + crypto.randomInt(10); jawab = a * b; }
    else if (op === '+') jawab = a + b;
    else { a = b + 3 + crypto.randomInt(40); jawab = a - b; } // selalu positif
    const salah = new Set();
    while (salah.size < 3) {
      const v = jawab + (crypto.randomInt(2) ? 1 : -1) * (1 + crypto.randomInt(10));
      if (v !== jawab && v >= 0) salah.add(v);
    }
    const o = shuffle([jawab, ...salah]).map(String);
    return { judul: '⚡ Event kilat: Hitung cepat!', q: `Berapa hasil **${a} ${op} ${b}**?`, o, a: o.indexOf(String(jawab)) };
  }
  async function jalankanEvent(chId) {
    const soal = soalKilat();
    const msg = await sendTo(chId, {
      embeds: [baseEmbed(soal.judul, `${soal.q}\n\nYang pertama menjawab benar dapat **5.000 money**!\n-# Waktu 5 menit. Satu kesempatan per orang.`, 0xf1c40f)],
      components: [row(...soal.o.map((o, k) => btn(`g:ev:${k}`, String(o).slice(0, 80), Secondary)))],
    });
    if (msg) events.set(msg.id, { ...soal, winner: null, tried: new Set(), exp: Date.now() + 5 * 60000, message: msg });
  }
  ctx.onButton('g:ev:', async (i) => {
    const e = events.get(i.message.id);
    if (!e) return deny(i, 'Event ini sudah berakhir.');
    if (e.winner) return deny(i, 'Sudah ada pemenang.');
    if (!butuhRoleI(i)) return;
    if (e.tried.has(i.user.id)) return deny(i, 'Kamu sudah menjawab di event ini.');
    e.tried.add(i.user.id);
    const k = Number(i.customId.split(':')[2]);
    if (k !== e.a) return i.reply({ embeds: [errEmbed('Salah! Kamu nggak bisa jawab lagi di event ini.')], flags: EPHEMERAL });
    e.winner = i.user.id;
    track(i.user.id, 'game');
    const r = uang(giveGameMoney(i.user.id, 5000));
    return i.update({
      embeds: [baseEmbed(`${e.judul} (selesai)`, `${e.q}\nJawaban: **${e.o[e.a]}**\n\n🏆 Pemenang: ${i.user}\n${r}`, 0x2ecc71)],
      components: [row(...e.o.map((o, n) => btn(`g:ev:${n}`, String(o).slice(0, 80), n === e.a ? Success : Secondary, null, true)))],
    });
  });
  function rencanaEvent(day) {
    const raw = getCfg('event_plan');
    let plan = raw ? JSON.parse(raw) : null;
    if (!plan || plan.day !== day) {
      const waktu = [];
      for (let t = 0; waktu.length < 3 && t < 200; t++) {
        const m = 540 + crypto.randomInt(721); // 09:00 - 21:00
        if (waktu.every((x) => Math.abs(x - m) >= 60)) waktu.push(m);
      }
      plan = { day, times: waktu.sort((a, b) => a - b), fired: [] };
      setCfg('event_plan', JSON.stringify(plan));
    }
    return plan;
  }
  ctx.onTick(async () => {
    // tutup event yang kadaluarsa
    for (const [id, e] of events) {
      if (Date.now() > e.exp || e.winner) {
        if (!e.winner) {
          await e.message.edit({
            embeds: [baseEmbed(`${e.judul} (waktu habis)`, `${e.q}\nJawaban: **${e.o[e.a]}**\nNggak ada yang menang kali ini.`, 0x95a5a6)],
            components: [],
          }).catch(() => {});
        }
        events.delete(id);
      }
    }
    const chId = getCfg('event_channel');
    if (!chId) return;
    const now = wibNow();
    const plan = rencanaEvent(now.day);
    for (let k = 0; k < plan.times.length; k++) {
      if (plan.fired.includes(k) || now.min < plan.times[k]) continue;
      plan.fired.push(k);
      setCfg('event_plan', JSON.stringify(plan));
      if (now.min - plan.times[k] <= 20) await jalankanEvent(chId); // kalau telat >20 menit (bot mati), dilewati
    }
  });

  // dipakai untuk tes
  return {
    giveGameMoney, wordleFeedback, kataWordle, kartuBingo, putarSpin, tttMenang, soalKilat, rencanaEvent, parseUang, SPIN,
    _games: games, _sk: sk, _events: events, _tl: tl, _tebakHarga: tebakHarga,
  };
};
