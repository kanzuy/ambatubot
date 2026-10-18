// ============================================================
//  Data game - Reduygenk-KantDev
// ============================================================

// Trivia: q = pertanyaan, o = 4 pilihan, a = index jawaban benar (0-3)
const TRIVIA = [
  { q: 'Ramadan adalah bulan ke berapa dalam kalender Hijriah?', o: ['7', '8', '9', '10'], a: 2 },
  { q: 'Berapa jumlah rukun Islam?', o: ['4', '5', '6', '7'], a: 1 },
  { q: 'Berapa jumlah rukun iman?', o: ['5', '6', '7', '8'], a: 1 },
  { q: 'Sholat wajib dalam sehari semalam ada berapa kali?', o: ['3', '4', '5', '6'], a: 2 },
  { q: 'Malaikat yang menyampaikan wahyu kepada para nabi adalah?', o: ['Mikail', 'Jibril', 'Israfil', 'Izrail'], a: 1 },
  { q: 'Surat terpanjang dalam Al-Qur\'an adalah?', o: ['Al-Fatihah', 'Yasin', 'Al-Baqarah', 'Al-Ikhlas'], a: 2 },
  { q: 'Al-Qur\'an terdiri dari berapa juz?', o: ['20', '25', '30', '40'], a: 2 },
  { q: 'Al-Qur\'an terdiri dari berapa surat?', o: ['110', '114', '120', '124'], a: 1 },
  { q: 'Malam yang lebih baik dari seribu bulan adalah?', o: ['Malam Jumat', 'Malam Lailatul Qadar', 'Malam Nisfu Syaban', 'Malam 1 Muharram'], a: 1 },
  { q: 'Nabi Muhammad SAW lahir di kota?', o: ['Madinah', 'Thaif', 'Mekah', 'Yaman'], a: 2 },
  { q: 'Bulan sebelum Ramadan adalah?', o: ['Rajab', 'Syaban', 'Syawal', 'Muharram'], a: 1 },
  { q: 'Bulan setelah Ramadan adalah?', o: ['Syaban', 'Dzulhijjah', 'Syawal', 'Rajab'], a: 2 },
  { q: 'Ibadah haji dilaksanakan pada bulan?', o: ['Syawal', 'Dzulhijjah', 'Rajab', 'Muharram'], a: 1 },
  { q: 'Wahyu pertama diterima Nabi Muhammad SAW di?', o: ['Gua Hira', 'Gua Tsur', 'Gunung Uhud', 'Padang Arafah'], a: 0 },
  { q: 'Khalifah pertama setelah Nabi Muhammad SAW wafat adalah?', o: ['Umar bin Khattab', 'Utsman bin Affan', 'Abu Bakar ash-Shiddiq', 'Ali bin Abi Thalib'], a: 2 },
  { q: 'Sahabat Nabi yang berjuluk Al-Faruq adalah?', o: ['Umar bin Khattab', 'Abu Bakar', 'Ali bin Abi Thalib', 'Bilal bin Rabah'], a: 0 },
  { q: 'Nabi yang membuat bahtera besar adalah?', o: ['Nabi Musa', 'Nabi Nuh', 'Nabi Ibrahim', 'Nabi Yusuf'], a: 1 },
  { q: 'Zakat fitrah dikeluarkan menjelang?', o: ['Idul Adha', 'Maulid Nabi', 'Idul Fitri', 'Isra Miraj'], a: 2 },
  { q: 'Rukun Islam yang pertama adalah?', o: ['Sholat', 'Puasa', 'Syahadat', 'Zakat'], a: 2 },
  { q: 'Kata "takjil" artinya?', o: ['Menyegerakan berbuka', 'Menunda berbuka', 'Makan sahur', 'Sedekah'], a: 0 },
  { q: 'Kiblat umat Islam saat sholat adalah?', o: ['Masjid Nabawi', 'Ka\'bah', 'Masjid Al-Aqsa', 'Gunung Uhud'], a: 1 },
  { q: 'Pohon penghasil kurma adalah?', o: ['Palem kurma', 'Kelapa', 'Pinang', 'Sawit'], a: 0 },
  { q: 'Planet terbesar di tata surya adalah?', o: ['Mars', 'Jupiter', 'Saturnus', 'Bumi'], a: 1 },
  { q: 'Gunung tertinggi di Indonesia adalah?', o: ['Semeru', 'Kerinci', 'Puncak Jaya', 'Rinjani'], a: 2 },
  { q: 'Hewan darat tercepat di dunia adalah?', o: ['Singa', 'Cheetah', 'Kuda', 'Macan tutul'], a: 1 },
  { q: 'Pencipta lagu kebangsaan Indonesia Raya adalah?', o: ['Ismail Marzuki', 'W.R. Supratman', 'Ki Hajar Dewantara', 'C. Simanjuntak'], a: 1 },
  { q: 'Proklamasi kemerdekaan Indonesia dibacakan pada tanggal?', o: ['17 Agustus 1945', '1 Juni 1945', '28 Oktober 1928', '10 November 1945'], a: 0 },
  { q: 'Ibu kota negara Jepang adalah?', o: ['Osaka', 'Kyoto', 'Tokyo', 'Nagoya'], a: 2 },
  { q: 'Hasil dari 7 x 8 adalah?', o: ['54', '56', '58', '64'], a: 1 },
  { q: 'Rumus kimia air adalah?', o: ['CO2', 'O2', 'H2O', 'NaCl'], a: 2 },
  { q: 'Benua terluas di dunia adalah?', o: ['Afrika', 'Amerika', 'Eropa', 'Asia'], a: 3 },
  { q: 'Samudra terluas di dunia adalah?', o: ['Hindia', 'Atlantik', 'Pasifik', 'Arktik'], a: 2 },
  { q: 'Proklamator kemerdekaan Indonesia adalah?', o: ['Soekarno dan Hatta', 'Soeharto dan Habibie', 'Sutan Sjahrir dan Tan Malaka', 'Ahmad Yani dan Nasution'], a: 0 },
  { q: 'Masjid terbesar di Indonesia adalah?', o: ['Istiqlal', 'Raya Baiturrahman', 'Agung Demak', 'Al-Akbar'], a: 0 },
  { q: 'Ka\'bah terletak di dalam?', o: ['Masjid Nabawi', 'Masjidil Haram', 'Masjid Quba', 'Masjidil Aqsa'], a: 1 },
  { q: 'Hari raya setelah bulan Ramadan disebut?', o: ['Idul Adha', 'Idul Fitri', 'Maulid Nabi', 'Isra Miraj'], a: 1 },
  { q: 'Waktu sholat yang dikerjakan setelah matahari terbenam adalah?', o: ['Ashar', 'Dzuhur', 'Maghrib', 'Subuh'], a: 2 },
  { q: 'Hewan yang menjadi nama surat ke-105 adalah?', o: ['Lebah', 'Semut', 'Gajah', 'Laba-laba'], a: 2 },
];

// Tebak harga: harga perkiraan umum (Rupiah)
const HARGA = [
  { nama: 'Es teh manis (warung)', harga: 5000 },
  { nama: 'Gorengan (1 buah)', harga: 1500 },
  { nama: 'Nasi goreng (warung)', harga: 15000 },
  { nama: 'Bakso (1 mangkuk)', harga: 15000 },
  { nama: 'Mie ayam (1 mangkuk)', harga: 15000 },
  { nama: 'Martabak manis (ukuran sedang)', harga: 35000 },
  { nama: 'Sate ayam (10 tusuk)', harga: 25000 },
  { nama: 'Kolak pisang (1 porsi)', harga: 8000 },
  { nama: 'Es buah (1 porsi)', harga: 10000 },
  { nama: 'Nasi padang dengan ayam', harga: 25000 },
  { nama: 'Soto ayam (1 porsi)', harga: 17000 },
  { nama: 'Gado-gado (1 porsi)', harga: 15000 },
  { nama: 'Siomay (1 porsi)', harga: 15000 },
  { nama: 'Cilok (1 porsi)', harga: 5000 },
  { nama: 'Seblak (1 porsi)', harga: 12000 },
  { nama: 'Batagor (1 porsi)', harga: 15000 },
  { nama: 'Es kelapa muda (1 gelas)', harga: 10000 },
  { nama: 'Es cendol (1 gelas)', harga: 8000 },
  { nama: 'Kurma (250 gram)', harga: 30000 },
  { nama: 'Kopi susu kekinian (1 gelas)', harga: 20000 },
  { nama: 'Ayam geprek (1 porsi)', harga: 18000 },
  { nama: 'Pisang goreng (1 porsi)', harga: 10000 },
  { nama: 'Roti bakar (1 porsi)', harga: 15000 },
  { nama: 'Cireng (1 porsi)', harga: 8000 },
  { nama: 'Nasi uduk (1 porsi)', harga: 12000 },
  { nama: 'Bubur ayam (1 mangkuk)', harga: 13000 },
  { nama: 'Es campur (1 gelas)', harga: 12000 },
  { nama: 'Pempek (1 porsi)', harga: 20000 },
  { nama: 'Donat (1 buah)', harga: 5000 },
  { nama: 'Telur gulung (1 tusuk)', harga: 2000 },
];

// Tebak lagu: petunjuk bertahap (tanpa lirik). artis & genre cuma petunjuk umum.
const LAGU = [
  { judul: 'Laskar Pelangi', artis: 'Nidji', genre: 'Pop' },
  { judul: 'Bendera', artis: 'Cokelat', genre: 'Pop rock' },
  { judul: 'Kangen', artis: 'Dewa 19', genre: 'Rock' },
  { judul: 'Separuh Aku', artis: 'NOAH', genre: 'Pop' },
  { judul: 'Hati-Hati di Jalan', artis: 'Tulus', genre: 'Pop' },
  { judul: 'Monokrom', artis: 'Tulus', genre: 'Pop' },
  { judul: 'Pamer Bojo', artis: 'Didi Kempot', genre: 'Campursari / pop Jawa' },
  { judul: 'Sewu Kutho', artis: 'Didi Kempot', genre: 'Campursari / pop Jawa' },
  { judul: 'Ojo Dibandingke', artis: 'Farel Prayoga', genre: 'Dangdut / pop Jawa' },
  { judul: 'Lathi', artis: 'Weird Genius', genre: 'Elektronik' },
  { judul: 'Cinta Luar Biasa', artis: 'Andmesh', genre: 'Pop' },
  { judul: 'Bintang di Surga', artis: 'Peterpan', genre: 'Pop rock' },
  { judul: 'Mungkin Nanti', artis: 'Peterpan', genre: 'Pop rock' },
  { judul: 'Tombo Ati', artis: 'Opick', genre: 'Religi' },
  { judul: 'Assalamualaikum', artis: 'Maher Zain', genre: 'Religi' },
  { judul: 'Insha Allah', artis: 'Maher Zain', genre: 'Religi' },
  { judul: 'Ramadan', artis: 'Maher Zain', genre: 'Religi' },
  { judul: 'Bertaut', artis: 'Nadin Amizah', genre: 'Pop' },
  { judul: 'Sempurna', artis: 'Andra and The Backbone', genre: 'Pop rock' },
  { judul: 'Sebuah Kisah Klasik', artis: 'Sheila on 7', genre: 'Pop rock' },
];

// Wordle: kata 5 huruf bertema Ramadan (huruf besar)
const WORDLE_WORDS = [
  'SAHUR', 'IMSAK', 'ZAKAT', 'FITRI', 'SABAR', 'HILAL', 'BEDUG', 'KURMA', 'ADZAN', 'SALAM',
  'QURAN', 'HAFIZ', 'SUBUH', 'SUNAH', 'WAJIB', 'HARAM', 'HALAL', 'UMRAH', 'MEKAH', 'SURGA',
  'MALAM', 'BULAN', 'PUASA', 'TAKWA', 'ISLAM', 'ULAMA', 'RUKUK', 'SUJUD', 'ZIKIR', 'WUDHU',
  'DHUHA', 'TOBAT', 'INFAK', 'WAKAF', 'AMIIN',
];

// Sambung kata: kata pembuka
const SAMBUNG_START = ['kurma', 'sahur', 'bulan', 'masjid', 'sajadah', 'berkah', 'ikhlas', 'syukur', 'sedekah', 'hilal', 'takjil', 'zakat'];

// Bingo: key harus cocok dengan track(...) di game/ibadah
const MISI = {
  quest: 'Jawab 1 soal quest dengan benar',
  gacha: 'Gacha 1x',
  spin: 'Putar lucky spin',
  game: 'Main 1 game',
  tilawah: 'Catat tilawah',
  kebaikan: 'Lapor 1 kebaikan',
  muhasabah: 'Isi muhasabah',
  amal: 'Selesaikan 1 tantangan amal',
  trivia: 'Jawab 1 trivia dengan benar',
  wordle: 'Main Wordle hari ini',
  tebakharga: 'Main tebak harga',
  tebaklagu: 'Main tebak lagu',
  doa: 'Baca 1 doa',
  hadits: 'Baca 1 hadis',
  ayat: 'Baca 1 ayat',
};

module.exports = { TRIVIA, HARGA, LAGU, WORDLE_WORDS, SAMBUNG_START, MISI };
