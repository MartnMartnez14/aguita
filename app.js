(() => {
  const selector = document.querySelector('.drink-selector');
  const drinkButtons = [...selector.querySelectorAll('[data-drink]')];
  const themes = { agua: '#eaf7fb', mate: '#e1f2ec', te: '#f3e8dc' };
  function selectDrink(drink) {
    document.body.dataset.drink = drink;
    drinkButtons.forEach((button) => {
      const active = button.dataset.drink === drink;
      button.setAttribute('aria-pressed', String(active));
      document.getElementById(button.getAttribute('aria-controls')).hidden = !active;
    });
    document.getElementById('water-nav').hidden = drink !== 'agua';
    document.querySelector('meta[name="theme-color"]').content = themes[drink];
  }
  drinkButtons.forEach((button) => button.addEventListener('click', () => {
    selectDrink(button.dataset.drink);
    if (window.location.hash) history.replaceState(null, '', window.location.pathname + window.location.search);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }));
  selectDrink('agua');
  selector.hidden = false;

  const HOURS = [9, 11, 14, 17, 19, 21];
  const STORE_KEY = 'aguita-tracker-v1';
  const $ = (id) => document.getElementById(id);
  const goalSelect = $('goal-select');
  const today = new Date();
  const dateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const saved = readState();
  let state = saved.date === dateKey ? saved : { date: dateKey, count: 0, goal: saved.goal || 8, reminders: false, dismissed: [] };
  state.dismissed = Array.isArray(state.dismissed) ? state.dismissed : [];
  let lastReminderMinute = '';
  goalSelect.value = String([6, 8, 10, 12].includes(state.goal) ? state.goal : 8);
  $('reminder-toggle').checked = Boolean(state.reminders);

  function readState() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch { return {}; }
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch { /* Storage can be disabled; counter still works in memory. */ }
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
    $('progress-caption').textContent = state.count >= goal ? '¡Meta alcanzada! Buen trabajo' : state.count === 0 ? 'Cada vaso cuenta' : `${goal - state.count} ${goal - state.count === 1 ? 'vaso' : 'vasos'} para tu referencia`;
    $('add-glass').disabled = state.count >= goal;
    const grid = $('cup-grid');
    grid.replaceChildren();
    grid.setAttribute('aria-label', `${state.count} de ${goal} vasos registrados`);
    for (let i = 0; i < goal; i += 1) {
      const cup = document.createElement('span');
      cup.className = `cup-item${i < state.count ? ' filled' : ''}`;
      cup.setAttribute('aria-hidden', 'true');
      cup.textContent = '◒';
      grid.append(cup);
    }
    save();
  }
  function renderReminders() {
    const holder = $('reminder-times');
    holder.replaceChildren();
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    let nextIndex = HOURS.findIndex((hour) => hour * 60 >= nowMinutes);
    HOURS.forEach((hour, index) => {
      const chip = document.createElement('span');
      chip.className = `time-chip${state.reminders && index === nextIndex ? ' next' : ''}`;
      chip.textContent = `${String(hour).padStart(2, '0')}:00`;
      holder.append(chip);
    });
    $('reminder-status').textContent = state.reminders ? 'Avisos activos mientras esta página permanezca abierta' : 'Avisos apagados';
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
      try { new Notification('Pausa de hidratación 💧', { body: '¿Te apetece un vaso de agua?', tag: stamp }); } catch { /* In-page message remains available. */ }
    }
    save();
  }
  $('today-date').textContent = new Intl.DateTimeFormat('es-UY', { weekday: 'long', day: 'numeric', month: 'long' }).format(today);
  $('add-glass').addEventListener('click', () => { if (state.count < Number(goalSelect.value)) state.count += 1; render(); });
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
    const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    if (currentKey !== state.date) {
      state = { ...state, date: currentKey, count: 0, dismissed: [] };
      render();
      $('today-date').textContent = new Intl.DateTimeFormat('es-UY', { weekday: 'long', day: 'numeric', month: 'long' }).format(now);
    }
    checkReminder();
    renderReminders();
  }, 15000);
})();
