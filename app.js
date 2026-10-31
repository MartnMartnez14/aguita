(() => {
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (id) => document.getElementById(id);

  /* ---------------------------------------------------------------------
     Cambio de bebida y tema
     --------------------------------------------------------------------- */

  const selector = document.querySelector('.drink-selector');
  const drinkButtons = [...selector.querySelectorAll('[data-drink]')];
  const themeColor = document.querySelector('meta[name="theme-color"]');
  const themes = { agua: '#f6f3ea', mate: '#f1f5e8', te: '#f7ede2' };

  function revealVisibleNow() {
    window.requestAnimationFrame(() => {
      document.querySelectorAll('[data-reveal].is-reveal-ready:not(.is-visible)').forEach((element) => {
        const rect = element.getBoundingClientRect();
        if (rect.top < window.innerHeight * .96 && rect.bottom > 0) {
          element.classList.add('is-visible');
        }
      });
    });
  }

  function selectDrink(drink) {
    document.body.dataset.drink = drink;
    drinkButtons.forEach((button) => {
      const active = button.dataset.drink === drink;
      button.setAttribute('aria-pressed', String(active));
      document.getElementById(button.getAttribute('aria-controls')).hidden = !active;
    });
    $('water-nav').hidden = drink !== 'agua';
    themeColor.content = themes[drink];
    revealVisibleNow();
  }

  drinkButtons.forEach((button) => button.addEventListener('click', () => {
    selectDrink(button.dataset.drink);
    if (window.location.hash) {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  }));

  selectDrink('agua');
  selector.hidden = false;

  /* ---------------------------------------------------------------------
     Header con estado al hacer scroll
     --------------------------------------------------------------------- */

  const header = document.querySelector('.site-header');
  const syncHeader = () => {
    header.dataset.scrolled = String(window.scrollY > 12);
  };
  window.addEventListener('scroll', syncHeader, { passive: true });
  syncHeader();

  /* ---------------------------------------------------------------------
     Revelados al scroll
     --------------------------------------------------------------------- */

  const revealObserver = (() => {
    const elements = [...document.querySelectorAll('[data-reveal]')];
    if (!elements.length) return null;

    elements.forEach((element) => {
      element.classList.add('is-reveal-ready');
      const siblings = [...element.parentElement.querySelectorAll(':scope > [data-reveal]')];
      const index = siblings.indexOf(element);
      if (index > 0) element.style.transitionDelay = `${Math.min(index, 5) * 70}ms`;
    });

    if (reduceMotion.matches || !('IntersectionObserver' in window)) {
      elements.forEach((element) => element.classList.add('is-visible'));
      return null;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -7% 0px', threshold: .08 });

    elements.forEach((element) => observer.observe(element));
    return observer;
  })();

  reduceMotion.addEventListener?.('change', (event) => {
    if (!event.matches) return;
    document.querySelectorAll('[data-reveal].is-reveal-ready').forEach((element) => {
      element.classList.add('is-visible');
    });
    if (revealObserver) revealObserver.disconnect();
  });

  /* ---------------------------------------------------------------------
     Marquesina pausable
     --------------------------------------------------------------------- */

  const marquee = document.querySelector('[data-marquee]');
  const marqueeToggle = $('ticker-toggle');

  if (marquee && marqueeToggle) {
    marqueeToggle.addEventListener('click', () => {
      const paused = marquee.classList.toggle('is-paused');
      marqueeToggle.setAttribute('aria-pressed', String(paused));
      marqueeToggle.textContent = paused ? 'Reanudar' : 'Pausar';
    });
  }

  /* ---------------------------------------------------------------------
     Canvas ASCII de la ilustración principal
     --------------------------------------------------------------------- */

  function initAscii() {
    const canvas = document.querySelector('[data-ascii]');
    if (!canvas || !canvas.getContext) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const glyphs = ' .:-=+*#%@';
    let width = 0;
    let height = 0;
    let running = false;
    let inView = true;
    let frameId = 0;
    let lastTime = 0;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return false;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return true;
    }

    function draw(time = 0) {
      if (!width || !height) return;
      ctx.clearRect(0, 0, width, height);
      const cell = Math.max(8, Math.min(12, width / 46));
      const cols = Math.ceil(width / cell);
      const rows = Math.ceil(height / cell);
      const t = reduceMotion.matches ? 0 : time / 1600;

      ctx.font = `${Math.max(8, cell * .92)}px "IBM Plex Mono", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          const nx = col / cols;
          const ny = row / rows;
          const waveA = Math.sin(nx * 9.2 + t * .8 + ny * 3.1);
          const waveB = Math.cos(nx * 5.1 - t * .5 + ny * 7.4);
          const bandA = Math.exp(-Math.pow((ny - (.56 + waveA * .07 + waveB * .035)) / .105, 2));
          const bandB = Math.exp(-Math.pow((ny - (.36 + waveB * .06)) / .12, 2)) * .62;
          const density = Math.max(bandA, bandB);
          const hash = Math.sin(col * 12.9898 + row * 78.233 + t * 2.7) * 43758.5453;
          const noise = hash - Math.floor(hash);
          const alpha = .16 + density * .22 + noise * .05;

          if (density < .26 || noise < .14) continue;

          const index = Math.min(glyphs.length - 1, Math.floor((density + noise * .35) * glyphs.length));
          const glyph = glyphs[Math.max(0, index)];
          if (glyph === ' ') continue;

          ctx.fillStyle = noise > .9
            ? 'rgba(44, 107, 116, .62)'
            : `rgba(16, 46, 51, ${Math.min(.46, alpha).toFixed(3)})`;
          ctx.fillText(glyph, col * cell + cell / 2, row * cell + cell / 2);
        }
      }
    }

    function loop(time) {
      if (!running) return;
      if (time - lastTime > 72) {
        draw(time);
        lastTime = time;
      }
      frameId = window.requestAnimationFrame(loop);
    }

    function start() {
      if (running || reduceMotion.matches || document.hidden || !inView) return;
      running = true;
      frameId = window.requestAnimationFrame(loop);
    }

    function stop() {
      running = false;
      window.cancelAnimationFrame(frameId);
    }

    function refresh() {
      if (!resize()) return;
      draw(performance.now());
      if (reduceMotion.matches) stop();
      else start();
    }

    refresh();

    if ('ResizeObserver' in window) {
      const resizeObserver = new ResizeObserver(refresh);
      resizeObserver.observe(canvas);
    } else {
      window.addEventListener('resize', refresh, { passive: true });
    }

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(([entry]) => {
        inView = entry.isIntersecting;
        if (inView) start();
        else stop();
      }, { threshold: .08 });
      observer.observe(canvas);
    }

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop();
      else start();
    });

    reduceMotion.addEventListener?.('change', (event) => {
      stop();
      draw(event.matches ? 0 : performance.now());
      if (!event.matches) start();
    });

    if (document.fonts?.ready) {
      document.fonts.ready.then(() => {
        if (!running) draw(0);
      });
    }
  }

  initAscii();

  /* ---------------------------------------------------------------------
     Footer tide: dibujo de las olas al entrar en pantalla
     --------------------------------------------------------------------- */

  const footer = document.querySelector('[data-tide]');

  if (footer) {
    if (reduceMotion.matches || !('IntersectionObserver' in window)) {
      footer.classList.add('is-inview');
    } else {
      const observer = new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting) return;
        footer.classList.add('is-inview');
        observer.disconnect();
      }, { threshold: .12 });
      observer.observe(footer);
    }
  }

  /* ---------------------------------------------------------------------
     Enlaces del footer hacia la vista Agua
     --------------------------------------------------------------------- */

  document.querySelectorAll('[data-water-link]').forEach((link) => {
    link.addEventListener('click', (event) => {
      if (document.body.dataset.drink === 'agua') return;
      event.preventDefault();
      const hash = link.getAttribute('href');
      selectDrink('agua');
      window.requestAnimationFrame(() => {
        const target = document.querySelector(hash);
        target?.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'start' });
      });
    });
  });

  /* ---------------------------------------------------------------------
     Contador de vasos
     --------------------------------------------------------------------- */

  const HOURS = [9, 11, 14, 17, 19, 21];
  const STORE_KEY = 'aguita-tracker-v1';
  const goalSelect = $('goal-select');
  const today = new Date();
  const dateKey = dateKeyFor(today);
  const saved = readState();
  let state = saved.date === dateKey
    ? saved
    : { date: dateKey, count: 0, goal: saved.goal || 8, reminders: false, dismissed: [] };

  state.dismissed = Array.isArray(state.dismissed) ? state.dismissed : [];
  let lastReminderMinute = '';

  goalSelect.value = String([6, 8, 10, 12].includes(state.goal) ? state.goal : 8);
  $('reminder-toggle').checked = Boolean(state.reminders);

  function dateKeyFor(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function readState() {
    try {
      return JSON.parse(localStorage.getItem(STORE_KEY)) || {};
    } catch {
      return {};
    }
  }

  function save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch {
      /* El almacenamiento puede estar deshabilitado; el contador sigue en memoria. */
    }
  }

  function render() {
    const goal = Number(goalSelect.value);
    state.goal = goal;
    state.count = Math.min(Math.max(0, Number(state.count) || 0), goal);

    $('current-count').textContent = state.count;
    $('goal-count').textContent = goal;

    const percent = Math.min(100, (state.count / goal) * 100);
    $('progress-fill').style.width = `${percent}%`;

    const progress = $('progress-track');
    progress.setAttribute('aria-valuemax', String(goal));
    progress.setAttribute('aria-valuenow', String(state.count));
    progress.setAttribute('aria-valuetext', `${state.count} de ${goal} vasos`);

    $('progress-caption').textContent = state.count >= goal
      ? '¡Meta alcanzada! Buen trabajo'
      : state.count === 0
        ? 'Cada vaso cuenta'
        : `${goal - state.count} ${goal - state.count === 1 ? 'vaso' : 'vasos'} para tu referencia`;

    $('add-glass').disabled = state.count >= goal;

    const grid = $('cup-grid');
    grid.replaceChildren();
    grid.setAttribute('aria-label', `${state.count} de ${goal} vasos registrados`);

    for (let index = 0; index < goal; index += 1) {
      const cup = document.createElement('span');
      cup.className = `cup-item${index < state.count ? ' filled' : ''}`;
      cup.setAttribute('aria-hidden', 'true');
      grid.append(cup);
    }

    save();
  }

  function renderReminders() {
    const holder = $('reminder-times');
    holder.replaceChildren();
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const nextIndex = HOURS.findIndex((hour) => hour * 60 >= nowMinutes);

    HOURS.forEach((hour, index) => {
      const chip = document.createElement('span');
      chip.className = `time-chip${state.reminders && index === nextIndex ? ' next' : ''}`;
      chip.textContent = `${String(hour).padStart(2, '0')}:00`;
      holder.append(chip);
    });

    $('reminder-status').textContent = state.reminders
      ? 'Avisos activos mientras esta página permanezca abierta'
      : 'Avisos apagados';
  }

  function checkReminder() {
    if (!state.reminders) return;
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const stamp = `${state.date}-${hour}-${minute}`;

    if (minute !== 0 || !HOURS.includes(hour) || lastReminderMinute === stamp || state.dismissed.includes(stamp)) return;

    lastReminderMinute = stamp;
    state.dismissed = (state.dismissed || []).slice(-20);
    $('reminder-status').textContent = `Pausa de hidratación · ${String(hour).padStart(2, '0')}:00 — ¿te apetece un vaso de agua?`;

    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('Pausa de hidratación 💧', { body: '¿Te apetece un vaso de agua?', tag: stamp });
      } catch {
        /* El mensaje dentro de la página sigue disponible. */
      }
    }

    save();
  }

  function addRipple(button, event) {
    if (reduceMotion.matches) return;
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX ? event.clientX - rect.left : rect.width / 2;
    const y = event.clientY ? event.clientY - rect.top : rect.height / 2;
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.setAttribute('aria-hidden', 'true');
    ripple.style.width = `${size}px`;
    ripple.style.height = `${size}px`;
    ripple.style.left = `${x - size / 2}px`;
    ripple.style.top = `${y - size / 2}px`;
    button.append(ripple);
    ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
  }

  $('today-date').textContent = new Intl.DateTimeFormat('es-UY', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(today);

  $('add-glass').addEventListener('click', (event) => {
    if (state.count >= Number(goalSelect.value)) return;
    addRipple(event.currentTarget, event);
    state.count += 1;
    render();
  });

  $('reset-button').addEventListener('click', () => {
    if (!state.count) return;
    state.count = 0;
    render();
  });

  goalSelect.addEventListener('change', render);

  $('reminder-toggle').addEventListener('change', (event) => {
    state.reminders = event.target.checked;
    state.dismissed = [];
    renderReminders();
    save();
  });

  render();
  renderReminders();

  window.setInterval(() => {
    const now = new Date();
    const currentKey = dateKeyFor(now);

    if (currentKey !== state.date) {
      state = { ...state, date: currentKey, count: 0, dismissed: [] };
      render();
      $('today-date').textContent = new Intl.DateTimeFormat('es-UY', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }).format(now);
    }

    checkReminder();
    renderReminders();
  }, 15000);
})();
