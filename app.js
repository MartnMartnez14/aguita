(() => {
  const HOURS = [9, 11, 14, 17, 19, 21];
  const STORE_KEY = 'aguita-tracker-v1';
  const $ = (id) => document.getElementById(id);
  const goalSelect = $('goal-select');
  const today = new Date();
  const dayKey = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const read = () => { try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch { return {}; } };
  const previous = read();
  let state = previous.date === dayKey() ? previous : { date: dayKey(), count: 0, goal: previous.goal || 8, reminders: false };
  let lastNotice = '';
  goalSelect.value = String([6, 8, 10, 12].includes(state.goal) ? state.goal : 8);
  $('reminder-toggle').checked = Boolean(state.reminders);
  const save = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch {} };
  function render() {
    const goal = Number(goalSelect.value);
    state.goal = goal;
    state.count = Math.min(Math.max(0, Number(state.count) || 0), goal);
    $('current-count').textContent = state.count;
    $('goal-count').textContent = goal;
    $('progress-fill').style.width = Math.min(100, state.count / goal * 100) + '%';
    const bar = $('progress-track');
    bar.setAttribute('aria-valuemax', goal);
    bar.setAttribute('aria-valuenow', state.count);
    $('progress-caption').textContent = state.count >= goal ? '¡Meta alcanzada! Buen trabajo' : state.count === 0 ? 'Cada vaso cuenta' : (goal - state.count) + ((goal - state.count) === 1 ? ' vaso para tu referencia' : ' vasos para tu referencia');
    $('add-glass').disabled = state.count >= goal;
    const grid = $('cup-grid');
    grid.replaceChildren();
    grid.setAttribute('aria-label', state.count + ' de ' + goal + ' vasos registrados');
    for (let i = 0; i < goal; i++) {
      const cup = document.createElement('span');
      cup.className = 'cup-item' + (i < state.count ? ' filled' : '');
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
    const minutes = now.getHours() * 60 + now.getMinutes();
    const next = HOURS.findIndex((hour) => hour * 60 >= minutes);
    HOURS.forEach((hour, index) => {
      const chip = document.createElement('span');
      chip.className = 'time-chip' + (state.reminders && index === next ? ' next' : '');
      chip.textContent = String(hour).padStart(2, '0') + ':00';
      holder.append(chip);
    });
    $('reminder-status').textContent = state.reminders ? 'Avisos activos mientras esta página permanezca abierta' : 'Avisos apagados';
  }
  function checkReminder() {
    if (!state.reminders) return;
    const now = new Date();
    const stamp = dayKey() + '-' + now.getHours() + '-' + now.getMinutes();
    if (now.getMinutes() !== 0 || !HOURS.includes(now.getHours()) || lastNotice === stamp) return;
    lastNotice = stamp;
    $('reminder-status').textContent = 'Pausa de hidratación · ' + String(now.getHours()).padStart(2, '0') + ':00 — ¿te apetece un vaso de agua?';
    if ('Notification' in window && Notification.permission === 'granted') {
      try { new Notification('Pausa de hidratación 💧', { body: '¿Te apetece un vaso de agua?', tag: stamp }); } catch {}
    }
  }
  $('today-date').textContent = new Intl.DateTimeFormat('es-UY', { weekday: 'long', day: 'numeric', month: 'long' }).format(today);
  $('add-glass').addEventListener('click', () => { if (state.count < Number(goalSelect.value)) state.count++; render(); });
  $('reset-button').addEventListener('click', () => { state.count = 0; render(); });
  goalSelect.addEventListener('change', render);
  $('reminder-toggle').addEventListener('change', (event) => { state.reminders = event.target.checked; renderReminders(); save(); });
  render();
  renderReminders();
  window.setInterval(() => {
    if (dayKey() !== state.date) { state.date = dayKey(); state.count = 0; render(); $('today-date').textContent = new Intl.DateTimeFormat('es-UY', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()); }
    checkReminder();
    renderReminders();
  }, 15000);
})();
