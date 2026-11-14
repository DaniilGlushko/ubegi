// Бегун «Убеги от блокировки» — кот Арчи, маскот Arka (выбран владельцем 14.11.2026; паспорт — docs/mascot/README.md).
// Модель — archi.js (копия docs/mascot/archi.js без правок), ей нужен window.RoundedBoxGeometry из rounded-box.js.
// Порядок скриптов: three.min.js → rounded-box.js → archi.js → runner.js.
//
// Договор с игрой (тот же, что у прежнего временного героя — игра не менялась):
//   window.makeRunner(THREE) → { group, update(state, dt, t) }
//   group — фигура; игра ставит group.position (x — полоса, y — высота прыжка, z — путь) и больше её не трогает.
//   Бежит в сторону −z (от камеры), лапы на y = 0, высота ≈ 1.5 (в подкате ≤ 0.9 — игра так считает столкновения).
//   state: { phase — фаза шага (рад), air — 0..1 в прыжке, vy — скорость по вертикали, slide — 0..1 подкат,
//            lean — наклон при смене полосы (рад), stop — 0..1 после столкновения, turn — 0..1 повернуться мордой к камере, shield — 0..1,
//            glance — необязательно: 0..1 оглянуться через плечо (иначе сам раз в 5,5 с) }
// Глаз-солнце у Арчи открыт всегда (так в паспорте); при столкновении он округляется от удивления.
(function () {
  window.makeRunner = function (THREE) {
    const K = 0.6;                       // 2.45 (рост Арчи сидя) × 0.6 ≈ 1.47
    const YAW = Math.PI - 0.42;          // спиной к камере, чуть боком — видно сторону открытого глаза
    const archi = window.makeArchi(THREE, window.RoundedBoxGeometry);
    // --- чтобы сзади читался кот, а не серый кубик: хвост трубой с крючком и кремовым кончиком, большие уши с розовым,
    //     светлые полоски-«табби», кремовые подушечки лап. Всё — скруглённые кубики и матовые цвета, archi.js не трогаем.
    const RB = window.RoundedBoxGeometry, mats = {};
    const mat = c => mats[c] || (mats[c] = new THREE.MeshStandardMaterial({ color: c, roughness: .85, metalness: 0 }));
    const part = (parent, [w, h, d], c, [x, y, z], rot) => { const m = new THREE.Mesh(new RB(w, h, d, 2, Math.min(.06, w / 2.2, h / 2.2, d / 2.2)), mat(c));
      m.position.set(x, y, z); if (rot) m.rotation.set(rot[0], rot[1], rot[2]); parent.add(m); return m; };
    const FUR = 0x343A48, FUR_L = 0x4C5468, TABBY = 0x6A7288, FG = 0xFFF3DC, PINK = 0xE59AA2;
    const body = archi.head.parent;                                   // корпус модели (в координатах archi.js: морда в +z, спина в −z)
    archi.tail.visible = false;                                       // свой хвост вместо короткого
    const tail = new THREE.Group(); tail.position.set(0, 1.05, -.74); body.add(tail);
    part(tail, [.26, .8, .26], FUR, [0, .36, -.06]);
    part(tail, [.26, .5, .26], FUR, [0, .9, -.12], [-.15, 0, 0]);
    part(tail, [.44, .26, .26], FUR, [.1, 1.17, -.14]);             // крючок вбок — «?» видно со спины
    part(tail, [.26, .28, .27], FG, [.29, 1.03, -.14]);             // кремовый кончик
    for (const sd of [-1, 1]) {                                       // уши: светлее и больше, розовое видно сзади
      const ear = new THREE.Group(); ear.position.set(sd * .36, .6, -.1); ear.rotation.z = -sd * .18; archi.head.add(ear);
      part(ear, [.38, .3, .16], FUR_L, [0, 0, 0]); part(ear, [.26, .18, .14], FUR_L, [sd * .02, .2, 0]); part(ear, [.13, .12, .12], FUR_L, [sd * .03, .33, 0]);
      part(ear, [.22, .2, .04], PINK, [0, .06, -.09]);
    }
    for (const z of [-.5, -.15, .2]) part(body, [1.2, .05, .14], TABBY, [0, 1.258, z]);   // полоски по спине
    for (const y of [.95, 1.13]) part(body, [.9, .07, .04], TABBY, [0, y, -.76]);
    for (const x of [-.22, 0, .22]) part(archi.head, [.09, .04, .56], TABBY, [x, .456, -.12]);
    for (const y of [.05, .2]) part(archi.head, [.66, .06, .04], TABBY, [0, y, -.48]);
    archi.legs.forEach((leg, i) => {                                  // подушечки лап мелькают на бегу
      if (i < 2) part(leg, [.2, .12, .04], PINK, [0, -.27, -.115]);
      else { part(leg, [.26, .16, .05], FG, [0, -.31, -.31]); part(leg, [.26, .04, .4], FG, [0, -.41, -.02]); }
    });
    // ночью тёмно-серая шерсть сливается с асфальтом: чуть подсвечиваем матовые цвета изнутри (цвета не меняем)
    const seen = new Set();
    archi.group.traverse(o => {
      const m = o.material; if (!m || seen.has(m) || !m.emissive) return; seen.add(m);
      if (m.emissive.getHex() === 0) m.emissive.copy(m.color).multiplyScalar(0.42);
    });
    const group = new THREE.Group();
    const rig = new THREE.Group(); group.add(rig);          // наклон, поворот, покачивание
    const holder = new THREE.Group(); rig.add(holder);      // масштаб, присед, наклон носа в прыжке
    holder.add(archi.group);
    // контровой свет сзади-сверху: читается силуэт на телефоне
    const rim = new THREE.PointLight(0xFFE2B8, 12, 5, 2); rim.position.set(.4, 2.4, 1.9); group.add(rim);
    // пузырь защиты (чай, неуязвимость после ⚡ Авто)
    const bubble = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0xFFB020, transparent: true, opacity: 0, wireframe: true, depthWrite: false }));
    bubble.position.y = .8; bubble.scale.set(.9, .9, 1.05); group.add(bubble);

    const lerp = (a, b, u) => a + (b - a) * u;
    const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
    function update(st, dt, t) {
      const sl = st.slide || 0, air = st.air || 0, stop = st.stop || 0, turn = st.turn || 0;
      const run = (1 - sl) * (1 - stop) * (1 - air);
      // походка из archi.pose (ноги ходят как sin(t·11)) — ускоряем под скорость бега через фазу шага
      const tp = st.phase * 1.25 / 11;
      archi.pose(tp, { eye: 1, look: 0, walk: 1.8 * run });
      tail.rotation.z = .22 * Math.sin(t * 3.2) - .1 * (st.lean || 0); tail.rotation.x = -.15 * air + .12 * sl;
      // каждые 5,5 с оглядывается через плечо — к камере повёрнут открытый глаз-солнце («Вижу»)
      const ph = t % 5.5, glance = st.glance != null ? st.glance : ph < 1.2 ? Math.sin(Math.PI * ph / 1.2) : 0;
      archi.head.rotation.y = -1.9 * glance * (1 - turn) * (1 - stop) * (1 - sl);
      const L = archi.legs;                                          // 0,1 — передние, 2,3 — задние
      for (let i = 0; i < 4; i++) {
        const front = i < 2;
        L[i].rotation.x = lerp(L[i].rotation.x, front ? -1.1 : 0.9, Math.max(air, sl));   // в прыжке и подкате — лапы вперёд и назад
      }
      archi.head.position.y -= .28 * sl;
      // присед: ниже и длиннее; прыжок: нос вверх на взлёте, вниз на спуске
      holder.scale.set(K * (1 + .12 * sl), K * (1 - .45 * sl), K * (1 + .22 * sl));
      holder.rotation.x = .3 * clamp((st.vy || 0) / 8, -1, 1) * air;
      holder.position.y = 0;
      // столкновение: глаз круглый от удивления, поворот мордой к камере
      if (stop > 0) archi.eyeO.scale.set(1 + .45 * stop, 1 + .45 * stop, 1);
      else archi.eyeO.scale.x = 1;
      archi.group.rotation.y = lerp(YAW, 0, turn);
      rig.rotation.z = st.lean || 0;
      rig.position.y = stop * .08 * Math.sin(Math.min(1, stop) * Math.PI);
      const sh = st.shield || 0;
      bubble.visible = sh > .01; bubble.material.opacity = .45 * sh; bubble.rotation.y = t * 1.5;
    }
    return { group, update };
  };
})();
