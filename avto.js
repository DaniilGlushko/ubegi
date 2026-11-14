// Помощник «⚡ Авто» — светящаяся арка Arka, летит у плеча героя. Подсказывает (вспышка, кольца) и спасает при столкновении.
// Можно заменить этот файл, не трогая игру.
//
// Договор: window.makeAvto(THREE, kit) → { group, update(state, dt, t) }
//   group — фигура; игра ставит group.position сама.
//   state: { flash — 0..1 подсказка (впереди препятствие), save — 0..1 вспышка спасения (1 в момент спасения, потом гаснет),
//            charges — сколько зарядов (0 — арка тусклее), cam — камера (чтобы арка смотрела на игрока) }
(function () {
  window.makeAvto = function (THREE, kit) {
    const group = new THREE.Group();
    const body = new THREE.Group(); group.add(body);
    const add = (A) => new THREE.MeshBasicMaterial(Object.assign({ transparent: true, depthWrite: false }, A));
    // логотип-арка: внешняя дуга солнца, тёмная щель, светлая сердцевина
    [[.46, 0xFFB020, 0], [.34, 0x0F1219, .004], [.22, 0xFFF3DC, .008]].forEach(([w, c, z]) => {
      const m = new THREE.Mesh(new THREE.ShapeGeometry(kit.archShape(w), 16).translate(0, -.26, z), add({ color: c }));
      body.add(m);
    });
    const back = new THREE.Mesh(new THREE.ExtrudeGeometry(kit.archShape(.46), { depth: .05, bevelEnabled: false, curveSegments: 16 }).translate(0, -.26, -.052),
      new THREE.MeshBasicMaterial({ color: 0xC98A10 }));
    body.add(back);
    const glow = kit.halo(0xFFB020, 1.1, .8); group.add(glow);
    const ring = new THREE.Mesh(new THREE.RingGeometry(.3, .36, 32), add({ color: 0xFFB020, opacity: 0, blending: THREE.AdditiveBlending }));
    group.add(ring);
    const burst = kit.halo(0xFFF3DC, 4, 0); group.add(burst);

    function update(st, dt, t) {
      const f = st.flash || 0, sv = st.save || 0, dim = st.charges > 0 ? 1 : .55;
      if (st.cam) { body.quaternion.copy(st.cam.quaternion); ring.quaternion.copy(st.cam.quaternion); }
      body.rotateY(Math.sin(t * 2.1) * .35);
      body.position.y = Math.sin(t * 4) * .06;
      body.scale.setScalar(1 + f * .35 + sv * .6);
      glow.material.opacity = (.55 + .45 * f) * dim; glow.scale.setScalar(1.1 * (1 + f * 1.6 + sv * 2));
      const rp = (t * 2.2) % 1; ring.scale.setScalar(1 + rp * 3 * Math.max(f, sv)); ring.material.opacity = Math.max(f, sv) * (1 - rp) * .9;
      burst.material.opacity = sv * .9; burst.scale.setScalar(2 + (1 - sv) * 5);
    }
    return { group, update };
  };
})();
