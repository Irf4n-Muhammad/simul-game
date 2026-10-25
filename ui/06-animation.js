// ================================================================ animation state
// habits: every creature gets two from its id, and they shape what it does when left alone
const HABITS = {
  curious: { label: "Looks around at everything", idle: { look: 4 } },
  bouncy: { label: "Hops when it's happy", idle: { hop: 4 } },
  chaser: { label: "Chases its own tail", idle: { spin: 3 } },
  dozy: { label: "Yawns and stretches a lot", idle: { stretch: 4 } },
  hummer: { label: "Hums little tunes", idle: { hum: 3 } },
  twitchy: { label: "Ears never stay still", idle: { twitch: 5 } },
  follower: { label: "Follows your finger with its eyes", follow: 2.2 },
};
const hashStr = str => { let h = 2166136261; for (const ch of String(str)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };
function habitsOf(id) {
  const keys = Object.keys(HABITS), h = hashStr("kebiasaan:" + id), a = h % keys.length, b = (a + 1 + (h >>> 8) % (keys.length - 1)) % keys.length;
  return [keys[a], keys[b]];
}
let snapEl = null;
let joyUntil = 0, surpriseUntil = 0, idleAt = 4000, idle = null, idleLook = { x: 0, y: 0 };
let anim = null, mouthOpen = 0, talkUntil = 0, chewUntil = 0, blinkAt = 1500, lookX = 0, lookY = 0, rubbing = 0, napUntil = 0;
const play = (type, dur) => { anim = { type, t0: performance.now(), dur }; };

