// rasi.js: Buku Bintang. Tiap makhluk lahir di bawah satu dari 12 bintang asli. Bintangnya = dua akar bakat yang paling
// cepat ia pelajari (c.st.genes.talent), urutan dihitung, jadi 4 x 3 = 12. Bintang itu bawaan lahir tapi tersembunyi:
// sampai umur READ_AGE hari bukunya masih buku catatan pensil; malam pembacaan di umur READ_AGE mengubah wujud buku
// (sampul warna bintang, tinta emas, segel bakat). Fungsi murni: makhluk + hari masuk, tampilan keluar. UI di ui/40-book.js.
//
// Bukan zodiak: tidak dihitung dari tanggal lahir. Sengaja tidak ada simbol mistis; sosok tiap bintang diambil dari
// rasi aslinya (busur Orion, elang Aquila, harpa Lyra, ...), dan tidak ada satu pun rasi zodiak.
"use strict";
(function () {
  const READ_AGE = 30;
  // akar pohon bakat (tree.js) -> skill di status.js
  const ROOTS = { body: "fitness", mind: "logic", spark: "creativity", heart: "charm" };
  const ORDER = ["body", "mind", "spark", "heart"];
  const ROOT_LABEL = { body: "Body", mind: "Mind", spark: "Spark", heart: "Heart" };
  // kata kerja sederhana buat kalimat "learns X fastest, then Y"
  const ROOT_PLAIN = { body: "moving and sport", mind: "thinking things through", spark: "making new things", heart: "people" };

  // kunci "akar1>akar2". pal: kulit terang, kulit gelap, logam terang, logam gelap, cahaya
  const STARS = {
    "body>mind":  { id: "rigel", name: "Rigel", fig: "bow", figName: "the Bow", con: "Orion", pal: ["#2C5A86", "#0E2238", "#E4EEF8", "#7C93AE", "#BFE0FF"],
      fact: "The hunter's foot, the brightest point of Orion.", fits: "strategist athletes, keepers, coaches" },
    "body>spark": { id: "arcturus", name: "Arcturus", fig: "staff", figName: "the Staff", con: "Boötes", pal: ["#8A4520", "#3A1608", "#F5B987", "#A0582A", "#FFB070"],
      fact: "One of the fastest-moving bright stars we can see.", fits: "show athletes, dancers, racers" },
    "body>heart": { id: "alphacen", name: "Alpha Centauri", fig: "horseshoe", figName: "the Horseshoe", con: "Centaurus", pal: ["#8A6A1E", "#3A2A08", "#FFE7A0", "#A8802A", "#FFD877"],
      fact: "The closest star system to our Sun.", fits: "captains, rescuers, guardians" },
    "mind>body":  { id: "altair", name: "Altair", fig: "eagle", figName: "the Eagle", con: "Aquila", pal: ["#5A6270", "#22262E", "#F2F2F6", "#9AA0AC", "#F4F4FF"],
      fact: "The eagle's brightest star. It spins once every nine hours.", fits: "engineers, builders, surgeons" },
    "mind>spark": { id: "canopus", name: "Canopus", fig: "ship", figName: "the Ship", con: "Carina", pal: ["#145A5E", "#06262A", "#E8C46A", "#9A7428", "#9FE8E0"],
      fact: "Sailors of the southern seas steered by it.", fits: "inventors, explorers, researchers" },
    "mind>heart": { id: "polaris", name: "Polaris", fig: "bear", figName: "the Little Bear", con: "Ursa Minor", pal: ["#1E2A6A", "#0A0F30", "#F0CF7E", "#A07A2A", "#FFE29A"],
      fact: "The star that barely moves. Sailors found north by it.", fits: "leaders, teachers, judges" },
    "spark>body": { id: "achernar", name: "Achernar", fig: "river", figName: "the River", con: "Eridanus", pal: ["#156A8E", "#062C40", "#B8E8F8", "#5A9AB0", "#9EE0FF"],
      fact: "It spins so fast it is squashed flat.", fits: "makers, chefs, craftsmen" },
    "spark>mind": { id: "deneb", name: "Deneb", fig: "swan", figName: "the Swan", con: "Cygnus", pal: ["#5A4A86", "#241A40", "#ECE4FF", "#9A8AC0", "#E0D4FF"],
      fact: "Very far away, yet still one of the brightest.", fits: "designers, writers, visionaries" },
    "spark>heart": { id: "sirius", name: "Sirius", fig: "dog", figName: "the Great Dog", con: "Canis Major", pal: ["#2440B0", "#0C1650", "#EEF2FF", "#8A9AD0", "#B8CCFF"],
      fact: "The brightest star in the whole night sky.", fits: "performers, actors, presenters" },
    "heart>body": { id: "capella", name: "Capella", fig: "wheel", figName: "the Wheel", con: "Auriga", pal: ["#3E6A2E", "#16280F", "#F0D890", "#A08A3A", "#FFE8A0"],
      fact: "The charioteer's star, the brightest in his wheel of stars.", fits: "carers, vets, nurses" },
    "heart>mind": { id: "procyon", name: "Procyon", fig: "paw", figName: "the Paw", con: "Canis Minor", pal: ["#8A6A40", "#40301C", "#FFE4B0", "#A07A3A", "#FFE4B0"],
      fact: "Its name means \"before the dog\": it rises first.", fits: "doctors, biologists, counsellors" },
    "heart>spark": { id: "vega", name: "Vega", fig: "harp", figName: "the Harp", con: "Lyra", pal: ["#7A2050", "#320A20", "#F4B8B0", "#B0706A", "#FFC4D8"],
      fact: "The star of the harp, once the north star long ago.", fits: "musicians, painters, storytellers" },
  };

  // urutan akar dari bakat: bakat tertinggi dulu; seri dipecah oleh skill sekarang, lalu urutan tetap ORDER
  function rank(st) {
    const t = st && st.genes && st.genes.talent || {}, s = st && st.skills || {};
    return ORDER.slice().sort((a, b) => ((t[ROOTS[b]] || 0) - (t[ROOTS[a]] || 0)) || ((s[ROOTS[b]] || 0) - (s[ROOTS[a]] || 0)) || (ORDER.indexOf(a) - ORDER.indexOf(b)));
  }
  function starOf(st) {
    const [a, b] = rank(st);
    return { ...STARS[a + ">" + b], first: a, second: b, key: a + ">" + b };
  }
  // umur dan tahap buku. day = hari game sekarang, born = hari lahir makhluk
  function stage(born, day) {
    const age = day - born;
    return age >= READ_AGE ? "read" : "notebook";
  }
  function daysToReading(born, day) { return Math.max(0, born + READ_AGE - day); }
  // hari pembacaan (hari game), dipakai UI buat momen ritual sekali
  function readingDay(born) { return born + READ_AGE; }
  // segel per akar setelah pembacaan: akar bintang pertama dan kedua tersegel, sisanya belum
  function seal(st, root, born, day) {
    if (stage(born, day) !== "read") return "none";
    const s = starOf(st);
    return root === s.first ? "first" : root === s.second ? "second" : "warm";
  }
  function plain(s) { return `Learns ${ROOT_PLAIN[s.first]} fastest, then ${ROOT_PLAIN[s.second]}.`; }
  // angka romawi buat hari di buku (umur, bukan tanggal)
  function roman(n) {
    n = Math.max(1, Math.floor(n)); let out = "";
    for (const [v, r] of [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]]) while (n >= v) { out += r; n -= v; }
    return out;
  }

  const API = { READ_AGE, ROOTS, ORDER, ROOT_LABEL, ROOT_PLAIN, STARS, rank, starOf, stage, daysToReading, readingDay, seal, plain, roman };
  if (typeof module !== "undefined") module.exports = API;
  else globalThis.Rasi = API;
})();
