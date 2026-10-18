// ============================================================
//  Konten ibadah - Reduygenk-KantDev
//  PENTING: mohon dicek oleh guru/ustadz sebelum dipakai di server.
//  Terjemahan di sini ringkas, bukan terjemahan resmi.
// ============================================================

const DOA = [
  {
    nama: 'Bangun tidur',
    arab: 'الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ',
    latin: "Alhamdu lillaahil ladzii ahyaanaa ba'da maa amaatanaa wa ilaihin nusyuur.",
    arti: 'Segala puji bagi Allah yang telah menghidupkan kami setelah mematikan kami, dan kepada-Nya kami dikembalikan.',
    sumber: 'HR. Bukhari',
  },
  {
    nama: 'Sebelum tidur',
    arab: 'بِاسْمِكَ اللَّهُمَّ أَحْيَا وَبِاسْمِكَ أَمُوتُ',
    latin: 'Bismikallaahumma ahyaa wa bismika amuut.',
    arti: 'Dengan menyebut nama-Mu ya Allah, aku hidup dan aku mati.',
    sumber: 'HR. Bukhari',
  },
  {
    nama: 'Sebelum makan',
    arab: 'اللَّهُمَّ بَارِكْ لَنَا فِيمَا رَزَقْتَنَا وَقِنَا عَذَابَ النَّارِ بِسْمِ اللَّهِ',
    latin: "Allaahumma baarik lanaa fiimaa razaqtanaa wa qinaa 'adzaaban naar, bismillaah.",
    arti: 'Ya Allah, berkahilah rezeki yang Engkau berikan kepada kami dan lindungilah kami dari siksa neraka. Dengan nama Allah.',
    sumber: 'Doa yang umum diajarkan. Adab membaca basmalah sebelum makan: HR. Abu Dawud dan Tirmidzi',
  },
  {
    nama: 'Sesudah makan',
    arab: 'الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنَا وَسَقَانَا وَجَعَلَنَا مُسْلِمِينَ',
    latin: "Alhamdulillaahil ladzii ath'amanaa wa saqaanaa wa ja'alanaa muslimiin.",
    arti: 'Segala puji bagi Allah yang telah memberi kami makan dan minum serta menjadikan kami muslim.',
    sumber: 'HR. Abu Dawud dan Tirmidzi',
  },
  {
    nama: 'Berbuka puasa',
    arab: 'ذَهَبَ الظَّمَأُ وَابْتَلَّتِ الْعُرُوقُ وَثَبَتَ الْأَجْرُ إِنْ شَاءَ اللَّهُ',
    latin: "Dzahabazh zhama'u wabtallatil 'uruuqu wa tsabatal ajru insyaa Allaah.",
    arti: 'Telah hilang dahaga, urat-urat telah basah, dan pahala telah ditetapkan insya Allah.',
    sumber: 'HR. Abu Dawud',
  },
  {
    nama: 'Masuk masjid',
    arab: 'اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ',
    latin: 'Allaahummaf tah lii abwaaba rahmatik.',
    arti: 'Ya Allah, bukakanlah untukku pintu-pintu rahmat-Mu.',
    sumber: 'HR. Muslim',
  },
  {
    nama: 'Keluar masjid',
    arab: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ مِنْ فَضْلِكَ',
    latin: 'Allaahumma innii as-aluka min fadhlik.',
    arti: 'Ya Allah, sesungguhnya aku memohon sebagian karunia-Mu.',
    sumber: 'HR. Muslim',
  },
  {
    nama: 'Keluar rumah',
    arab: 'بِسْمِ اللَّهِ تَوَكَّلْتُ عَلَى اللَّهِ وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ',
    latin: "Bismillaahi tawakkaltu 'alallaah, wa laa hawla wa laa quwwata illaa billaah.",
    arti: 'Dengan nama Allah, aku bertawakal kepada Allah. Tiada daya dan kekuatan kecuali dengan pertolongan Allah.',
    sumber: 'HR. Abu Dawud dan Tirmidzi',
  },
  {
    nama: 'Sapu jagat (kebaikan dunia dan akhirat)',
    arab: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ',
    latin: "Rabbanaa aatinaa fid dunyaa hasanah, wa fil aakhirati hasanah, wa qinaa 'adzaaban naar.",
    arti: 'Ya Tuhan kami, berilah kami kebaikan di dunia dan kebaikan di akhirat, dan lindungilah kami dari siksa neraka.',
    sumber: 'QS. Al-Baqarah: 201',
  },
  {
    nama: 'Untuk kedua orang tua',
    arab: 'رَبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا',
    latin: 'Rabbirhamhumaa kamaa rabbayaanii shaghiiraa.',
    arti: 'Ya Tuhanku, sayangilah keduanya sebagaimana mereka berdua mendidik aku pada waktu kecil.',
    sumber: "QS. Al-Isra': 24",
  },
  {
    nama: 'Menambah ilmu',
    arab: 'رَبِّ زِدْنِي عِلْمًا',
    latin: "Rabbi zidnii 'ilmaa.",
    arti: 'Ya Tuhanku, tambahkanlah ilmu kepadaku.',
    sumber: 'QS. Taha: 114',
  },
];

// terjemah ringkas, bukan lafaz asli
const HADITS = [
  { teks: 'Sesungguhnya setiap amal tergantung pada niatnya, dan setiap orang mendapat sesuai dengan apa yang diniatkannya.', sumber: 'HR. Bukhari dan Muslim' },
  { teks: 'Barangsiapa berpuasa Ramadan karena iman dan mengharap pahala dari Allah, diampuni dosanya yang telah lalu.', sumber: 'HR. Bukhari dan Muslim' },
  { teks: 'Puasa adalah perisai.', sumber: 'HR. Bukhari dan Muslim' },
  { teks: 'Barangsiapa memberi makan orang yang berpuasa, ia mendapat pahala seperti pahala orang yang berpuasa itu tanpa mengurangi pahalanya sedikit pun.', sumber: 'HR. Tirmidzi' },
  { teks: "Sebaik-baik kalian adalah orang yang belajar Al-Qur'an dan mengajarkannya.", sumber: 'HR. Bukhari' },
  { teks: 'Tidaklah beriman salah seorang di antara kalian hingga ia mencintai untuk saudaranya apa yang ia cintai untuk dirinya sendiri.', sumber: 'HR. Bukhari dan Muslim' },
  { teks: 'Senyummu di hadapan saudaramu adalah sedekah.', sumber: 'HR. Tirmidzi' },
  { teks: 'Permudahlah dan jangan mempersulit, berilah kabar gembira dan jangan membuat orang lari.', sumber: 'HR. Bukhari dan Muslim' },
  { teks: 'Orang yang kuat bukanlah yang menang dalam bergulat, tetapi yang mampu menahan dirinya ketika marah.', sumber: 'HR. Bukhari dan Muslim' },
  { teks: 'Barangsiapa beriman kepada Allah dan hari akhir, hendaklah ia berkata baik atau diam.', sumber: 'HR. Bukhari dan Muslim' },
  { teks: 'Seorang mukmin bagi mukmin lainnya seperti satu bangunan, sebagian menguatkan sebagian yang lain.', sumber: 'HR. Bukhari dan Muslim' },
  { teks: 'Sesungguhnya Allah tidak melihat rupa dan harta kalian, tetapi Dia melihat hati dan amal kalian.', sumber: 'HR. Muslim' },
];

const AYAT = [
  { ref: 'QS. Al-Baqarah: 183', arab: 'يَا أَيُّهَا الَّذِينَ آمَنُوا كُتِبَ عَلَيْكُمُ الصِّيَامُ كَمَا كُتِبَ عَلَى الَّذِينَ مِن قَبْلِكُمْ لَعَلَّكُمْ تَتَّقُونَ', arti: 'Wahai orang-orang yang beriman, diwajibkan atas kamu berpuasa sebagaimana diwajibkan atas orang-orang sebelum kamu agar kamu bertakwa.' },
  { ref: 'QS. Al-Baqarah: 186', arab: 'وَإِذَا سَأَلَكَ عِبَادِي عَنِّي فَإِنِّي قَرِيبٌ ۖ أُجِيبُ دَعْوَةَ الدَّاعِ إِذَا دَعَانِ', arti: 'Apabila hamba-hamba-Ku bertanya kepadamu tentang Aku, sesungguhnya Aku dekat. Aku mengabulkan doa orang yang berdoa apabila ia berdoa kepada-Ku.' },
  { ref: 'QS. Al-Baqarah: 286 (potongan)', arab: 'لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا', arti: 'Allah tidak membebani seseorang melainkan sesuai dengan kesanggupannya.' },
  { ref: 'QS. Al-Baqarah: 152', arab: 'فَاذْكُرُونِي أَذْكُرْكُمْ وَاشْكُرُوا لِي وَلَا تَكْفُرُونِ', arti: 'Maka ingatlah Aku, niscaya Aku ingat kepadamu. Bersyukurlah kepada-Ku dan janganlah kamu ingkar kepada-Ku.' },
  { ref: "QS. Ar-Ra'd: 28 (potongan)", arab: 'أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ', arti: 'Ingatlah, hanya dengan mengingat Allah hati menjadi tenteram.' },
  { ref: 'QS. Ali Imran: 139', arab: 'وَلَا تَهِنُوا وَلَا تَحْزَنُوا وَأَنتُمُ الْأَعْلَوْنَ إِن كُنتُم مُّؤْمِنِينَ', arti: 'Janganlah kamu merasa lemah dan janganlah bersedih hati, padahal kamulah orang-orang yang paling tinggi jika kamu beriman.' },
  { ref: 'QS. Al-Hujurat: 13 (potongan)', arab: 'إِنَّ أَكْرَمَكُمْ عِندَ اللَّهِ أَتْقَاكُمْ', arti: 'Sesungguhnya yang paling mulia di antara kamu di sisi Allah ialah yang paling bertakwa.' },
  { ref: 'QS. At-Talaq: 2-3 (potongan)', arab: 'وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا ۝ وَيَرْزُقْهُ مِنْ حَيْثُ لَا يَحْتَسِبُ', arti: 'Barangsiapa bertakwa kepada Allah, Dia akan membukakan jalan keluar baginya dan memberinya rezeki dari arah yang tidak disangka-sangka.' },
  { ref: 'QS. Al-Insyirah: 5-6', arab: 'فَإِنَّ مَعَ الْعُسْرِ يُسْرًا ۝ إِنَّ مَعَ الْعُسْرِ يُسْرًا', arti: 'Maka sesungguhnya bersama kesulitan ada kemudahan. Sesungguhnya bersama kesulitan ada kemudahan.' },
  { ref: 'QS. Al-Qadr: 1-3', arab: 'إِنَّا أَنزَلْنَاهُ فِي لَيْلَةِ الْقَدْرِ ۝ وَمَا أَدْرَاكَ مَا لَيْلَةُ الْقَدْرِ ۝ لَيْلَةُ الْقَدْرِ خَيْرٌ مِّنْ أَلْفِ شَهْرٍ', arti: 'Sesungguhnya Kami menurunkannya pada malam kemuliaan. Tahukah kamu apakah malam kemuliaan itu? Malam kemuliaan itu lebih baik daripada seribu bulan.' },
  { ref: 'QS. Ar-Rahman: 13', arab: 'فَبِأَيِّ آلَاءِ رَبِّكُمَا تُكَذِّبَانِ', arti: 'Maka nikmat Tuhanmu yang manakah yang kamu dustakan?' },
  { ref: "QS. Al-'Asr: 1-3", arab: 'وَالْعَصْرِ ۝ إِنَّ الْإِنسَانَ لَفِي خُسْرٍ ۝ إِلَّا الَّذِينَ آمَنُوا وَعَمِلُوا الصَّالِحَاتِ وَتَوَاصَوْا بِالْحَقِّ وَتَوَاصَوْا بِالصَّبْرِ', arti: 'Demi masa. Sesungguhnya manusia benar-benar dalam kerugian, kecuali orang-orang yang beriman dan mengerjakan kebajikan serta saling menasihati untuk kebenaran dan kesabaran.' },
  { ref: 'QS. Al-Ikhlas: 1-4', arab: 'قُلْ هُوَ اللَّهُ أَحَدٌ ۝ اللَّهُ الصَّمَدُ ۝ لَمْ يَلِدْ وَلَمْ يُولَدْ ۝ وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ', arti: 'Katakanlah, Dialah Allah Yang Maha Esa. Allah tempat bergantung segala sesuatu. Dia tidak beranak dan tidak diperanakkan. Dan tidak ada sesuatu pun yang setara dengan-Nya.' },
];

const NIAT = {
  arab: 'نَوَيْتُ صَوْمَ غَدٍ عَنْ أَدَاءِ فَرْضِ شَهْرِ رَمَضَانَ هَذِهِ السَّنَةِ لِلَّهِ تَعَالَى',
  latin: "Nawaitu shauma ghadin 'an adaa-i fardhi syahri ramadhaana hadzihis sanati lillaahi ta'aalaa.",
  arti: 'Aku berniat puasa esok hari untuk menunaikan kewajiban bulan Ramadan tahun ini karena Allah Ta\'ala.',
};

module.exports = { DOA, HADITS, AYAT, NIAT };
