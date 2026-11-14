// Мир «Убеги от блокировки»: страны маршрута (страны серверов Arka) и фигуры, построенные в коде (low-poly, без файлов).
// Каждые ~27 секунд забег въезжает в следующую страну: свои цвета, украшения по сторонам, шутка на плашке, свой бонус.
// Шутки добрые: смеёмся над дорогой и стереотипами-открытками, не над людьми. Без политики и без настоящих брендов.
//
// Страна:
//   id, name, flag, sub (подзаголовок на плашке), enter (шутка на плашке при въезде)
//   toasts — строки, которые всплывают по ходу (через 9 с после въезда и дальше каждые 7 с)
//   save — строка при спасении ⚡ Авто в этой стране; crash — строка на карточке проигрыша; near — при опасном уклонении
//   bonus — 'cake' (кексик → «Чилл»), 'tea' (чай → щит), 'big' (арки ×2 всю страну) или null
//   colors — sky (небо и туман), road, side (тротуар), field (земля), bld (три цвета домов)
//   build — дома: h (множитель высоты), off (отступ от дороги), skip (сторона без домов: -1 слева, 1 справа)
//   particles — 'snow' | 'rain' | null
//   car — фигура встречной машины; low, wall — особые фигуры вместо обычных табло (с вероятностью lowP / wallP)
//   slowP — как часто попадается «Замедление»
//   decor(THREE, kit, r, side) → THREE.Group | null — украшения для куска дороги 10 м с одной стороны (r() — случайное 0..1, одинаковое при каждом запуске)
//
// models[name](THREE, kit, opt) → THREE.Group с userData {hd: половина длины по ходу, v: скорость навстречу м/с}
(function () {
  let K = null; // кэш геометрий/материалов (строятся один раз)

  // --- склейка простых фигур в одну сетку с цветом в вершинах (один вызов отрисовки на фигуру) ---
  function P(T, geo, color, x, y, z, o) {
    o = o || {};
    const m = new T.Matrix4().compose(new T.Vector3(x || 0, y || 0, z || 0),
      new T.Quaternion().setFromEuler(new T.Euler(o.rx || 0, o.ry || 0, o.rz || 0)),
      new T.Vector3(o.sx || 1, o.sy || 1, o.sz || 1));
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    g.applyMatrix4(m);
    return { g, c: color };
  }
  function merge(T, parts) {
    let n = 0; for (const p of parts) n += p.g.attributes.position.count;
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), c = new T.Color();
    let o = 0;
    for (const p of parts) {
      const a = p.g.attributes.position, cnt = a.count; c.set(p.c);
      pos.set(a.array.subarray(0, cnt * 3), o * 3);
      for (let i = 0; i < cnt; i++) { col[(o + i) * 3] = c.r; col[(o + i) * 3 + 1] = c.g; col[(o + i) * 3 + 2] = c.b; }
      o += cnt; p.g.dispose();
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    geo.setAttribute('color', new T.BufferAttribute(col, 3));
    geo.computeVertexNormals(); geo.computeBoundingSphere();
    return geo;
  }

  function init(T, kit) {
    if (K) return K;
    const box = (w, h, d) => new T.BoxGeometry(w, h, d);
    const cyl = (a, b, h, s) => new T.CylinderGeometry(a, b, h, s || 10);
    const ico = (r) => new T.IcosahedronGeometry(r, 0);
    const sph = (r, ws, hs, half) => new T.SphereGeometry(r, ws || 10, hs || 6, 0, Math.PI * 2, 0, half ? Math.PI / 2 : Math.PI);
    const tor = (r, t, a) => new T.TorusGeometry(r, t, 5, 14, a || Math.PI * 2);
    const M = (parts) => merge(T, parts);
    const p = (...a) => P(T, ...a);
    K = { box, cyl };
    K.solid = new T.MeshLambertMaterial({ vertexColors: true, flatShading: true });
    K.glow = new T.MeshBasicMaterial({ vertexColors: true });
    K.water = new T.MeshLambertMaterial({ color: 0x1B4F70, emissive: 0x0A2236, flatShading: true });
    K.wire = new T.MeshBasicMaterial({ color: 0x9AA3B8, wireframe: true });
    const WHEEL = 0x14171E, GLASS = 0x26324A, CHROME = 0xC9CDD4, CREAM = 0xFFF3DC, RED = 0xFF4D4D;
    const wheels = (w, zf, zb, r) => [-1, 1].flatMap(s => [zf, zb].map(z => p(cyl(r, r, .22, 10), WHEEL, s * w, r, z, { rz: Math.PI / 2 })));

    // встречная машина (общая): кузов цвета c, смотрит в +z (на игрока)
    K.car = (c) => M([p(box(1.5, .55, 3.6), c, 0, .58, 0), p(box(1.3, .48, 1.9), GLASS, 0, 1.08, .05), p(box(1.34, .07, 1.75), c, 0, 1.34, .05),
      p(box(1.54, .16, .14), 0x8A8478, 0, .4, 1.82), p(box(1.54, .16, .14), 0x8A8478, 0, .4, -1.82), ...wheels(.72, 1.15, -1.15, .3)]);
    K.carGlow = M([p(box(.3, .12, .05), CREAM, -.5, .66, 1.81), p(box(.3, .12, .05), CREAM, .5, .66, 1.81)]);
    // старый седан (Албания): угловатый, длинный, светлый, хромированные бамперы
    K.sedan = M([p(box(1.62, .52, 4.5), 0xE8DFC9, 0, .6, 0), p(box(1.42, .46, 2.0), GLASS, 0, 1.08, -.15), p(box(1.46, .07, 2.05), 0xE8DFC9, 0, 1.33, -.15),
      p(box(1.7, .15, .16), CHROME, 0, .42, 2.27), p(box(1.7, .15, .16), CHROME, 0, .42, -2.27), p(box(.9, .22, .04), 0x3A3F4A, 0, .66, 2.26),
      p(box(1.64, .05, 4.52), 0xB9A98A, 0, .78, 0), ...wheels(.76, 1.45, -1.45, .31)]);
    K.sedanGlow = M([p(cyl(.11, .11, .05, 10), 0xFFE6B8, -.6, .68, 2.26, { rx: Math.PI / 2 }), p(cyl(.11, .11, .05, 10), 0xFFE6B8, .6, .68, 2.26, { rx: Math.PI / 2 })]);
    // жёлтый школьный автобус (США), стоит поперёк пути — обходить по соседней полосе
    K.bus = M([p(box(1.72, 1.8, 6.2), 0xF2B21B, 0, 1.2, 0), p(box(1.74, .09, 6.22), 0x1A1A1A, 0, .98, 0), p(box(1.74, .09, 6.22), 0x1A1A1A, 0, 1.38, 0),
      p(box(1.74, .1, 6.22), 0xF7F2E6, 0, 2.15, 0), p(box(1.5, .62, .05), GLASS, 0, 1.72, 3.11), p(box(1.6, .5, .9), 0xF2B21B, 0, .75, 3.4),
      p(box(1.66, .14, .14), 0x1A1A1A, 0, .48, 3.86), ...wheels(.8, 2.1, -2.1, .4)]);
    K.busGlow = M([p(box(.24, .16, .05), CREAM, -.55, .9, 3.86), p(box(.24, .16, .05), CREAM, .55, .9, 3.86),
      p(box(.16, .16, .05), RED, -.7, 2.0, 3.12), p(box(.16, .16, .05), RED, .7, 2.0, 3.12),
      ...[-1, 1].map(s => p(box(.02, .5, 5.2), 0xFFE6A8, s * .87, 1.72, -.3))]);
    // красный двухэтажный автобус (Великобритания), едет навстречу
    K.decker = M([p(box(1.72, 1.45, 5.2), 0xD7262E, 0, .98, 0), p(box(1.72, 1.3, 5.2), 0xD7262E, 0, 2.36, 0), p(box(1.74, .1, 5.22), 0xF3E6C8, 0, 1.72, 0),
      p(box(1.6, .1, 5.1), 0xB81E25, 0, 3.05, 0), ...wheels(.8, 1.75, -1.75, .38)]);
    K.deckerGlow = M([p(box(1.4, .46, .05), 0xFFE6A8, 0, 2.42, 2.61), p(box(1.4, .4, .05), 0xFFE6A8, 0, 1.25, 2.61),
      ...[-1, 1].flatMap(s => [p(box(.02, .42, 4.4), 0xFFE6A8, s * .87, 2.42, -.2), p(box(.02, .38, 3.6), 0xFFE6A8, s * .87, 1.25, -.6)]),
      p(box(.26, .14, .05), CREAM, -.58, .55, 2.61), p(box(.26, .14, .05), CREAM, .58, .55, 2.61), p(box(.9, .22, .05), 0x1A1F2C, 0, 2.86, 2.61)]);
    // велосипед поперёк полосы (Нидерланды) — перепрыгнуть
    K.bike = M([p(tor(.32, .04), 0x1A1F2C, -.52, .36, 0), p(tor(.32, .04), 0x1A1F2C, .52, .36, 0),
      p(box(.66, .06, .06), 0x2F86B8, .02, .66, 0), p(box(.06, .06, .62), 0x2F86B8, -.22, .5, 0, { rx: Math.PI / 2, rz: .55 }),
      p(box(.6, .06, .06), 0x2F86B8, .22, .48, 0, { rz: .62 }), p(box(.06, .34, .06), 0x2F86B8, -.24, .76, 0), p(box(.24, .06, .1), 0x1A1F2C, -.24, .94, 0),
      p(box(.06, .3, .06), 0x2F86B8, .42, .78, 0), p(box(.06, .06, .5), 0xC9CDD4, .42, .94, 0), p(box(.3, .16, .3), 0x8A6A3A, .62, .78, 0)]);
    // упавшая колонна (Македония) — перепрыгнуть
    K.column = M([p(cyl(.32, .32, 1.5, 10), 0xE6E1D6, 0, .32, 0, { rz: Math.PI / 2 }), p(cyl(.335, .335, .05, 10), 0xC9C2B4, -.25, .32, 0, { rz: Math.PI / 2 }),
      p(cyl(.335, .335, .05, 10), 0xC9C2B4, .25, .32, 0, { rz: Math.PI / 2 }), p(box(.22, .62, .62), 0xD8D2C4, .76, .32, 0, { rx: .2 })]);
    // сугроб (Россия) — перепрыгнуть
    K.drift = M([p(ico(1), 0xE4ECF8, 0, .1, 0, { sx: .78, sy: .55, sz: .5 }), p(ico(1), 0xD3DDEE, -.45, .05, .15, { sx: .45, sy: .4, sz: .4 }),
      p(ico(1), 0xF0F5FC, .42, .04, -.1, { sx: .5, sy: .38, sz: .42 })]);
    // кексик и чай — бонусы
    K.cake = M([p(cyl(.25, .18, .27, 10), RED, 0, 0, 0), ...[0, 1, 2, 3, 4].map(i => p(box(.03, .27, .03), CREAM, Math.sin(i * 1.26) * .215, 0, Math.cos(i * 1.26) * .215, { ry: i * 1.26 })),
      p(sph(.28, 10, 6, true), CREAM, 0, .12, 0, { sy: .75 }), p(sph(.17, 8, 5, true), 0xFFE9C4, 0, .3, 0, { sy: .8 }),
      p(sph(.065, 6, 5), RED, 0, .45, 0), ...[0, 1, 2, 3, 4, 5].map(i => p(box(.05, .02, .02), [0xFFB020, 0x7FC6E8, 0xFF8FB0][i % 3], Math.sin(i) * .16, .26, Math.cos(i) * .16, { ry: i }))]);
    K.tea = M([p(cyl(.24, .17, .28, 12), CREAM, 0, 0, 0), p(cyl(.215, .215, .02, 12), 0x8A4F25, 0, .13, 0), p(tor(.085, .028, Math.PI * 2), CREAM, .25, .01, 0, { rz: 0 }),
      p(cyl(.34, .3, .04, 14), CREAM, 0, -.15, 0), p(cyl(.245, .245, .04, 12), RED, 0, .07, 0)]);

    // ---- украшения ----
    K.drifts = [0, 1].map(v => M([0, 1, 2].map(i => p(ico(1), [0xDCE5F3, 0xEEF3FB, 0xC9D4E8][(i + v) % 3], (i - 1) * .9 + v * .3, .05, (i - 1) * 2.6 + v,
      { sx: .7 + ((i + v) % 2) * .4, sy: .32 + i * .06, sz: .9 + v * .3 }))));
    K.birch = M([p(cyl(.09, .11, 3.2, 6), 0xEDEFF2, 0, 1.6, 0), ...[.6, 1.2, 1.9, 2.5].map((y, i) => p(box(.2, .06, .2), 0x2A2D33, 0, y, 0, { ry: i })),
      p(ico(1), 0x4C6B3E, 0, 3.4, 0, { sx: .9, sy: 1.3, sz: .9 }), p(ico(1), 0x5E7E46, .3, 2.8, .2, { sx: .6, sy: .7, sz: .6 })]);
    K.tulips = [0, 1, 2].map(v => M([p(box(.7, .18, 4.2), 0x2E4A2A, 0, .09, 0), ...[0, 1, 2, 3, 4, 5, 6, 7].map(i => p(cyl(.11, .05, .2, 6),
      [[0xFF4D4D, 0xFFB020], [0xFF8FB0, 0xFFF3DC], [0xFF6A2B, 0xFFD34D]][v][i % 2], (i % 2 ? .15 : -.15), .42, -1.8 + i * .52))]));
    K.tulipStem = M([0, 1, 2, 3, 4, 5, 6, 7].map(i => p(box(.03, .26, .03), 0x5E8C3E, (i % 2 ? .15 : -.15), .26, -1.8 + i * .52)));
    K.mill = M([p(cyl(.75, 1.25, 4.2, 8), 0x5A3E30, 0, 2.1, 0), p(new T.ConeGeometry(.95, 1.2, 8), 0x2E2420, 0, 4.8, 0), p(box(.5, .9, .06), 0x2A1E18, 0, .45, 1.2),
      p(box(.3, .3, .06), 0xFFD994, 0, 2.6, .95)]);
    K.blades = M([0, 1, 2, 3].map(i => p(box(.34, 2.6, .05), 0xEDE3CF, Math.sin(i * Math.PI / 2) * 1.3, Math.cos(i * Math.PI / 2) * 1.3, 0, { rz: -i * Math.PI / 2 })));
    K.bunker = M([p(sph(1.1, 10, 5, true), 0x8C8A84, 0, 0, 0, { sy: .75 }), p(box(.9, .12, .3), 0x1A1C20, 0, .5, .95), p(cyl(1.15, 1.2, .12, 10), 0x6E6C66, 0, .04, 0)]);
    K.burger = M([p(cyl(.12, .12, 2.4, 6), 0x3A3F52, 0, 1.2, 0), p(cyl(1.1, 1.0, .38, 12), 0xD39A4F, 0, 2.6, 0), p(cyl(1.18, 1.18, .32, 12), 0x5A2E1E, 0, 2.95, 0),
      p(box(2.1, .07, 2.1), 0xFFC21F, 0, 3.15, 0, { ry: .5 }), p(cyl(1.25, 1.2, .1, 12), 0x5FAE3E, 0, 3.22, 0), p(cyl(1.1, 1.1, .1, 12), 0xE2402F, 0, 3.32, 0),
      p(sph(1.12, 12, 6, true), 0xE0A658, 0, 3.36, 0, { sy: .62 }), ...[0, 1, 2, 3, 4, 5, 6].map(i => p(box(.1, .04, .06), 0xFFF3DC, Math.sin(i * .9) * .7, 3.36 + .62 - Math.abs(Math.sin(i * .9) * .7) * .45, Math.cos(i * .9) * .7, { ry: i }))]);
    K.columns = M([-1.5, 1.5].flatMap(z => [p(cyl(.26, .3, 3.4, 10), 0xEAE5DA, 0, 1.9, z), p(box(.8, .2, .8), 0xD9D3C6, 0, 3.7, z), p(box(.8, .2, .8), 0xD9D3C6, 0, .1, z)])
      .concat([p(box(.9, .4, 4.0), 0xE2DCCF, 0, 4.0, 0), p(box(1.0, .3, 4.2), 0xCFC8B9, 0, 4.35, 0, { sx: .9 })]));
    K.statue = M([p(box(1.1, 1.2, 1.1), 0xD9D3C6, 0, .6, 0), p(box(1.25, .15, 1.25), 0xC9C2B4, 0, 1.25, 0),
      p(cyl(.17, .2, .75, 7), 0xB7925C, -.11, 1.7, 0), p(cyl(.17, .2, .75, 7), 0xB7925C, .11, 1.7, 0), p(cyl(.24, .3, .8, 7), 0xB7925C, 0, 2.45, 0),
      p(sph(.19, 8, 6), 0xB7925C, 0, 3.05, 0), p(box(.11, .7, .11), 0xB7925C, .32, 3.0, 0, { rz: -.35 }), p(box(.05, 1.8, .05), 0x8A6A3A, .48, 3.0, 0),
      p(box(.11, .55, .11), 0xB7925C, -.3, 2.4, 0, { rz: .2 }), p(sph(.21, 8, 4, true), 0xA0804E, 0, 3.12, 0, { sy: .7 })]);
    K.phone = M([p(box(.95, 2.5, .95), 0xD4242C, 0, 1.25, 0), p(box(1.05, .18, 1.05), 0xB81E25, 0, 2.58, 0), p(box(.8, .2, .8), 0xD4242C, 0, 2.75, 0, { sy: .8 }),
      p(box(.97, .14, .97), 0x1A1C20, 0, 2.28, 0)]);
    K.phoneGlow = M([-1, 1].flatMap(s => [p(box(.02, 1.4, .62), 0xFFE6A8, s * .485, 1.3, 0), p(box(.62, 1.4, .02), 0xFFE6A8, 0, 1.3, s * .485)]));
    K.bench = M([p(box(.5, .08, 1.6), 0x5A3E30, 0, .5, 0), p(box(.08, .5, 1.6), 0x5A3E30, .22, .78, 0), p(box(.4, .5, .08), 0x1A1C20, 0, .25, -.7), p(box(.4, .5, .08), 0x1A1C20, 0, .25, .7)]);
    return K;
  }

  // помощник: сетка с цветом в вершинах
  function mesh(T, geo, mat, x, y, z, ry) { const m = new T.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0); if (ry) m.rotation.y = ry; return m; }
  function group(T, ...meshes) { const g = new T.Group(); meshes.forEach(m => m && g.add(m)); return g; }

  const models = {
    car(T, kit, o) {
      const k = init(T, kit), g = group(T, mesh(T, k.car(o && o.color || [0x3A4A7A, 0x5A6272, 0x2F6A5A, 0x7A3A4A][Math.floor(((o && o.r) || .3) * 4)]), k.solid), mesh(T, k.carGlow, k.glow));
      for (const s of [-1, 1]) { const h = kit.halo(0xFFE2B0, 1.2, .7); h.position.set(s * .5, .66, 1.9); g.add(h); }
      g.userData = { hd: 1.8, v: 7 }; return g;
    },
    sedan(T, kit) {
      const k = init(T, kit), g = group(T, mesh(T, k.sedan, k.solid), mesh(T, k.sedanGlow, k.glow));
      for (const s of [-1, 1]) { const h = kit.halo(0xFFE2B0, 1.2, .7); h.position.set(s * .6, .68, 2.35); g.add(h); }
      g.userData = { hd: 2.25, v: 6 }; return g;
    },
    bus(T, kit) {
      const k = init(T, kit), g = group(T, mesh(T, k.bus, k.solid), mesh(T, k.busGlow, k.glow));
      for (const s of [-1, 1]) { const h = kit.halo(0xFF4D4D, .7, .8); h.position.set(s * .7, 2.0, 3.2); g.add(h); }
      g.userData = { hd: 3.1, v: 0 }; return g;
    },
    decker(T, kit) {
      const k = init(T, kit), g = group(T, mesh(T, k.decker, k.solid), mesh(T, k.deckerGlow, k.glow));
      for (const s of [-1, 1]) { const h = kit.halo(0xFFE2B0, 1.2, .7); h.position.set(s * .58, .55, 2.7); g.add(h); }
      g.userData = { hd: 2.6, v: 5 }; return g;
    },
    bike(T, kit) { const k = init(T, kit); const g = group(T, mesh(T, k.bike, k.solid)); g.userData = { hd: .2, v: 0 }; return g; },
    column(T, kit) { const k = init(T, kit); const g = group(T, mesh(T, k.column, k.solid)); g.userData = { hd: .35, v: 0 }; return g; },
    drift(T, kit) { const k = init(T, kit); const g = group(T, mesh(T, k.drift, k.solid)); g.userData = { hd: .5, v: 0 }; return g; },
    // вышка-глушилка: решётка, мигающий огонь сверху, табло с надписью (opt.sign — материал табло от игры)
    tower(T, kit, o) {
      const k = init(T, kit), g = new T.Group();
      const c = k.towerParts || (k.towerParts = { lat: new T.CylinderGeometry(.1, .62, 3.6, 4, 6, true), legs: new T.CylinderGeometry(.1, .62, 3.6, 4, 1, true),
        legMat: new T.MeshLambertMaterial({ color: 0x4A5266, side: T.DoubleSide, transparent: true, opacity: .35 }), ant: new T.BoxGeometry(.12, .42, .08),
        antMat: new T.MeshLambertMaterial({ color: 0xC9CDD4 }), top: new T.BoxGeometry(.14, .12, .14), topMat: new T.MeshBasicMaterial({ color: 0xFF4D4D }), board: new T.BoxGeometry(1.42, .6, .08) });
      const lat = new T.Mesh(c.lat, k.wire); lat.position.y = 1.8; lat.rotation.y = Math.PI / 4; g.add(lat);
      const legs = new T.Mesh(c.legs, c.legMat); legs.position.y = 1.8; legs.rotation.y = Math.PI / 4; g.add(legs);
      for (const [x, y] of [[-.22, 3.2], [.22, 3.0], [0, 3.45]]) { const a = new T.Mesh(c.ant, c.antMat); a.position.set(x, y, .12); g.add(a); }
      const top = new T.Mesh(c.top, c.topMat); top.position.y = 3.68; g.add(top);
      const h = kit.halo(0xFF4D4D, 1.1, .9); h.position.set(0, 3.7, .05); g.add(h);
      if (o && o.sign) { const b = new T.Mesh(c.board, o.sign); b.position.set(0, 1.25, .5); g.add(b); }
      const gl = kit.glowPlane(0xFF4D4D, 2.2, 2.4, .45); gl.position.set(0, .07, .5); g.add(gl);
      g.userData = { hd: .5, v: 0, blinks: [h] }; return g;
    },
    cake(T, kit) { const k = init(T, kit); const g = group(T, mesh(T, k.cake, k.solid)); g.add(kit.halo(0xFF8FB0, 1.6, .55)); return g; },
    tea(T, kit) { const k = init(T, kit); const g = group(T, mesh(T, k.tea, k.solid)); g.add(kit.halo(0xFFB020, 1.6, .55)); return g; },
  };

  // --- украшения по странам ---
  const D = {
    ru(T, kit, r, s) {
      const k = init(T, kit), g = new T.Group();
      g.add(mesh(T, k.drifts[r() < .5 ? 0 : 1], k.solid, s * (3.4 + r() * .6), 0, (r() - .5) * 3, r() * 3));
      if (r() < .45) g.add(mesh(T, k.birch, k.solid, s * (4.4 + r() * .4), 0, (r() - .5) * 6, r() * 3));
      return g;
    },
    nl(T, kit, r, s) {
      const k = init(T, kit), g = new T.Group();
      const w = new T.Mesh(k.canalGeo || (k.canalGeo = new T.PlaneGeometry(2.6, 10).rotateX(-Math.PI / 2)), k.water); w.position.set(s * 6.0, .03, 0); g.add(w);
      if (r() < .7) { const v = Math.floor(r() * 3); g.add(mesh(T, k.tulips[v], k.solid, s * 4.15, 0, 0)); g.add(mesh(T, k.tulipStem, k.solid, s * 4.15, 0, 0)); }
      else g.add(mesh(T, k.bike, k.solid, s * 3.6, 0, (r() - .5) * 4, Math.PI / 2 + (r() - .5) * .4));
      if (r() < .33) { const m = mesh(T, k.mill, k.solid, s * 9.2, 0, (r() - .5) * 4, s > 0 ? -.4 : .4); const b = mesh(T, k.blades, k.solid, 0, 4.2, 1.25);
        m.add(b); g.add(m); g.userData.spin = b; g.userData.noBuilding = true; }
      return g;
    },
    al(T, kit, r, s) {
      const k = init(T, kit), g = new T.Group();
      if (r() < .6) g.add(mesh(T, k.bunker, k.solid, s * (5.0 + r() * .6), 0, (r() - .5) * 4, r() * 6));
      else g.add(mesh(T, k.sedan, k.solid, s * 3.75, 0, (r() - .5) * 3, r() < .5 ? 0 : Math.PI));
      return g;
    },
    us(T, kit, r, s) {
      const k = init(T, kit), g = new T.Group();
      if (r() < .5) g.add(mesh(T, k.burger, k.solid, s * 4.0, 0, (r() - .5) * 4, r() * 3));
      else { g.add(mesh(T, k.bus, k.solid, s * 3.75, -.2, (r() - .5) * 2, r() < .5 ? 0 : Math.PI)); g.add(mesh(T, k.busGlow, k.glow, s * 3.75, -.2, 0)); g.children[1].position.z = g.children[0].position.z; g.children[1].rotation.y = g.children[0].rotation.y; }
      return g;
    },
    mk(T, kit, r, s) {
      const k = init(T, kit), g = new T.Group();
      if (s < 0) { const w = new T.Mesh(k.lakeGeo || (k.lakeGeo = new T.PlaneGeometry(40, 10).rotateX(-Math.PI / 2)), k.water); w.position.set(-24.6, .02, 0); g.add(w); }
      const v = r();
      if (s < 0) { if (v < .5) g.add(mesh(T, k.columns, k.solid, -3.9, 0, 0)); }
      else if (v < .45) g.add(mesh(T, k.columns, k.solid, 4.0, 0, 0)); else if (v < .8) g.add(mesh(T, k.statue, k.solid, 3.9, 0, (r() - .5) * 4, -.5));
      return g;
    },
    uk(T, kit, r, s) {
      const k = init(T, kit), g = new T.Group();
      if (r() < .55) { const z = (r() - .5) * 5; g.add(mesh(T, k.phone, k.solid, s * 3.75, 0, z)); g.add(mesh(T, k.phoneGlow, k.glow, s * 3.75, 0, z)); }
      else g.add(mesh(T, k.bench, k.solid, s * 4.1, 0, (r() - .5) * 4, s > 0 ? Math.PI : 0));
      return g;
    },
  };

  const countries = [
    { id: 'ru', name: 'Россия', flag: '🇷🇺', sub: 'Белые списки', enter: 'Пропуск есть? Только по белому списку!',
      toasts: ['Сеть ловит — интернета нет', 'Открываются только Госуслуги и маркетплейсы'],
      save: null, crash: 'Не нужно обходить белые списки, если интернета нет вообще', near: null, bonus: null,
      colors: { sky: 0x111827, road: 0x1E2433, side: 0x4A5368, field: 0x5C6782, bld: [0x7E86A0, 0x707894, 0x8A8496] },
      build: { h: 1, off: 0 }, particles: 'snow', car: 'car', low: 'drift', lowP: .25, wall: null, slowP: .3, decor: D.ru },
    { id: 'nl', name: 'Нидерланды', flag: '🇳🇱', sub: 'Каналы и велосипеды', enter: 'Забежим на кексик?',
      toasts: ['Велосипедов больше, чем людей'], save: null, crash: 'Даже велосипед бы не помог', near: null, bonus: 'cake',
      colors: { sky: 0x0D1B24, road: 0x1C2630, side: 0x323A46, field: 0x173322, bld: [0x8A6E62, 0x7A6A78, 0x6E7E8E] },
      build: { h: .7, off: 3.6 }, particles: null, car: 'car', low: 'bike', lowP: .45, wall: null, slowP: 0, decor: D.nl },
    { id: 'al', name: 'Албания', flag: '🇦🇱', sub: 'Бункеры и старые седаны', enter: 'Здесь вас встретят как брата',
      toasts: ['Бункеров тут больше, чем пробок'], save: 'О, братья албанцы!', crash: 'О, братья албанцы! В следующий раз подвезём', near: 'О, братья албанцы!', bonus: null,
      colors: { sky: 0x1B1422, road: 0x241F28, side: 0x3E3434, field: 0x2C2419, bld: [0xA08670, 0x8E7A86, 0x9A8C70] },
      build: { h: .55, off: 2.2 }, particles: null, car: 'sedan', low: null, lowP: 0, wall: null, slowP: 0, decor: D.al },
    { id: 'us', name: 'США', flag: '🇺🇸', sub: 'Всё по-крупному', enter: 'Всё по-крупному: арки ×2',
      toasts: ['Порция арок — двойная'], save: null, crash: 'Даже большой бургер не спас', near: null, bonus: 'big',
      colors: { sky: 0x130F26, road: 0x1A1A2C, side: 0x2E2A44, field: 0x17142A, bld: [0x6E78A8, 0x7C6E9E, 0x5E86A0] },
      build: { h: 1.7, off: .4 }, particles: null, car: 'car', low: null, lowP: 0, wall: 'bus', wallP: .35, slowP: 0, decor: D.us },
    { id: 'mk', name: 'Македония', flag: '🇲🇰', sub: 'Колонны и озеро', enter: 'Даже Македонский бы не догнал',
      toasts: ['Статуй больше, чем светофоров'], save: null, crash: 'Колонну не перепрыгнули — бывает', near: null, bonus: null,
      colors: { sky: 0x0E1B26, road: 0x1E2532, side: 0x4A4F5A, field: 0x18261F, bld: [0xC8C0B0, 0xB8B2A6, 0xA8A49C] },
      build: { h: .6, off: .6, skip: -1 }, particles: null, car: 'car', low: 'column', lowP: .4, wall: null, slowP: 0, decor: D.mk },
    { id: 'uk', name: 'Великобритания', flag: '🇬🇧', sub: 'Дождь и чай', enter: 'Внимание: левостороннее движение!',
      toasts: ['Дождь — это просто погода', 'Время чая: ловите чашку'], save: null, crash: 'Автобус приехал по расписанию', near: null, bonus: 'tea',
      colors: { sky: 0x161B22, road: 0x22272E, side: 0x343840, field: 0x1A2620, bld: [0x8A5A4A, 0x7A7470, 0x6A6E78] },
      build: { h: .9, off: 0 }, particles: 'rain', car: 'decker', low: null, lowP: 0, wall: null, slowP: 0, decor: D.uk },
  ];

  window.ARKA_WORLD = { countries, models, init };
})();
