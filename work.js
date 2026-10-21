// Kerja sebagai mekanik utama masa dewasa. Satu mesin, beberapa profil pekerjaan: perawat (Ward), office staff (Desk),
// software engineer (Sprint), fast food crew (Grill), guru (Class), dokter (Rounds), desainer (Studio), influencer (Feed),
// atlet (Club), quant (Terminal).
// Tiap hari satu shift: pekerjaan yang dikerjakan (pasien / tugas / tiket / jam sibuk), kesalahan, kepuasan, stres. Ada rekan kerja
// bernama (bos, mentor, saingan, teman), kartu keputusan harian, target mingguan, penilaian bulanan yang nyambung ke review naik jabatan.
// Pemain cuma kasih saran ("kerja:<op>:<arg>"), makhluknya bisa nolak (game._refuse). Semua acak dari seed, jadi replay sama.
"use strict";
(function () {
  const E = (typeof module !== "undefined") ? require("./engine.js") : globalThis.Engine;
  const ST = (typeof module !== "undefined") ? require("./status.js") : globalThis.Status;
  const CR = (typeof module !== "undefined") ? require("./career.js") : globalThis.Career;
  const { HOOKS, seed_rng, clamp, YEAR } = E;
  const hash = s => { let h = 2166136261; for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15; return (h >>> 0) / 4294967296; };
  const r1 = v => Math.round(v * 10) / 10;

  const FIRST = ["Ada", "Bram", "Cleo", "Dov", "Esme", "Finn", "Greta", "Hugo", "Iris", "Jules", "Kai", "Lena", "Milo", "Nora", "Otto", "Pia", "Quin", "Rosa", "Sami", "Tess", "Uma", "Vic", "Wren", "Yara"];
  const LAST = ["Ash", "Bloom", "Fern", "Lark", "Reed", "Wren", "Moss", "Hale", "Brook", "Thorn", "Vale", "Pike"];
  const name2 = k => FIRST[Math.floor(hash(k + "f") * FIRST.length)] + " " + LAST[Math.floor(hash(k + "l") * LAST.length)];

  // ---------------------------------------------------------------- profil pekerjaan
  // shift: tiap pilihan punya efek ke bayaran, stres per hari, risiko salah, mutu, dan jumlah kerjaan
  const P = {
    nurse: {
      app: "Ward", ic: "🩺", color: "#2E8B83", soft: "#EEF6F5", place: "on the ward", bossRole: "Ward manager", workplace: "hospital",
      items: "Patients", item: "patient", doneVerb: "went home", doneLbl: "Sent home", metric: "Patients happy", metricShort: "patient happiness", qual: "Care quality", inc: "mistake",
      names: ["Mr. Pebble", "Mrs. Thistle", "Old Mr. Burr", "Little Pip", "Mrs. Hazel", "Mr. Quill", "Granny Moss", "Mr. Tumble", "Miss Clover", "Mr. Bramble", "Mrs. Fennel", "Young Rowan"],
      cond: [["a sprained ankle", 1], ["the flu", 1], ["a broken arm", 1], ["recovery after surgery", 2], ["pneumonia", 2], ["a heart problem", 3], ["a bad fall", 2], ["a high fever", 1], ["kidney stones", 2], ["a long illness", 3]],
      gainK: 1, nBase: 3, flowMul: 1,
      shift: { day: ["Day shift", "", { pay: 0, s: 0, risk: 1, q: 0, n: 0 }, "☀️"], night: ["Night shift", "more mistakes at night", { pay: 0.25, s: 3, risk: 1.3, q: 0, n: 1 }, "🌙"] },
      style: { book: ["By the book", ""], extra: ["Go the extra mile", "patients love it, learns faster"] },
      certs: { icu: { label: "Intensive care", cost: 900, days: 12 }, peds: { label: "Pediatrics", cost: 600, days: 10 }, er: { label: "Emergency", cost: 750, days: 10 } }, certSfx: " nursing",
      targets: { safe: "No mistakes this week", happy: "Patients happy (80+ average)", flow: "Send {n} patients home" },
      incLine: p => `${p}'s medicine came at the wrong time.`, sayInc: (n, p) => `A mistake on ${n}'s shift: ${p} got the wrong timing on their medicine.`,
      mentorTip: "a trick for finding tricky veins", lunch: "shared lunch on the roof",
      cards: {
        worse: { t: "{p} in bed {b} is getting worse fast.", o: [["doctor", "Call the doctor", "Safe, but the doctor is busy and grumpy"], ["handle", "Handle it yourself", "Big win if skilled, risky if not"], ["mentor", "Ask {m}", "Learn something, owe them one"]],
          r: { doctor: "Called the doctor. {p} is stable again.", win: "Handled {p} alone and got it right. {boss} was impressed.", fail: "Tried to handle {p} alone and it went wrong. The doctor had to step in.", mentor: "{m} walked {n} through it. {p} is better and {n} learned something." } },
        double: { t: "The ward is two nurses short. {boss} asks {n} to stay for a double shift." },
        error: { t: "{who} gave a patient the wrong dose. Nobody else saw it.", fix: "The patient is fine", what: "the wrong dose", audit: "The wrong dose came out in an audit." },
        complaint: { t: "{p}'s family says {n} was rude during the night round.", them: "The family" },
      },
      intro: ["Every work day is one shift: patients to look after, mistakes to avoid, and a body that gets tired.", "How the patients are doing, what needs a decision, and how stressed {n} is."],
      gradeFrom: "patient happiness, people sent home, mistakes, weekly goals and how the boss feels", repNote: "Other hospitals see this on Burrow.",
    },
    office: {
      app: "Desk", ic: "🗂️", color: "#4A6FA5", soft: "#EEF2F8", place: "at the office", bossRole: "Office manager", workplace: "office", where: true,
      items: "Tasks", item: "task", doneVerb: "got done", doneLbl: "Tasks done", metric: "Work quality", metricShort: "work quality", qual: "Focus", inc: "error",
      names: ["The Q3 budget", "The Moss & Co file", "The supply order", "Payroll", "The board slides", "Client letters", "The audit binder", "Expense reports", "New-hire forms", "Meeting minutes", "The rent contract", "The yearly plan"],
      cond: [["routine", 1], ["routine", 1], ["a tight deadline", 2], ["messy numbers", 2], ["a big client", 3], ["for the board", 3], ["a quick one", 1], ["lots of back and forth", 2]],
      gainK: 1.8, nBase: 3, flowMul: 1,
      shift: { office: ["At the office", "", { pay: 0, s: 0, risk: 1, q: 0, n: 0 }, "🏢"], home: ["Work from home", "calmer, but the boss sees less", { pay: 0, s: -1.5, risk: 1.15, q: -0.02, n: 0 }, "🏠"] },
      style: { book: ["Do what's asked", ""], extra: ["Go the extra mile", "the boss notices, learns faster"] },
      certs: { sheets: { label: "Spreadsheets", cost: 500, days: 8 }, pm: { label: "Project management", cost: 800, days: 12 }, acct: { label: "Bookkeeping", cost: 650, days: 10 } }, certSfx: "",
      targets: { safe: "No errors this week", happy: "Quality 80+ on average", flow: "Finish {n} tasks" },
      incLine: p => `${p} went out with a wrong number in it.`, sayInc: (n, p) => `An error on ${n}'s desk: ${p} went out with a wrong number in it.`,
      mentorTip: "a spreadsheet shortcut that saves an hour a day", lunch: "grabbed noodles together",
      cards: {
        worse: { t: "{boss} needs {p} by five o'clock, and it's only half done.", o: [["doctor", "Get the team to split it", "Safe, but the team grumbles"], ["handle", "Push through alone", "Big win if skilled, risky if not"], ["mentor", "Ask {m}", "Learn something, owe them one"]],
          r: { doctor: "The team split {p}. It went out on time.", win: "Finished {p} alone, on time and clean. {boss} was impressed.", fail: "Rushed {p} alone and it went out with errors. {boss} had to fix it.", mentor: "{m} showed {n} a faster way. {p} got done and {n} learned something." } },
        double: { t: "It's month-end. {boss} asks {n} to stay late and close the books." },
        error: { t: "{who} sent a client the wrong numbers. Nobody else noticed.", fix: "The client got the right numbers", what: "the wrong numbers", audit: "The wrong numbers came out in the quarterly audit." },
        complaint: { t: "A client says {n} was rude to them on the phone.", them: "The client" },
      },
      intro: ["Every work day is a pile of tasks: reports, files and clients, with errors to avoid and a boss to keep happy.", "Which tasks are moving, what needs a decision, and how stressed {n} is."],
      gradeFrom: "work quality, tasks done, errors, weekly goals and how the boss feels", repNote: "Other companies see this on Burrow.",
    },
    software: {
      app: "Sprint", ic: "💻", color: "#6C4AB6", soft: "#F2EEF9", place: "on the team", bossRole: "Engineering manager", workplace: "company", where: true,
      items: "Tickets", item: "ticket", doneVerb: "shipped", doneLbl: "Shipped", metric: "Code quality", metricShort: "code quality", qual: "Focus", inc: "bug",
      names: ["Login page", "Checkout flow", "Search speed", "Dark mode", "Payment retries", "Sign-up form", "Crash on startup", "API timeouts", "Photo upload", "Notifications", "The settings page", "Offline mode"],
      cond: [["a small fix", 1], ["a small fix", 1], ["a new feature", 2], ["a nasty bug", 2], ["a rewrite", 3], ["a new feature", 2], ["a quick tweak", 1], ["performance work", 3]],
      gainK: 0.9, nBase: 3, flowMul: 1,
      shift: { office: ["At the office", "", { pay: 0, s: 0, risk: 1, q: 0, n: 0 }, "🏢"], home: ["Work from home", "fewer meetings, harder to ask for help", { pay: 0, s: -1.5, risk: 1.1, q: 0.01, n: 0 }, "🏠"] },
      style: { book: ["Ship fast", "more done, more bugs"], extra: ["Write tests first", "fewer bugs, learns faster"] },
      certs: { cloud: { label: "Cloud", cost: 1200, days: 12 }, sec: { label: "Security", cost: 1000, days: 10 }, ml: { label: "Machine learning", cost: 1500, days: 14 } }, certSfx: "",
      targets: { safe: "No bugs shipped this week", happy: "Code quality 80+ on average", flow: "Ship {n} tickets" },
      incLine: p => `A bug in ${p} reached users.`, sayInc: (n, p) => `A bug from ${n}'s code reached users: ${p} broke for a few hours.`,
      mentorTip: "how to find a bug in half the time", lunch: "argued about tabs and spaces over lunch",
      cards: {
        worse: { t: "{p} is broken for users right now and the support inbox is filling up.", o: [["doctor", "Roll back the release", "Safe, but the new work is undone"], ["handle", "Hotfix it live", "Big win if skilled, risky if not"], ["mentor", "Pair with {m}", "Learn something, owe them one"]],
          r: { doctor: "Rolled back. {p} works again, and the fix can wait for Monday.", win: "Hotfixed {p} live in twenty minutes. {boss} shared it in the team chat.", fail: "The hotfix broke {p} even more. {boss} had to roll it back.", mentor: "{m} paired with {n} on it. {p} is fixed and {n} learned something." } },
        double: { t: "Release night. {boss} asks {n} to stay until it ships." },
        error: { t: "{who} pushed code that shows users each other's emails. Nobody else noticed yet.", fix: "The leak was patched within the hour", what: "the email leak", audit: "The email leak came out in a security review." },
        complaint: { t: "The product manager says {n} brushed them off in standup.", them: "The product manager" },
      },
      intro: ["Every work day is a sprint of tickets: features to build, bugs to avoid, and deadlines that don't move.", "Which tickets are moving, what needs a decision, and how stressed {n} is."],
      gradeFrom: "code quality, tickets shipped, bugs, weekly goals and how the boss feels", repNote: "Other tech companies see this on Burrow.",
    },
    fastfood: {
      app: "Grill", ic: "🍔", color: "#D9822B", soft: "#FCF3EA", place: "behind the counter", bossRole: "Shift manager", workplace: "restaurant",
      items: "Rushes", item: "rush", doneVerb: "handled", doneLbl: "Rushes handled", metric: "Customer rating", metricShort: "customer rating", qual: "Speed", inc: "wrong order",
      names: ["Breakfast rush", "Lunch rush", "School's out", "Dinner rush", "Late-night crowd", "Drive-thru line", "Delivery wave", "Office lunch order"],
      cond: [["steady", 1], ["busy", 2], ["packed", 3], ["busy", 2], ["steady", 1]],
      gainK: 14, nBase: 3, flowMul: 5, count: ["orders served", (n, q) => n * (30 + q * 40)],
      shift: { day: ["Day shift", "", { pay: 0, s: 0, risk: 1, q: 0, n: 0 }, "☀️"], late: ["Late shift", "rowdier crowd", { pay: 0.2, s: 2.5, risk: 1.2, q: 0, n: 1 }, "🌙"] },
      style: { book: ["Speed first", ""], extra: ["Smile and chat", "customers love it, learns faster"] },
      certs: { food: { label: "Food safety", cost: 250, days: 6 }, lead: { label: "Shift lead", cost: 400, days: 8 }, barista: { label: "Barista", cost: 300, days: 6 } }, certSfx: "",
      targets: { safe: "No wrong orders this week", happy: "Customer rating 80+", flow: "Handle {n} rushes" },
      incLine: p => `An order got mixed up during the ${p.toLowerCase()}.`, sayInc: (n, p) => `A mix-up on ${n}'s shift: the wrong order went out during the ${p.toLowerCase()}.`,
      mentorTip: "how to work the grill and the fryer at the same time", lunch: "split a milkshake on break",
      cards: {
        worse: { t: "A bus of hungry tourists just pulled up during the {p}.", o: [["doctor", "Call {fr} in to help", "Safe, but costs a favour"], ["handle", "Run the counter alone", "Big win if quick, risky if not"], ["mentor", "Ask {m} to run the grill", "Learn something, owe them one"]],
          r: { doctor: "{fr} came in. Every tourist got fed.", win: "Ran the counter alone and nobody waited long. {boss} was impressed.", fail: "Tried to run it alone. Orders got mixed up and {boss} had to jump in.", mentor: "{m} ran the grill and showed {n} the rhythm. Everyone got fed and {n} learned something." } },
        double: { t: "Two crew called in sick. {boss} asks {n} to cover a double." },
        error: { t: "{who} served chicken that wasn't cooked through. Nobody else saw it.", fix: "The customer got a fresh meal", what: "the undercooked chicken", audit: "A food inspector traced the undercooked chicken back to the shift." },
        complaint: { t: "A customer says {n} got their order wrong and rolled their eyes.", them: "The customer" },
      },
      intro: ["Every work day is a few rushes: lines to clear, orders to get right, and feet that get tired.", "How the rushes went, what needs a decision, and how stressed {n} is."],
      gradeFrom: "customer rating, rushes handled, wrong orders, weekly goals and how the boss feels", repNote: "Other restaurants see this on Burrow.",
    },
    teacher: {
      app: "Class", ic: "📚", color: "#3E8E5E", soft: "#EDF6F0", place: "at school", bossRole: "Head teacher", workplace: "school",
      items: "Students", item: "student", doneVerb: "passed the test", doneLbl: "Passed", metric: "Class mood", metricShort: "class mood", qual: "Teaching", inc: "slip-up",
      names: ["Little Pip", "Bea", "Tomas", "Juniper", "Oskar", "Mina", "Rowan", "Lulu", "Felix", "Dot", "Arlo", "Sunny"],
      cond: [["stuck on fractions", 1], ["behind in reading", 2], ["always distracted", 2], ["new to the school", 1], ["shy in class", 1], ["struggling at home", 3], ["bored and acting out", 2], ["far behind in maths", 3]],
      gainK: 0.8, nBase: 3, flowMul: 1,
      shift: { day: ["School day", "", { pay: 0, s: 0, risk: 1, q: 0, n: 0 }, "🏫"], club: ["Run an after-school club", "extra pay, a longer day", { pay: 0.15, s: 2.5, risk: 1.15, q: 0, n: 1 }, "🧩"] },
      style: { book: ["Follow the lesson plan", ""], extra: ["Give extra help", "students love it, learns faster"] },
      certs: { sen: { label: "Special needs", cost: 600, days: 10 }, lead: { label: "School leadership", cost: 900, days: 12 }, lang: { label: "Language teaching", cost: 500, days: 8 } }, certSfx: "",
      targets: { safe: "No slip-ups this week", happy: "Class mood 80+ on average", flow: "Get {n} students through a test" },
      incLine: p => `${p}'s test got marked wrong.`, sayInc: (n, p) => `A slip-up in ${n}'s class: ${p}'s test got marked wrong.`,
      mentorTip: "a trick for getting a noisy class quiet in five seconds", lunch: "shared a pot of tea in the staff room",
      cards: {
        worse: { t: "{p} is falling further behind and their parents want a meeting.", o: [["doctor", "Bring in the school counselor", "Safe, but slow"], ["handle", "Tutor them yourself", "Big win if skilled, risky if not"], ["mentor", "Ask {m}", "Learn something, owe them one"]],
          r: { doctor: "The counselor stepped in. {p} has a plan now.", win: "Tutored {p} after class and it clicked. {boss} heard about it.", fail: "Tried to tutor {p} alone and it made things worse. {boss} had to call the parents.", mentor: "{m} showed {n} a new way to explain it. {p} is catching up and {n} learned something." } },
        double: { t: "A teacher is off sick. {boss} asks {n} to cover their class too." },
        error: { t: "{who} lost a stack of graded tests and made up the marks. Nobody else knows.", fix: "The tests were marked again", what: "the made-up marks", audit: "The made-up marks came out when a parent asked to see the test." },
        complaint: { t: "{p}'s parents say {n} was unfair to their child.", them: "The parents" },
      },
      intro: ["Every work day is a school day: students to help through, mistakes to avoid, and a voice that gets tired.", "Which students are moving, what needs a decision, and how stressed {n} is."],
      gradeFrom: "class mood, students passed, slip-ups, weekly goals and how the head teacher feels", repNote: "Other schools see this on Burrow.",
    },
    doctor: {
      app: "Rounds", ic: "⚕️", color: "#2F6F9F", soft: "#ECF3F9", place: "at the hospital", bossRole: "Chief of medicine", workplace: "hospital",
      items: "Patients", item: "patient", doneVerb: "went home", doneLbl: "Sent home", metric: "Patients happy", metricShort: "patient happiness", qual: "Diagnosis", inc: "misdiagnosis",
      names: ["Mr. Pebble", "Mrs. Thistle", "Old Mr. Burr", "Little Pip", "Mrs. Hazel", "Mr. Quill", "Granny Moss", "Mr. Tumble", "Miss Clover", "Mr. Bramble", "Mrs. Fennel", "Young Rowan"],
      cond: [["a stubborn cough", 1], ["chest pain", 3], ["a mystery rash", 2], ["a bad fall", 2], ["a high fever", 1], ["headaches that won't stop", 2], ["a heart problem", 3], ["a broken wrist", 1], ["stomach pain", 2], ["a rare infection", 3]],
      gainK: 1.2, nBase: 3, flowMul: 1.2,
      shift: { day: ["Day rounds", "", { pay: 0, s: 0, risk: 1, q: 0, n: 0 }, "☀️"], call: ["On call at night", "more pay, more mistakes", { pay: 0.3, s: 3.5, risk: 1.3, q: 0, n: 1 }, "📟"] },
      style: { book: ["Standard checks", ""], extra: ["Dig deeper", "patients trust it, learns faster"] },
      certs: { card: { label: "Cardiology", cost: 1400, days: 14 }, surg: { label: "Surgery", cost: 1800, days: 16 }, peds: { label: "Pediatrics", cost: 1100, days: 12 } }, certSfx: "",
      targets: { safe: "No misdiagnosis this week", happy: "Patients happy (80+ average)", flow: "Send {n} patients home" },
      incLine: p => `${p} got the wrong diagnosis at first.`, sayInc: (n, p) => `A misdiagnosis on ${n}'s rounds: ${p} was treated for the wrong thing for a day.`,
      mentorTip: "a question that catches what the scans miss", lunch: "ate vending machine snacks between patients",
      cards: {
        worse: { t: "{p} has symptoms that don't match any textbook.", o: [["doctor", "Order every test", "Safe, but slow and the lab grumbles"], ["handle", "Trust your gut", "Big win if skilled, risky if not"], ["mentor", "Ask {m}", "Learn something, owe them one"]],
          r: { doctor: "Every test came back. {p} is on the right treatment now.", win: "Trusted the hunch on {p} and it was right. {boss} was impressed.", fail: "The hunch on {p} was wrong. {boss} had to change the treatment.", mentor: "{m} spotted the clue with {n}. {p} is better and {n} learned something." } },
        double: { t: "The emergency room is overflowing. {boss} asks {n} to stay for another shift." },
        error: { t: "{who} gave a patient a drug they're allergic to. The patient is fine and nobody else saw.", fix: "The chart was fixed", what: "the allergy mistake", audit: "The allergy mistake came out in a chart review." },
        complaint: { t: "{p}'s family says {n} rushed them and didn't explain anything.", them: "The family" },
      },
      intro: ["Every work day is a round of patients: puzzles to solve, mistakes to avoid, and very long hours.", "How the patients are doing, what needs a decision, and how stressed {n} is."],
      gradeFrom: "patient happiness, people sent home, misdiagnoses, weekly goals and how the chief feels", repNote: "Other hospitals see this on Burrow.",
    },
    designer: {
      app: "Studio", ic: "🎨", color: "#C2457A", soft: "#FAEEF3", place: "at the studio", bossRole: "Creative director", workplace: "studio", where: true,
      items: "Briefs", item: "brief", doneVerb: "delivered", doneLbl: "Delivered", metric: "Client rating", metricShort: "client rating", qual: "Craft", inc: "redo",
      names: ["Café logo", "Book cover", "Bakery menu", "App icons", "Festival poster", "Shop window", "Brand refresh", "Wedding invites", "Website home page", "Cereal box", "Museum signs", "Band T-shirt"],
      cond: [["a quick one", 1], ["a quick one", 1], ["a picky client", 2], ["a tight deadline", 2], ["a big launch", 3], ["a new brand", 3], ["lots of feedback", 2]],
      gainK: 1.5, nBase: 3, flowMul: 1.5,
      shift: { studio: ["At the studio", "", { pay: 0, s: 0, risk: 1, q: 0, n: 0 }, "🏢"], home: ["Work from home", "calmer, fewer chats with the team", { pay: 0, s: -1.5, risk: 1.1, q: 0, n: 0 }, "🏠"] },
      style: { book: ["Do what the client asks", ""], extra: ["Push the idea further", "clients notice, learns faster"] },
      certs: { motion: { label: "Motion design", cost: 700, days: 10 }, ux: { label: "UX design", cost: 900, days: 12 }, type: { label: "Typography", cost: 450, days: 8 } }, certSfx: "",
      targets: { safe: "No redos this week", happy: "Client rating 80+ on average", flow: "Deliver {n} briefs" },
      incLine: p => `The ${p.toLowerCase()} had to be done again.`, sayInc: (n, p) => `A redo on ${n}'s desk: the client sent back the ${p.toLowerCase()}.`,
      mentorTip: "how to pick colours that never clash", lunch: "sketched on napkins over lunch",
      cards: {
        worse: { t: "The client hates the {p} draft and the launch is tomorrow.", o: [["doctor", "Give them what they ask for", "Safe, but bland"], ["handle", "Pitch a bold new take", "Big win if skilled, risky if not"], ["mentor", "Ask {m}", "Learn something, owe them one"]],
          r: { doctor: "Made the changes the client asked for. The {p} went out on time.", win: "Pitched a bold new {p} and the client loved it. {boss} was impressed.", fail: "The bold new {p} fell flat. {boss} had to calm the client down.", mentor: "{m} sat with {n} and found the fix. The client is happy and {n} learned something." } },
        double: { t: "A big pitch is due. {boss} asks {n} to stay late and finish the slides." },
        error: { t: "{who} used a photo without paying for it in a client ad. Nobody else noticed.", fix: "The photo was swapped out", what: "the unpaid photo", audit: "The photographer found the unpaid photo and sent a bill." },
        complaint: { t: "A client says {n} ignored their feedback.", them: "The client" },
      },
      intro: ["Every work day is a stack of briefs: ideas to make real, redos to avoid, and clients to keep happy.", "Which briefs are moving, what needs a decision, and how stressed {n} is."],
      gradeFrom: "client rating, briefs delivered, redos, weekly goals and how the boss feels", repNote: "Other studios see this on Burrow.",
    },
    influencer: {
      app: "Feed", ic: "📱", color: "#E0569B", soft: "#FCEEF5", place: "online", bossRole: "Talent manager", workplace: "agency", where: true,
      items: "Posts", item: "post", doneVerb: "went live", doneLbl: "Posted", metric: "Fan mood", metricShort: "fan mood", qual: "Content", inc: "backlash",
      names: ["Morning routine", "Café review", "Outfit check", "Live Q&A", "Brand collab", "Travel vlog", "Recipe reel", "Dance trend", "Unboxing", "Day in my life", "Room tour", "Pet cam"],
      cond: [["a quick story", 1], ["a reel", 2], ["a long vlog", 3], ["a sponsored post", 2], ["a quick story", 1]],
      gainK: 6, nBase: 3, flowMul: 5, count: ["new followers", (n, q) => n * (150 + q * 450)],
      shift: { home: ["Film at home", "", { pay: 0, s: 0, risk: 1, q: 0, n: 0 }, "🏠"], out: ["Film out and about", "fresher posts, more tiring", { pay: 0.1, s: 2, risk: 1.1, q: 0.02, n: 1 }, "📍"] },
      style: { book: ["Play it safe", ""], extra: ["Be real with fans", "fans love it, learns faster"] },
      certs: { video: { label: "Video editing", cost: 400, days: 8 }, photo: { label: "Photography", cost: 450, days: 8 }, voice: { label: "Public speaking", cost: 350, days: 6 } }, certSfx: "",
      targets: { safe: "No backlash this week", happy: "Fan mood 80+ on average", flow: "Put out {n} posts" },
      incLine: p => `The ${p.toLowerCase()} got a wave of angry comments.`, sayInc: (n, p) => `Backlash on ${n}'s feed: the ${p.toLowerCase()} got a wave of angry comments.`,
      mentorTip: "when to post so more people see it", lunch: "filmed a silly duet together",
      cards: {
        worse: { t: "The comments under the {p} are turning ugly.", o: [["doctor", "Turn off comments", "Safe, but fans feel shut out"], ["handle", "Reply to everyone", "Big win if charming, risky if not"], ["mentor", "Ask {m}", "Learn something, owe them one"]],
          r: { doctor: "Comments are off. Things calmed down after a day.", win: "Replied to everyone and won them back. {boss} was impressed.", fail: "The replies made it worse. {boss} had to post a statement.", mentor: "{m} helped {n} write one honest reply. Fans came round and {n} learned something." } },
        double: { t: "A brand wants two extra videos by tomorrow. {boss} asks {n} to film tonight." },
        error: { t: "{who} forgot to mark a paid post as an ad. Nobody noticed yet.", fix: "The ad label was added", what: "the hidden ad", audit: "A watchdog account flagged the hidden ad." },
        complaint: { t: "A brand says {n} was rude on a call.", them: "The brand" },
      },
      intro: ["Every work day is a few posts: ideas to film, backlash to avoid, and fans who want more.", "Which posts went live, what needs a decision, and how stressed {n} is."],
      gradeFrom: "fan mood, posts put out, backlash, weekly goals and how the manager feels", repNote: "Brands see this on Burrow.",
    },
    athlete: {
      app: "Club", ic: "🏅", color: "#C0392B", soft: "#FBEDEB", place: "at the club", bossRole: "Coach", workplace: "club",
      items: "Drills", item: "drill", doneVerb: "nailed", doneLbl: "Nailed", metric: "Coach rating", metricShort: "coach rating", qual: "Form", inc: "knock",
      names: ["Sprint drills", "Ball work", "Strength day", "Set pieces", "Recovery swim", "Tactics review", "Match prep", "Endurance run", "Agility ladder", "Penalty practice"],
      cond: [["light", 1], ["hard", 2], ["brutal", 3], ["hard", 2], ["light", 1]],
      gainK: 4, nBase: 3, flowMul: 3,
      shift: { day: ["Regular training", "", { pay: 0, s: 0, risk: 1, q: 0, n: 0 }, "⚽"], extra: ["Extra session", "match bonus, sore muscles", { pay: 0.15, s: 3, risk: 1.3, q: 0.02, n: 1 }, "🔥"] },
      style: { book: ["Follow the plan", ""], extra: ["Stay after practice", "the coach notices, learns faster"] },
      certs: { cap: { label: "Captaincy", cost: 600, days: 10 }, phys: { label: "Sports science", cost: 800, days: 12 }, mind: { label: "Mental coaching", cost: 500, days: 8 } }, certSfx: "",
      targets: { safe: "No knocks this week", happy: "Coach rating 80+ on average", flow: "Nail {n} drills" },
      incLine: p => `Took a knock during ${p.toLowerCase()}.`, sayInc: (n, p) => `${n} took a knock during ${p.toLowerCase()} and had to sit out the rest.`,
      mentorTip: "a stretch that keeps the knees happy", lunch: "shared a big bowl of pasta after training",
      cards: {
        worse: { t: "{n}'s knee is sore and the coach wants them for {p}.", o: [["doctor", "Tell the physio", "Safe, but misses the session"], ["handle", "Play through it", "Big win if fit, risky if not"], ["mentor", "Ask {m}", "Learn something, owe them one"]],
          r: { doctor: "The physio taped the knee. {n} sat out and it's fine now.", win: "Played through it and had a great session. {boss} was impressed.", fail: "The knee got worse during {p}. {boss} had to pull {n} off.", mentor: "{m} showed {n} how to take the strain off. The session went well and {n} learned something." } },
        double: { t: "Two players are injured. {boss} asks {n} to train with the first team too." },
        error: { t: "{who} skipped a drug test check-in. Nobody noticed yet.", fix: "The check-in was done late", what: "the missed check-in", audit: "The league found the missed check-in." },
        complaint: { t: "A teammate says {n} hogs the ball.", them: "The teammate" },
      },
      intro: ["Every work day is training: drills to nail, knocks to avoid, and a body that gets tired.", "How the drills went, what needs a decision, and how stressed {n} is."],
      gradeFrom: "coach rating, drills nailed, knocks, weekly goals and how the coach feels", repNote: "Other clubs see this on Burrow.",
    },
    quant: {
      app: "Terminal", ic: "📈", color: "#1F7A6D", soft: "#EAF5F3", place: "on the trading floor", bossRole: "Head of trading", workplace: "fund", where: true,
      items: "Models", item: "model", doneVerb: "went live", doneLbl: "Live", metric: "Model accuracy", metricShort: "model accuracy", qual: "Rigor", inc: "bad trade",
      names: ["Momentum signal", "Rate curve model", "Options pricer", "Risk report", "Order router", "Volatility model", "Pairs trade", "Backtest engine", "Currency hedge", "Earnings signal", "Liquidity model", "Market-making bot"],
      cond: [["a tweak", 1], ["a tweak", 1], ["a new signal", 2], ["messy data", 2], ["a full rebuild", 3], ["a new market", 3], ["speed work", 2]],
      gainK: 0.9, nBase: 3, flowMul: 1,
      shift: { office: ["On the floor", "", { pay: 0, s: 0, risk: 1, q: 0, n: 0 }, "🏢"], home: ["Work from home", "quieter, slower to react", { pay: 0, s: -1.5, risk: 1.15, q: 0, n: 0 }, "🏠"] },
      style: { book: ["Ship the model", ""], extra: ["Backtest twice", "fewer surprises, learns faster"] },
      certs: { stats: { label: "Advanced statistics", cost: 1500, days: 14 }, ml: { label: "Machine learning", cost: 1800, days: 14 }, risk: { label: "Risk management", cost: 1200, days: 12 } }, certSfx: "",
      targets: { safe: "No bad trades this week", happy: "Model accuracy 80+ on average", flow: "Put {n} models live" },
      incLine: p => `The ${p.toLowerCase()} made a bad trade.`, sayInc: (n, p) => `A bad trade on ${n}'s desk: the ${p.toLowerCase()} lost money before anyone caught it.`,
      mentorTip: "how to spot a backtest that's too good to be true", lunch: "argued about the market over sushi",
      cards: {
        worse: { t: "The {p} is losing money live and the market is moving fast.", o: [["doctor", "Switch it off", "Safe, but the desk loses the edge"], ["handle", "Fix it live", "Big win if skilled, risky if not"], ["mentor", "Ask {m}", "Learn something, owe them one"]],
          r: { doctor: "Switched the {p} off. The losses stopped.", win: "Fixed the {p} live and it made the money back. {boss} was impressed.", fail: "The live fix made it worse. {boss} had to pull the plug.", mentor: "{m} found the bug with {n}. The {p} is fine and {n} learned something." } },
        double: { t: "Markets are wild tonight. {boss} asks {n} to watch the screens until the close." },
        error: { t: "{who} left a test order running that bought far too much. Nobody noticed yet.", fix: "The order was unwound", what: "the runaway order", audit: "The runaway order came out in the risk review." },
        complaint: { t: "A trader says {n} talked down to them.", them: "The trader" },
      },
      intro: ["Every work day is a set of models: ideas to test, bad trades to avoid, and markets that never sleep.", "Which models are live, what needs a decision, and how stressed {n} is."],
      gradeFrom: "model accuracy, models live, bad trades, weekly goals and how the boss feels", repNote: "Other funds see this on Burrow.",
    },
  };
  const JOBS = Object.keys(P);
  const prof = W => P[W.job || "nurse"];
  const jobOf = c => c && c.st && c.st.job && P[c.st.job.id] ? c.st.job.id : null;
  const CERTS = P.nurse.certs;

  // ---------------------------------------------------------------- mulai kerja di satu tempat
  function init(c, home, day) {
    const j = c.st.job, k = home.id + c.id + j.co + j.since, p = P[j.id];
    const used = new Set();
    const nm = s => { let n, i = 0; do n = name2(k + s + i++); while (used.has(n)); used.add(n); return n; };
    const W = { job: j.id, co: j.co, since: day, boss: { name: nm("boss"), rel: 50 }, mates: [
      { id: "m", role: "mentor", name: nm("m"), rel: 55 }, { id: "r", role: "rival", name: nm("r"), rel: 30 }, { id: "f", role: "friend", name: nm("f"), rel: 60 }],
      pts: [], pseq: 0, shift: Object.keys(p.shift)[0], ot: "never", style: "book", certs: [], study: null, stress: 20, off: Math.floor(hash(k + "off") * 7),
      week: null, weekLast: null, month: { from: day, sat: 0, n: 0, inc: 0, disc: 0, hits: 0 }, grades: [], warn: 0, rep: 50, raise: 1,
      card: null, cardD: day, cardLast: null, today: null, hist: [], burn: 0, rest: null };
    c.st.ward = W;
    return W;
  }
  function admit(W, k, day) {
    const p = prof(W), i = W.pseq++, h = hash(k + "p" + i), cd = p.cond[Math.floor(hash(k + "c" + i) * p.cond.length)];
    W.pts.push({ id: i, name: p.names[Math.floor(h * p.names.length)], cond: cd[0], sev: cd[1], hp: Math.round(5 + hash(k + "h" + i) * 25), in: day, sat: 70 });
  }
  const offDay = (W, day) => (day + W.off) % 7 < 2;
  const working = (W, day) => !offDay(W, day) && !(W.burn > day) && W.rest !== day;
  const SH = W => prof(W).shift[W.shift] ? prof(W).shift[W.shift][2] : Object.values(prof(W).shift)[0][2];

  // ---------------------------------------------------------------- mutu kerja hari ini
  function careQ(c, W) {
    const s = c.st.skills, t = k => c.traits[k] ?? 50, w = (ST.JOBS[W.job || "nurse"] || {}).w || { logic: 0.4, charm: 0.3, fitness: 0.3 };
    const mate = W.mates.find(m => m.role === "mentor"), sk = Object.entries(w).reduce((a, [k, v]) => a + (s[k] || 0) * v, 0);
    return clamp(0.32 + sk / 100 * 0.42 + (t("rajin") - 50) / 260 + (W.style === "extra" ? 0.08 : 0) + SH(W).q
      + { never: 0, some: 0.03, always: 0.05 }[W.ot] + W.certs.length * 0.03 + (mate.rel - 50) / 1000 - Math.max(0, W.stress - 60) / 110, 0.1, 0.98);
  }
  function stressDelta(c, W) {
    const t = k => c.traits[k] ?? 50, f = W.mates.find(m => m.role === "friend");
    return 4.5 + SH(W).s + { never: 0, some: 3, always: 7 }[W.ot] + (W.style === "extra" ? 2 : 0) + (W.study ? 2 : 0)
      - (f.rel > 60 ? 1 : 0) - c.st.skills.fitness / 60 + (t("penakut") - 50) / 50;
  }
  // perkiraan efek tiap tuas, buat ditunjukin sebelum dipencet
  function preview(c, W) {
    const pay = ST.salary(c.st.job), base = { ...W }, p = prof(W);
    const at = o => { const W2 = { ...base, ...o }; return { q: Math.round(careQ(c, W2) * 100), s: r1(stressDelta(c, W2)) }; };
    return {
      shift: Object.fromEntries(Object.entries(p.shift).map(([k, o]) => [k, { ...at({ shift: k }), pay: Math.round(pay * o[2].pay) }])),
      ot: { never: { ...at({ ot: "never" }), pay: 0 }, some: { ...at({ ot: "some" }), pay: Math.round(pay * 0.2) }, always: { ...at({ ot: "always" }), pay: Math.round(pay * 0.45) } },
      style: { book: at({ style: "book" }), extra: at({ style: "extra" }) },
      now: at({}), pay };
  }

  // ---------------------------------------------------------------- satu shift
  function shift(x, W) {
    const c = x.c, day = x.day, home = x.home, rng = seed_rng(home.id, c.id, day, "ward"), k = home.id + c.id + W.co, p = prof(W), sh = SH(W);
    const lv = c.st.job.level, N = p.nBase + lv + sh.n, q = careQ(c, W);
    while (W.pts.length < N) admit(W, k, day);
    let inc = 0, disc = [], incs = [], satS = 0;
    for (const it of W.pts) {
      // kerja cepat (ship fast) selesai lebih cepat tapi lebih sering salah
      const fast = W.job === "software" && W.style === "book" ? 1.2 : 1;
      const gain = (3 + q * 13 - it.sev * 2 + (rng.random() - 0.5) * 6) * p.gainK * fast;
      it.hp = clamp(it.hp + gain, 0, 100);
      const risk = (Math.max(0, 0.016 * it.sev - q * 0.02) + 0.002) * (W.stress > 70 ? 1.8 : 1) * sh.risk * ({ never: 1, some: 1.1, always: 1.35 }[W.ot]) * (fast > 1 ? 1.4 : 1);
      if (rng.random() < risk) { inc++; it.hp = clamp(it.hp - 18, 0, 100); it.sat -= 25; incs.push(it); }
      it.sat = clamp(it.sat * 0.7 + (40 + q * 60 + (W.style === "extra" ? 6 : 0) + (rng.random() - 0.5) * 12) * 0.3, 0, 100);
      satS += it.sat;
    }
    const sat = Math.round(satS / W.pts.length);
    for (const it of W.pts.slice()) if (it.hp >= 100) { disc.push(it); W.pts.splice(W.pts.indexOf(it), 1); }
    // stres, uang, keahlian
    const dS = stressDelta(c, W) + inc * 5;
    W.stress = clamp(W.stress + dS, 0, 100);
    const pay = ST.salary(c.st.job), extra = Math.round(pay * (sh.pay + { never: 0, some: 0.2, always: 0.45 }[W.ot]));
    c.st.wallet += extra;
    const w = (ST.JOBS[W.job || "nurse"] || {}).w || { logic: 0.4, charm: 0.3, fitness: 0.3 };
    for (const [s, v] of Object.entries(w)) c.st.skills[s] = Math.min(100, Math.round((c.st.skills[s] + 0.05 * v * (W.style === "extra" ? 1.3 : 1) * Math.max(0.1, 1 - c.st.skills[s] / 120)) * 1000) / 1000);
    if (W.stress > 70) x.need("mood", -2);
    if (W.ot === "always") x.need("energi", -4);
    // belajar sertifikat
    let note = "";
    if (W.study) { W.study.left -= 1; if (W.study.left <= 0) { const K = p.certs[W.study.cert]; W.certs.push(W.study.cert); W.raise = r1x(W.raise * 1.04); note = `Finished the ${K.label} course.`; ST.achieve(x, "cert_" + W.study.cert, `Certified in ${K.label}${p.certSfx}.`); W.study = null; } }
    // bos lihat kesalahan
    if (inc) W.boss.rel = clamp(W.boss.rel - 3 * inc, 0, 100);
    // politik kantor kecil
    const R = W.mates.find(m => m.role === "rival"), F = W.mates.find(m => m.role === "friend");
    if (!note && rng.random() < 0.06) {
      if (R.rel < 40 && rng.random() < 0.5) {
        if (F.rel > 60) { note = `${R.name} tried to take credit for ${c.name}'s work, but ${F.name} spoke up for them.`; F.rel = clamp(F.rel + 3, 0, 100); }
        else { note = `${R.name} took credit for ${c.name}'s idea in the team meeting.`; W.boss.rel = clamp(W.boss.rel - 2, 0, 100); x.need("mood", -4); }
      } else { const m = rng.choice(W.mates); m.rel = clamp(m.rel + 4, 0, 100); note = { mentor: `${m.name} showed ${c.name} ${p.mentorTip}.`, rival: `${m.name} and ${c.name} actually got along today.`, friend: `${m.name} and ${c.name} ${p.lunch}.` }[m.role]; }
    }
    // burnout
    if (W.stress >= 90) {
      W.burn = day + 5; W.stress = 55; W.boss.rel = clamp(W.boss.rel - 4, 0, 100); x.need("mood", -15);
      note = `${c.name} burned out and has to take five days off.`;
      x.say(`${c.name} is completely worn out from work. The doctor orders five days of rest.`); x.remember(`Burned out as a ${ST.JOBS[W.job || "nurse"].label.toLowerCase()}.`);
    }
    const M = W.month; M.sat += sat; M.n++; M.inc += inc; M.disc += disc.length;
    if (W.week) { W.week.inc += inc; W.week.sat += sat; W.week.n++; W.week.disc += disc.length; }
    W.today = W.lastShift = { d: day, work: true, n: W.pts.length + disc.length, disc: disc.map(it => it.name), inc, incP: incs.map(it => it.name), sat, q: Math.round(q * 100), dS: r1(dS), stress: Math.round(W.stress), extra, note,
      served: p.count && disc.length ? Math.round(p.count[1](disc.length, q)) : null };
    W.hist.push([day, sat, inc, disc.length, Math.round(W.stress)]);
    if (W.hist.length > 60) W.hist.splice(0, W.hist.length - 60);
    if (inc) x.say(p.sayInc(c.name, incs[0].name));
  }
  const r1x = v => Math.round(v * 1000) / 1000;

  // ---------------------------------------------------------------- target mingguan, penilaian bulanan
  function weekly(x, W) {
    const day = x.day, c = x.c, p = prof(W);
    if (W.week && day - W.week.from >= 7) {
      const w = W.week, ok = w.k === "safe" ? w.inc === 0 : w.k === "happy" ? w.n && w.sat / w.n >= 80 : w.disc >= w.need;
      W.weekLast = { d: day, ok, label: w.label };
      if (ok) { W.boss.rel = clamp(W.boss.rel + 5, 0, 100); W.month.hits++; x.say(`${c.name} hit this week's goal ${p.place}: ${w.label.toLowerCase()}. ${W.boss.name} noticed.`); }
      W.week = null;
    }
    if (!W.week) {
      const ks = Object.keys(p.targets), kk = ks[Math.floor(hash(x.home.id + c.id + day + "wk") * ks.length)], need = Math.round((2 + c.st.job.level) * p.flowMul);
      W.week = { k: kk, from: day, need, label: p.targets[kk].replace("{n}", need), inc: 0, sat: 0, n: 0, disc: 0 };
    }
  }
  const GRADE_ADJ = { A: -8, B: -3, C: 0, D: 6 };
  function monthly(x, W) {
    const day = x.day, c = x.c, M = W.month, p = prof(W);
    if (day - M.from < 30) return;
    if (M.n >= 8) {
      const sc = M.sat / M.n + M.disc * 1.2 / p.flowMul - M.inc * 7 + M.hits * 4 + (W.boss.rel - 50) / 4;
      const g = sc >= 93 ? "A" : sc >= 80 ? "B" : sc >= 60 ? "C" : "D";
      W.grades.push({ d: day, g, sc: Math.round(sc), sat: Math.round(M.sat / M.n), inc: M.inc, disc: M.disc, hits: M.hits });
      if (W.grades.length > 12) W.grades.shift();
      W.rep = Math.round(W.rep * 0.7 + { A: 95, B: 75, C: 55, D: 25 }[g] * 0.3);
      c.st.wrep = W.rep;
      let line = `${c.name}'s monthly review from ${W.boss.name}: grade ${g}.`;
      if (g === "A") { W.raise = r1x(W.raise * 1.08); W.warn = Math.max(0, W.warn - 1); line += " A raise of 8%."; }
      else if (g === "B") { W.raise = r1x(W.raise * 1.03); line += " A small raise of 3%."; }
      else if (g === "D") { W.warn++; line += ` A formal warning (${W.warn} of 3).`; x.need("mood", -8); }
      x.say(line);
      if (W.warn >= 3) {
        const st = c.st, nm = CR.coName(st.job.co);
        st.lastWhy = "Let go"; st.job = null; st.next_review = null; st.next_comp = null; st.ready_since = day; st.retry_after = day + 4;
        delete c.info.kerja; delete c.info.level; c.st.ward = null;
        const l2 = `${nm} let ${c.name} go after three warnings.`;
        x.say(l2); x.need("mood", -12); x.drama = "sedang"; x.remember(l2);
        return;
      }
    }
    W.month = { from: day, sat: 0, n: 0, inc: 0, disc: 0, hits: 0 };
  }
  // review naik jabatan: syaratnya digeser sesuai nilai bulan terakhir
  function adjustReview(home, c, W) {
    const g = W.grades.length ? W.grades[W.grades.length - 1].g : null;
    if (!g) return;
    for (const m of ST.pendingFor(home, c.id)) if (m.kind === "review" && m.job === (W.job || "nurse") && m.adj == null) { m.req += GRADE_ADJ[g] - W.certs.length * 2; m.adj = g; }
  }

  // ---------------------------------------------------------------- kartu keputusan harian
  // kartu yang sama di semua pekerjaan; teksnya dari profil
  const CARD_O = {
    double: [["yes", "Stay", "+{pay} coins, boss happy, stress +15"], ["no", "Go home", "Boss a bit disappointed"]],
    error: [["report", "Report it", "Right thing to do, {who} won't like it"], ["talk", "Talk to {who} first", "Give them a chance to own up"], ["cover", "Keep quiet", "Friends for now, trouble if it comes out"]],
    family: [["swap", "Ask {fr} to swap", "Works if you two are close"], ["work", "Work the shift", "Miss the party"], ["sick", "Call in sick", "Boss might find out"]],
    complaint: [["sorry", "Apologise", "Calms them down"], ["explain", "Explain what happened", "Charm decides how it goes"], ["boss", "Let {boss} handle it", "Safe, boss is a bit annoyed"]],
    course: [["yes", "Sign up", "Better work and pay later, more tired now"], ["no", "Not now", "Nothing changes"]],
  };
  const cardText = (p, k) => k === "family" ? "{f}'s birthday is tomorrow, but {n} is on the roster." : k === "course" ? "A course in {cert} has a spot open. {cost} coins and {days} evenings of study." : p.cards[k].t;
  function famBirthday(home, c, day) {
    return home.members.find(m => m !== c && m.alive(day + 1) && !("keluar" in m.info) && m.age(day + 1) > 0 && m.age(day + 1) % YEAR === 0) || null;
  }
  function fill(s, V) { return s.replace(/\{(\w+)\}/g, (_, k) => V[k] ?? ""); }
  function drawCard(x, W) {
    const c = x.c, day = x.day, rng = seed_rng(x.home.id, c.id, day, "wardcard"), p = prof(W);
    if (W.card || day - W.cardD < 2 || !working(W, day + 1)) return;
    const fb = famBirthday(x.home, c, day);
    let k = fb ? "family" : rng.random() < 0.3 ? rng.choice(["worse", "worse", "double", "error", "complaint", ...(W.study || W.certs.length >= 3 ? [] : ["course"])]) : null;
    if (!k) return;
    const it = W.pts.length ? W.pts[Math.floor(rng.random() * W.pts.length)] : { name: "A " + p.item, id: 0 };
    const who = rng.random() < 0.5 ? W.mates.find(m => m.role === "rival") : W.mates.find(m => m.role === "friend");
    const CK = Object.keys(p.certs), cert = CK.filter(o => !W.certs.includes(o))[Math.floor(rng.random() * 3) % Math.max(1, 3 - W.certs.length)] || CK[0];
    const V = { p: it.name, b: (it.id % 12) + 1, n: c.name, boss: W.boss.name, m: W.mates[0].name, fr: W.mates[2].name, who: who.name, f: fb ? fb.name : "", cert: p.certs[cert].label + p.certSfx, cost: p.certs[cert].cost, days: p.certs[cert].days, pay: Math.round(ST.salary(c.st.job) * 0.6) };
    const O = k === "worse" ? p.cards.worse.o : CARD_O[k];
    W.card = { k, d: day, pid: it.id, who: who.id, cert, fam: fb ? fb.id : null, t: fill(cardText(p, k), V), o: O.map(o => [o[0], fill(o[1], V), fill(o[2], V)]) };
    W.cardD = day;
    x.say(`At work: ${W.card.t}`);
  }
  function answer(home, c, W, opt, day, by) {
    const C = W.card, p = prof(W);
    if (!C || !C.o.some(o => o[0] === opt)) return false;
    W.card = null;
    const r = hash(home.id + c.id + C.d + opt + "ans"), q = careQ(c, W), s = c.st.skills;
    const M = id => W.mates.find(m => m.id === id), up = (o, v) => { o.rel = clamp(o.rel + v, 0, 100); };
    const it = W.pts.find(o => o.id === C.pid), pn = it ? it.name : "The " + p.item;
    const V = { p: pn, n: c.name, boss: W.boss.name, m: W.mates[0].name, fr: W.mates[2].name };
    let t = "", good = null;
    if (C.k === "worse") {
      const T = p.cards.worse.r;
      if (opt === "doctor") { if (it) it.hp = clamp(it.hp + 5, 0, 100); t = fill(T.doctor, V); good = true; }
      else if (opt === "handle") { if (r < q) { if (it) it.hp = clamp(it.hp + 15, 0, 100); up(W.boss, 6); t = fill(T.win, V); good = true; } else { if (it) it.hp = clamp(it.hp - 15, 0, 100); up(W.boss, -6); W.month.inc++; t = fill(T.fail, V); good = false; } }
      else { const m = W.mates[0]; up(m, 5); s.logic = Math.min(100, s.logic + 0.4); if (it) it.hp = clamp(it.hp + 8, 0, 100); t = fill(T.mentor, V); good = true; }
    }
    if (C.k === "double") {
      if (opt === "yes") { const n = Math.round(ST.salary(c.st.job) * 0.6); c.st.wallet += n; up(W.boss, 6); W.stress = clamp(W.stress + 15, 0, 100); t = `Stayed late. +${n} coins and a grateful ${W.boss.name}, but exhausted.`; good = true; }
      else { up(W.boss, -3); t = `Went home after the normal shift. ${W.boss.name} found someone else.`; good = null; }
    }
    if (C.k === "error") {
      const m = M(C.who), Er = p.cards.error;
      if (opt === "report") { up(W.boss, 4); up(m, -22); t = `Reported ${Er.what}. ${Er.fix}. ${m.name} is cold to ${c.name} now.`; good = true; }
      else if (opt === "talk") { if (r < 0.6) { up(m, 6); t = `${m.name} owned up to the mistake after their talk. Everyone moved on.`; good = true; } else { up(m, 2); W.secret = { d: day, who: m.id }; t = `${m.name} promised to be careful but didn't tell anyone.`; good = null; } }
      else { up(m, 12); W.secret = { d: day, who: m.id }; t = `Kept quiet. ${m.name} is grateful.`; good = null; }
    }
    if (C.k === "family") {
      const f0 = home.get(C.fam), f = c.demo ? null : f0, fr = W.mates[2];
      if (opt === "swap") { if (fr.rel >= 50 || r < 0.3) { up(fr, -4); W.rest = C.d + 1; if (f) f.needs.mood = clamp(f.needs.mood + 10); c.needs.mood = clamp(c.needs.mood + 8); t = `${fr.name} took the shift. ${c.name} made it to ${f0 ? f0.name + "'s" : "the"} party.`; good = true; } else { t = `${fr.name} couldn't swap. ${c.name} worked and missed the party.`; c.needs.mood = clamp(c.needs.mood - 8); if (f) f.needs.mood = clamp(f.needs.mood - 6); good = false; } }
      else if (opt === "work") { c.needs.mood = clamp(c.needs.mood - 8); if (f) f.needs.mood = clamp(f.needs.mood - 6); up(W.boss, 2); t = `Worked the shift and missed ${f0 ? f0.name + "'s" : "the"} birthday.`; good = false; }
      else { W.rest = C.d + 1; if (r < 0.25) { up(W.boss, -10); W.warn++; t = `Called in sick, but ${W.boss.name} saw the party photos. A warning.`; good = false; } else { if (f) f.needs.mood = clamp(f.needs.mood + 10); t = `Called in sick and went to the party. Nobody found out.`; good = true; } }
    }
    if (C.k === "complaint") {
      const them = p.cards.complaint.them;
      if (opt === "sorry") { if (it) it.sat = clamp(it.sat + 15, 0, 100); t = `Apologised. ${them} calmed down.`; good = true; }
      else if (opt === "explain") { if (r < 0.3 + s.charm / 130) { if (it) it.sat = clamp(it.sat + 20, 0, 100); up(W.boss, 2); t = `Explained calmly. ${them} ended up thanking ${c.name}.`; good = true; } else { if (it) it.sat = clamp(it.sat - 15, 0, 100); up(W.boss, -4); t = `The explanation came out wrong. ${them} went to ${W.boss.name}.`; good = false; } }
      else { up(W.boss, -2); t = `${W.boss.name} smoothed it over, with a sigh.`; good = null; }
    }
    if (C.k === "course") {
      const K = p.certs[C.cert] || Object.values(p.certs)[0];
      if (opt === "yes") { if (c.st.wallet < K.cost) { t = `Not enough coins for the course.`; good = false; } else { c.st.wallet -= K.cost; W.study = { cert: C.cert, left: K.days }; t = `Signed up for ${K.label}. ${K.days} evenings of study ahead.`; good = true; } }
      else t = "Skipped the course for now.";
    }
    W.cardLast = { d: day, t, by, good };
    return true;
  }
  function autoAnswer(x, W) {
    const C = W.card, tr = k => x.t(k) ?? 50;
    if (!C || x.day - C.d < 1) return;
    const pick = { worse: tr("penakut") > 55 ? "doctor" : tr("ambisius") > 60 ? "handle" : "mentor", double: tr("ambisius") > 50 || tr("rajin") > 60 ? "yes" : "no",
      error: tr("patuh") > 55 ? "report" : tr("ramah") > 55 ? "talk" : "cover", family: tr("ramah") > 50 ? "swap" : tr("rajin") > 55 ? "work" : "sick",
      complaint: tr("ramah") > 55 ? "sorry" : "explain", course: tr("ambisius") > 50 && x.c.st.wallet > 1500 ? "yes" : "no" }[C.k];
    answer(x.home, x.c, W, pick, x.day, "self");
    if (W.cardLast) x.say(`${x.c.name} decided at work: ${W.cardLast.t}`);
  }

  // rahasia yang ketahuan belakangan
  function secret(x, W) {
    const S = W.secret, Er = prof(W).cards.error;
    if (!S) return;
    if (x.day - S.d > 20) { W.secret = null; return; }
    if (hash(x.home.id + x.c.id + x.day + "sec") < 0.04) {
      W.secret = null; W.boss.rel = clamp(W.boss.rel - 12, 0, 100); W.warn++;
      const m = W.mates.find(o => o.id === S.who);
      x.say(`${Er.audit} ${W.boss.name} found out ${x.c.name} knew. A formal warning (${W.warn} of 3).`);
      W.cardLast = { d: x.day, t: `${Er.audit} ${x.c.name} got a warning for covering for ${m.name}.`, by: "work", good: false };
    }
  }

  // ---------------------------------------------------------------- tiap hari
  const _status = HOOKS.status;
  HOOKS.status = (x, dramas, events) => {
    _status(x, dramas, events);
    const c = x.c, day = x.day;
    if (!c.st) return;
    const jb = jobOf(c);
    if (!jb || !c.st.job.co || !CR.canWork(c, day)) { if (c.st.ward && (c.st.ward.job || "nurse") !== jb) c.st.ward = null; return; }
    let W = c.st.ward;
    if (!W || W.co !== c.st.job.co || (W.job || "nurse") !== jb) W = init(c, x.home, day);
    c.st.job.raise = W.raise;
    autoAnswer(x, W);
    secret(x, W);
    if (working(W, day)) shift(x, W);
    else { W.stress = clamp(W.stress - (W.burn > day ? 8 : 9), 0, 100); W.today = { d: day, work: false, why: W.burn > day ? "burnout" : W.rest === day ? "leave" : "off", stress: Math.round(W.stress) }; }
    weekly(x, W);
    monthly(x, W);
    if (!c.st.ward) return;
    adjustReview(x.home, c, W);
    drawCard(x, W);
  };
  // gaji: kenaikan dari penilaian bulanan dan sertifikat
  const _pay = ST.EXT.pay;
  ST.EXT.pay = job => (_pay ? _pay(job) : 1) * (job.raise || 1);

  // ---------------------------------------------------------------- saran pemain: "kerja:<op>:<arg>"
  const _act = HOOKS.act;
  HOOKS.act = (home, cid, kind, day) => {
    if (!kind.startsWith("kerja:")) return _act(home, cid, kind, day);
    const c = home.get(cid);
    if (!c || !c.alive(day) || !jobOf(c) || !c.st.ward) return false;
    const [, op, arg] = kind.split(":");
    return applyAct(home, c, c.st.ward, op, arg, day);
  };
  function applyAct(home, c, W, op, arg, day) {
    if (op === "shift" && prof(W).shift[arg] && W.shift !== arg) { W.shift = arg; return true; }
    if (op === "ot" && ["never", "some", "always"].includes(arg) && W.ot !== arg) { W.ot = arg; return true; }
    if (op === "style" && ["book", "extra"].includes(arg) && W.style !== arg) { W.style = arg; return true; }
    if (op === "rest" && working(W, day + 1) && (W.rest == null || day - W.rest >= 14)) { W.rest = day + 1; W.boss.rel = clamp(W.boss.rel - 1, 0, 100); return true; }
    if (op === "card") return answer(home, c, W, arg, day, "you");
    return false;
  }

  // ---------------------------------------------------------------- tampilan
  function view(c, home, day) {
    const W = c && c.st && c.st.ward;
    if (!W || !jobOf(c) || (W.job || "nurse") !== jobOf(c)) return null;
    const j = c.st.job, M = W.month, wk = W.week, p = prof(W);
    const pend = ST.pendingFor(home, c.id).find(m => m.kind === "review");
    const g = W.grades.length ? W.grades[W.grades.length - 1] : null;
    return { ...W, job: W.job || "nurse", P: p, co: CR.coName(j.co), title: ST.title(j), ladder: [0, 1, 2, 3].map(l => ST.title(j, l)), raisePct: Math.round((W.raise - 1) * 100), basePay: Math.round(ST.salary(j) / (W.raise || 1)), next: j.level < 3 ? ST.title(j, j.level + 1) : null, level: j.level, pay: ST.salary(j), prev: preview(c, W),
      working: working(W, day), tomorrow: working(W, day + 1), offNext: Array.from({ length: 7 }, (_, i) => !working(W, day + i)),
      monthDay: day - M.from, monthAvg: M.n ? Math.round(M.sat / M.n) : null, monthInc: M.inc, monthDisc: M.disc, monthHits: M.hits,
      weekGoal: wk ? { label: wk.label, k: wk.k, day: day - wk.from, prog: wk.k === "safe" ? wk.inc : wk.k === "happy" ? (wk.n ? Math.round(wk.sat / wk.n) : null) : wk.disc, need: wk.k === "safe" ? 0 : wk.k === "happy" ? 80 : wk.need } : null,
      review: pend ? { day: pend.day, req: pend.req, adj: pend.adj } : j.level < 3 && c.st.next_review != null && c.st.next_review < 1e8 ? { day: c.st.next_review, req: null } : null,
      lastGrade: g, certsV: W.certs.map(k => p.certs[k] ? p.certs[k].label : k), studyV: W.study ? { label: p.certs[W.study.cert].label, left: W.study.left } : null,
      restOk: working(W, day + 1) && (W.rest == null || day - W.rest >= 14) };
  }

  // mode uji: pekerja tiruan yang sudah kerja beberapa minggu, nggak nyentuh save
  function demo(home, c, day, job = "nurse") {
    if (!c || !c.st || !P[job]) return null;
    const cc = Object.create(c);
    Object.assign(cc, { st: JSON.parse(JSON.stringify(c.st)), needs: { ...c.needs }, traits: { ...c.traits }, info: JSON.parse(JSON.stringify(c.info)), stats: { ...c.stats }, memory: [], demo: true });
    const since = day - 40, co = (CR.companiesAt(since, job)[0] || {}).id || null;
    cc.st.job = { id: job, level: 0, since, co };
    cc.st.ward = null; cc.st.wallet = Math.max(cc.st.wallet, 2000);
    const W = init(cc, home, since);
    for (let d = since; d <= day; d++) {
      const x = new E.Ctx(cc, d, seed_rng(c.id, d, "wdemo"), home, true);
      autoAnswer(x, W); secret(x, W);
      if (working(W, d)) shift(x, W); else { W.stress = clamp(W.stress - 9, 0, 100); W.today = { d, work: false, why: "off", stress: Math.round(W.stress) }; }
      weekly(x, W); if (cc.st.ward) monthly(x, W); if (!cc.st.ward) break;
      drawCard(x, W);
    }
    cc.vday = day;
    if (cc.st.ward && !cc.st.ward.card) { const x = new E.Ctx(cc, day, seed_rng(c.id, day, "wdemo2"), home, true); for (let i = 0; i < 6 && !cc.st.ward.card; i++) { cc.st.ward.cardD = -99; x.day = day - i; drawCard(x, cc.st.ward); } if (cc.st.ward.card) cc.st.ward.card.d = day; }
    return cc;
  }

  function demoNext(home, cc) {
    const W = cc.st.ward, d = ++cc.vday, x = new E.Ctx(cc, d, seed_rng(cc.id, d, "wdemo"), home, true);
    if (!W) return cc;
    autoAnswer(x, W); secret(x, W);
    if (working(W, d)) shift(x, W); else { W.stress = clamp(W.stress - (W.burn > d ? 8 : 9), 0, 100); W.today = { d, work: false, why: W.burn > d ? "burnout" : W.rest === d ? "leave" : "off", stress: Math.round(W.stress) }; }
    weekly(x, W); monthly(x, W);
    if (cc.st.ward) drawCard(x, cc.st.ward);
    return cc;
  }
  const demoAct = (home, cc, op, arg) => cc.st.ward ? applyAct(home, cc, cc.st.ward, op, arg, cc.vday) : false;

  const API = { CERTS, PROFILES: P, JOBS, view, careQ, working, demo, demoNext, demoAct };
  if (typeof module !== "undefined") module.exports = API;
  else globalThis.Work = API;
})();
