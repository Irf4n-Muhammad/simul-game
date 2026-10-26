// Pohon bakat: tiap makhluk menumbuhkan pohonnya sendiri. 4 akar, 12 cabang, 36 ranting, 72 panggilan hidup,
// 38 kombinasi lintas akar, dan 20 simpul rahasia yang baru muncul kalau sesuatu terjadi di hidupnya.
// Poin datang dari umur, latihan, dan momen besar. Membuka simpul = tindakan "pohon:<id>" yang dicatat,
// jadi game tetap bisa diputar ulang. Efek: belajar lebih cepat, skor momen besar, peluang kejadian, dan aksesori.
"use strict";
(function () {
  const E = (typeof module !== "undefined") ? require("./engine.js") : globalThis.Engine;
  const ST = (typeof module !== "undefined") ? require("./status.js") : globalThis.Status;
  const { HOOKS, REGISTRY, seed_rng, Ctx, phase_of } = E;

  // ---------------------------------------------------------------- data
  // efek ditulis ringkas: g:skill:% (belajar lebih cepat), j:job:n (skor wawancara/review kerjaan itu),
  // k:kind:n (skor semua momen jenis itu), z:prize:n (skor lomba hadiah itu), o:storylet:x (peluang kejadian),
  // l:hari (umur lebih panjang), a:n (skor semua momen besar)
  const ROOTS = [
    ["body", "Body", "fitness", "#5E9E6E", "headband", "g:fitness:10", [
      ["sport", "Sport", "o:lomba:1.3 o:kecelakaan_kecil:0.85", [
        ["ball", "Ball games", "g:fitness:6 j:athlete:3", [
          ["captain", "Team captain", "j:athlete:5 k:review:2", "Could captain a pro team one day."],
          ["striker", "Star striker", "j:athlete:6 z:sport:3", "The one everyone watches in the final minute."]]],
        ["track", "Track", "g:fitness:6 z:sport:3", [
          ["sprinter", "Sprinter", "z:sport:6", "Built for the Championship sprint."],
          ["marathon", "Marathon runner", "j:athlete:4 o:sakit_parah:0.85", "Runs for hours and rarely gets sick."]]],
        ["water", "Water", "g:fitness:6 o:liburan:1.2", [
          ["swimmer", "Swimmer", "j:athlete:5 z:sport:2", "Medals in the pool."],
          ["diver", "Deep diver", "o:cerita_perjalanan:1.5 o:liburan:1.3", "Sees reefs nobody else in the family has seen."]]]]],
      ["vital", "Vitality", "o:sakit_parah:0.85 o:demam:0.8", [
        ["health", "Health", "o:sakit_parah:0.8 o:sakit_tua:0.85", [
          ["ironimmune", "Iron immune", "o:demam:0.5 o:sakit_parah:0.7", "Hardly ever sick, all life long."],
          ["evergreen", "Evergreen", "l:21 o:sakit_tua:0.75", "Lives about three weeks longer."]]],
        ["outdoors", "Outdoors", "o:liburan:1.3 o:cerita_perjalanan:1.3", [
          ["climber", "Mountain climber", "o:cerita_perjalanan:1.6 g:fitness:8", "Has a summit photo on the wall."],
          ["explorer", "Explorer", "o:liburan:1.5 o:pet_nyasar:1.5", "Always coming home with a story or a stray."]]],
        ["firstaid", "First aid", "j:nurse:3 g:logic:5", [
          ["paramedic", "Paramedic", "j:nurse:5 o:kecelakaan_kecil:0.6", "First one there when something goes wrong."],
          ["wardnurse", "Ward nurse", "j:nurse:6 k:review:1", "Could run a whole hospital ward."]]]]],
      ["hands", "Hands", "o:hobi_baru:1.3 o:usaha_sampingan:1.2", [
        ["cooking", "Cooking", "j:fastfood:3 g:creativity:5", [
          ["chef", "Head chef", "j:fastfood:5 o:usaha_sampingan:1.4", "From fry cook to running the kitchen."],
          ["baker", "Baker", "o:teman_baru:1.2 o:usaha_sampingan:1.5", "The whole street knows their bread."]]],
        ["building", "Building", "g:logic:5 o:hobi_baru:1.2", [
          ["carpenter", "Carpenter", "o:usaha_sampingan:1.5 o:hobi_baru:1.3", "Built half the furniture in the family home."],
          ["architect", "Architect", "j:designer:4 j:software:2", "Draws the houses other creatures live in."]]],
        ["gardening", "Gardening", "o:hobi_baru:1.3 o:sakit_tua:0.9", [
          ["gardener", "Gardener", "o:sakit_tua:0.75 o:senam_lansia:1.4", "A long, calm, green old age."],
          ["florist", "Florist", "o:kenalan_menarik:1.3 o:usaha_sampingan:1.4", "Their shop is where romances start."]]]]]]],
    ["mind", "Mind", "logic", "#5B7FB8", "glasses", "g:logic:10", [
      ["science", "Science", "g:logic:8 z:science:2", [
        ["medicine", "Medicine", "j:doctor:3 j:nurse:2", [
          ["surgeon", "Surgeon", "j:doctor:6 k:review:1", "Chief of medicine is within reach."],
          ["gp", "Family doctor", "j:doctor:4 o:sakit_parah:0.8", "The doctor the whole neighborhood trusts."]]],
        ["lab", "Lab research", "z:science:3 g:logic:6", [
          ["inventor", "Inventor", "z:science:6 o:karya_besar:1.3", "A real shot at the Golden Acorn prize."],
          ["naturalist", "Naturalist", "z:science:4 o:liburan:1.3 o:pet_nyasar:1.4", "Names a new beetle after the family."]]],
        ["engineering", "Engineering", "j:software:3 g:logic:6", [
          ["coder", "Coder", "j:software:6", "Could rise all the way to CTO."],
          ["robotics", "Robot maker", "j:software:4 z:science:3", "Builds the robot that wins the science fair."]]]]],
      ["numbers", "Numbers", "g:logic:8 o:dipecat:0.85", [
        ["finance", "Finance", "j:quant:3 j:office:2", [
          ["trader", "Trader", "j:quant:6", "Head of trading, if the nerves hold."],
          ["investor", "Investor", "j:founder:4 o:beli_barang_mahal:0.7", "Money that quietly grows for the next generation."]]],
        ["strategy", "Strategy", "k:review:2 k:interview:1", [
          ["chess", "Chess master", "k:comp:4 g:logic:8", "Wins every family board game, forever."],
          ["planner", "Master planner", "k:review:3 o:nganggur_lama:0.6", "Never caught without a plan B."]]],
        ["data", "Data", "j:software:2 j:quant:2", [
          ["analyst", "Analyst", "j:office:5 j:software:3", "Sees patterns before anyone else."],
          ["cipher", "Codebreaker", "j:software:4 z:science:3", "Solves the puzzle nobody else could."]]]]],
      ["words", "Words", "g:logic:6 g:charm:4", [
        ["teaching", "Teaching", "j:teacher:3", [
          ["mentor", "Mentor", "j:teacher:5 o:teman_baru:1.2", "Old students visit for years."],
          ["professor", "Professor", "j:teacher:4 z:science:3", "Could run the whole school one day."]]],
        ["writing", "Writing", "o:karya_besar:1.3 g:creativity:5", [
          ["novelist", "Novelist", "o:karya_besar:1.6", "Writes the book the family keeps on the shelf."],
          ["journalist", "Journalist", "j:office:4 o:cerita_perjalanan:1.3", "Always where the news is."]]],
        ["law", "Law", "j:office:3 k:interview:1", [
          ["lawyer", "Lawyer", "j:office:5 k:interview:2", "Wins arguments at work and at dinner."],
          ["judge", "Judge", "j:office:4 o:berantem_rumah_tangga:0.7", "The calm, fair voice of the family."]]]]]]],
    ["spark", "Spark", "creativity", "#D9874A", "beret", "g:creativity:10", [
      ["art", "Art", "o:karya_besar:1.2 o:hobi_baru:1.2", [
        ["painting", "Painting", "j:designer:2 z:art:3", [
          ["painter", "Painter", "z:art:6", "Paintings that hang in the prize hall."],
          ["illustrator", "Illustrator", "j:designer:4 o:karya_besar:1.3", "Draws the pictures in children's books."]]],
        ["design", "Design", "j:designer:3", [
          ["designer_n", "Designer", "j:designer:6", "Creative director one day."],
          ["fashion", "Fashion designer", "j:designer:4 j:influencer:3", "Everyone copies their style."]]],
        ["sculpture", "Sculpture", "z:art:3 g:fitness:4", [
          ["sculptor", "Sculptor", "z:art:5 o:karya_besar:1.3", "A statue in the plaza."],
          ["potter", "Potter", "o:usaha_sampingan:1.4 o:hobi_baru:1.3", "Every mug in the family kitchen is theirs."]]]]],
      ["music", "Music", "o:latihan_bakat:1.3 o:pesta_pertama:1.15", [
        ["instrument", "Instruments", "z:art:2 o:latihan_bakat:1.3", [
          ["pianist", "Pianist", "z:art:5 o:lomba:1.3", "Plays the recital everyone remembers."],
          ["guitarist", "Guitarist", "o:pesta_pertama:1.4 o:kenalan_menarik:1.3", "The song at every campfire."]]],
        ["voice", "Voice", "j:influencer:2 o:lomba:1.2", [
          ["singer", "Singer", "j:influencer:5", "Could become an Icon."],
          ["composer", "Composer", "z:art:5 o:karya_besar:1.4", "Writes the song the family sings for generations."]]],
        ["rhythm", "Rhythm", "g:fitness:5 o:pesta_pertama:1.2", [
          ["dancer", "Dancer", "z:sport:2 z:art:3 j:athlete:2", "Moves like nobody else on the stage."],
          ["dj", "DJ", "o:pesta_pertama:1.5 o:party_kantor:1.3", "Every big night has their playlist."]]]]],
      ["media", "Media", "o:karya_besar:1.15 o:teman_baru:1.1", [
        ["film", "Film", "j:influencer:2 o:karya_besar:1.2", [
          ["director", "Film director", "o:karya_besar:1.6 z:art:3", "A film with their name in the credits."],
          ["actor", "Actor", "j:influencer:5 o:kenalan_menarik:1.2", "Recognized on the street."]]],
        ["socialmedia", "Social media", "j:influencer:3", [
          ["influencer_n", "Influencer", "j:influencer:6", "Followers in every city."],
          ["streamer", "Streamer", "j:influencer:4 o:teman_baru:1.3", "Thousands watch them every night."]]],
        ["games", "Games", "j:software:2 j:designer:2", [
          ["gamemaker", "Game maker", "j:software:4 j:founder:2", "Ships a game other creatures play."],
          ["animator", "Animator", "j:designer:5", "Makes the cartoons kids grow up with."]]]]]]],
    ["heart", "Heart", "charm", "#C96B86", "flower", "g:charm:10", [
      ["social", "Friendship", "o:teman_baru:1.15 o:reuni:1.2", [
        ["circle", "Circle", "o:teman_baru:1.2 o:pesta_pertama:1.2", [
          ["host", "Party host", "o:pesta_pertama:1.5 o:party_kantor:1.4", "Every party ends up at their place."],
          ["bestie", "Best friend", "o:kehilangan_sahabat:0.6 o:reuni:1.5", "Keeps one friend for life."]]],
        ["network", "Network", "o:reuni:1.3 k:interview:1", [
          ["connector", "Connector", "k:interview:3 o:teman_baru:1.3", "Always knows someone who can help."],
          ["diplomat", "Diplomat", "j:office:4 o:berantem_sekolah:0.5", "Ends fights before they start."]]],
        ["care", "Care", "o:patah_hati:0.8 o:berantem_rumah_tangga:0.85", [
          ["counselor", "Counselor", "j:teacher:3 j:nurse:3", "The one everyone tells their secrets to."],
          ["peacemaker", "Peacemaker", "o:berantem_rumah_tangga:0.6 o:putus:0.8", "A home that rarely raises its voice."]]]]],
      ["romance", "Love", "o:kenalan_menarik:1.2 o:jadian:1.15", [
        ["flirt", "Charm", "o:kenalan_menarik:1.25 o:kencan:1.2", [
          ["heartthrob", "Heartthrob", "o:kenalan_menarik:1.5 o:jadian:1.3", "Never short of admirers."],
          ["matchmaker", "Matchmaker", "o:kencan:1.4 o:teman_baru:1.2", "Sets up half the couples in town."]]],
        ["devotion", "Devotion", "o:putus:0.75 o:selingkuh_di_party:0.6", [
          ["soulmate", "Soulmate", "o:putus:0.5 o:patah_hati:0.6", "One love, the whole way through."],
          ["loyal", "Forever loyal", "o:selingkuh_di_party:0.3 o:berantem_rumah_tangga:0.8", "Trust nobody ever has to question."]]],
        ["family", "Family", "o:kabar_bayi:1.2 o:main_sama_cucu:1.2", [
          ["bigfamily", "Big family", "o:kabar_bayi:1.5", "A noisy table every holiday."],
          ["elder", "Family elder", "o:main_sama_cucu:1.6 o:sakit_tua:0.9", "The grandparent every grandkid runs to."]]]]],
      ["lead", "Leadership", "o:dimarahi_bos:0.8 k:review:1", [
        ["business", "Business", "j:founder:3 o:usaha_sampingan:1.3", [
          ["founder_n", "Founder", "j:founder:6", "Could build a unicorn."],
          ["sales", "Salesperson", "j:fastfood:3 j:office:3 k:interview:1", "Could sell sand on a beach."]]],
        ["public", "Public life", "j:influencer:2 o:teman_baru:1.1", [
          ["mayor", "Town leader", "k:review:3 o:reuni:1.3", "Their name ends up on a park bench."],
          ["speaker", "Speaker", "j:influencer:4 j:teacher:2", "Fills a hall when they talk."]]],
        ["team", "Teamwork", "k:review:2 j:office:2", [
          ["manager", "Manager", "j:office:5 k:review:2", "Head of office material."],
          ["coach", "Coach", "j:athlete:3 j:teacher:3", "Turns rookies into legends."]]]]]]],
  ];

  const COMBOS = [
    ["bedside", "Bedside doctor", "medicine", "care", "j:doctor:4 j:nurse:4", "The doctor patients ask for by name."],
    ["product", "Product maker", "engineering", "design", "j:software:3 j:designer:3", "Makes things that are useful and beautiful."],
    ["growth", "Growth hacker", "data", "socialmedia", "j:influencer:5", "Knows exactly why a post goes viral."],
    ["tycoon", "Tycoon", "finance", "business", "j:founder:5 j:quant:2", "Money, companies, and a mansion on the hill."],
    ["screen", "Screenwriter", "writing", "film", "o:karya_besar:1.6", "Their story becomes a movie."],
    ["celebchef", "Celebrity chef", "cooking", "socialmedia", "j:influencer:4 j:fastfood:3", "A cooking show the whole town watches."],
    ["legendcoach", "Legendary coach", "track", "team", "j:athlete:4 j:teacher:3", "Their trophies have other names on them."],
    ["sportsmed", "Sports medic", "medicine", "health", "j:doctor:3 o:sakit_parah:0.75", "Keeps champions on their feet."],
    ["smarthome", "Smart home builder", "building", "engineering", "j:software:3 o:usaha_sampingan:1.3", "Their houses think for themselves."],
    ["indie", "Indie studio", "games", "business", "j:founder:4 j:software:2", "A tiny studio with a giant hit."],
    ["musictherapy", "Music therapist", "voice", "care", "j:nurse:3 o:patah_hati:0.6", "Heals with songs."],
    ["dancechamp", "Dance champion", "rhythm", "track", "k:comp:3 z:sport:3", "Gold medals that sparkle."],
    ["moviestar", "Movie star", "film", "flirt", "j:influencer:6", "Posters on bedroom walls."],
    ["ambassador", "Ambassador", "law", "network", "j:office:4 o:reuni:1.4", "Friends in every city in the world."],
    ["dataart", "Data artist", "data", "painting", "j:designer:4 z:art:2", "Makes numbers beautiful."],
    ["debate", "Debate champion", "strategy", "public", "k:comp:3 k:interview:2", "Never loses an argument on stage."],
    ["fieldsci", "Field scientist", "lab", "outdoors", "z:science:4 o:liburan:1.3", "Discoveries made in muddy boots."],
    ["landscape", "Landscape artist", "gardening", "painting", "z:art:4 o:hobi_baru:1.3", "Gardens people travel to see."],
    ["startup", "Startup hacker", "engineering", "business", "j:founder:6", "Codes the company into existence."],
    ["artteacher", "Art teacher", "teaching", "painting", "j:teacher:4 z:art:2", "Every kid in town has one of their drawings."],
    ["sportsicon", "Sports icon", "ball", "socialmedia", "j:athlete:3 j:influencer:4", "A face on every sports shoe."],
    ["biotech", "Biotech pioneer", "lab", "finance", "z:science:4 j:founder:3", "Turns lab ideas into companies."],
    ["familybiz", "Family business", "family", "business", "j:founder:3 o:usaha_sampingan:1.6", "A shop that carries the family name."],
    ["lovepoet", "Love poet", "writing", "flirt", "o:jadian:1.4 o:kenalan_menarik:1.3", "Poems that win hearts."],
    ["fashionicon", "Fashion icon", "design", "flirt", "j:influencer:4 j:designer:3", "Sets the trend every season."],
    ["adventure", "Adventure filmmaker", "outdoors", "film", "o:liburan:1.6 o:cerita_perjalanan:1.6", "Films from the edge of the map."],
    ["wellness", "Wellness coach", "health", "team", "o:sakit_parah:0.7 o:sakit_tua:0.8", "Keeps the whole family healthy."],
    ["heronurse", "Hero nurse", "firstaid", "care", "j:nurse:6", "Saves a life, and that family never forgets it."],
    ["esports", "Esports star", "games", "network", "j:influencer:4 k:comp:2", "Wins tournaments with thousands watching."],
    ["soundeng", "Sound engineer", "instrument", "data", "j:software:3 j:designer:3", "Every hit song passes through their hands."],
    ["restaurant", "Restaurant chain", "cooking", "business", "j:fastfood:6 j:founder:2", "Their food in every neighborhood."],
    ["homeceo", "Household CEO", "strategy", "family", "o:berantem_rumah_tangga:0.5 o:kabar_bayi:1.2", "A big family that runs like clockwork."],
    ["bestseller", "Bestselling speaker", "writing", "public", "j:influencer:3 j:teacher:3", "Books, stages and a long signing line."],
    ["monument", "Monument maker", "building", "sculpture", "z:art:5", "A landmark that outlives them."],
    ["ocean", "Ocean scientist", "water", "lab", "z:science:4 o:liburan:1.3", "Finds something new under the sea."],
    ["partylegend", "Party legend", "rhythm", "circle", "o:pesta_pertama:1.6 o:teman_baru:1.3", "The night everyone still talks about."],
    ["mentormentor", "Mentor of mentors", "teaching", "team", "j:teacher:6", "Teachers who learned from them teach others."],
    ["cyber", "Cyber detective", "data", "law", "j:software:4 j:office:3", "Catches the hackers nobody else can."],
  ];

  // simpul rahasia: induk, syarat dari hidup makhluk itu sendiri
  const kids = (c, home) => home.children_of(c);
  const hasAch = (st, pre) => st.ach.some(a => a.id.startsWith(pre));
  const SECRETS = [
    ["prodigymind", "Prodigy mind", "mind", (c, st) => st.genes.rares.includes("genius"), "g:logic:15 z:science:4", "Born with a gift for thinking.", "Only for creatures born a genius."],
    ["ironwill", "Iron will", "body", (c, st) => st.genes.rares.includes("iron_body"), "g:fitness:15 o:sakit_parah:0.6", "A body that never quits.", "Only for creatures born with an iron body."],
    ["starpower", "Star power", "heart", (c, st) => st.genes.rares.includes("born_star"), "g:charm:15 j:influencer:4", "Heads turn when they walk in.", "Only for born stars."],
    ["wildgenius", "Wild genius", "spark", (c, st) => st.genes.rares.includes("prodigy"), "g:creativity:15 z:art:4", "Ideas nobody else would have.", "Only for born prodigies."],
    ["goldenglow", "Golden glow", "romance", (c, st) => st.genes.rares.includes("golden_fur"), "o:kenalan_menarik:1.5 j:influencer:3", "That golden fur, everyone remembers it.", "Only for golden fur."],
    ["stargazer", "Stargazer", "science", (c, st) => st.genes.rares.includes("starry"), "z:science:5 o:karya_besar:1.3", "The stars in their fur point somewhere.", "Only for starry fur."],
    ["oldsoul", "Old soul", "vital", (c, st) => st.genes.rares.includes("long_life"), "l:14 o:sakit_tua:0.7", "Seems to have lived before.", "Only for the long-lived."],
    ["nevergiveup", "Never give up", "lead", (c) => (c.info.ditolak ?? 0) >= 3, "k:interview:4", "Rejected three times, still knocking.", "Opens after being turned down three times."],
    ["underdog", "Underdog", "business", (c, st) => hasAch(st, "self_made"), "a:2", "Came from little and climbed anyway.", "Opens for the self-made."],
    ["champheart", "Champion's heart", "sport", (c, st) => hasAch(st, "prize_sport"), "z:sport:5 k:comp:2", "Knows how winning feels.", "Opens after winning a Championship."],
    ["acorn", "Golden Acorn", "lab", (c, st) => hasAch(st, "prize_science"), "z:science:5 g:logic:10", "A laureate's curiosity.", "Opens after winning the Golden Acorn."],
    ["muse", "Muse", "art", (c, st) => hasAch(st, "prize_art"), "z:art:5 g:creativity:10", "Inspiration that never runs dry.", "Opens after winning an Art prize."],
    ["summit", "Top of the ladder", "team", (c, st) => hasAch(st, "top_"), "k:review:3 a:1", "Has seen the view from the top.", "Opens after reaching the top of a career."],
    ["fullhouse", "Full house", "family", (c, st, home) => kids(c, home).length >= 3, "o:main_sama_cucu:1.5 o:kabar_bayi:1.2", "Three kids and counting.", "Opens with three children."],
    ["grandheart", "Grandheart", "romance", (c, st, home) => kids(c, home).some(k => kids(k, home).length > 0), "o:main_sama_cucu:1.6 o:sakit_tua:0.85", "Lives for the grandkids.", "Opens when a grandchild is born."],
    ["latebloom", "Late bloomer", "health", (c, st, home, day) => phase_of(c.age(day)) === "tua", "o:senam_lansia:1.5 o:sakit_tua:0.8", "Best years came last.", "Opens in old age."],
    ["twintalent", "Twin talents", "spark", (c, st) => Object.values(st.genes.talent).filter(v => v >= 8).length >= 2, "g:creativity:8 g:logic:8 g:charm:8 g:fitness:8", "Good at two things, really good.", "Only for creatures with two big talents."],
    ["allrounder", "All-rounder", "trunk", (c, st) => Object.values(st.skills).every(v => v >= 35), "a:2", "Can do a bit of everything.", "Opens when every skill reaches 35."],
    ["familyway", "Family way", "trunk", (c, st) => { const L = st.tree && st.tree.legacy; return !!L && st.tree.have.includes(L.path[1] || L.root); }, "a:1 o:reuni:1.3", "Carries the family's path forward.", "Only for heirs who carry on the family path."],
    ["oldmoney", "Old money", "finance", (c, st) => st.wallet >= 100000, "j:founder:3 j:quant:3", "Money that makes more money.", "Opens with 100,000 coins saved."],
  ];

  const COST = { root: 2, field: 3, spec: 4, niche: 6, combo: 7, secret: 3, legend: 8, master: 10, icon: 12, crown: 15 };
  const TIER_LABEL = { root: "Constellation", field: "Bright star", spec: "Star", niche: "Calling", combo: "Crossroad", secret: "Hidden star",
    legend: "Legend", master: "Master", icon: "Icon", crown: "Crown" };
  // empat lingkar terluar: hanya bisa diraih dalam satu hidup, dan tiga yang terakhir butuh bakat.
  // Latihan keras (skill 90+) dihitung +1 bakat, jadi pekerja keras bisa sampai Icon, tapi Crown tetap untuk yang berbakat.
  const GATE = { master: 7, icon: 8, crown: 9 };
  const ICONS = {
    sport: ["Olympian", "Their name is on the stadium."], vital: ["Ageless", "Still climbing hills when everyone else has stopped."],
    hands: ["Master craftsman", "People queue for anything their hands make."], science: ["Laureate", "A discovery that changes every textbook."],
    numbers: ["Oracle", "Sees the pattern before anyone else."], words: ["Voice of a generation", "Words people quote without knowing who said them."],
    art: ["Old master", "Their work hangs where the whole town comes to look."], music: ["Maestro", "The whole town hums their songs."],
    media: ["Superstar", "Everyone knows their face."], social: ["Beloved by all", "Every door in town is open to them."],
    romance: ["Great love", "A love story the town tells its children."], lead: ["Visionary", "They decide where the town goes next."],
  };
  const CROWNS = {
    body: ["Titan", "The strongest life the town has ever seen."], mind: ["Sage", "The wisest mind of their age."],
    spark: ["Eternal muse", "A gift that comes once in many lifetimes."], heart: ["Heart of the town", "Everyone's favourite, for generations."],
  };

  // ---------------------------------------------------------------- simpul jadi satu peta
  const NODES = {}, ORDER = [];
  function parseFx(s) {
    const fx = { gain: {}, job: {}, kind: {}, prize: {}, odds: {}, life: 0, all: 0 };
    for (const t of s.split(/\s+/).filter(Boolean)) {
      const [k, a, b] = t.split(":");
      if (k === "g") fx.gain[a] = (fx.gain[a] || 0) + Number(b) / 100;
      else if (k === "j") fx.job[a] = (fx.job[a] || 0) + Number(b);
      else if (k === "k") fx.kind[a] = (fx.kind[a] || 0) + Number(b);
      else if (k === "z") fx.prize[a] = (fx.prize[a] || 0) + Number(b);
      else if (k === "o") fx.odds[a] = (fx.odds[a] || 1) * Number(b);
      else if (k === "l") fx.life += Number(a);
      else if (k === "a") fx.all += Number(a);
    }
    return fx;
  }
  function add(n) { NODES[n.id] = n; ORDER.push(n.id); return n; }
  for (const [rid, rl, skill, color, gear, rfx, fields] of ROOTS) {
    add({ id: rid, label: rl, tier: "root", root: rid, skill, color, gear, req: [], fx: parseFx(rfx) });
    for (const [fid, fl, ffx, specs] of fields) {
      add({ id: fid, label: fl, tier: "field", root: rid, req: [rid], fx: parseFx(ffx) });
      for (const [sid, sl, sfx, niches] of specs) {
        add({ id: sid, label: sl, tier: "spec", root: rid, field: fid, req: [fid], fx: parseFx(sfx) });
        for (const [nid, nl, nfx, d] of niches) add({ id: nid, label: nl, tier: "niche", root: rid, field: fid, spec: sid, req: [sid], fx: parseFx(nfx), d });
      }
    }
  }
  for (const [id, label, a, b, f, d] of COMBOS) add({ id, label, tier: "combo", req: [a, b], roots: [NODES[a].root, NODES[b].root], fx: parseFx(f), d });
  for (const [id, label, parent, cond, f, d, hint] of SECRETS)
    add({ id, label, tier: "secret", req: parent === "trunk" ? [] : [parent], root: parent === "trunk" ? null : NODES[parent].root, cond, fx: parseFx(f), d, hint });
  const lower = s => /^[A-Z]{2}/.test(s) ? s : s[0].toLowerCase() + s.slice(1);
  function grow(fx, k, extra) {
    const out = parseFx(extra);
    for (const g of ["job", "kind", "prize"]) for (const [a, v] of Object.entries(fx[g])) out[g][a] = (out[g][a] || 0) + Math.round(v * k);
    for (const [a, v] of Object.entries(fx.gain)) out.gain[a] = (out.gain[a] || 0) + v * k;
    for (const [a, v] of Object.entries(fx.odds)) out.odds[a] = (out.odds[a] || 1) * Math.round((1 + (v - 1) * k) * 100) / 100;
    out.life += fx.life; out.all += fx.all;
    return out;
  }
  for (const [rid, , skill, , , , fields] of ROOTS) {
    const icons = [];
    for (const [fid, , , specs] of fields) {
      const masters = [];
      for (const [sid, sl, , niches] of specs) {
        const legends = niches.map(([nid, nl]) => add({ id: nid + "_legend", label: "Legendary " + lower(nl), tier: "legend", root: rid, field: fid, spec: sid,
          req: [nid], fx: grow(NODES[nid].fx, 1.5, "a:1"), d: `A ${lower(nl)} the whole town still talks about.` }).id);
        masters.push(add({ id: sid + "_master", label: sl + " master", tier: "master", root: rid, field: fid, req: [], reqAny: legends,
          fx: grow(NODES[sid].fx, 1.5, `a:1 g:${skill}:8`), d: `Masters every corner of ${lower(sl)}.` }).id);
      }
      icons.push(add({ id: fid + "_icon", label: ICONS[fid][0], tier: "icon", root: rid, req: [], reqAny: masters,
        fx: grow(NODES[fid].fx, 1.5, `a:2 l:7 g:${skill}:12`), d: ICONS[fid][1] }).id);
    }
    add({ id: rid + "_crown", label: CROWNS[rid][0], tier: "crown", root: rid, req: [], reqAny: icons,
      fx: parseFx(`a:4 l:21 g:${skill}:25`), d: CROWNS[rid][1] });
  }
  for (const id of ORDER) { const n = NODES[id]; n.kids = ORDER.filter(k => NODES[k].req.includes(id) || (NODES[k].reqAny || []).includes(id)); }

  // bagian dunia yang punya simpul ini (simulasi populasi, sama seperti angka % lain di game)
  const hash = s => { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return ((h >>> 0) % 10000) / 10000; };
  const SHARE_BASE = { root: 0.55, field: 0.2, spec: 0.07, niche: 0.016, combo: 0.005, secret: 0.0012, legend: 0.003, master: 0.0008, icon: 0.00015, crown: 0.00002 };
  for (const id of ORDER) {
    const n = NODES[id];
    let s = SHARE_BASE[n.tier] * (0.55 + hash(id) * 0.9);
    const jobs = Object.keys(n.fx.job);
    if (n.tier === "niche" && jobs.length) s *= Math.min(2.2, Math.max(0.35, Math.sqrt(ST.JOBS[jobs[0]].pop / 0.05)));
    n.share = s;
  }

  // ---------------------------------------------------------------- teks efek
  const ODDS = {
    teman_baru: "make a new friend", kenalan_menarik: "meet someone special", jadian: "start dating", kencan: "go on dates",
    kabar_bayi: "have a baby", main_sama_cucu: "play with the grandkids", hobi_baru: "pick up a new hobby",
    karya_besar: "make a big work", lomba: "join a competition", latihan_bakat: "practice their talent",
    liburan: "go on holiday", reuni: "have a reunion", usaha_sampingan: "start a side business", cerita_perjalanan: "travel",
    sakit_parah: "get seriously ill", kecelakaan_kecil: "have small accidents", demam: "catch a fever",
    patah_hati: "get their heart broken", putus: "break up", berantem_rumah_tangga: "fight at home",
    dimarahi_bos: "get scolded at work", dipecat: "get fired", sakit_tua: "get sick in old age",
    senam_lansia: "join the elder exercise club", pesta_pertama: "go to parties", party_kantor: "go to office parties",
    berantem_sekolah: "fight at school", pet_nyasar: "find a stray pet", selingkuh_di_party: "be tempted to cheat",
    kehilangan_sahabat: "lose a close friend", nganggur_lama: "stay jobless for long", beli_barang_mahal: "splurge on pricey things",
  };
  const KIND = { interview: "every job interview", review: "every promotion review", comp: "every competition" };
  function fxLines(fx) {
    const out = [];
    for (const [k, v] of Object.entries(fx.gain)) out.push(`Learns ${ST.SKILL_LABEL[k]} ${Math.round(v * 100)}% faster`);
    for (const [k, v] of Object.entries(fx.job)) out.push(`+${v} score for ${ST.JOBS[k].label} jobs and promotions`);
    for (const [k, v] of Object.entries(fx.kind)) out.push(`+${v} score in ${KIND[k]}`);
    for (const [k, v] of Object.entries(fx.prize)) out.push(`+${v} score for the ${ST.PRIZES[k].label}`);
    if (fx.all) out.push(`+${fx.all} score in every big moment`);
    for (const [k, v] of Object.entries(fx.odds)) {
      const p = Math.round(Math.abs(v - 1) * 100);
      out.push(`${p}% ${v > 1 ? "more" : "less"} likely to ${ODDS[k] || k}`);
    }
    if (fx.life) out.push(`Lives about ${fx.life} days longer`);
    return out;
  }

  // ---------------------------------------------------------------- poin
  // Umur, latihan, dan momen besar. Disimpan sebagai angka tertinggi supaya skill yang menurun di usia tua tidak mengambil poin.
  const AGE_EVERY = 50, SKILL_EVERY = 25, ACH_MAX = 10;
  // Penguasaan: skill di atas 40 memberi poin lagi, makin berbakat makin cepat. Ini yang membuat lingkar terluar bisa diraih dalam satu hidup.
  const MASTERY_FROM = 40, MASTERY_EVERY = 4;
  function earnedParts(c, day) {
    const st = c.st;
    const age = Math.min(24, Math.floor(Math.max(0, c.age(day)) / AGE_EVERY));
    const practice = Math.floor(Object.values(st.skills).reduce((a, b) => a + b, 0) / SKILL_EVERY);
    const moments = Math.min(ACH_MAX, st.ach.filter(a => !a.id.startsWith("tree_")).length);
    const mastery = Math.floor(Object.entries(st.skills).reduce((a, [k, v]) => a + Math.max(0, v - MASTERY_FROM) * (0.5 + st.genes.talent[k] / 10), 0) / MASTERY_EVERY);
    return { age, practice, moments, mastery };
  }
  // bakat yang dihitung untuk gerbang: latihan sampai 90 menambah satu
  let devOpen = false; // hanya untuk alat dev: membuka semua gerbang bakat
  const gateTalent = (st, root) => { if (devOpen) return 99; const k = NODES[root].skill, top = st.tree && st.tree.top ? st.tree.top[k] || 0 : 0; return st.genes.talent[k] + (Math.max(top, st.skills[k]) >= 90 ? 1 : 0); };
  function tr(st) {
    if (!st.tree) st.tree = { have: [], days: {}, peak: 0, spent: 0, legacy: null, seen: [] };
    return st.tree;
  }
  function update(c, day) {
    const T = tr(c.st), p = earnedParts(c, day);
    T.peak = Math.max(T.peak, p.age + p.practice + p.moments + p.mastery);
    T.top = T.top || {};
    for (const [k, v] of Object.entries(c.st.skills)) if (v > (T.top[k] || 0)) T.top[k] = v;
    return T;
  }
  const points = c => { const T = tr(c.st); return T.peak - T.spent; };

  function cost(c, id) {
    const n = NODES[id], st = c.st, T = tr(st);
    let v = COST[n.tier];
    if (["field", "spec", "niche"].includes(n.tier) && st.genes.talent[NODES[n.root].skill] >= 8) v -= 1;
    // jalur keluarga: tumbuh dekat dunianya, jadi lebih murah (bintangnya tetap harus dinyalakan sendiri)
    if (T.legacy && T.legacy.path.includes(id)) v -= 1;
    return Math.max(1, v);
  }

  function state(c, id, home, day) {
    const n = NODES[id], st = c.st, T = tr(st), have = new Set(T.have);
    if (have.has(id)) return "owned";
    if (n.reqAny) {
      if (!n.reqAny.some(r => have.has(r))) return "hidden";
      return gateTalent(st, n.root) >= GATE[n.tier] ? "open" : "gated";
    }
    const reqOk = n.tier === "secret" && !n.req.length ? T.have.length > 0 : n.req.every(r => have.has(r));
    const anyReq = n.req.some(r => have.has(r));
    if (n.tier === "secret") {
      if (!reqOk) return "hidden";
      return n.cond(c, st, home, day) ? "open" : "secret";
    }
    if (n.tier === "root") return "open";
    if (reqOk) return "open";
    if (n.tier === "combo" && anyReq) return "glimpse";
    return "hidden";
  }

  function canUnlock(c, id, home, day) {
    if (!NODES[id] || !c.st) return false;
    return state(c, id, home, day) === "open" && points(c) >= cost(c, id);
  }

  // ---------------------------------------------------------------- efek dipakai mesin
  const fxCache = new WeakMap();
  function fxOf(st) {
    const T = st.tree;
    if (!T || !T.have.length) return null;
    const key = T.have.join(",");
    const got = fxCache.get(T);
    if (got && got.key === key) return got.fx;
    const fx = { gain: {}, job: {}, kind: {}, prize: {}, odds: {}, all: 0 };
    for (const id of T.have) {
      const f = NODES[id].fx;
      for (const [k, v] of Object.entries(f.gain)) fx.gain[k] = (fx.gain[k] || 0) + v;
      for (const g of ["job", "kind", "prize"]) for (const [k, v] of Object.entries(f[g])) fx[g][k] = (fx[g][k] || 0) + v;
      for (const [k, v] of Object.entries(f.odds)) fx.odds[k] = (fx.odds[k] || 1) * v;
      fx.all += f.all;
    }
    fxCache.set(T, { key, fx });
    return fx;
  }
  ST.EXT.gain = (st, k) => { const fx = fxOf(st); return fx && fx.gain[k] ? 1 + fx.gain[k] : 1; };
  ST.EXT.score = (c, m) => {
    const fx = fxOf(c.st);
    if (!fx) return 0;
    let s = fx.all + (fx.kind[m.kind] || 0);
    const job = m.job || (m.kind === "comp" && c.st.job ? c.st.job.id : null);
    if (job) s += fx.job[job] || 0;
    if (m.prize) s += fx.prize[m.prize] || 0;
    return Math.round(s);
  };
  // peluang kejadian: bobot tiap cerita dikali efek pohon makhluk yang sedang dijalani
  for (const s of REGISTRY) {
    const w0 = s.weight;
    s.weight = x => {
      const v = w0(x);
      const fx = x.c.st && fxOf(x.c.st);
      return fx && fx.odds[s.id] ? v * fx.odds[s.id] : v;
    };
  }

  // jalur pertemanan juga memberi ruang untuk teman tambahan (cerita teman_baru dibatasi jumlah teman)
  const TB = REGISTRY.find(s => s.id === "teman_baru");
  if (TB) {
    const c0 = TB.cond;
    TB.cond = x => {
      if (c0(x)) return true;
      const fx = x.c.st && fxOf(x.c.st), m = fx && fx.odds.teman_baru;
      if (!m || m <= 1) return false;
      const extra = m >= 1.4 ? 2 : 1;
      const n = Object.values(x.c.relations).filter(r => r.tipe === "teman").length;
      return n < 1 + Math.floor(x.t("ramah") / 18) + extra;
    };
  }

  // poin naik tiap hari; anak dari pohon yang sudah tumbuh mewarisi satu jalur keluarga
  // kejadian yang lebih/kurang mungkin juga datang lebih cepat/lambat lagi: jeda ulangnya ikut dibagi efeknya
  const BY_ID = Object.fromEntries(REGISTRY.map(s => [s.id, s]));
  const _status = HOOKS.status;
  HOOKS.status = (x, dramas, events) => {
    _status(x, dramas, events);
    const c = x.c, T = update(c, x.day);
    const fx = fxOf(c.st);
    if (fx) for (const [id, m] of Object.entries(fx.odds)) {
      const s = BY_ID[id];
      if (s && c.cooldowns[id] === x.day + s.cooldown) c.cooldowns[id] = x.day + Math.max(1, Math.round(s.cooldown / m));
    }
    if (!T.checked) {
      T.checked = true;
      const parent = c.parents.map(p => x.home.get(p)).find(p => p && p.st && p.st.tree && p.st.tree.have.length);
      if (parent) {
        const L = legacyOf(parent);
        if (L) {
          T.legacy = { ...L, from: parent.name };
        }
      }
    }
  };
  function legacyOf(p) {
    const have = p.st.tree.have.filter(id => ["field", "spec", "niche"].includes(NODES[id].tier));
    if (!have.length) return null;
    const rank = { niche: 3, spec: 2, field: 1 };
    const deep = have.slice().sort((a, b) => rank[NODES[b].tier] - rank[NODES[a].tier])[0];
    const path = []; let n = NODES[deep];
    while (n) { path.unshift(n.id); n = n.req[0] ? NODES[n.req[0]] : null; }
    return { root: path[0], node: deep, path };
  }

  // tindakan pemain "pohon:<id>"
  const _act = HOOKS.act;
  HOOKS.act = (home, cid, kind, day) => {
    if (!kind.startsWith("pohon:")) return _act(home, cid, kind, day);
    const c = home.get(cid), id = kind.slice(6);
    if (!c || !c.st || !c.alive(day) || "keluar" in c.info) return false;
    update(c, day);
    if (!canUnlock(c, id, home, day)) return false;
    const T = tr(c.st), n = NODES[id];
    T.spent += cost(c, id);
    T.have.push(id); T.days[id] = day;
    if (n.fx.life) c.death_day += n.fx.life;
    if (["niche", "combo", "secret", "legend", "master", "icon", "crown"].includes(n.tier)) {
      const x = new Ctx(c, day, seed_rng(cid, day, "pohon"), home, true);
      const big = ["icon", "crown"].includes(n.tier);
      x.drama = big ? "besar" : "sedang";
      ST.achieve(x, "tree_" + id, n.tier === "secret" ? `Found a secret: ${n.label}.` : n.tier === "niche" || n.tier === "combo" ? `Found a calling: ${n.label}.`
        : n.tier === "crown" ? `Crowned: ${n.label}. One of the rarest lives in town.` : `Became a ${TIER_LABEL[n.tier]}: ${n.label}.`);
    }
    return true;
  };

  // ---------------------------------------------------------------- untuk UI
  function rootSpend(st) {
    const out = {}, T = st && st.tree;
    if (!T) return out;
    for (const id of T.have) { const r = NODES[id].root || (NODES[id].roots || [])[0]; if (r) out[r] = (out[r] || 0) + 1; }
    return out;
  }
  // aksesori: akar terkuat (minimal 2 simpul) dan akar kedua kalau sudah 3 simpul
  function gearOf(c) {
    const sp = rootSpend(c && c.st), ranked = Object.entries(sp).sort((a, b) => b[1] - a[1]);
    const out = [];
    if (ranked[0] && ranked[0][1] >= 2) out.push(NODES[ranked[0][0]].gear);
    if (ranked[1] && ranked[1][1] >= 3) out.push(NODES[ranked[1][0]].gear);
    return out;
  }
  function pathOf(c) {
    const T = c.st && c.st.tree;
    if (!T || !T.have.length) return [];
    return T.have.filter(id => ["niche", "combo", "secret", "legend", "master", "icon", "crown"].includes(NODES[id].tier)).map(id => NODES[id].label);
  }
  function view(c, home, day) {
    if (!c || !c.st) return null;
    const T = tr(c.st), parts = earnedParts(c, day);
    const nodes = {};
    let hidden = 0;
    for (const id of ORDER) {
      const s = state(c, id, home, day);
      nodes[id] = { s, cost: cost(c, id), day: T.days[id] ?? null };
      if (s === "hidden" || s === "secret") hidden += 1;
      if (s === "gated") nodes[id].need = { talent: GATE[NODES[id].tier], has: gateTalent(c.st, NODES[id].root), skill: NODES[NODES[id].root].skill };
    }
    return { points: points(c), earned: T.peak, spent: T.spent, parts, nodes, hidden, have: T.have.slice(), legacy: T.legacy,
      callings: T.have.filter(id => ["niche", "combo"].includes(NODES[id].tier)).length };
  }
  function info(id) {
    const n = NODES[id];
    return { ...n, lines: fxLines(n.fx), share: ST.pct(n.share), tierLabel: TIER_LABEL[n.tier], gate: GATE[n.tier] || null };
  }

  const API = { NODES, ORDER, ROOTS: ROOTS.map(r => r[0]), COMBOS, SECRETS, COST, TIER_LABEL, GATE, setDev: v => { devOpen = !!v; }, view, info, gearOf, pathOf, points,
    canUnlock, cost, fxLines, count: ORDER.length, callings: ORDER.filter(id => ["niche", "combo"].includes(NODES[id].tier)).length };
  if (typeof module !== "undefined") module.exports = API;
  else globalThis.Tree = API;
})();
