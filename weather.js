// weather.js: cuaca nyata sebagai kulit langit (v44.1; daftar-saran 33). Bagian murni yang bisa diuji di Node:
// kode cuaca WMO -> kulit langit, zona waktu -> kota (koordinat kasar, tanpa izin lokasi), URL Open-Meteo, dan aturan cache.
// Pengambilan data dan penerapan ke scene ada di ui/33-weather.js. Tidak pernah dibaca engine/game: cuaca hanya mengubar
// tekstur jendela, warna latar, dan lapisan hujan/salju. Tidak masuk save, tidak masuk aksi, tidak masuk telemetry selain nama kulitnya.
"use strict";
(() => {
  const SKINS = ["clear", "cloud", "rain", "snow", "fog", "storm"];
  const LABEL = { clear: "Clear", cloud: "Cloudy", rain: "Rain", snow: "Snow", fog: "Fog", storm: "Storm" };
  // kode cuaca WMO 4677 seperti yang dipakai Open-Meteo (current.weather_code)
  function skin(code) {
    const c = Number(code);
    if (!Number.isFinite(c) || c < 0) return "clear";
    if (c <= 1) return "clear";
    if (c <= 3) return "cloud";
    if (c === 45 || c === 48) return "fog";
    if ((c >= 51 && c <= 67) || (c >= 80 && c <= 82)) return "rain";
    if ((c >= 71 && c <= 77) || c === 85 || c === 86) return "snow";
    if (c >= 95 && c <= 99) return "storm";
    return "clear";
  }
  // kota utama tiap zona waktu IANA yang umum: cukup buat cuaca (presisi 0,1 derajat, kira-kira 10 km)
  const ZONES = {
    "Asia/Jakarta": [-6.2, 106.8], "Asia/Pontianak": [0.0, 109.3], "Asia/Makassar": [-5.1, 119.4], "Asia/Jayapura": [-2.5, 140.7],
    "Asia/Kuala_Lumpur": [3.1, 101.7], "Asia/Kuching": [1.6, 110.3], "Asia/Singapore": [1.3, 103.8], "Asia/Brunei": [4.9, 114.9], "Asia/Dili": [-8.6, 125.6],
    "Asia/Bangkok": [13.8, 100.5], "Asia/Ho_Chi_Minh": [10.8, 106.7], "Asia/Phnom_Penh": [11.6, 104.9], "Asia/Vientiane": [18.0, 102.6], "Asia/Yangon": [16.8, 96.2],
    "Asia/Manila": [14.6, 121.0], "Asia/Tokyo": [35.7, 139.7], "Asia/Seoul": [37.6, 127.0], "Asia/Shanghai": [31.2, 121.5], "Asia/Hong_Kong": [22.3, 114.2],
    "Asia/Taipei": [25.0, 121.5], "Asia/Kolkata": [28.6, 77.2], "Asia/Karachi": [24.9, 67.0], "Asia/Dhaka": [23.8, 90.4], "Asia/Colombo": [6.9, 79.9],
    "Asia/Kathmandu": [27.7, 85.3], "Asia/Dubai": [25.2, 55.3], "Asia/Riyadh": [24.7, 46.7], "Asia/Tehran": [35.7, 51.4], "Asia/Baghdad": [33.3, 44.4],
    "Asia/Jerusalem": [31.8, 35.2], "Asia/Kabul": [34.5, 69.2], "Asia/Tashkent": [41.3, 69.2], "Asia/Almaty": [43.2, 76.9],
    "Australia/Sydney": [-33.9, 151.2], "Australia/Melbourne": [-37.8, 145.0], "Australia/Brisbane": [-27.5, 153.0], "Australia/Perth": [-31.9, 115.9],
    "Australia/Adelaide": [-34.9, 138.6], "Pacific/Auckland": [-36.8, 174.8], "Pacific/Honolulu": [21.3, -157.9],
    "Europe/London": [51.5, -0.1], "Europe/Dublin": [53.3, -6.3], "Europe/Paris": [48.9, 2.4], "Europe/Berlin": [52.5, 13.4], "Europe/Madrid": [40.4, -3.7],
    "Europe/Rome": [41.9, 12.5], "Europe/Amsterdam": [52.4, 4.9], "Europe/Brussels": [50.8, 4.4], "Europe/Zurich": [47.4, 8.5], "Europe/Vienna": [48.2, 16.4],
    "Europe/Prague": [50.1, 14.4], "Europe/Warsaw": [52.2, 21.0], "Europe/Stockholm": [59.3, 18.1], "Europe/Oslo": [59.9, 10.8], "Europe/Copenhagen": [55.7, 12.6],
    "Europe/Helsinki": [60.2, 24.9], "Europe/Lisbon": [38.7, -9.1], "Europe/Athens": [38.0, 23.7], "Europe/Istanbul": [41.0, 29.0], "Europe/Moscow": [55.8, 37.6],
    "Europe/Kyiv": [50.5, 30.5], "Europe/Bucharest": [44.4, 26.1], "Europe/Budapest": [47.5, 19.0],
    "Africa/Cairo": [30.0, 31.2], "Africa/Lagos": [6.5, 3.4], "Africa/Nairobi": [-1.3, 36.8], "Africa/Johannesburg": [-26.2, 28.0], "Africa/Casablanca": [33.6, -7.6],
    "Africa/Accra": [5.6, -0.2], "Africa/Addis_Ababa": [9.0, 38.7], "Africa/Algiers": [36.8, 3.1],
    "America/New_York": [40.7, -74.0], "America/Chicago": [41.9, -87.6], "America/Denver": [39.7, -105.0], "America/Phoenix": [33.4, -112.1],
    "America/Los_Angeles": [34.1, -118.2], "America/Anchorage": [61.2, -149.9], "America/Toronto": [43.7, -79.4], "America/Vancouver": [49.3, -123.1],
    "America/Edmonton": [53.5, -113.5], "America/Winnipeg": [49.9, -97.1], "America/Halifax": [44.6, -63.6], "America/Detroit": [42.3, -83.0],
    "America/Mexico_City": [19.4, -99.1], "America/Guatemala": [14.6, -90.5], "America/Panama": [9.0, -79.5], "America/Havana": [23.1, -82.4],
    "America/Santo_Domingo": [18.5, -69.9], "America/Bogota": [4.7, -74.1], "America/Lima": [-12.0, -77.0], "America/Santiago": [-33.4, -70.6],
    "America/Sao_Paulo": [-23.5, -46.6], "America/Argentina/Buenos_Aires": [-34.6, -58.4], "America/Caracas": [10.5, -66.9], "America/Montevideo": [-34.9, -56.2],
  };
  const place = tz => ZONES[tz] ? ZONES[tz].slice() : null;
  const cityOf = tz => tz && ZONES[tz] ? tz.split("/").pop().replace(/_/g, " ") : null;
  const round1 = x => Math.round(Number(x) * 10) / 10;
  const url = (lat, lon) => `https://api.open-meteo.com/v1/forecast?latitude=${round1(lat)}&longitude=${round1(lon)}&current=weather_code,is_day`;
  // jawaban Open-Meteo: { current: { weather_code, is_day } } -> { code, isDay } atau null kalau bentuknya lain
  function parse(json) {
    const c = json && json.current;
    if (!c || !Number.isFinite(Number(c.weather_code))) return null;
    return { code: Number(c.weather_code), isDay: c.is_day == null ? null : Number(c.is_day) === 1 };
  }
  const fresh = (cache, now, ttl) => !!(cache && Number.isFinite(cache.t) && now - cache.t >= 0 && now - cache.t < ttl);

  const API = { SKINS, LABEL, ZONES, skin, place, cityOf, round1, url, parse, fresh, label: s => LABEL[s] || "Clear" };
  if (typeof module !== "undefined") module.exports = API;
  else globalThis.Weather = API;
})();
