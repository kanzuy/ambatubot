// ============================================================
//  11 fitur ibadah & kebaikan (slash command) - Reduygenk-KantDev
//  PENTING: konten agama (doa, hadis, ayat, niat) di konten.js
//  sebaiknya dicek oleh guru/ustadz sebelum dipakai.
// ============================================================
const {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require('discord.js');
const K = require('./konten');

module.exports = function ibadah(ctx) {
  const { db, baseEmbed, okEmbed, errEmbed, EPHEMERAL, isAdmin, hasMemberRole, wibNow, tglIndo, fmt, addMoney, track } = ctx;

  const REWARD = { kebaikan: 2000, tilawah: 3000, muhasabah: 2000, amal: 5000 };

  db.exec(`
    CREATE TABLE IF NOT EXISTS kebaikan (user_id TEXT, day TEXT, teks TEXT, PRIMARY KEY (user_id, day));
    CREATE TABLE IF NOT EXISTS tilawah (user_id TEXT, day TEXT, pages INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (user_id, day));
    CREATE TABLE IF NOT EXISTS muhasabah (user_id TEXT, day TEXT, baik TEXT, perbaiki TEXT, PRIMARY KEY (user_id, day));
    CREATE TABLE IF NOT EXISTS kultum (id INTEGER PRIMARY KEY AUTOINCREMENT, tanggal TEXT NOT NULL, jam TEXT NOT NULL, penceramah TEXT NOT NULL, tema TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS amal (id INTEGER PRIMARY KEY AUTOINCREMENT, judul TEXT NOT NULL, deskripsi TEXT NOT NULL, aktif INTEGER NOT NULL DEFAULT 1);
    CREATE TABLE IF NOT EXISTS amal_done (user_id TEXT, amal_id INTEGER, ts INTEGER, PRIMARY KEY (user_id, amal_id));
  `);
  const st = {
    getKebaikan: db.prepare('SELECT 1 FROM kebaikan WHERE user_id = ? AND day = ?'),
    insKebaikan: db.prepare('INSERT OR IGNORE INTO kebaikan(user_id, day, teks) VALUES(?, ?, ?)'),
    getTil: db.prepare('SELECT pages FROM tilawah WHERE user_id = ? AND day = ?'),
    setTil: db.prepare('INSERT INTO tilawah(user_id, day, pages) VALUES(?, ?, ?) ON CONFLICT(user_id, day) DO UPDATE SET pages = excluded.pages'),
    sumTil: db.prepare('SELECT COALESCE(SUM(pages), 0) AS total FROM tilawah WHERE user_id = ?'),
    insMuh: db.prepare('INSERT OR IGNORE INTO muhasabah(user_id, day, baik, perbaiki) VALUES(?, ?, ?, ?)'),
    getMuh: db.prepare('SELECT 1 FROM muhasabah WHERE user_id = ? AND day = ?'),
    insKultum: db.prepare('INSERT INTO kultum(tanggal, jam, penceramah, tema) VALUES(?, ?, ?, ?)'),
    listKultum: db.prepare('SELECT id, tanggal, jam, penceramah, tema FROM kultum WHERE tanggal >= ? ORDER BY tanggal, jam LIMIT 10'),
    delKultum: db.prepare('DELETE FROM kultum WHERE id = ?'),
    insAmal: db.prepare('INSERT INTO amal(judul, deskripsi) VALUES(?, ?)'),
    listAmal: db.prepare('SELECT a.id, a.judul, a.deskripsi, (SELECT COUNT(*) FROM amal_done d WHERE d.amal_id = a.id) AS n FROM amal a WHERE a.aktif = 1 ORDER BY a.id'),
    getAmal: db.prepare('SELECT id, judul FROM amal WHERE id = ? AND aktif = 1'),
    offAmal: db.prepare('UPDATE amal SET aktif = 0 WHERE id = ?'),
    insDone: db.prepare('INSERT OR IGNORE INTO amal_done(user_id, amal_id, ts) VALUES(?, ?, ?)'),
    amalCount: db.prepare('SELECT COUNT(*) AS c FROM amal WHERE aktif = 1'),
    doneTotal: db.prepare('SELECT COUNT(*) AS c, COUNT(DISTINCT d.user_id) AS u FROM amal_done d JOIN amal a ON a.id = d.amal_id WHERE a.aktif = 1'),
    topAmal: db.prepare('SELECT d.user_id, COUNT(*) AS c FROM amal_done d JOIN amal a ON a.id = d.amal_id WHERE a.aktif = 1 GROUP BY d.user_id ORDER BY c DESC LIMIT 5'),
    myAmal: db.prepare('SELECT COUNT(*) AS c FROM amal_done d JOIN amal a ON a.id = d.amal_id WHERE a.aktif = 1 AND d.user_id = ?'),
  };

  const ephemeral = (embed) => ({ embeds: [embed], flags: EPHEMERAL });
  const butuhRole = (i) => {
    if (hasMemberRole(i.member)) return true;
    i.reply(ephemeral(errEmbed('Kamu harus punya role dulu. Ambil lewat tombol **getrole**.')));
    return false;
  };
  const butuhAdmin = (i) => {
    if (isAdmin(i.member)) return true;
    i.reply(ephemeral(errEmbed('Cuma admin yang bisa pakai perintah ini.')));
    return false;
  };
  const input = (id, label, style, required, max, placeholder) =>
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId(id).setLabel(label).setStyle(style).setRequired(required).setMaxLength(max).setPlaceholder(placeholder || ''),
    );

  // ------------------------------------------------------------
  // 1. /kebaikan
  // ------------------------------------------------------------
  ctx.onSlash('kebaikan', new SlashCommandBuilder().setName('kebaikan').setDescription('Laporkan kebaikan yang kamu lakukan hari ini'), async (i) => {
    if (!butuhRole(i)) return;
    if (st.getKebaikan.get(i.user.id, wibNow().day)) {
      return i.reply(ephemeral(okEmbed('Kamu sudah melapor kebaikan hari ini. Terima kasih!')));
    }
    return i.showModal(
      new ModalBuilder()
        .setCustomId('ib:kebaikan')
        .setTitle('Kebaikan hari ini')
        .addComponents(input('teks', 'Kebaikan apa yang kamu lakukan?', TextInputStyle.Paragraph, true, 300, 'Contoh: membantu ibu menyiapkan takjil')),
    );
  });
  ctx.onModal('ib:kebaikan', async (i) => {
    const teks = i.fields.getTextInputValue('teks').trim();
    if (st.insKebaikan.run(i.user.id, wibNow().day, teks).changes === 0) {
      return i.reply(ephemeral(okEmbed('Kamu sudah melapor kebaikan hari ini.')));
    }
    addMoney(i.user.id, REWARD.kebaikan);
    track(i.user.id, 'kebaikan');
    return i.reply(ephemeral(baseEmbed('🤍 Kebaikan tercatat', `"${teks}"\n\n💵 **+${fmt(REWARD.kebaikan)} money**\nSemoga berkah dan dibalas kebaikan.`, 0x2ecc71)));
  });

  // ------------------------------------------------------------
  // 2. /tilawah
  // ------------------------------------------------------------
  const bar = (frac) => {
    const n = Math.max(0, Math.min(10, Math.round(frac * 10)));
    return '▰'.repeat(n) + '▱'.repeat(10 - n);
  };
  ctx.onSlash(
    'tilawah',
    new SlashCommandBuilder()
      .setName('tilawah')
      .setDescription("Catat progres membaca Al-Qur'an")
      .addIntegerOption((o) => o.setName('halaman').setDescription('Jumlah halaman yang kamu baca (mushaf 604 halaman)').setRequired(true).setMinValue(1).setMaxValue(604)),
    async (i) => {
      if (!butuhRole(i)) return;
      const day = wibNow().day;
      const tambah = i.options.getInteger('halaman');
      const sebelum = st.getTil.get(i.user.id, day);
      const hariIni = Math.min(604, (sebelum?.pages ?? 0) + tambah);
      st.setTil.run(i.user.id, day, hariIni);
      track(i.user.id, 'tilawah');
      let hadiah = 'Hadiah harian sudah kamu ambil, progres tetap tercatat.';
      if (!sebelum) {
        addMoney(i.user.id, REWARD.tilawah);
        hadiah = `💵 **+${fmt(REWARD.tilawah)} money** (hadiah harian)`;
      }
      const total = st.sumTil.get(i.user.id).total;
      const khatam = Math.floor(total / 604);
      const sisa = total % 604;
      return i.reply(
        ephemeral(
          baseEmbed(
            "📖 Tilawah tercatat",
            `Hari ini: **${hariIni} halaman**\nTotal: **${fmt(total)} halaman** (± ${(total / 20).toFixed(1)} juz)\n\nKhatam ke-${khatam + 1}: ${bar(sisa / 604)} **${Math.round((sisa / 604) * 100)}%**\nKhatam selesai: **${khatam}x**\n\n${hadiah}`,
            0x2ecc71,
          ),
        ),
      );
    },
  );

  // ------------------------------------------------------------
  // 3. /doa  4. /doaharian
  // ------------------------------------------------------------
  const doaEmbed = (d, judulAwal = '🤲') =>
    baseEmbed(`${judulAwal} ${d.nama}`, `## ${d.arab}\n\n*${d.latin}*\n\n**Artinya:** ${d.arti}\n\n-# Sumber: ${d.sumber}`, 0x16a085);
  const doaMenu = () =>
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('ib:doa')
        .setPlaceholder('Pilih doa')
        .addOptions(K.DOA.map((d, idx) => ({ label: d.nama.slice(0, 100), value: String(idx) }))),
    );
  ctx.onSlash('doa', new SlashCommandBuilder().setName('doa').setDescription('Tampilkan kumpulan doa'), async (i) => {
    return i.reply({ embeds: [baseEmbed('🤲 Kumpulan doa', 'Pilih doa dari menu di bawah.', 0x16a085)], components: [doaMenu()] });
  });
  ctx.onSelect('ib:doa', async (i) => {
    const d = K.DOA[Number(i.values[0])];
    if (!d) return i.reply(ephemeral(errEmbed('Doa nggak ditemukan.')));
    track(i.user.id, 'doa');
    return i.update({ embeds: [doaEmbed(d)], components: [doaMenu()] });
  });
  const hariKe = (day) => {
    const [y, m, d] = day.split('-').map(Number);
    return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
  };
  ctx.onSlash('doaharian', new SlashCommandBuilder().setName('doaharian').setDescription('Doa pilihan hari ini'), async (i) => {
    const d = K.DOA[hariKe(wibNow().day) % K.DOA.length];
    track(i.user.id, 'doa');
    return i.reply({ embeds: [doaEmbed(d, '🌙 Doa hari ini:')] });
  });

  // ------------------------------------------------------------
  // 5. /hadits  6. /ayat
  // ------------------------------------------------------------
  ctx.onSlash('hadits', new SlashCommandBuilder().setName('hadits').setDescription('Tampilkan hadis beserta sumbernya'), async (i) => {
    const h = K.HADITS[Math.floor(Math.random() * K.HADITS.length)];
    track(i.user.id, 'hadits');
    return i.reply({ embeds: [baseEmbed('📜 Hadis', `"${h.teks}"\n\n**${h.sumber}**\n-# Terjemahan ringkas, bukan lafaz asli.`, 0x8e44ad)] });
  });
  ctx.onSlash(
    'ayat',
    new SlashCommandBuilder()
      .setName('ayat')
      .setDescription("Tampilkan ayat Al-Qur'an beserta referensinya")
      .addStringOption((o) =>
        o.setName('pilih').setDescription('Pilih ayat (kosongkan buat acak)').addChoices(...K.AYAT.map((a, idx) => ({ name: a.ref, value: String(idx) }))),
      ),
    async (i) => {
      const pilih = i.options.getString('pilih');
      const a = pilih !== null ? K.AYAT[Number(pilih)] : K.AYAT[Math.floor(Math.random() * K.AYAT.length)];
      track(i.user.id, 'ayat');
      return i.reply({ embeds: [baseEmbed(`📖 ${a.ref}`, `## ${a.arab}\n\n**Artinya:** ${a.arti}\n\n-# Terjemahan ringkas.`, 0x2980b9)] });
    },
  );

  // ------------------------------------------------------------
  // 7. /muhasabah (jurnal privat)
  // ------------------------------------------------------------
  ctx.onSlash('muhasabah', new SlashCommandBuilder().setName('muhasabah').setDescription('Jurnal refleksi harian (privat)'), async (i) => {
    if (!butuhRole(i)) return;
    if (st.getMuh.get(i.user.id, wibNow().day)) return i.reply(ephemeral(okEmbed('Kamu sudah mengisi muhasabah hari ini.')));
    return i.showModal(
      new ModalBuilder()
        .setCustomId('ib:muhasabah')
        .setTitle('Muhasabah harian')
        .addComponents(
          input('baik', 'Hal baik yang kamu syukuri hari ini', TextInputStyle.Paragraph, true, 400),
          input('perbaiki', 'Yang mau diperbaiki besok', TextInputStyle.Paragraph, true, 400),
        ),
    );
  });
  ctx.onModal('ib:muhasabah', async (i) => {
    const baik = i.fields.getTextInputValue('baik').trim();
    const perbaiki = i.fields.getTextInputValue('perbaiki').trim();
    if (st.insMuh.run(i.user.id, wibNow().day, baik, perbaiki).changes === 0) return i.reply(ephemeral(okEmbed('Kamu sudah mengisi muhasabah hari ini.')));
    addMoney(i.user.id, REWARD.muhasabah);
    track(i.user.id, 'muhasabah');
    return i.reply(ephemeral(baseEmbed('🌙 Muhasabah tersimpan', `**Disyukuri:** ${baik}\n\n**Diperbaiki besok:** ${perbaiki}\n\n💵 **+${fmt(REWARD.muhasabah)} money**\n-# Jurnal ini cuma kamu yang lihat.`, 0x2ecc71)));
  });

  // ------------------------------------------------------------
  // 8. /niatpuasa
  // ------------------------------------------------------------
  ctx.onSlash('niatpuasa', new SlashCommandBuilder().setName('niatpuasa').setDescription('Tampilkan bacaan niat puasa Ramadan'), async (i) => {
    return i.reply({ embeds: [baseEmbed('🌙 Niat puasa Ramadan', `## ${K.NIAT.arab}\n\n*${K.NIAT.latin}*\n\n**Artinya:** ${K.NIAT.arti}`, 0x34495e)] });
  });

  // ------------------------------------------------------------
  // 9. /kultum
  // ------------------------------------------------------------
  const parseTanggal = (t) => {
    const m = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(t.trim());
    if (!m) return null;
    const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
    const dt = new Date(Date.UTC(y, mo - 1, d));
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
    return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  };
  const parseJam = (j) => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(j.trim());
    if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return null;
    return `${String(m[1]).padStart(2, '0')}:${m[2]}`;
  };
  ctx.onSlash(
    'kultum',
    new SlashCommandBuilder()
      .setName('kultum')
      .setDescription('Jadwal kultum komunitas')
      .addSubcommand((s) => s.setName('lihat').setDescription('Lihat jadwal kultum yang akan datang'))
      .addSubcommand((s) =>
        s
          .setName('tambah')
          .setDescription('Tambah jadwal kultum (admin)')
          .addStringOption((o) => o.setName('tanggal').setDescription('Format DD-MM-YYYY').setRequired(true))
          .addStringOption((o) => o.setName('jam').setDescription('Format HH:MM (WIB)').setRequired(true))
          .addStringOption((o) => o.setName('penceramah').setDescription('Nama penceramah').setRequired(true))
          .addStringOption((o) => o.setName('tema').setDescription('Tema kultum').setRequired(true)),
      )
      .addSubcommand((s) =>
        s.setName('hapus').setDescription('Hapus jadwal kultum (admin)').addIntegerOption((o) => o.setName('id').setDescription('ID jadwal').setRequired(true)),
      ),
    async (i) => {
      const sub = i.options.getSubcommand();
      if (sub === 'lihat') {
        const rows = st.listKultum.all(wibNow().day);
        const teks = rows.length
          ? rows.map((r) => `**#${r.id}** · ${tglIndo(r.tanggal)} · ${r.jam} WIB\n🎤 ${r.penceramah} — ${r.tema}`).join('\n\n')
          : 'Belum ada jadwal kultum yang akan datang.';
        return i.reply({ embeds: [baseEmbed('🎙️ Jadwal kultum', teks, 0xe67e22)] });
      }
      if (!butuhAdmin(i)) return;
      if (sub === 'tambah') {
        const tanggal = parseTanggal(i.options.getString('tanggal'));
        const jam = parseJam(i.options.getString('jam'));
        if (!tanggal) return i.reply(ephemeral(errEmbed('Format tanggal salah. Pakai DD-MM-YYYY, contoh 15-03-2027.')));
        if (!jam) return i.reply(ephemeral(errEmbed('Format jam salah. Pakai HH:MM, contoh 19:30.')));
        const r = st.insKultum.run(tanggal, jam, i.options.getString('penceramah').slice(0, 80), i.options.getString('tema').slice(0, 120));
        return i.reply(ephemeral(okEmbed(`Jadwal kultum ditambahkan (ID **#${r.lastInsertRowid}**).`)));
      }
      const id = i.options.getInteger('id');
      const r = st.delKultum.run(id);
      return i.reply(ephemeral(r.changes ? okEmbed(`Jadwal #${id} dihapus.`) : errEmbed(`Jadwal #${id} nggak ditemukan.`)));
    },
  );

  // ------------------------------------------------------------
  // 10. /amal  11. /amalstats
  // ------------------------------------------------------------
  ctx.onSlash(
    'amal',
    new SlashCommandBuilder()
      .setName('amal')
      .setDescription('Daftar tantangan amal')
      .addSubcommand((s) => s.setName('lihat').setDescription('Lihat daftar tantangan amal'))
      .addSubcommand((s) =>
        s.setName('selesai').setDescription('Tandai tantangan amal sudah kamu selesaikan').addIntegerOption((o) => o.setName('id').setDescription('ID tantangan').setRequired(true)),
      )
      .addSubcommand((s) =>
        s
          .setName('tambah')
          .setDescription('Tambah tantangan amal (admin)')
          .addStringOption((o) => o.setName('judul').setDescription('Judul tantangan').setRequired(true))
          .addStringOption((o) => o.setName('deskripsi').setDescription('Penjelasan tantangan').setRequired(true)),
      )
      .addSubcommand((s) =>
        s.setName('hapus').setDescription('Hapus tantangan amal (admin)').addIntegerOption((o) => o.setName('id').setDescription('ID tantangan').setRequired(true)),
      ),
    async (i) => {
      const sub = i.options.getSubcommand();
      if (sub === 'lihat') {
        const rows = st.listAmal.all();
        const teks = rows.length
          ? rows.map((r) => `**#${r.id} ${r.judul}**\n${r.deskripsi}\n-# ${r.n} orang sudah menyelesaikan`).join('\n\n')
          : 'Belum ada tantangan amal.';
        return i.reply({ embeds: [baseEmbed('🤝 Tantangan amal', `${teks}\n\nSelesai? Ketik \`/amal selesai id:<nomor>\` (+${fmt(REWARD.amal)} money per tantangan).`, 0xe67e22)] });
      }
      if (sub === 'selesai') {
        if (!butuhRole(i)) return;
        const id = i.options.getInteger('id');
        const a = st.getAmal.get(id);
        if (!a) return i.reply(ephemeral(errEmbed(`Tantangan #${id} nggak ditemukan.`)));
        if (st.insDone.run(i.user.id, id, Date.now()).changes === 0) return i.reply(ephemeral(okEmbed(`Kamu sudah menyelesaikan tantangan #${id}.`)));
        addMoney(i.user.id, REWARD.amal);
        track(i.user.id, 'amal');
        return i.reply(ephemeral(baseEmbed('🤝 Amal tercatat', `Tantangan **#${id} ${a.judul}** selesai.\n💵 **+${fmt(REWARD.amal)} money**\nSemoga menjadi amal yang diterima.`, 0x2ecc71)));
      }
      if (!butuhAdmin(i)) return;
      if (sub === 'tambah') {
        const r = st.insAmal.run(i.options.getString('judul').slice(0, 80), i.options.getString('deskripsi').slice(0, 300));
        return i.reply(ephemeral(okEmbed(`Tantangan amal ditambahkan (ID **#${r.lastInsertRowid}**).`)));
      }
      const id = i.options.getInteger('id');
      const r = st.offAmal.run(id);
      return i.reply(ephemeral(r.changes ? okEmbed(`Tantangan #${id} dihapus.`) : errEmbed(`Tantangan #${id} nggak ditemukan.`)));
    },
  );

  ctx.onSlash('amalstats', new SlashCommandBuilder().setName('amalstats').setDescription('Statistik partisipasi amal'), async (i) => {
    const total = st.amalCount.get().c;
    const { c: selesai, u: peserta } = st.doneTotal.get();
    const top = st.topAmal.all().map((r, n) => `${['🥇', '🥈', '🥉'][n] || `**${n + 1}.**`} <@${r.user_id}> — **${r.c}** tantangan`);
    const saya = st.myAmal.get(i.user.id).c;
    return i.reply({
      embeds: [
        baseEmbed(
          '📊 Statistik amal',
          `Tantangan aktif: **${total}**\nTotal penyelesaian: **${selesai}**\nPeserta unik: **${peserta}**\n\n**Peserta teraktif**\n${top.length ? top.join('\n') : 'Belum ada.'}\n\nKamu sudah menyelesaikan **${saya}/${total}** tantangan.`,
          0x2980b9,
        ),
      ],
      allowedMentions: { parse: [] },
    });
  });

  return { parseTanggal, parseJam, bar, REWARD };
};
