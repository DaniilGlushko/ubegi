// Звуки «Убеги от блокировки»: файлы в sfx/ (моно mp3). Web Audio API; без него или с file:// (fetch не работает) — запасной путь через <audio>.
// iOS и Telegram дают включить звук только после касания: игра зовёт unlock() из обработчика нажатия (кнопка «Начать», тап, клавиша).
// Договор: window.makeSound() → { unlock(), play(name), toggle(), on (вкл/выкл), log }
//   play(name): jump slide lane arch avto crash country kexik begi pochinil spi
//   Одинаковый звук звучит не больше 2 раз одновременно; мяу и арки — с небольшим случайным сдвигом высоты (0.92–1.08).
//   Фразы Арчи громче остальных. Выбор 🔊/🔇 запоминается в localStorage (если он доступен). Никогда не бросает ошибок.
(function () {
  window.makeSound = function () {
    const FILES = { jump: 'meow-jump', slide: 'slide', lane: 'lane', arch: 'arch', avto: 'avto', crash: 'meow-crash', country: 'country',
      kexik: 'kexik', begi: 'archi-begi', pochinil: 'archi-pochinil', spi: 'archi-spi' };
    const VOL = { jump: .5, slide: .45, lane: .18, arch: .4, avto: .55, crash: .6, country: .45, kexik: .55, begi: 1, pochinil: 1, spi: 1 };
    const PITCH = { jump: 1, arch: 1, crash: 1 };
    const KEY = 'arka-ubegi-sound';
    let on = true;
    try { on = localStorage.getItem(KEY) !== '0'; } catch (e) {}
    let ctx = null, master = null, started = false;
    const buf = {}, els = {}, active = {}, pending = {}, log = [];

    function loadEl(name) {                                  // запасной путь: <audio> работает и с file://
      try { const a = new Audio('sfx/' + FILES[name] + '.mp3'); a.preload = 'auto'; els[name] = a; } catch (e) {}
    }
    function decode(ab) {
      return new Promise((res, rej) => { try { const p = ctx.decodeAudioData(ab, res, rej); if (p && p.then) p.then(res, rej); } catch (e) { rej(e); } });
    }
    function loadAll() {
      for (const name in FILES) {
        if (!ctx || location.protocol === 'file:') { loadEl(name); continue; }
        fetch('sfx/' + FILES[name] + '.mp3').then(r => { if (!r.ok) throw 0; return r.arrayBuffer(); }).then(decode)
          .then(b => { buf[name] = b; if (pending[name] && performance.now() - pending[name] < 1500) play(name); delete pending[name]; })
          .catch(() => loadEl(name));
      }
    }
    function unlock() {
      if (!on) return;
      try {
        if (!ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) { ctx = new AC(); master = ctx.createGain(); master.connect(ctx.destination); } }
        if (ctx && ctx.state === 'suspended' && ctx.resume) ctx.resume().catch(() => {});
        if (ctx) { const s = ctx.createBufferSource(); s.buffer = ctx.createBuffer(1, 1, 22050); s.connect(master); s.start(0); } // «разбудить» звук на iOS
      } catch (e) { ctx = null; }
      if (!started) { started = true; loadAll(); }
    }
    function play(name) {
      log.push(name); if (log.length > 50) log.shift();
      if (!on || !started || !FILES[name]) return;
      if ((active[name] || 0) >= 2) return;
      const rate = PITCH[name] ? .92 + Math.random() * .16 : 1;
      try {
        if (ctx && buf[name]) {
          const s = ctx.createBufferSource(), g = ctx.createGain();
          s.buffer = buf[name]; s.playbackRate.value = rate; g.gain.value = VOL[name];
          s.connect(g); g.connect(master); active[name] = (active[name] || 0) + 1;
          s.onended = () => { active[name] = Math.max(0, (active[name] || 1) - 1); };
          s.start(0); return;
        }
        if (els[name]) {
          const a = els[name].cloneNode(); a.volume = Math.min(1, VOL[name]); a.playbackRate = rate;
          active[name] = (active[name] || 0) + 1;
          const done = () => { active[name] = Math.max(0, (active[name] || 1) - 1); };
          a.onended = done; a.onerror = done;
          const p = a.play(); if (p && p.catch) p.catch(done);
          return;
        }
        pending[name] = performance.now();                    // ещё грузится — сыграем, если успеет за 1.5 с
      } catch (e) {}
    }
    function toggle() {
      on = !on;
      try { localStorage.setItem(KEY, on ? '1' : '0'); } catch (e) {}
      try { if (master) master.gain.value = on ? 1 : 0; } catch (e) {}
      if (on) unlock();
      return on;
    }
    return { unlock, play, toggle, log, get on() { return on; }, get ready() { return started; } };
  };
})();
