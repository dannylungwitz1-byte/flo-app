// Flo — persönliche Organisation. Alle Daten bleiben lokal (localStorage).

const store = {
  get(key, fallback) {
    try { return JSON.parse(localStorage.getItem("flo:" + key)) ?? fallback; }
    catch { return fallback; }
  },
  set(key, value) { localStorage.setItem("flo:" + key, JSON.stringify(value)); },
};

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const $ = (sel) => document.querySelector(sel);
const dateKey = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const TODAY = dateKey();

// ---------- Datum-Anzeige ----------
const heute = new Date();
$("#today-label").textContent = heute.toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "short" });

// ---------- Drawer-Navigation ----------
const drawer = $("#drawer");
const overlay = $("#overlay");

function openDrawer() {
  drawer.classList.add("open");
  overlay.classList.add("visible");
  document.body.style.overflow = "hidden";
}
function closeDrawer() {
  drawer.classList.remove("open");
  overlay.classList.remove("visible");
  document.body.style.overflow = "";
}

$("#menu-btn").addEventListener("click", openDrawer);
$("#drawer-close").addEventListener("click", closeDrawer);
overlay.addEventListener("click", closeDrawer);

const VIEW_TITLES = {
  aufgaben:    "Aufgaben",
  tagebuch:    "Tagebuch",
  listen:      "Listen",
  kalender:    "Kalender",
  gewohnheiten:"Routinen",
  kalorien:    "Kalorien & Wasser",
  zyklus:      "Zyklus & Pille",
  training:    "Trainingsplan",
};

function navigateTo(view) {
  document.querySelectorAll(".view").forEach((s) => { s.hidden = s.dataset.view !== view; });
  document.querySelectorAll(".nav-item[data-view]").forEach((item) => {
    item.classList.toggle("active", item.dataset.view === view);
  });
  $("#view-title").textContent = VIEW_TITLES[view] || view;
  closeDrawer();
  if (view === "kalorien")    renderMacros();
  if (view === "zyklus")      renderZyklus();
  if (view === "training")    renderTraining();
  if (view === "tagebuch")    renderTabebuch();
  if (view === "kalender")    renderKalender();
}

document.querySelectorAll(".nav-item[data-view]").forEach((item) => {
  item.addEventListener("click", () => navigateTo(item.dataset.view));
});

// ---------- Aufgaben ----------
let tasks = store.get("tasks", []);
const taskList = $("#task-list");

function renderTasks() {
  taskList.innerHTML = "";
  const sorted = [...tasks].sort((a, b) => a.done - b.done);
  sorted.forEach((t) => {
    const li = document.createElement("li");
    li.className = "item" + (t.done ? " done" : "");
    li.innerHTML = `
      <div class="check ${t.done ? "done" : ""}">✓</div>
      <div class="item-body"><div class="item-title"></div></div>
      <button class="del">×</button>`;
    li.querySelector(".item-title").textContent = t.text;
    li.querySelector(".check").onclick = () => { t.done = !t.done; store.set("tasks", tasks); renderTasks(); };
    li.querySelector(".del").onclick = () => { tasks = tasks.filter((x) => x.id !== t.id); store.set("tasks", tasks); renderTasks(); };
    taskList.appendChild(li);
  });
  $("#task-empty").hidden = tasks.length > 0;
}
$("#task-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = $("#task-input");
  const text = input.value.trim();
  if (!text) return;
  tasks.push({ id: uid(), text, done: false });
  store.set("tasks", tasks);
  input.value = "";
  renderTasks();
});
renderTasks();

// ---------- Tagebuch & Stimmung ----------
const MOODS = [
  { id: 0, label: "Strahlend", color: "#F4C440", color2: "#E0A020",
    svg: `<svg viewBox="0 0 40 40" width="22" height="22" fill="none">
      <circle cx="14" cy="15" r="2.8" fill="rgba(0,0,0,0.45)"/>
      <circle cx="26" cy="15" r="2.8" fill="rgba(0,0,0,0.45)"/>
      <circle cx="15.5" cy="13.5" r="1.1" fill="white" opacity="0.9"/>
      <circle cx="27.5" cy="13.5" r="1.1" fill="white" opacity="0.9"/>
      <path d="M10 23 Q20 34 30 23" stroke="rgba(0,0,0,0.45)" stroke-width="2.8" fill="none" stroke-linecap="round"/>
      <path d="M20 3 L20 6" stroke="rgba(0,0,0,0.3)" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M30 6 L28 8.5" stroke="rgba(0,0,0,0.3)" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M10 6 L12 8.5" stroke="rgba(0,0,0,0.3)" stroke-width="2.2" stroke-linecap="round"/>
    </svg>` },
  { id: 1, label: "Gut", color: "#E8907A", color2: "#C86850",
    svg: `<svg viewBox="0 0 40 40" width="22" height="22" fill="none">
      <circle cx="14" cy="15" r="2.8" fill="rgba(0,0,0,0.45)"/>
      <circle cx="26" cy="15" r="2.8" fill="rgba(0,0,0,0.45)"/>
      <path d="M12 23 Q20 31 28 23" stroke="rgba(0,0,0,0.45)" stroke-width="2.8" fill="none" stroke-linecap="round"/>
    </svg>` },
  { id: 2, label: "Okay", color: "#82B09A", color2: "#5A906E",
    svg: `<svg viewBox="0 0 40 40" width="22" height="22" fill="none">
      <circle cx="14" cy="15" r="2.8" fill="rgba(0,0,0,0.4)"/>
      <circle cx="26" cy="15" r="2.8" fill="rgba(0,0,0,0.4)"/>
      <line x1="12" y1="26" x2="28" y2="26" stroke="rgba(0,0,0,0.4)" stroke-width="2.8" stroke-linecap="round"/>
    </svg>` },
  { id: 3, label: "Trüb", color: "#7496B0", color2: "#4E7090",
    svg: `<svg viewBox="0 0 40 40" width="22" height="22" fill="none">
      <circle cx="14" cy="16" r="2.8" fill="rgba(0,0,0,0.4)"/>
      <circle cx="26" cy="16" r="2.8" fill="rgba(0,0,0,0.4)"/>
      <path d="M11 12.5 Q14 10.5 17 12.5" stroke="rgba(0,0,0,0.35)" stroke-width="1.8" fill="none" stroke-linecap="round"/>
      <path d="M23 12.5 Q26 10.5 29 12.5" stroke="rgba(0,0,0,0.35)" stroke-width="1.8" fill="none" stroke-linecap="round"/>
      <path d="M13 29 Q20 22 27 29" stroke="rgba(0,0,0,0.4)" stroke-width="2.8" fill="none" stroke-linecap="round"/>
    </svg>` },
  { id: 4, label: "Schwer", color: "#9485BA", color2: "#6A5898",
    svg: `<svg viewBox="0 0 40 40" width="22" height="22" fill="none">
      <circle cx="14" cy="17" r="2.8" fill="rgba(0,0,0,0.45)"/>
      <circle cx="26" cy="17" r="2.8" fill="rgba(0,0,0,0.45)"/>
      <path d="M10 11 Q14 14 17 11" stroke="rgba(0,0,0,0.45)" stroke-width="2" fill="none" stroke-linecap="round"/>
      <path d="M23 11 Q26 14 30 11" stroke="rgba(0,0,0,0.45)" stroke-width="2" fill="none" stroke-linecap="round"/>
      <path d="M12 31 Q20 22 28 31" stroke="rgba(0,0,0,0.45)" stroke-width="2.8" fill="none" stroke-linecap="round"/>
    </svg>` },
];

let todayMoodSelected = -1;

function renderTabebuch() {
  // Greeting + date
  const h = heute.getHours();
  const greeting = h < 12 ? "Guten Morgen" : h < 18 ? "Wie war dein Tag?" : "Guten Abend";
  $("#journal-greeting").textContent = greeting;
  $("#journal-date-sub").textContent = heute.toLocaleDateString("de-DE", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });
  $("#journal-page-day").textContent = heute.toLocaleDateString("de-DE", { weekday: "long" });
  $("#journal-page-date").textContent = heute.toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" });

  // Load saved entry for today
  const saved = store.get("tag-" + TODAY, null);
  todayMoodSelected = saved ? saved.mood : -1;

  // Journal text
  const ta = $("#journal-textarea");
  ta.value = saved ? (saved.text || "") : "";

  // Auto-save on input
  ta.oninput = () => saveDayEntry(false);

  // Render mood circles
  const row = $("#mood-row");
  row.innerHTML = "";
  if (todayMoodSelected >= 0) row.classList.add("has-selection");
  else row.classList.remove("has-selection");

  MOODS.forEach((m) => {
    const circle = document.createElement("div");
    circle.className = "mood-circle" + (m.id === todayMoodSelected ? " sel" : "");
    circle.style.background = `linear-gradient(135deg, ${m.color} 0%, ${m.color2} 100%)`;
    circle.innerHTML = m.svg;
    circle.onclick = () => selectMood(m.id);
    row.appendChild(circle);
  });

  updateMoodLabel();
  updateMoodSelectorBg();
  renderMoodHistory();
}

function selectMood(id) {
  todayMoodSelected = todayMoodSelected === id ? -1 : id;
  const row = $("#mood-row");
  if (todayMoodSelected >= 0) row.classList.add("has-selection");
  else row.classList.remove("has-selection");
  row.querySelectorAll(".mood-circle").forEach((c, i) => {
    c.classList.toggle("sel", i === todayMoodSelected);
  });
  updateMoodLabel();
  updateMoodSelectorBg();
  saveDayEntry(false);
}

function updateMoodLabel() {
  const label = $("#mood-name");
  if (todayMoodSelected >= 0) {
    label.textContent = MOODS[todayMoodSelected].label;
    label.style.color = MOODS[todayMoodSelected].color2;
  } else {
    label.textContent = "";
  }
}

function updateMoodSelectorBg() {
  const sel = $("#mood-selector");
  if (todayMoodSelected >= 0) {
    const c = MOODS[todayMoodSelected].color;
    sel.style.background = `linear-gradient(160deg, ${c}18 0%, #ffffff 60%)`;
  } else {
    sel.style.background = "";
  }
}

function saveDayEntry(showIndicator = true) {
  const text = $("#journal-textarea").value;
  store.set("tag-" + TODAY, { mood: todayMoodSelected, text, ts: Date.now() });
  renderMoodHistory();
  if (showIndicator) {
    const ind = $("#journal-saved-indicator");
    ind.classList.add("show");
    setTimeout(() => ind.classList.remove("show"), 1800);
  }
}

$("#journal-save-btn").addEventListener("click", () => saveDayEntry(true));

function renderMoodHistory() {
  const row = $("#mood-dots-row");
  if (!row) return;
  row.innerHTML = "";
  for (let i = 29; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = dateKey(d);
    const entry = store.get("tag-" + key, null);
    const dot = document.createElement("div");
    dot.className = "mood-hist-dot" + (key === TODAY ? " today-dot" : "");
    if (entry && entry.mood >= 0) {
      dot.style.background = `linear-gradient(135deg, ${MOODS[entry.mood].color}, ${MOODS[entry.mood].color2})`;
      dot.classList.add("has-entry");
    }
    dot.title = d.toLocaleDateString("de-DE", { day: "numeric", month: "short" });
    dot.onclick = () => {
      if (entry) openPastEntrySheet(key, entry, d);
    };
    row.appendChild(dot);
  }
}

function openPastEntrySheet(key, entry, dateObj) {
  const mood = entry.mood >= 0 ? MOODS[entry.mood] : null;
  const sheet = document.createElement("div");
  sheet.className = "sheet-overlay";
  const dateStr = dateObj.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });
  sheet.innerHTML = `
    <div class="sheet">
      <div class="sheet-title" style="margin-bottom:10px">${dateStr}</div>
      ${mood ? `
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
          <div class="past-entry-mood-circle" style="background:linear-gradient(135deg,${mood.color},${mood.color2})">${mood.svg}</div>
          <div style="font-family:var(--serif);font-size:18px;font-style:italic;color:${mood.color2}">${mood.label}</div>
        </div>` : ""}
      ${entry.text ? `<div class="past-entry-text">${entry.text.replace(/</g,"&lt;").replace(/\n/g,"<br>")}</div>`
                   : `<div class="past-entry-empty">Kein Eintrag an diesem Tag.</div>`}
      <div class="sheet-actions" style="margin-top:20px">
        <button class="sheet-cancel" style="flex:1">Schließen</button>
      </div>
    </div>`;
  sheet.querySelector(".sheet-cancel").onclick = () => document.body.removeChild(sheet);
  document.body.appendChild(sheet);
}

// ---------- Listen ----------
function renderListen() {
  const lists = store.get("listen", []);
  const grid = $("#listen-grid");
  grid.innerHTML = "";
  lists.forEach((l) => {
    const card = document.createElement("div");
    card.className = "listen-card";
    const done = l.items.filter(i => i.done).length;
    card.innerHTML = `
      <div class="listen-card-name"></div>
      <div class="listen-card-count"></div>`;
    card.querySelector(".listen-card-name").textContent = l.name;
    card.querySelector(".listen-card-count").textContent = l.items.length === 0 ? "Leer" : `${done}/${l.items.length}`;
    card.onclick = () => openListSheet(l.id);
    grid.appendChild(card);
  });
  $("#listen-empty").hidden = lists.length > 0;
}

function openListSheet(listId) {
  const lists = store.get("listen", []);
  const list = lists.find(l => l.id === listId);
  if (!list) return;

  const sheet = document.createElement("div");
  sheet.className = "sheet-overlay";
  sheet.innerHTML = `
    <div class="sheet sheet-full">
      <div class="sheet-header">
        <div class="sheet-title-row">
          <div class="sheet-title listen-sheet-title"></div>
          <button class="del listen-del-btn">×</button>
        </div>
      </div>
      <form class="add-form listen-add-form">
        <input type="text" placeholder="Neuer Eintrag…" autocomplete="off"/>
        <button type="submit">+</button>
      </form>
      <ul class="list listen-items"></ul>
      <div class="sheet-actions" style="margin-top:auto;padding-top:16px">
        <button class="sheet-cancel" style="flex:1">Schließen</button>
      </div>
    </div>`;

  sheet.querySelector(".listen-sheet-title").textContent = list.name;
  sheet.querySelector(".sheet-cancel").onclick = () => { document.body.removeChild(sheet); renderListen(); };

  sheet.querySelector(".listen-del-btn").onclick = () => {
    const updated = store.get("listen", []).filter(l => l.id !== listId);
    store.set("listen", updated);
    document.body.removeChild(sheet);
    renderListen();
  };

  function renderItems() {
    const ul = sheet.querySelector(".listen-items");
    ul.innerHTML = "";
    const cur = store.get("listen", []).find(l => l.id === listId);
    if (!cur) return;
    cur.items.forEach(item => {
      const li = document.createElement("li");
      li.className = "item" + (item.done ? " done" : "");
      li.innerHTML = `<div class="check ${item.done ? "done" : ""}">✓</div><div class="item-body"><div class="item-title"></div></div><button class="del">×</button>`;
      li.querySelector(".item-title").textContent = item.text;
      li.querySelector(".check").onclick = () => {
        const ls = store.get("listen", []); const l2 = ls.find(l => l.id === listId);
        const it = l2.items.find(i => i.id === item.id); it.done = !it.done;
        store.set("listen", ls); renderItems();
      };
      li.querySelector(".del").onclick = () => {
        const ls = store.get("listen", []); const l2 = ls.find(l => l.id === listId);
        l2.items = l2.items.filter(i => i.id !== item.id);
        store.set("listen", ls); renderItems();
      };
      ul.appendChild(li);
    });
  }
  renderItems();

  sheet.querySelector(".listen-add-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = sheet.querySelector("input");
    const text = input.value.trim(); if (!text) return;
    const ls = store.get("listen", []); const l2 = ls.find(l => l.id === listId);
    l2.items.push({ id: uid(), text, done: false });
    store.set("listen", ls); input.value = ""; renderItems();
  });

  document.body.appendChild(sheet);
  setTimeout(() => sheet.querySelector("input").focus(), 50);
}

$("#neue-liste-btn").addEventListener("click", () => {
  const sheet = document.createElement("div");
  sheet.className = "sheet-overlay";
  sheet.innerHTML = `
    <div class="sheet">
      <div class="sheet-title">Neue Liste</div>
      <input type="text" placeholder="Name der Liste…" autocomplete="off"
        style="width:100%;font-family:var(--body);font-size:17px;border:1.5px solid var(--border-2);border-radius:12px;padding:12px 16px;background:var(--surface);color:var(--text);outline:none;-webkit-appearance:none;"/>
      <div class="sheet-actions" style="margin-top:16px">
        <button class="sheet-cancel">Abbrechen</button>
        <button class="accent-btn sheet-save">Erstellen</button>
      </div>
    </div>`;
  sheet.querySelector(".sheet-cancel").onclick = () => document.body.removeChild(sheet);
  sheet.querySelector(".sheet-save").onclick = () => {
    const name = sheet.querySelector("input").value.trim();
    if (!name) return;
    const lists = store.get("listen", []);
    lists.push({ id: uid(), name, items: [] });
    store.set("listen", lists);
    document.body.removeChild(sheet);
    renderListen();
  };
  document.body.appendChild(sheet);
  setTimeout(() => sheet.querySelector("input").focus(), 50);
});

renderListen();

// ---------- Kalender ----------
let events = store.get("events", []);
let kalYear = new Date().getFullYear();
let kalMonth = new Date().getMonth();
let kalSelected = TODAY;

function renderKalender() {
  renderKalGrid();
  renderKalDayEvents();
}

function renderKalGrid() {
  $("#kal-month-label").textContent = new Date(kalYear, kalMonth, 1)
    .toLocaleDateString("de-DE", { month: "long", year: "numeric" });

  const grid = $("#kal-mini-grid");
  grid.innerHTML = "";

  const firstDay = new Date(kalYear, kalMonth, 1);
  const lastDate = new Date(kalYear, kalMonth + 1, 0).getDate();
  let startDow = firstDay.getDay();
  startDow = startDow === 0 ? 6 : startDow - 1;

  // Tage mit Terminen als Set
  const eventDays = new Set(
    events.map(ev => ev.when ? ev.when.slice(0, 10) : null).filter(Boolean)
  );

  const addCell = (dStr, otherMonth) => {
    const cell = document.createElement("div");
    cell.className = "kal-cell" +
      (otherMonth ? " other-month" : "") +
      (dStr === TODAY ? " today" : "") +
      (dStr === kalSelected && dStr !== TODAY ? " selected" : "");
    const num = document.createElement("div");
    num.className = "kal-cell-num";
    num.textContent = parseInt(dStr.slice(8));
    cell.appendChild(num);
    if (eventDays.has(dStr) && !otherMonth) {
      const dot = document.createElement("div");
      dot.className = "kal-cell-dot";
      cell.appendChild(dot);
    }
    if (!otherMonth) {
      cell.onclick = () => { kalSelected = dStr; renderKalGrid(); renderKalDayEvents(); };
    }
    grid.appendChild(cell);
  };

  for (let i = startDow - 1; i >= 0; i--) {
    const d = new Date(kalYear, kalMonth, -i);
    addCell(dateKey(d), true);
  }
  for (let d = 1; d <= lastDate; d++) {
    addCell(dateKey(new Date(kalYear, kalMonth, d)), false);
  }
  const trailing = (7 - ((startDow + lastDate) % 7)) % 7;
  for (let i = 1; i <= trailing; i++) {
    addCell(dateKey(new Date(kalYear, kalMonth + 1, i)), true);
  }
}

function renderKalDayEvents() {
  const d = new Date(kalSelected + "T00:00:00");
  const isToday = kalSelected === TODAY;
  const label = isToday
    ? "Heute, " + d.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })
    : d.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  $("#kal-day-header").textContent = label;

  const container = $("#event-list");
  container.innerHTML = "";
  const dayEvents = events.filter(ev => ev.when && ev.when.startsWith(kalSelected));

  if (dayEvents.length === 0) {
    $("#event-empty").hidden = false;
  } else {
    $("#event-empty").hidden = true;
    dayEvents.sort((a, b) => a.when.localeCompare(b.when)).forEach((ev) => {
      const card = document.createElement("div");
      card.className = "event-card";
      const timeStr = ev.hasTime
        ? new Date(ev.when).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) + " Uhr"
        : "Ganztägig";
      card.innerHTML = `
        <div class="event-accent-line"></div>
        <div class="event-body">
          <div class="event-title"></div>
          <div class="event-time"></div>
        </div>
        <button class="event-del">×</button>`;
      card.querySelector(".event-title").textContent = ev.text;
      card.querySelector(".event-time").textContent = timeStr;
      card.querySelector(".event-del").onclick = () => {
        events = events.filter((x) => x.id !== ev.id);
        store.set("events", events);
        renderKalGrid();
        renderKalDayEvents();
      };
      container.appendChild(card);
    });
  }
}

$("#kal-prev").addEventListener("click", () => {
  kalMonth--; if (kalMonth < 0) { kalMonth = 11; kalYear--; }
  renderKalGrid();
});
$("#kal-next").addEventListener("click", () => {
  kalMonth++; if (kalMonth > 11) { kalMonth = 0; kalYear++; }
  renderKalGrid();
});

$("#kal-add-trigger").addEventListener("click", () => {
  const sheet = document.createElement("div");
  sheet.className = "sheet-overlay";
  sheet.innerHTML = `
    <div class="sheet">
      <div class="sheet-title">Neuer Termin</div>
      <input type="text" id="ev-text" placeholder="Bezeichnung…" autocomplete="off"
        style="width:100%;font-family:var(--body);font-size:17px;border:1.5px solid var(--border-2);border-radius:12px;padding:12px 16px;background:var(--surface);color:var(--text);outline:none;-webkit-appearance:none;margin-bottom:12px;box-sizing:border-box;"/>
      <div style="display:flex;gap:8px;margin-bottom:4px">
        <input type="date" id="ev-date" value="${kalSelected}"
          style="flex:1;font-family:var(--body);font-size:16px;border:1.5px solid var(--border-2);border-radius:12px;padding:11px 12px;background:var(--surface-2);color:var(--text);outline:none;-webkit-appearance:none;"/>
        <input type="time" id="ev-time"
          style="flex:0.8;font-family:var(--body);font-size:16px;border:1.5px solid var(--border-2);border-radius:12px;padding:11px 12px;background:var(--surface-2);color:var(--text);outline:none;-webkit-appearance:none;"/>
      </div>
      <div class="sheet-actions">
        <button class="sheet-cancel">Abbrechen</button>
        <button class="accent-btn sheet-save">Speichern</button>
      </div>
    </div>`;
  sheet.querySelector(".sheet-cancel").onclick = () => document.body.removeChild(sheet);
  sheet.querySelector(".sheet-save").onclick = () => {
    const text = sheet.querySelector("#ev-text").value.trim();
    const date = sheet.querySelector("#ev-date").value;
    const time = sheet.querySelector("#ev-time").value;
    if (!text) return;
    const when = date ? (time ? `${date}T${time}` : `${date}T00:00`) : "";
    events.push({ id: uid(), text, when, hasTime: !!time });
    store.set("events", events);
    document.body.removeChild(sheet);
    renderKalGrid();
    renderKalDayEvents();
  };
  document.body.appendChild(sheet);
  setTimeout(() => sheet.querySelector("#ev-text").focus(), 50);
});

// ---------- Gewohnheiten ----------
let habits = store.get("habits", []);
const habitList = $("#habit-list");
const wochentage = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

function streakOf(done) {
  let s = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    if (done.includes(dateKey(d))) s++;
    else if (i > 0) break;
  }
  return s;
}

function renderHabits() {
  habitList.innerHTML = "";
  habits.forEach((h) => {
    const li = document.createElement("li");
    li.className = "item";
    li.style.flexDirection = "column";
    li.style.alignItems = "stretch";

    const top = document.createElement("div");
    top.style.cssText = "display:flex;justify-content:space-between;align-items:center";
    const titleEl = document.createElement("div");
    titleEl.className = "item-title"; titleEl.textContent = h.text;
    const del = document.createElement("button");
    del.className = "del"; del.textContent = "×";
    del.onclick = () => { habits = habits.filter((x) => x.id !== h.id); store.set("habits", habits); renderHabits(); };
    top.append(titleEl, del);

    const week = document.createElement("div");
    week.className = "habit-week";
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = dateKey(d);
      const cell = document.createElement("div");
      cell.className = "day-dot" + (h.done.includes(key) ? " done" : "") + (i === 0 ? " today" : "");
      cell.textContent = wochentage[d.getDay()];
      cell.onclick = () => {
        h.done = h.done.includes(key) ? h.done.filter((k) => k !== key) : [...h.done, key];
        store.set("habits", habits); renderHabits();
      };
      week.appendChild(cell);
    }
    const streak = document.createElement("div");
    streak.className = "streak-text";
    const s = streakOf(h.done);
    streak.textContent = s > 0 ? `🔥 ${s} ${s === 1 ? "Tag" : "Tage"} in Folge` : "Heute starten?";

    li.append(top, week, streak);
    habitList.appendChild(li);
  });
  $("#habit-empty").hidden = habits.length > 0;
}
$("#habit-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = $("#habit-input");
  const text = input.value.trim();
  if (!text) return;
  habits.push({ id: uid(), text, done: [] });
  store.set("habits", habits);
  input.value = "";
  renderHabits();
});
renderHabits();

// ---------- Kalorien & Protein ----------
let macroGoals = store.get("macroGoals", { kcal: 2000, prot: 150 });

function getTodayMeals() { return store.get("meals-" + TODAY, []); }
function saveTodayMeals(meals) { store.set("meals-" + TODAY, meals); }
function getSavedMeals() { return store.get("saved-meals", []); }

function renderSavedChips() {
  const saved = getSavedMeals();
  const wrap = $("#saved-chips-wrap");
  const container = $("#saved-chips");
  wrap.hidden = saved.length === 0;
  container.innerHTML = "";
  saved.forEach((m) => {
    const chip = document.createElement("div");
    chip.className = "meal-chip";
    chip.innerHTML = `<span></span><span style="color:var(--muted);font-size:13px">${m.kcal} kcal</span><button class="meal-chip-del">×</button>`;
    chip.querySelector("span").textContent = m.name;
    chip.onclick = (e) => {
      if (e.target.classList.contains("meal-chip-del")) return;
      $("#meal-input").value = m.name;
      $("#meal-kcal").value = m.kcal;
      $("#meal-prot").value = m.prot;
      $("#meal-input").focus();
    };
    chip.querySelector(".meal-chip-del").onclick = () => {
      store.set("saved-meals", getSavedMeals().filter((x) => x.id !== m.id));
      renderSavedChips();
    };
    container.appendChild(chip);
  });
}

function renderMacros() {
  const meals = getTodayMeals();
  const totalKcal = meals.reduce((s, m) => s + (m.kcal || 0), 0);
  const totalProt = meals.reduce((s, m) => s + (m.prot || 0), 0);

  $("#kcal-total").textContent = totalKcal;
  $("#kcal-goal").textContent = macroGoals.kcal;
  $("#prot-total").textContent = totalProt;
  $("#prot-goal").textContent = macroGoals.prot;

  $("#kcal-bar").style.width = Math.min(100, Math.round(totalKcal / macroGoals.kcal * 100)) + "%";
  $("#prot-bar").style.width = Math.min(100, Math.round(totalProt / macroGoals.prot * 100)) + "%";

  const list = $("#meal-list");
  list.innerHTML = "";
  [...meals].reverse().forEach((m) => {
    const li = document.createElement("li");
    li.className = "item";
    li.innerHTML = `
      <div class="item-body">
        <div class="item-title"></div>
        <div class="item-sub">${m.kcal} kcal · ${m.prot} g Protein</div>
      </div>
      <button class="meal-save-btn" title="Als Favorit speichern">☆</button>
      <button class="del">×</button>`;
    li.querySelector(".item-title").textContent = m.name;
    li.querySelector(".meal-save-btn").onclick = () => {
      const saved = getSavedMeals();
      if (!saved.find((x) => x.name === m.name)) {
        saved.push({ id: uid(), name: m.name, kcal: m.kcal, prot: m.prot });
        store.set("saved-meals", saved);
        renderSavedChips();
      }
    };
    li.querySelector(".del").onclick = () => {
      saveTodayMeals(getTodayMeals().filter((x) => x.id !== m.id));
      renderMacros();
    };
    list.appendChild(li);
  });
  $("#meal-empty").hidden = meals.length > 0;
  renderWater();
  renderSavedChips();
}

$("#meal-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = $("#meal-input").value.trim();
  const kcal = parseInt($("#meal-kcal").value) || 0;
  const prot = parseInt($("#meal-prot").value) || 0;
  if (!name) return;
  const meals = getTodayMeals();
  meals.push({ id: uid(), name, kcal, prot });
  saveTodayMeals(meals);
  $("#meal-input").value = ""; $("#meal-kcal").value = ""; $("#meal-prot").value = "";
  renderMacros();
});

$("#goal-btn").addEventListener("click", () => {
  const sheet = document.createElement("div");
  sheet.className = "sheet-overlay";
  sheet.innerHTML = `
    <div class="sheet">
      <div class="sheet-title">Tägliche Ziele</div>
      <p class="sheet-goal-label">Kalorien (kcal)</p>
      <input type="number" id="g-kcal" value="${macroGoals.kcal}" style="margin-bottom:12px"/>
      <p class="sheet-goal-label">Protein (g)</p>
      <input type="number" id="g-prot" value="${macroGoals.prot}"/>
      <div class="sheet-actions">
        <button class="sheet-cancel">Abbrechen</button>
        <button class="accent-btn sheet-save">Speichern</button>
      </div>
    </div>`;
  sheet.querySelector(".sheet-cancel").onclick = () => document.body.removeChild(sheet);
  sheet.querySelector(".sheet-save").onclick = () => {
    macroGoals.kcal = parseInt(sheet.querySelector("#g-kcal").value) || 2000;
    macroGoals.prot = parseInt(sheet.querySelector("#g-prot").value) || 150;
    store.set("macroGoals", macroGoals);
    document.body.removeChild(sheet);
    renderMacros();
  };
  document.body.appendChild(sheet);
});

// ---------- Wasserzähler ----------
function renderWater() {
  const goalMl = store.get("waterGoalMl", 2000);
  const drunkMl = store.get("water-ml-" + TODAY, 0);
  const fraction = Math.min(1, drunkMl / goalMl);
  const translateY = Math.round((1 - fraction) * 148);
  const rect = $("#water-fill-rect");
  if (rect) rect.style.transform = `translateY(${translateY}px)`;
  const wc = $("#water-count");
  if (wc) wc.textContent = (drunkMl / 1000).toFixed(1).replace(".", ",") + " L";
  const wg = $("#water-goal-disp");
  if (wg) wg.textContent = "Ziel: " + (goalMl / 1000).toFixed(1).replace(".", ",") + " L";
}

$("#water-plus").addEventListener("click", () => {
  const goalMl = store.get("waterGoalMl", 2000);
  const schluckMl = store.get("waterSchluckMl", 250);
  const cur = store.get("water-ml-" + TODAY, 0);
  if (cur < goalMl) { store.set("water-ml-" + TODAY, Math.min(goalMl, cur + schluckMl)); renderWater(); }
});
$("#water-minus").addEventListener("click", () => {
  const schluckMl = store.get("waterSchluckMl", 250);
  const cur = store.get("water-ml-" + TODAY, 0);
  if (cur > 0) { store.set("water-ml-" + TODAY, Math.max(0, cur - schluckMl)); renderWater(); }
});
$("#water-goal-btn").addEventListener("click", () => {
  const goalL = store.get("waterGoalMl", 2000) / 1000;
  const schluck = store.get("waterSchluckMl", 250);
  const sheet = document.createElement("div");
  sheet.className = "sheet-overlay";
  sheet.innerHTML = `
    <div class="sheet">
      <div class="sheet-title">Wasserziel</div>
      <p class="sheet-goal-label">Tagesziel (Liter)</p>
      <input type="number" id="w-goal" value="${goalL}" min="0.5" max="6" step="0.1" style="margin-bottom:14px"/>
      <p class="sheet-goal-label">Menge pro Schluck (ml)</p>
      <input type="number" id="w-schluck" value="${schluck}" min="50" max="1000" step="50"/>
      <div class="sheet-actions">
        <button class="sheet-cancel">Abbrechen</button>
        <button class="accent-btn sheet-save">Speichern</button>
      </div>
    </div>`;
  sheet.querySelector(".sheet-cancel").onclick = () => document.body.removeChild(sheet);
  sheet.querySelector(".sheet-save").onclick = () => {
    store.set("waterGoalMl", Math.round((parseFloat(sheet.querySelector("#w-goal").value) || 2) * 1000));
    store.set("waterSchluckMl", parseInt(sheet.querySelector("#w-schluck").value) || 250);
    document.body.removeChild(sheet);
    renderWater();
  };
  document.body.appendChild(sheet);
});
renderWater();

// ---------- Zyklus & Pille ----------
let calYear = new Date().getFullYear();
let calMonth = new Date().getMonth();

function getDayInCycle(dateStr, data) {
  const start = new Date(data.start + "T00:00:00");
  const d = new Date(dateStr + "T00:00:00");
  const diff = Math.floor((d - start) / 86400000);
  if (diff < 0) return null;
  return (diff % (data.length || 28)) + 1;
}

function phaseClass(dayInCycle, pillDays) {
  if (dayInCycle === null) return "";
  if (dayInCycle > pillDays) return "phase-pause";
  if (dayInCycle <= 5)  return "phase-mens";
  if (dayInCycle <= 13) return "phase-follikel";
  if (dayInCycle <= 16) return "phase-eisprung";
  return "phase-luteal";
}

function buildCalDay(dateStr, data, pillDays, otherMonth) {
  const cell = document.createElement("div");
  cell.className = "cal-day";
  if (otherMonth) { cell.classList.add("other-month"); }
  if (dateStr === TODAY) cell.classList.add("today");

  const dayInCycle = getDayInCycle(dateStr, data);
  const cls = phaseClass(dayInCycle, pillDays);
  if (cls) cell.classList.add(cls);

  const numEl = document.createElement("span");
  numEl.className = "cal-num";
  numEl.textContent = parseInt(dateStr.slice(8));
  cell.appendChild(numEl);

  const dot = document.createElement("div");
  dot.className = "cal-dot";
  const isPillDay = dayInCycle !== null && dayInCycle <= pillDays;
  if (isPillDay && !otherMonth) {
    const taken = store.get("pill-" + dateStr, false);
    const future = dateStr > TODAY;
    if (taken) dot.classList.add("taken");
    else if (!future) dot.classList.add("missed");
    if (!future) {
      cell.addEventListener("click", () => {
        store.set("pill-" + dateStr, !store.get("pill-" + dateStr, false));
        renderZyklus();
      });
    }
  }
  cell.appendChild(dot);
  return cell;
}

const PHASE_INFO = {
  mens:     { name: "Menstruation",  days: "Tag 1–5",   short: "Ruhe & Regeneration",
    text: "Die Gebärmutterschleimhaut löst sich ab. Östrogen und Progesteron sind auf ihrem Tiefstand. Viele Frauen fühlen sich müde und empfindlich — das ist völlig normal. Gönne dir Wärme und Ruhe.",
    tips: ["Wärme & Wärmflasche", "Sanftes Yoga", "Eisenreich essen", "Früh schlafen"] },
  follikel: { name: "Follikelphase", days: "Tag 6–13",  short: "Energie steigt",
    text: "Östrogen steigt an. Du wirst energie­reicher, kommunikativer und kreativer. Dein Körper bereitet sich auf den Eisprung vor — jetzt ist der beste Zeitpunkt für neue Projekte und intensiveren Sport.",
    tips: ["Neue Projekte starten", "Krafttraining optimal", "Soziale Events", "Kreativität nutzen"] },
  eisprung: { name: "Eisprung",      days: "Tag 14–16", short: "Höchste Energie",
    text: "Östrogen erreicht seinen Höhepunkt. Du strahlst Selbstbewusstsein aus, bist kommunikativ und energiegeladen. Ein perfekter Moment für wichtige Gespräche, Präsentationen oder besondere Aktivitäten.",
    tips: ["Wichtige Gespräche", "Höchstleistung Sport", "Selbstbewusst auftreten", "Fruchtbarste Zeit"] },
  luteal:   { name: "Lutealphase",   days: "Tag 17–28", short: "Nach innen kehren",
    text: "Progesteron steigt an, du wirst ruhiger und introvertierter. In der zweiten Hälfte können PMS-Symptome auftreten. Dein Körper signalisiert: Verlangsamen, reflektieren und auf sich achten.",
    tips: ["Reflexion & Journaling", "Ruhige Routinen", "Magnesium & B6", "Auf sich hören"] },
  pause:    { name: "Pillenpause",   days: "Pause",     short: "Pillenfreie Tage",
    text: "Das sind deine pillenfreien Tage. Es kommt zu einer Abbruchblutung, die durch den Hormonentzug ausgelöst wird. Gönn dir Ruhe und achte auf deinen Körper.",
    tips: ["Wärme & Ruhe", "Viel trinken", "Sanfte Bewegung", "Auf Beschwerden achten"] },
};

function renderZyklus() {
  const data = store.get("zyklus", null);
  const setupEl = $("#zyklus-setup");
  const displayEl = $("#zyklus-display");

  if (!data) {
    setupEl.hidden = false;
    displayEl.hidden = true;
    return;
  }
  setupEl.hidden = true;
  displayEl.hidden = false;

  const pillDays = data.pillDays || 21;

  $("#cal-month-title").textContent = new Date(calYear, calMonth, 1)
    .toLocaleDateString("de-DE", { month: "long", year: "numeric" });

  const grid = $("#cal-grid");
  grid.innerHTML = "";

  const firstDay = new Date(calYear, calMonth, 1);
  const lastDate = new Date(calYear, calMonth + 1, 0).getDate();

  let startDow = firstDay.getDay();
  startDow = startDow === 0 ? 6 : startDow - 1;

  for (let i = startDow - 1; i >= 0; i--) {
    const d = new Date(calYear, calMonth, -i);
    grid.appendChild(buildCalDay(dateKey(d), data, pillDays, true));
  }
  for (let d = 1; d <= lastDate; d++) {
    grid.appendChild(buildCalDay(dateKey(new Date(calYear, calMonth, d)), data, pillDays, false));
  }
  const total = startDow + lastDate;
  const trailing = (7 - (total % 7)) % 7;
  for (let i = 1; i <= trailing; i++) {
    const d = new Date(calYear, calMonth + 1, i);
    grid.appendChild(buildCalDay(dateKey(d), data, pillDays, true));
  }

  const todayDIC = getDayInCycle(TODAY, data);
  const phaseTodayBar = $("#phase-today-bar");
  if (todayDIC !== null) {
    phaseTodayBar.hidden = false;
    const pKey = phaseClass(todayDIC, pillDays).replace("phase-", "") || "luteal";
    const info = PHASE_INFO[pKey] || PHASE_INFO.luteal;
    $("#phase-today-day").textContent = "Tag " + todayDIC + " von " + (data.length || 28);
    $("#phase-today-name").textContent = info.name;
    $("#phase-today-short").textContent = info.short;
  } else {
    phaseTodayBar.hidden = true;
  }
}

$("#setup-save-btn").addEventListener("click", () => {
  const start = $("#period-start").value;
  const length = parseInt($("#cycle-length-input").value) || 28;
  const pillDays = parseInt($("#pill-days-input").value) || 21;
  if (!start) return;
  store.set("zyklus", { start, length, pillDays });
  renderZyklus();
});

$("#cal-prev").addEventListener("click", () => {
  calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; }
  renderZyklus();
});
$("#cal-next").addEventListener("click", () => {
  calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; }
  renderZyklus();
});

$("#phase-info-btn").addEventListener("click", () => {
  const data = store.get("zyklus", null);
  if (!data) return;
  const pillDays = data.pillDays || 21;
  const todayDIC = getDayInCycle(TODAY, data);
  if (todayDIC === null) return;
  const pKey = phaseClass(todayDIC, pillDays).replace("phase-", "") || "luteal";
  const info = PHASE_INFO[pKey] || PHASE_INFO.luteal;
  const sheet = document.createElement("div");
  sheet.className = "sheet-overlay";
  sheet.innerHTML = `
    <div class="sheet">
      <div class="phase-sheet-name"></div>
      <div class="phase-sheet-days"></div>
      <div class="phase-sheet-text"></div>
      <div class="phase-tips"></div>
      <div class="sheet-actions" style="margin-top:20px">
        <button class="sheet-cancel" style="flex:1">Schließen</button>
      </div>
    </div>`;
  sheet.querySelector(".phase-sheet-name").textContent = info.name;
  sheet.querySelector(".phase-sheet-days").textContent = info.days;
  sheet.querySelector(".phase-sheet-text").textContent = info.text;
  info.tips.forEach((t) => {
    const tip = document.createElement("div");
    tip.className = "phase-tip";
    tip.textContent = t;
    sheet.querySelector(".phase-tips").appendChild(tip);
  });
  sheet.querySelector(".sheet-cancel").onclick = () => document.body.removeChild(sheet);
  document.body.appendChild(sheet);
});

$("#zyklus-edit-btn").addEventListener("click", () => {
  const data = store.get("zyklus", null);
  if (data) {
    $("#period-start").value = data.start;
    $("#cycle-length-input").value = data.length || 28;
    $("#pill-days-input").value = data.pillDays || 21;
  }
  $("#zyklus-setup").hidden = false;
  $("#zyklus-display").hidden = true;
});

// ---------- Trainingsplan ----------
const TAGE = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const TAGE_LANG = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
let activeWeek = 1;
let activeDay = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

function renderTraining() {
  const picker = $("#week-picker");
  picker.innerHTML = "";
  for (let w = 1; w <= 12; w++) {
    const chip = document.createElement("div");
    chip.className = "week-chip" + (w === activeWeek ? " active" : "");
    chip.textContent = "W" + w;
    chip.onclick = () => { activeWeek = w; renderTraining(); };
    picker.appendChild(chip);
  }
  const activeChip = picker.querySelector(".week-chip.active");
  if (activeChip) activeChip.scrollIntoView({ inline: "center", behavior: "smooth", block: "nearest" });

  const container = $("#training-days");
  container.innerHTML = "";

  const dots = document.createElement("div");
  dots.className = "training-dots";
  TAGE.forEach((t, i) => {
    const dot = document.createElement("div");
    dot.className = "training-dot" + (i === activeDay ? " active" : "");
    dot.textContent = t;
    dot.onclick = () => { activeDay = i; renderTraining(); };
    dots.appendChild(dot);
  });
  container.appendChild(dots);

  const key = "training-w" + activeWeek + "-d" + (activeDay + 1);
  const plan = store.get(key, "");
  const card = document.createElement("div");
  card.className = "training-card";
  card.innerHTML = `
    <div class="training-card-day">${TAGE_LANG[activeDay]}</div>
    <div class="training-card-plan">${plan || "Noch kein Training eingetragen.\nTippe zum Bearbeiten."}</div>
    <button class="training-edit-btn">✎ Bearbeiten</button>`;
  card.querySelector(".training-edit-btn").onclick = () => openDaySheet(activeWeek, activeDay + 1, TAGE_LANG[activeDay], key);
  container.appendChild(card);

  let touchStartX = 0;
  card.addEventListener("touchstart", (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
  card.addEventListener("touchend", (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) < 40) return;
    if (dx < 0 && activeDay < 6) { activeDay++; renderTraining(); }
    if (dx > 0 && activeDay > 0) { activeDay--; renderTraining(); }
  }, { passive: true });
}

function openDaySheet(week, dayNum, dayName, key) {
  const plan = store.get(key, "");
  const sheet = document.createElement("div");
  sheet.className = "sheet-overlay";
  sheet.innerHTML = `
    <div class="sheet">
      <div class="sheet-title">Woche ${week} — ${dayName}</div>
      <textarea rows="6" placeholder="z.B. Laufen 5km, Kraft Oberkörper, Ruhetag…"></textarea>
      <div class="sheet-actions">
        <button class="sheet-cancel">Abbrechen</button>
        <button class="accent-btn sheet-save">Speichern</button>
      </div>
    </div>`;
  const w1Key = "training-w1-d" + dayNum;
  const w1Plan = week > 1 && !plan ? store.get(w1Key, "") : "";
  sheet.querySelector("textarea").value = plan || w1Plan;
  sheet.querySelector(".sheet-cancel").onclick = () => document.body.removeChild(sheet);
  sheet.querySelector(".sheet-save").onclick = () => {
    store.set(key, sheet.querySelector("textarea").value.trim());
    document.body.removeChild(sheet);
    renderTraining();
  };
  document.body.appendChild(sheet);
  setTimeout(() => sheet.querySelector("textarea").focus(), 50);
}

// ---------- PWA ----------
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
