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
  const goal = store.get("waterGoal", 8);
  const count = store.get("water-" + TODAY, 0);
  const fraction = Math.min(1, count / goal);
  const translateY = Math.round((1 - fraction) * 148);
  const rect = $("#water-fill-rect");
  if (rect) rect.style.transform = `translateY(${translateY}px)`;
  const wc = $("#water-count");
  if (wc) wc.textContent = count;
  const wg = $("#water-goal-disp");
  if (wg) wg.textContent = goal;
}

$("#water-plus").addEventListener("click", () => {
  const goal = store.get("waterGoal", 8);
  const cur = store.get("water-" + TODAY, 0);
  if (cur < goal) { store.set("water-" + TODAY, cur + 1); renderWater(); }
});
$("#water-minus").addEventListener("click", () => {
  const cur = store.get("water-" + TODAY, 0);
  if (cur > 0) { store.set("water-" + TODAY, cur - 1); renderWater(); }
});
$("#water-goal-btn").addEventListener("click", () => {
  const goal = store.get("waterGoal", 8);
  const sheet = document.createElement("div");
  sheet.className = "sheet-overlay";
  sheet.innerHTML = `
    <div class="sheet">
      <div class="sheet-title">Tagesziel Wasser</div>
      <p class="sheet-goal-label">Anzahl Gläser</p>
      <input type="number" id="w-goal" value="${goal}" min="1" max="20"/>
      <div class="sheet-actions">
        <button class="sheet-cancel">Abbrechen</button>
        <button class="accent-btn sheet-save">Speichern</button>
      </div>
    </div>`;
  sheet.querySelector(".sheet-cancel").onclick = () => document.body.removeChild(sheet);
  sheet.querySelector(".sheet-save").onclick = () => {
    store.set("waterGoal", parseInt(sheet.querySelector("#w-goal").value) || 8);
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
  // Parse both as local midnight to avoid UTC timezone shifts
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

  // Monat-Titel
  $("#cal-month-title").textContent = new Date(calYear, calMonth, 1)
    .toLocaleDateString("de-DE", { month: "long", year: "numeric" });

  // Kalender-Grid aufbauen
  const grid = $("#cal-grid");
  grid.innerHTML = "";

  const firstDay = new Date(calYear, calMonth, 1);
  const lastDate = new Date(calYear, calMonth + 1, 0).getDate();

  // Mo=0 … So=6
  let startDow = firstDay.getDay();
  startDow = startDow === 0 ? 6 : startDow - 1;

  // Vormonat auffüllen
  for (let i = startDow - 1; i >= 0; i--) {
    const d = new Date(calYear, calMonth, -i);
    grid.appendChild(buildCalDay(dateKey(d), data, pillDays, true));
  }
  // Aktueller Monat
  for (let d = 1; d <= lastDate; d++) {
    grid.appendChild(buildCalDay(dateKey(new Date(calYear, calMonth, d)), data, pillDays, false));
  }
  // Nachmonat auffüllen
  const total = startDow + lastDate;
  const trailing = (7 - (total % 7)) % 7;
  for (let i = 1; i <= trailing; i++) {
    const d = new Date(calYear, calMonth + 1, i);
    grid.appendChild(buildCalDay(dateKey(d), data, pillDays, true));
  }

  // Heutige Phase anzeigen
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

// Pillenerinnerung um 19:00
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
const TAGE = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const TAGE_LANG = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
let activeWeek = 1;

function renderTraining() {
  // Wochenwähler
  const picker = $("#week-picker");
  picker.innerHTML = "";
  for (let w = 1; w <= 12; w++) {
    const chip = document.createElement("div");
    chip.className = "week-chip" + (w === activeWeek ? " active" : "");
    chip.textContent = "Woche " + w;
    chip.onclick = () => { activeWeek = w; renderTraining(); };
    picker.appendChild(chip);
  }
  // Scroll aktive Woche sichtbar
  const activeChip = picker.querySelector(".week-chip.active");
  if (activeChip) activeChip.scrollIntoView({ inline: "center", behavior: "smooth", block: "nearest" });

  // Tage der Woche
  const container = $("#training-days");
  container.innerHTML = "";
  TAGE.forEach((tag, i) => {
    const key = "training-w" + activeWeek + "-d" + (i + 1);
    const plan = store.get(key, "");
    const row = document.createElement("div");
    row.className = "training-day" + (plan ? " has-plan" : "");
    row.innerHTML = `
      <div class="training-day-label"></div>
      <div class="training-day-plan"></div>`;
    row.querySelector(".training-day-label").textContent = tag;
    row.querySelector(".training-day-plan").textContent = plan || "Kein Training geplant";
    row.onclick = () => openDaySheet(activeWeek, i + 1, TAGE_LANG[i], key);
    container.appendChild(row);
  });
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

// ---------- PILLEN-ERINNERUNG ----------
function setupPillReminder() {
  if (!("Notification" in window)) return;
  if (Notification.permission === "default") {
    Notification.requestPermission();
  }
  // Jeden Abend um 19:00 prüfen
  setInterval(() => {
    const now = new Date();
    if (now.getHours() === 19 && now.getMinutes() === 0) {
      if (Notification.permission === "granted") {
        new Notification("Flo — Pille nehmen 💊", {
          body: "Vergiss deine Pille nicht! 19:00 Uhr.",
          icon: "apple-touch-icon.png",
          tag: "pille-" + dateKey(),
          renotify: false,
        });
      }
    }
  }, 30000); // alle 30 Sekunden prüfen
}
setupPillReminder();
