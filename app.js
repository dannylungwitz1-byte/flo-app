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
const dateKey = (d = new Date()) => d.toISOString().slice(0, 10);
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
  aufgaben: "Aufgaben",
  notizen: "Notizen",
  kalender: "Kalender",
  gewohnheiten: "Routinen",
  kalorien: "Kalorien & Protein",
  zyklus: "Zyklus & Pille",
  bibel: "Bibeltagebuch",
  training: "Trainingsplan",
};

function navigateTo(view) {
  document.querySelectorAll(".view").forEach((s) => { s.hidden = s.dataset.view !== view; });
  document.querySelectorAll(".nav-item[data-view]").forEach((item) => {
    item.classList.toggle("active", item.dataset.view === view);
  });
  $("#view-title").textContent = VIEW_TITLES[view] || view;
  closeDrawer();
  if (view === "kalorien") renderMacros();
  if (view === "zyklus") renderZyklus();
  if (view === "bibel") renderBibel();
  if (view === "training") renderTraining();
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

// ---------- Notizen ----------
let notes = store.get("notes", []);
const noteList = $("#note-list");

function renderNotes() {
  noteList.innerHTML = "";
  notes.forEach((n) => {
    const li = document.createElement("li");
    li.className = "item";
    li.innerHTML = `<div class="item-body"><div class="item-title"></div></div><button class="del">×</button>`;
    li.querySelector(".item-title").textContent = n.text;
    li.querySelector(".del").onclick = () => { notes = notes.filter((x) => x.id !== n.id); store.set("notes", notes); renderNotes(); };
    noteList.appendChild(li);
  });
  $("#note-empty").hidden = notes.length > 0;
}
$("#note-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = $("#note-input");
  const text = input.value.trim();
  if (!text) return;
  notes.unshift({ id: uid(), text });
  store.set("notes", notes);
  input.value = "";
  renderNotes();
});
renderNotes();

// ---------- Kalender ----------
let events = store.get("events", []);
const eventList = $("#event-list");

function renderEvents() {
  eventList.innerHTML = "";
  const sorted = [...events].sort((a, b) => (a.when || "").localeCompare(b.when || ""));
  sorted.forEach((ev) => {
    const li = document.createElement("li");
    li.className = "item";
    const d = ev.when ? new Date(ev.when) : null;
    const sub = d
      ? d.toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "short" }) +
        (ev.hasTime ? ", " + d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) + " Uhr" : "")
      : "ohne Datum";
    li.innerHTML = `<div class="item-body"><div class="item-title"></div><div class="item-sub"></div></div><button class="del">×</button>`;
    li.querySelector(".item-title").textContent = ev.text;
    li.querySelector(".item-sub").textContent = sub;
    li.querySelector(".del").onclick = () => { events = events.filter((x) => x.id !== ev.id); store.set("events", events); renderEvents(); };
    eventList.appendChild(li);
  });
  $("#event-empty").hidden = events.length > 0;
}
$("#event-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const text = $("#event-input").value.trim();
  const date = $("#event-date").value;
  const time = $("#event-time").value;
  if (!text) return;
  const when = date ? (time ? `${date}T${time}` : `${date}T00:00`) : "";
  events.push({ id: uid(), text, when, hasTime: !!time });
  store.set("events", events);
  $("#event-input").value = ""; $("#event-date").value = ""; $("#event-time").value = "";
  renderEvents();
});
renderEvents();

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
      <button class="del">×</button>`;
    li.querySelector(".item-title").textContent = m.name;
    li.querySelector(".del").onclick = () => {
      const updated = getTodayMeals().filter((x) => x.id !== m.id);
      saveTodayMeals(updated);
      renderMacros();
    };
    list.appendChild(li);
  });
  $("#meal-empty").hidden = meals.length > 0;
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

// ---------- Zyklus & Pille ----------
const PHASEN = [
  { bis: 5,  name: "Menstruation",  desc: "Ruhe und Wärme. Dein Körper regeneriert sich.",       color: "#C07A7A" },
  { bis: 13, name: "Follikelphase", desc: "Energie steigt. Gute Zeit für neue Projekte.",          color: "#7A9E87" },
  { bis: 16, name: "Eisprung",      desc: "Höchste Energie und Kreativität. Du strahlst!",         color: "#C9897A" },
  { bis: 99, name: "Lutealphase",   desc: "Innehalten und auf dich hören. Sei sanft zu dir.",      color: "#9B8579" },
];

function getPhase(day) { return PHASEN.find((p) => day <= p.bis); }

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

  const start = new Date(data.start);
  start.setHours(0, 0, 0, 0);
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((todayDate - start) / 86400000);
  const cycleLen = data.length || 28;
  const day = (diffDays % cycleLen) + 1;
  const phase = getPhase(day);

  $("#phase-day").textContent = `Tag ${day} von ${cycleLen}`;
  $("#phase-name").textContent = phase.name;
  $("#phase-desc").textContent = phase.desc;
  $("#phase-card").style.borderColor = phase.color;

  const pillTaken = store.get("pill-" + TODAY, false);
  const pillBtn = $("#pill-btn");
  pillBtn.textContent = pillTaken ? "Heute genommen ✓" : "Als genommen markieren";
  pillBtn.className = "pill-btn" + (pillTaken ? " taken" : "");
  pillBtn.onclick = () => {
    store.set("pill-" + TODAY, true);
    renderZyklus();
  };
}

$("#setup-save-btn").addEventListener("click", () => {
  const start = $("#period-start").value;
  const length = parseInt($("#cycle-length-input").value) || 28;
  if (!start) return;
  store.set("zyklus", { start, length });
  renderZyklus();
});

$("#zyklus-edit-btn").addEventListener("click", () => {
  $("#zyklus-setup").hidden = false;
  $("#zyklus-display").hidden = true;
});

// Pillenerinnerung: Browser-Notification wenn App offen ist um 19:00
if ("Notification" in window && Notification.permission === "default") {
  Notification.requestPermission();
}
setInterval(() => {
  const now = new Date();
  if (now.getHours() === 19 && now.getMinutes() === 0) {
    if (!store.get("pill-" + TODAY, false)) {
      if (Notification.permission === "granted") {
        new Notification("💊 Zeit für deine Pille", {
          body: "19:00 Uhr — vergiss sie nicht!",
          icon: "apple-touch-icon.png",
        });
      }
    }
  }
}, 60000);

// ---------- Bibeltagebuch ----------
function renderBibel() {
  const entries = store.get("bibel", []);
  const list = $("#bibel-list");
  list.innerHTML = "";
  entries.forEach((e) => {
    const li = document.createElement("li");
    li.className = "item";
    const dateStr = new Date(e.date).toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    li.innerHTML = `
      <div class="bibel-item-header">
        <div>
          ${e.stelle ? `<div class="bibel-entry-stelle"></div>` : ""}
          <div class="bibel-entry-date">${dateStr}</div>
        </div>
        <button class="del">×</button>
      </div>
      ${e.vers ? `<div class="bibel-entry-vers"></div>` : ""}
      ${e.gedanken ? `<div class="bibel-entry-text"></div>` : ""}`;
    if (e.stelle) li.querySelector(".bibel-entry-stelle").textContent = e.stelle;
    if (e.vers) li.querySelector(".bibel-entry-vers").textContent = '\u201e' + e.vers + '\u201c';
    if (e.gedanken) li.querySelector(".bibel-entry-text").textContent = e.gedanken;
    li.querySelector(".del").onclick = () => {
      const updated = store.get("bibel", []).filter((x) => x.id !== e.id);
      store.set("bibel", updated);
      renderBibel();
    };
    list.appendChild(li);
  });
  $("#bibel-empty").hidden = entries.length > 0;
}

$("#bibel-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const stelle = $("#bibel-stelle").value.trim();
  const vers = $("#bibel-vers").value.trim();
  const gedanken = $("#bibel-gedanken").value.trim();
  const gebet = $("#bibel-gebet").value.trim();
  if (!stelle && !gedanken && !vers) return;
  const entries = store.get("bibel", []);
  entries.unshift({ id: uid(), date: new Date().toISOString(), stelle, vers, gedanken, gebet });
  store.set("bibel", entries);
  $("#bibel-stelle").value = ""; $("#bibel-vers").value = "";
  $("#bibel-gedanken").value = ""; $("#bibel-gebet").value = "";
  renderBibel();
});
renderBibel();

// ---------- Trainingsplan ----------
const MONATE = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];

function renderTraining() {
  const container = $("#training-months");
  container.innerHTML = "";
  MONATE.forEach((name, i) => {
    const plan = store.get("training-" + (i + 1), "");
    const card = document.createElement("div");
    card.className = "month-card" + (plan ? " has-content" : "");
    card.innerHTML = `
      <div class="month-num">Monat ${i + 1}</div>
      <div class="month-name"></div>
      <div class="month-preview"></div>`;
    card.querySelector(".month-name").textContent = name;
    card.querySelector(".month-preview").textContent = plan || "Tippe zum Bearbeiten…";
    card.onclick = () => openMonthSheet(i + 1, name);
    container.appendChild(card);
  });
}

function openMonthSheet(monthNum, monthName) {
  const plan = store.get("training-" + monthNum, "");
  const sheet = document.createElement("div");
  sheet.className = "sheet-overlay";
  sheet.innerHTML = `
    <div class="sheet">
      <div class="sheet-title">Monat ${monthNum} — ${monthName}</div>
      <textarea rows="10" placeholder="Dein Plan für diesen Monat…">${plan}</textarea>
      <div class="sheet-actions">
        <button class="sheet-cancel">Abbrechen</button>
        <button class="accent-btn sheet-save">Speichern</button>
      </div>
    </div>`;
  sheet.querySelector(".sheet-cancel").onclick = () => document.body.removeChild(sheet);
  sheet.querySelector(".sheet-save").onclick = () => {
    store.set("training-" + monthNum, sheet.querySelector("textarea").value.trim());
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
