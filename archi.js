// Кот Арчи — маскот Arka (выбран владельцем 14.11.2026). Модель для three.js: мультики и игра.
// Обычный скрипт (не модуль), грузится из file:// и с сайта:
//   <script src="archi.js"></script>
//   import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
//   const archi = makeArchi(THREE, RoundedBoxGeometry);  scene.add(archi.group);
//   archi.pose(t, {eye:0..1, look:-1..1, walk:0..1})  — каждый кадр
// Высота сидя ≈ 2.45 условных единиц. Масштаб — archi.group.scale.setScalar(k).
// Цвета бренда: ночь #0F1219, крем #FFF3DC, солнце #FFB020. Паспорт персонажа — docs/mascot/README.md.
window.makeArchi = function (THREE, RoundedBoxGeometry) {
  const FG = 0xFFF3DC, SUN = 0xFFB020, BLACK = 0x14161C;
  const FUR = 0x343A48, FUR_D = 0x2A2F3B, PINK = 0xE59AA2, COLLAR = 0x9B2F35;
  const mats = {};
  const M = (c, r = 0.85) => mats[c + "_" + r] || (mats[c + "_" + r] = new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: 0 }));
  const glow = new THREE.MeshStandardMaterial({ color: SUN, emissive: SUN, emissiveIntensity: 1.6, roughness: 0.5 });
  const B = (g, [w, h, d], c, [x, y, z], rad = 0.06, rot = [0, 0, 0]) => {
    const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(rad, w / 2.1, h / 2.1, d / 2.1)), typeof c === "number" ? M(c) : c);
    m.position.set(x, y, z); m.rotation.set(...rot); m.castShadow = true; m.receiveShadow = true; g.add(m); return m;
  };
  const group = new THREE.Group();
  const body = new THREE.Group(); group.add(body);
  const torso = B(body, [1.25, 0.95, 1.5], FUR, [0, 0.78, 0], 0.14);
  B(body, [0.8, 0.62, 0.12], FG, [0, 0.72, 0.75], 0.05);                       // грудка
  const legs = [];
  for (const s of [-1, 1]) { const p = new THREE.Group(); p.position.set(s * 0.36, 0.34, 0.55); body.add(p); B(p, [0.3, 0.36, 0.36], FG, [0, -0.17, 0.07], 0.06); legs.push(p); }
  for (const s of [-1, 1]) { const p = new THREE.Group(); p.position.set(s * 0.5, 0.42, -0.35); body.add(p); B(p, [0.32, 0.42, 0.6], FUR_D, [0, -0.2, 0], 0.08); legs.push(p); }
  const head = new THREE.Group(); head.position.set(0, 1.62, 0.32); body.add(head);
  B(head, [1.12, 0.9, 0.95], FUR, [0, 0, 0], 0.14);
  for (const s of [-1, 1]) {
    B(head, [0.34, 0.18, 0.22], FUR, [s * 0.34, 0.52, -0.05], 0.04);
    B(head, [0.22, 0.14, 0.2], FUR, [s * 0.38, 0.66, -0.05], 0.04);
    B(head, [0.1, 0.1, 0.18], FUR, [s * 0.41, 0.77, -0.05], 0.03);
    B(head, [0.16, 0.14, 0.04], PINK, [s * 0.36, 0.56, 0.07], 0.02);
  }
  B(head, [0.5, 0.26, 0.1], FG, [0, -0.23, 0.48], 0.05);                      // мордочка
  B(head, [0.12, 0.08, 0.06], PINK, [0, -0.14, 0.54], 0.02);                 // нос
  // левый (для зрителя) глаз — тот самый, открывается раз в 10 минут; правый всегда «спит»
  const eyeO = new THREE.Group(); eyeO.position.set(-0.25, 0.08, 0); head.add(eyeO);
  B(eyeO, [0.22, 0.22, 0.05], glow, [0, 0, 0.49], 0.03);
  const pupil = B(eyeO, [0.08, 0.16, 0.03], M(BLACK), [0, 0, 0.52], 0.01);
  B(eyeO, [0.05, 0.05, 0.02], M(0xffffff), [-0.04, 0.06, 0.535], 0.01);
  const eyeC = B(head, [0.24, 0.05, 0.05], M(BLACK), [-0.25, 0.06, 0.49], 0.02);
  B(head, [0.24, 0.05, 0.05], M(BLACK), [0.25, 0.06, 0.49], 0.02);
  for (const s of [-1, 1]) for (const dy of [-0.02, 0.06]) B(head, [0.32, 0.022, 0.022], M(FG, 0.6), [s * 0.42, -0.22 + dy, 0.5], 0.005);
  B(body, [0.98, 0.1, 0.12], M(COLLAR), [0, 1.2, 0.62], 0.04);              // ошейник
  B(body, [0.16, 0.16, 0.06], glow, [0, 1.08, 0.7], 0.03);                   // медальон (солнце)
  const tail = new THREE.Group(); tail.position.set(0.55, 0.55, -0.7); body.add(tail);
  B(tail, [0.2, 0.2, 0.7], FUR, [0, 0, -0.3], 0.08); B(tail, [0.2, 0.75, 0.2], FUR, [0, 0.35, -0.6], 0.08);

  // pose(t, o): o.eye — 0 закрыт / 1 открыт; o.look — взгляд влево-вправо (-1..1); o.walk — 0..1 сила ходьбы
  function pose(t, o = {}) {
    const eye = o.eye ?? 0, walk = o.walk ?? 0, look = o.look ?? 0;
    eyeO.scale.y = Math.max(0.05, eye); eyeO.visible = eye > 0.06; eyeC.visible = eye <= 0.06;
    pupil.position.x = 0.04 * look; head.rotation.y = 0.25 * look;
    const br = Math.sin(t * 2.1);
    torso.scale.y = 1 + 0.02 * br; head.position.y = 1.62 + 0.015 * br;
    tail.rotation.z = 0.25 * Math.sin(t * 2.6) + (walk ? 0.3 : 0);
    for (let i = 0; i < 4; i++) legs[i].rotation.x = walk * 0.6 * Math.sin(t * 11 + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI : 0));
    body.position.y = walk * 0.05 * Math.abs(Math.sin(t * 11));
  }
  return { group, head, eyeO, eyeC, tail, legs, pose, height: 2.45 };
};
