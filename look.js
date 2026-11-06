// v79: Look, shading dunia luar. Satu patch shader kecil buat semua MeshStandardMaterial di kota, tanpa render pass tambahan
// (jadi tetap ringan di HP): tidak ada render target, tidak ada blur. Isinya:
// - AO dinding: sisi tegak menggelap pelan ke arah tanah, jadi gedung kelihatan "berdiri" di tanah, bukan nempel.
// - Cahaya langit di tepi (fresnel): pinggiran benda dapat sedikit warna langit, jadi bentuknya kebaca walau di bayangan.
// - Grading: saturasi, bayangan dingin (biru), bagian terang hangat (krem), sesuai jam dan cuaca.
// Palet per jam juga ngatur warna hemisphere (langit biru di atas, tanah hangat di bawah) supaya bayangan terasa sejuk.
// Murni skin: tidak dibaca engine, game, atau simulasi.
"use strict";
(function () {
  // ao = gelap maksimum di kaki dinding, aoH = setinggi apa (unit dunia), sat = saturasi, rim = kuat cahaya tepi,
  // cool/warm = pengali warna bayangan/terang, sky/gnd = warna hemisphere, sunK/hemiK = pengali intensitas
  const P = {
    morning: { ao: 0.42, aoH: 1.1, sat: 1.12, rim: 0.22, cool: 0xd6dcec, warm: 0xfff0dc, sky: 0xc4d4ee, gnd: 0x9a8264, sunK: 1.35, hemiK: 0.95, con: 1.12, exp: 0.92 },
    day: { ao: 0.4, aoH: 1.1, sat: 1.14, rim: 0.2, cool: 0xd4dcee, warm: 0xfff5e6, sky: 0xbfd6f2, gnd: 0x8e8466, sunK: 1.4, hemiK: 0.95, con: 1.12, exp: 0.87 },
    evening: { ao: 0.45, aoH: 1.2, sat: 1.1, rim: 0.3, cool: 0xc6c2e0, warm: 0xffe0bf, sky: 0xa6a3d2, gnd: 0x8a6a58, sunK: 1.4, hemiK: 0.9, con: 1.14, exp: 0.92 },
    night: { ao: 0.5, aoH: 1.2, sat: 0.95, rim: 0.35, cool: 0xb6bfd8, warm: 0xfff0d8, sky: 0x5d6d9e, gnd: 0x3a3440, sunK: 1.0, hemiK: 1.1, con: 1.08, exp: 1.0 },
  };
  // cuaca: mendung/hujan meredam saturasi dan kehangatan
  const WX = { clear: [1, 1], cloud: [0.9, 0.6], fog: [0.85, 0.4], rain: [0.82, 0.35], storm: [0.75, 0.2], snow: [0.85, 0.45] };

  function create(THREE) {
    const U = {
      uLook: { value: new THREE.Vector4(0.4, 1.1, 1.1, 0.2) },   // ao, aoH, sat, rim
      uCool: { value: new THREE.Color(1, 1, 1) },
      uWarm: { value: new THREE.Color(1, 1, 1) },
      uSky: { value: new THREE.Color(0.7, 0.8, 1) },
      uGrade: { value: new THREE.Vector2(1, 1) },   // kontras (pangkat di sekitar abu tengah), eksposur
    };
    const VERT_HEAD = "#include <common>\nvarying vec3 vLkW;";
    const VERT_BODY = `#include <project_vertex>
      vec4 lkW = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        lkW = instanceMatrix * lkW;
      #endif
      vLkW = (modelMatrix * lkW).xyz;`;
    const FRAG_HEAD = "#include <common>\nvarying vec3 vLkW;\nuniform vec4 uLook;\nuniform vec3 uCool;\nuniform vec3 uWarm;\nuniform vec3 uSky;\nuniform vec2 uGrade;";
    const FRAG_BODY = `{
        vec3 lkN = inverseTransformDirection(normal, viewMatrix);
        float side = 1.0 - clamp(abs(lkN.y), 0.0, 1.0);
        float ao = mix(1.0 - uLook.x, 1.0, smoothstep(-0.05, uLook.y, vLkW.y));
        ao = mix(1.0, ao, side);
        vec3 lkV = normalize(cameraPosition - vLkW);
        float fr = pow(1.0 - clamp(dot(lkN, lkV), 0.0, 1.0), 3.0) * (0.35 + 0.65 * side);
        vec3 c = gl_FragColor.rgb * ao + uSky * fr * uLook.w * (0.25 + 0.75 * ao);
        float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
        c = max(mix(vec3(l), c, uLook.z), 0.0);
        c *= mix(uCool, uWarm, smoothstep(0.02, 0.5, l));
        c = 0.18 * pow(c / 0.18, vec3(uGrade.x)) * uGrade.y;
        gl_FragColor.rgb = c;
      }
      #include <tonemapping_fragment>`;
    function patch(m) {
      if (!m || !m.isMeshStandardMaterial || m.userData.look) return false;
      m.userData.look = true;
      const prev = m.onBeforeCompile;
      m.onBeforeCompile = (sh, r) => {
        if (prev) prev(sh, r);
        Object.assign(sh.uniforms, U);
        sh.vertexShader = sh.vertexShader.replace("#include <common>", VERT_HEAD).replace("#include <project_vertex>", VERT_BODY);
        sh.fragmentShader = sh.fragmentShader.replace("#include <common>", FRAG_HEAD).replace("#include <tonemapping_fragment>", FRAG_BODY);
      };
      const key = m.customProgramCacheKey ? m.customProgramCacheKey.bind(m) : () => "";
      m.customProgramCacheKey = () => key() + "|look1";
      m.needsUpdate = true;
      return true;
    }
    // semua material di adegan (dipanggil tiap ganti jam/cuaca dan sesudah ada bangunan baru; yang sudah ditambal dilewati)
    function patchScene(root) {
      let n = 0;
      root.traverse(o => { if (!o.material) return; for (const m of [].concat(o.material)) if (patch(m)) n++; });
      return n;
    }
    const lin = (hex, out) => out.setHex(hex).convertSRGBToLinear();
    const _w = new THREE.Color(1, 1, 1);
    // atur uniform + lampu dari jam dan cuaca. hemi/sun = lampu kota; base = intensitas yang sudah dihitung kota
    function apply(period, wx, hemi, sun) {
      const p = P[period] || P.day, w = WX[wx] || WX.clear;
      U.uLook.value.set(p.ao, p.aoH, 1 + (p.sat - 1) * w[0] - (1 - w[0]) * 0.25, p.rim);
      lin(p.cool, U.uCool.value).lerp(_w, 1 - w[1]);
      lin(p.warm, U.uWarm.value).lerp(_w, 1 - w[1]);
      lin(p.sky, U.uSky.value);
      U.uGrade.value.set(1 + (p.con - 1) * w[1], p.exp);
      if (hemi) { hemi.color.setHex(p.sky); hemi.groundColor.setHex(p.gnd); hemi.intensity *= 1 + (p.hemiK - 1) * w[1]; }
      if (sun) sun.intensity *= 1 + (p.sunK - 1) * w[1];   // mendung/hujan: cahaya tetap rata, bayangan nggak dipertegas
      return p;
    }
    return { U, patch, patchScene, apply };
  }
  const Look = { create, P, WX };
  if (typeof module !== "undefined") module.exports = Look; else globalThis.Look = Look;
})();
