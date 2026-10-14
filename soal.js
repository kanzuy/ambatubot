// ============================================================
//  Bank soal quest - Reduygenk-KantDev
//  Soal dibuat otomatis dari data 114 surat (ratusan variasi)
// ============================================================

// [no, nama, arti, jumlah ayat]
const SURAH = [
  [1, 'Al-Fatihah', 'Pembukaan', 7],
  [2, 'Al-Baqarah', 'Sapi Betina', 286],
  [3, "Ali 'Imran", 'Keluarga Imran', 200],
  [4, "An-Nisa'", 'Wanita', 176],
  [5, "Al-Ma'idah", 'Hidangan', 120],
  [6, "Al-An'am", 'Binatang Ternak', 165],
  [7, "Al-A'raf", 'Tempat yang Tertinggi', 206],
  [8, 'Al-Anfal', 'Rampasan Perang', 75],
  [9, 'At-Taubah', 'Pengampunan', 129],
  [10, 'Yunus', 'Nabi Yunus', 109],
  [11, 'Hud', 'Nabi Hud', 123],
  [12, 'Yusuf', 'Nabi Yusuf', 111],
  [13, "Ar-Ra'd", 'Guruh', 43],
  [14, 'Ibrahim', 'Nabi Ibrahim', 52],
  [15, 'Al-Hijr', 'Gunung Al-Hijr', 99],
  [16, 'An-Nahl', 'Lebah', 128],
  [17, "Al-Isra'", 'Perjalanan Malam', 111],
  [18, 'Al-Kahf', 'Gua', 110],
  [19, 'Maryam', 'Maryam', 98],
  [20, 'Ta Ha', 'Ta Ha', 135],
  [21, "Al-Anbiya'", 'Para Nabi', 112],
  [22, 'Al-Hajj', 'Haji', 78],
  [23, "Al-Mu'minun", 'Orang-orang Mukmin', 118],
  [24, 'An-Nur', 'Cahaya', 64],
  [25, 'Al-Furqan', 'Pembeda', 77],
  [26, "Asy-Syu'ara'", 'Para Penyair', 227],
  [27, 'An-Naml', 'Semut', 93],
  [28, 'Al-Qasas', 'Kisah-kisah', 88],
  [29, "Al-'Ankabut", 'Laba-laba', 69],
  [30, 'Ar-Rum', 'Bangsa Romawi', 60],
  [31, 'Luqman', 'Luqman', 34],
  [32, 'As-Sajdah', 'Sujud', 30],
  [33, 'Al-Ahzab', 'Golongan yang Bersekutu', 73],
  [34, "Saba'", "Kaum Saba'", 54],
  [35, 'Fatir', 'Pencipta', 45],
  [36, 'Yasin', 'Yasin', 83],
  [37, 'As-Saffat', 'Barisan-barisan', 182],
  [38, 'Sad', 'Sad', 88],
  [39, 'Az-Zumar', 'Rombongan', 75],
  [40, 'Gafir', 'Maha Pengampun', 85],
  [41, 'Fussilat', 'Dijelaskan dengan Terperinci', 54],
  [42, 'Asy-Syura', 'Musyawarah', 53],
  [43, 'Az-Zukhruf', 'Perhiasan', 89],
  [44, 'Ad-Dukhan', 'Kabut', 59],
  [45, 'Al-Jasiyah', 'Berlutut', 37],
  [46, 'Al-Ahqaf', 'Bukit-bukit Pasir', 35],
  [47, 'Muhammad', 'Nabi Muhammad', 38],
  [48, 'Al-Fath', 'Kemenangan', 29],
  [49, 'Al-Hujurat', 'Kamar-kamar', 18],
  [50, 'Qaf', 'Qaf', 45],
  [51, 'Az-Zariyat', 'Angin yang Menerbangkan', 60],
  [52, 'At-Tur', 'Bukit', 49],
  [53, 'An-Najm', 'Bintang', 62],
  [54, 'Al-Qamar', 'Bulan', 55],
  [55, 'Ar-Rahman', 'Yang Maha Pengasih', 78],
  [56, "Al-Waqi'ah", 'Hari Kiamat', 96],
  [57, 'Al-Hadid', 'Besi', 29],
  [58, 'Al-Mujadalah', 'Wanita yang Mengajukan Gugatan', 22],
  [59, 'Al-Hasyr', 'Pengusiran', 24],
  [60, 'Al-Mumtahanah', 'Wanita yang Diuji', 13],
  [61, 'As-Saff', 'Barisan', 14],
  [62, "Al-Jumu'ah", 'Hari Jumat', 11],
  [63, 'Al-Munafiqun', 'Orang-orang Munafik', 11],
  [64, 'At-Tagabun', 'Hari Dinampakkan Kesalahan', 18],
  [65, 'At-Talaq', 'Talak', 12],
  [66, 'At-Tahrim', 'Mengharamkan', 12],
  [67, 'Al-Mulk', 'Kerajaan', 30],
  [68, 'Al-Qalam', 'Pena', 52],
  [69, 'Al-Haqqah', 'Hari Kiamat', 52],
  [70, "Al-Ma'arij", 'Tempat Naik', 44],
  [71, 'Nuh', 'Nabi Nuh', 28],
  [72, 'Al-Jinn', 'Jin', 28],
  [73, 'Al-Muzzammil', 'Orang yang Berselimut', 20],
  [74, 'Al-Muddassir', 'Orang yang Berkemul', 56],
  [75, 'Al-Qiyamah', 'Hari Kiamat', 40],
  [76, 'Al-Insan', 'Manusia', 31],
  [77, 'Al-Mursalat', 'Malaikat yang Diutus', 50],
  [78, "An-Naba'", 'Berita Besar', 40],
  [79, "An-Nazi'at", 'Malaikat yang Mencabut', 46],
  [80, "'Abasa", 'Ia Bermuka Masam', 42],
  [81, 'At-Takwir', 'Menggulung', 29],
  [82, 'Al-Infitar', 'Terbelah', 19],
  [83, 'Al-Mutaffifin', 'Orang-orang Curang', 36],
  [84, 'Al-Insyiqaq', 'Terbelah', 25],
  [85, 'Al-Buruj', 'Gugusan Bintang', 22],
  [86, 'At-Tariq', 'Yang Datang di Malam Hari', 17],
  [87, "Al-A'la", 'Yang Paling Tinggi', 19],
  [88, 'Al-Gasyiyah', 'Hari Pembalasan', 26],
  [89, 'Al-Fajr', 'Fajar', 30],
  [90, 'Al-Balad', 'Negeri', 20],
  [91, 'Asy-Syams', 'Matahari', 15],
  [92, 'Al-Lail', 'Malam', 21],
  [93, 'Ad-Duha', 'Waktu Duha', 11],
  [94, 'Asy-Syarh', 'Melapangkan', 8],
  [95, 'At-Tin', 'Buah Tin', 8],
  [96, "Al-'Alaq", 'Segumpal Darah', 19],
  [97, 'Al-Qadr', 'Kemuliaan', 5],
  [98, 'Al-Bayyinah', 'Bukti yang Nyata', 8],
  [99, 'Az-Zalzalah', 'Goncangan', 8],
  [100, "Al-'Adiyat", 'Kuda Perang yang Berlari Kencang', 11],
  [101, "Al-Qari'ah", 'Hari Kiamat', 11],
  [102, 'At-Takasur', 'Bermegah-megahan', 8],
  [103, "Al-'Asr", 'Masa', 3],
  [104, 'Al-Humazah', 'Pengumpat', 9],
  [105, 'Al-Fil', 'Gajah', 5],
  [106, 'Quraisy', 'Suku Quraisy', 4],
  [107, "Al-Ma'un", 'Barang-barang yang Berguna', 7],
  [108, 'Al-Kausar', 'Nikmat yang Banyak', 3],
  [109, 'Al-Kafirun', 'Orang-orang Kafir', 6],
  [110, 'An-Nasr', 'Pertolongan', 3],
  [111, 'Al-Lahab', 'Gejolak Api', 5],
  [112, 'Al-Ikhlas', 'Ikhlas', 4],
  [113, 'Al-Falaq', 'Waktu Subuh', 5],
  [114, 'An-Nas', 'Manusia', 6],
];

// Surat yang golongannya disepakati (yang masih diperdebatkan sengaja nggak dipakai)
const MAKKIYAH = new Set([
  6, 7, 10, 11, 12, 14, 15, 16, 17, 18, 19, 20, 21, 23, 25, 26, 27, 28, 29, 30, 31, 32, 34, 35,
  36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 50, 51, 52, 53, 54, 56, 67, 68, 69, 70, 71, 72,
  73, 74, 75, 77, 78, 79, 80, 81, 82, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 100,
  101, 102, 103, 104, 105, 106, 108, 109, 111,
]);
const MADANIYAH = new Set([2, 3, 4, 5, 8, 9, 24, 33, 47, 48, 49, 57, 58, 59, 60, 62, 63, 65, 66, 110]);

// Soal "arti" yang dilewati (arti sama dengan nama / arti mirip surat lain)
const SKIP_ARTI = new Set([19, 20, 31, 36, 37, 38, 47, 50, 61, 73, 74, 88, 112, 113]);

// [pertanyaan, jawaban (nama surat), penjelasan]
const CURATED = [
  ["Surat terpanjang dalam Al-Qur'an adalah?", 'Al-Baqarah', 'Al-Baqarah punya 286 ayat.'],
  ["Surat terpendek dalam Al-Qur'an adalah?", 'Al-Kausar', 'Al-Kausar hanya 3 ayat.'],
  ['Surat yang tidak diawali dengan Basmalah adalah?', 'At-Taubah', 'At-Taubah tidak diawali Basmalah.'],
  ["Surat yang dijuluki \"Jantung Al-Qur'an\" adalah?", 'Yasin', "Yasin dikenal sebagai jantung Al-Qur'an."],
  ['Wahyu pertama yang turun kepada Nabi Muhammad SAW terdapat dalam surat?', "Al-'Alaq", "Lima ayat pertama Al-'Alaq."],
  ['Kisah Ashabul Kahfi (pemuda penghuni gua) terdapat dalam surat?', 'Al-Kahf', 'Al-Kahf berarti gua.'],
  ['Surat yang mengisahkan Nabi Yusuf AS secara lengkap adalah?', 'Yusuf', 'Surat Yusuf mengisahkan perjalanan hidup Nabi Yusuf AS.'],
  ['Surat yang wajib dibaca di setiap rakaat sholat adalah?', 'Al-Fatihah', 'Al-Fatihah adalah rukun dalam sholat.'],
  ["Surat yang disebut setara sepertiga Al-Qur'an adalah?", 'Al-Ikhlas', 'Disebut dalam hadis tentang keutamaan Al-Ikhlas.'],
  ["Kisah pasukan bergajah yang ingin menghancurkan Ka'bah ada di surat?", 'Al-Fil', 'Al-Fil berarti gajah.'],
  ['Malam Lailatul Qadr disebutkan dalam surat?', 'Al-Qadr', 'Al-Qadr berarti kemuliaan.'],
  ['Surat yang menyebut nama Abu Lahab adalah?', 'Al-Lahab', 'Al-Lahab juga disebut surat Al-Masad.'],
  ['Ayat tentang kewajiban puasa Ramadan terdapat dalam surat?', 'Al-Baqarah', 'Terdapat di Al-Baqarah ayat 183-185.'],
  ['Ayat Kursi terdapat dalam surat?', 'Al-Baqarah', 'Ayat Kursi adalah Al-Baqarah ayat 255.'],
  ['Surat yang namanya sama dengan nama ibunda Nabi Isa AS adalah?', 'Maryam', 'Surat Maryam adalah surat ke-19.'],
  ['Surat yang berisi nasihat seorang ayah kepada anaknya tentang tauhid dan adab adalah?', 'Luqman', 'Nasihat Luqman kepada anaknya.'],
  ['Kisah semut dan Nabi Sulaiman AS terdapat dalam surat?', 'An-Naml', 'An-Naml berarti semut.'],
  ["Surat yang berulang kali memuat pertanyaan \"Maka nikmat Tuhanmu yang manakah yang kamu dustakan?\" adalah?", 'Ar-Rahman', 'Ayat itu diulang berkali-kali di Ar-Rahman.'],
  ['Surat yang namanya diambil dari salah satu hari dalam sepekan adalah?', "Al-Jumu'ah", "Al-Jumu'ah berarti hari Jumat."],
  ["Surat terakhir dalam mushaf Al-Qur'an adalah?", 'An-Nas', 'An-Nas adalah surat ke-114.'],
  ["Surat pertama dalam mushaf Al-Qur'an adalah?", 'Al-Fatihah', 'Al-Fatihah adalah surat ke-1.'],
];

const NAMA = SURAH.map((s) => s[1]);
const BY_NAMA = new Map(SURAH.map((s) => [s[1], s]));

// Validasi data saat dimuat
for (const [, jawaban] of CURATED) {
  if (!BY_NAMA.has(jawaban)) throw new Error(`Soal curated: surat "${jawaban}" tidak ada di data`);
}

// ---------- util ----------
const rand = (n) => Math.floor(Math.random() * n);
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function pickNamaSalah(benar, n = 3) {
  return shuffle(NAMA.filter((x) => x !== benar)).slice(0, n);
}
function pickAngkaSalah(benar, min, max, range, n = 3) {
  const kandidat = [];
  for (let v = Math.max(min, benar - range); v <= Math.min(max, benar + range); v++) {
    if (v !== benar) kandidat.push(v);
  }
  return shuffle(kandidat).slice(0, n);
}
function susun(q, benar, salah, info, qid) {
  const options = shuffle([benar, ...salah]).map(String);
  return { q, options, answer: options.indexOf(String(benar)), info, qid };
}

// ---------- daftar semua ID soal ----------
const artiCount = new Map();
for (const s of SURAH) artiCount.set(s[2], (artiCount.get(s[2]) || 0) + 1);

const ALL_QIDS = [];
for (const [no, , arti] of SURAH) {
  if (!SKIP_ARTI.has(no) && artiCount.get(arti) === 1) ALL_QIDS.push(`arti:${no}`);
  ALL_QIDS.push(`ayat:${no}`, `urut:${no}`, `no:${no}`);
  if (no < 114) ALL_QIDS.push(`setelah:${no}`);
  if (no > 1) ALL_QIDS.push(`sebelum:${no}`);
  if (MAKKIYAH.has(no) || MADANIYAH.has(no)) ALL_QIDS.push(`tempat:${no}`);
}
CURATED.forEach((_, i) => ALL_QIDS.push(`cur:${i}`));

// ---------- bikin soal dari ID ----------
function makeQuestion(qid) {
  const [tipe, idx] = qid.split(':');
  const n = Number(idx);

  if (tipe === 'cur') {
    const [q, jawaban, info] = CURATED[n];
    return susun(q, jawaban, pickNamaSalah(jawaban), info, qid);
  }

  const [no, nama, arti, ayat] = SURAH[n - 1];

  switch (tipe) {
    case 'arti':
      return susun(
        `Surat manakah yang artinya "${arti}"?`,
        nama,
        pickNamaSalah(nama),
        `Jawaban: ${nama} (surat ke-${no}, ${ayat} ayat).`,
        qid,
      );
    case 'ayat':
      return susun(
        `Surat ${nama} terdiri dari berapa ayat?`,
        ayat,
        pickAngkaSalah(ayat, 1, 300, 15),
        `${nama} punya ${ayat} ayat.`,
        qid,
      );
    case 'urut':
      return susun(
        `${nama} adalah surat ke berapa dalam Al-Qur'an?`,
        no,
        pickAngkaSalah(no, 1, 114, 12),
        `${nama} adalah surat ke-${no}.`,
        qid,
      );
    case 'no':
      return susun(
        `Surat ke-${no} dalam Al-Qur'an adalah?`,
        nama,
        pickNamaSalah(nama),
        `Surat ke-${no} adalah ${nama} (${arti}).`,
        qid,
      );
    case 'setelah': {
      const next = SURAH[no][1];
      return susun(
        `Surat apa yang terletak tepat setelah surat ${nama}?`,
        next,
        pickNamaSalah(next),
        `Setelah ${nama} adalah ${next}.`,
        qid,
      );
    }
    case 'sebelum': {
      const prev = SURAH[no - 2][1];
      return susun(
        `Surat apa yang terletak tepat sebelum surat ${nama}?`,
        prev,
        pickNamaSalah(prev),
        `Sebelum ${nama} adalah ${prev}.`,
        qid,
      );
    }
    case 'tempat': {
      const benar = MAKKIYAH.has(no) ? 'Makkiyah' : 'Madaniyah';
      const salah = benar === 'Makkiyah' ? 'Madaniyah' : 'Makkiyah';
      return susun(
        `Surat ${nama} termasuk golongan surat apa?`,
        benar,
        [salah],
        `${nama} termasuk surat ${benar}.`,
        qid,
      );
    }
    default:
      throw new Error(`Tipe soal tidak dikenal: ${qid}`);
  }
}

module.exports = { SURAH, ALL_QIDS, makeQuestion };
