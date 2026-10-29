// ============================================================
//  Server Discord Activity (game gambar) - Reduygenk-KantDev
//  Jalan di proses yang sama dengan bot, jadi hadiah money langsung
//  masuk ke database yang sama. Aktif kalau DISCORD_CLIENT_SECRET diisi.
// ============================================================
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { Room } = require('./activity-room');

const PUB = __dirname; // semua file Activity ada di root repo

function avatarUrl(u) {
  if (u.avatar) return `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=64`;
  return `https://cdn.discordapp.com/embed/avatars/${Number((BigInt(u.id) >> 22n) % 6n)}.png`;
}

module.exports = function mulaiActivity(ctx, gameApi) {
  const secret = process.env.DISCORD_CLIENT_SECRET;
  if (!secret) {
    console.log('[activity] nonaktif (isi DISCORD_CLIENT_SECRET di Variables kalau mau pakai game gambar).');
    return null;
  }
  const clientId = process.env.DISCORD_CLIENT_ID || ctx.client.application?.id;
  let WebSocketServer;
  try {
    ({ WebSocketServer } = require('ws'));
  } catch (e) {
    console.warn('[activity] paket "ws" belum terpasang:', e.message);
    return null;
  }
  // bundel kode client (butuh esbuild + @discord/embedded-app-sdk)
  try {
    require('esbuild').buildSync({
      entryPoints: [path.join(PUB, 'activity-client.js')], bundle: true, outfile: path.join(PUB, 'activity-app.js'),
      format: 'iife', minify: true, logLevel: 'silent', target: 'es2020',
    });
  } catch (e) {
    console.warn('[activity] gagal membundel client:', e.message);
    return null;
  }

  const rooms = new Map();

  async function verifikasi(token, guildId) {
    if (!token || !guildId) return { ok: false, alasan: 'Buka game ini dari dalam server (bukan DM).' };
    const r = await fetch('https://discord.com/api/v10/users/@me', { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10000) });
    if (!r.ok) return { ok: false, alasan: 'Login Discord gagal.' };
    const u = await r.json();
    let member;
    try {
      const guild = ctx.client.guilds.cache.get(guildId) ?? (await ctx.client.guilds.fetch(guildId));
      member = await guild.members.fetch(u.id);
    } catch {
      return { ok: false, alasan: 'Bot nggak bisa menemukan kamu di server ini.' };
    }
    if (!ctx.hasMemberRole(member)) return { ok: false, alasan: 'Kamu harus punya role dulu. Ambil lewat tombol getrole.' };
    return { ok: true, user: { id: u.id, nama: member.displayName ?? u.global_name ?? u.username, avatar: avatarUrl(u) } };
  }

  function ambilRoom(id) {
    let room = rooms.get(id);
    if (!room) {
      room = new Room({
        id,
        onReward: (uid, jumlah, alasan) => {
          try {
            const r = gameApi.giveGameMoney(uid, jumlah);
            ctx.track(uid, 'game');
            room.players.get(uid)?.send({ t: 'hadiah', jumlah: r.granted, alasan });
          } catch (e) {
            console.error('[activity] hadiah gagal:', e.message);
          }
        },
      });
      rooms.set(id, room);
    }
    return room;
  }

  const server = http.createServer(async (req, res) => {
    try {
      const url = (req.url || '/').split('?')[0];
      if (req.method === 'POST' && url === '/api/token') {
        let body = '';
        for await (const c of req) { body += c; if (body.length > 4096) throw new Error('terlalu besar'); }
        const { code } = JSON.parse(body || '{}');
        const r = await fetch('https://discord.com/api/oauth2/token', {
          method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ client_id: clientId, client_secret: secret, grant_type: 'authorization_code', code: String(code || '') }),
        });
        const js = await r.json();
        res.writeHead(r.ok ? 200 : 400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ access_token: js.access_token ?? null }));
      }
      if (url === '/health') { res.writeHead(200); return res.end('ok'); }
      if (url === '/' || url === '/index.html') {
        const html = fs.readFileSync(path.join(PUB, 'activity-index.html'), 'utf8').replace('{{CLIENT_ID}}', clientId);
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end(html);
      }
      if (url === '/app.js') {
        res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
        return res.end(fs.readFileSync(path.join(PUB, 'activity-app.js')));
      }
      res.writeHead(404); res.end('Not found');
    } catch (e) {
      res.writeHead(500); res.end('error');
    }
  });

  const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 64 * 1024 });
  wss.on('connection', (ws) => {
    let room = null, uid = null;
    const kirim = (m) => { if (ws.readyState === 1) ws.send(JSON.stringify(m)); };
    ws.on('message', async (raw) => {
      let m;
      try { m = JSON.parse(raw); } catch { return; }
      try {
        if (!room) {
          if (m.t !== 'join') return;
          const v = await verifikasi(m.token, m.guildId);
          if (!v.ok) { kirim({ t: 'error', pesan: v.alasan }); return ws.close(); }
          const r = ambilRoom(String(m.instanceId || 'umum').slice(0, 80));
          const j = r.join(v.user, kirim);
          if (!j.ok) { kirim({ t: 'error', pesan: j.alasan }); return ws.close(); }
          room = r; uid = v.user.id;
          kirim({ t: 'siap', id: uid });
          return;
        }
        if (m.t === 'mulai') { const r = room.mulai(uid); if (!r.ok && r.alasan) kirim({ t: 'error', pesan: r.alasan }); }
        else if (m.t === 'stroke') room.stroke(uid, m.s);
        else if (m.t === 'hapus') room.hapus(uid);
        else if (m.t === 'tebak') room.tebak(uid, m.teks);
      } catch (e) {
        console.error('[activity ws]', e.message);
      }
    });
    ws.on('close', () => {
      if (!room || !uid) return;
      room.leave(uid);
      if (room.kosong()) rooms.delete(room.id);
    });
  });

  const timer = setInterval(() => rooms.forEach((r) => r.tick()), 1000);
  const port = Number(process.env.PORT) || 3000;
  server.listen(port, () => console.log(`[activity] aktif di port ${port} (game gambar)`));
  return { server, rooms, verifikasi, tutup: () => { clearInterval(timer); server.close(); wss.close(); } };
};
