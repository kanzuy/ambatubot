// ============================================================
//  Sistem XP & level - Reduygenk-KantDev
//  XP dari chat (5 XP, jeda 60 detik, maks 150/hari) dan dari
//  aktivitas bot (money dibagi 1.000). Naik level = hadiah money.
// ============================================================
const { Events, AttachmentBuilder, EmbedBuilder } = require('discord.js');

module.exports = function xp(ctx) {
  const { client, db, baseEmbed, okEmbed, errEmbed, isAdmin, wibNow, fmt, addMoney, getCfg, setCfg, sendTo, balasEmbed, commands, adminCommands } = ctx;

  const XP_CHAT = 5;
  const CHAT_COOLDOWN = 60 * 1000;
  const CHAT_CAP_HARIAN = 150;
  const HADIAH_MAKS = 20000;

  db.exec(`
    CREATE TABLE IF NOT EXISTS xp (user_id TEXT PRIMARY KEY, xp INTEGER NOT NULL DEFAULT 0, level INTEGER NOT NULL DEFAULT 1);
    CREATE TABLE IF NOT EXISTS xp_chat (user_id TEXT, day TEXT, total INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (user_id, day));
  `);
  const st = {
    get: db.prepare('SELECT xp, level FROM xp WHERE user_id = ?'),
    set: db.prepare('INSERT INTO xp(user_id, xp, level) VALUES(?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET xp = excluded.xp, level = excluded.level'),
    rank: db.prepare('SELECT COUNT(*) AS c FROM xp WHERE xp > ?'),
    top: db.prepare('SELECT user_id, xp, level FROM xp ORDER BY xp DESC LIMIT 100'),
    getChat: db.prepare('SELECT total FROM xp_chat WHERE user_id = ? AND day = ?'),
    setChat: db.prepare('INSERT INTO xp_chat(user_id, day, total) VALUES(?, ?, ?) ON CONFLICT(user_id, day) DO UPDATE SET total = excluded.total'),
  };

  // XP kumulatif yang dibutuhkan untuk mencapai level L. Level 1->2 = 100, 2->3 = 150, 3->4 = 200, dst.
  const perluXp = (L) => 25 * (L - 1) * (L + 2);
  const levelDari = (x) => {
    let L = 1;
    while (perluXp(L + 1) <= x) L++;
    return L;
  };
  const hadiahLevel = (L) => Math.min(L * 1000, HADIAH_MAKS);

  async function umumkan(uid, level, reward, total) {
    const chId = getCfg('level_channel');
    if (!chId) return;
    const prof = await ctx.profil(uid);
    let payload = null;
    if (ctx.gambar) {
      try {
        const buf = await ctx.gambar.renderLevel({ nama: prof.nama, avatarUrl: prof.avatarUrl, level, reward, xp: total, perluXp: perluXp(level + 1) });
        payload = {
          content: `<@${uid}>`,
          embeds: [new EmbedBuilder().setColor(ctx.COLOR).setImage('attachment://level.png').setFooter({ text: ctx.WATERMARK })],
          files: [new AttachmentBuilder(buf, { name: 'level.png' })],
          allowedMentions: { parse: [] },
        };
      } catch (e) {
        console.error('[xp] gagal bikin gambar level:', e.message);
      }
    }
    if (!payload) {
      payload = {
        embeds: [baseEmbed('⬆️ Naik level!', `<@${uid}> naik ke **level ${level}**!\n💵 Hadiah: **+${fmt(reward)} money**`, 0xf1c40f)],
        allowedMentions: { parse: [] },
      };
    }
    await sendTo(chId, payload);
  }

  // Tambah XP. Dipanggil tanpa await oleh modul lain.
  async function addXp(uid, n) {
    try {
      n = Math.floor(n);
      if (!(n > 0)) return null;
      const now = st.get.get(uid) || { xp: 0, level: 1 };
      const total = now.xp + n;
      const baru = levelDari(total);
      st.set.run(uid, total, baru);
      if (baru <= now.level) return { total, level: baru, naik: false };
      let reward = 0;
      for (let L = now.level + 1; L <= baru; L++) reward += hadiahLevel(L);
      addMoney(uid, reward); // hadiah level tidak menambah XP lagi
      await umumkan(uid, baru, reward, total);
      return { total, level: baru, naik: true, reward };
    } catch (e) {
      console.error('[xp]', e.message);
      return null;
    }
  }

  // XP dari chat
  const terakhir = new Map();
  client.on(Events.MessageCreate, async (msg) => {
    try {
      if (msg.author.bot || !msg.guild || msg.content.startsWith('.')) return;
      const t = Date.now();
      if (t - (terakhir.get(msg.author.id) || 0) < CHAT_COOLDOWN) return;
      const day = wibNow().day;
      const sudah = st.getChat.get(msg.author.id, day)?.total ?? 0;
      if (sudah >= CHAT_CAP_HARIAN) return;
      terakhir.set(msg.author.id, t);
      const dapat = Math.min(XP_CHAT, CHAT_CAP_HARIAN - sudah);
      st.setChat.run(msg.author.id, day, sudah + dapat);
      await addXp(msg.author.id, dapat);
    } catch (e) {
      console.error('[xp chat]', e.message);
    }
  });

  const bar = (f) => {
    const n = Math.max(0, Math.min(10, Math.round(f * 10)));
    return '▰'.repeat(n) + '▱'.repeat(10 - n);
  };

  commands.xp = async (msg) => {
    const d = st.get.get(msg.author.id) || { xp: 0, level: 1 };
    const awal = perluXp(d.level), akhir = perluXp(d.level + 1);
    const maju = (d.xp - awal) / (akhir - awal);
    const peringkat = st.rank.get(d.xp).c + 1;
    return balasEmbed(
      msg,
      baseEmbed('⭐ XP kamu', `${msg.author}\n**Level ${d.level}**\nXP: **${fmt(d.xp)}** / ${fmt(akhir)}\n${bar(maju)} **${Math.round(maju * 100)}%**\nPeringkat: **#${peringkat}**\n-# Naik level dapat money (level baru x 1.000, maksimal 20.000).`, 0xf1c40f),
    );
  };

  commands.xptop = async (msg) => {
    const rows = st.top.all();
    const members = rows.length ? await msg.guild.members.fetch({ user: rows.map((r) => r.user_id) }).catch(() => null) : null;
    const lines = [];
    for (const r of rows) {
      const m = members?.get(r.user_id);
      if (!m || isAdmin(m)) continue; // pemegang role admin nggak ikut
      const medal = ['🥇', '🥈', '🥉'][lines.length] || `**${lines.length + 1}.**`;
      lines.push(`${medal} <@${r.user_id}> — Level **${r.level}** · ${fmt(r.xp)} XP`);
      if (lines.length === 10) break;
    }
    return balasEmbed(msg, baseEmbed('🏆 Leaderboard XP', lines.length ? lines.join('\n') : 'Belum ada yang punya XP.', 0xf1c40f));
  };

  commands.setuplevel = async (msg) => {
    const ch = msg.mentions.channels.first() || msg.channel;
    if (!ch?.isTextBased()) return balasEmbed(msg, errEmbed('Channel tidak valid.'));
    setCfg('level_channel', ch.id);
    return balasEmbed(msg, okEmbed(`Pengumuman naik level akan dikirim ke ${ch}.`));
  };
  adminCommands.add('setuplevel');

  return { addXp, perluXp, levelDari, hadiahLevel };
};
