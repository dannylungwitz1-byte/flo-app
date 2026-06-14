// Flo — persönliche Organisation. Alle Daten bleiben lokal auf deinem Gerät (localStorage).

// ---------- Speicher-Helfer ----------
const store = {
  get(key, fallback) {
    try { return JSON.parse(localStorage.getItem("flo:" + key)) ?? fallback; }
    catch { return fallback; }
  },
  set(key, value) { localStorage.setItem("flo:" + key, JSON.stringify(value)); },
};

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const $ = (sel) => document.querySelector(sel);

// ---------- Tab-Navigation ----------
const titles = {
  aufgaben: "Aufgaben", notizen: "Notizen",
  kalender: "Kalender", gewohnheiten: "Routinen",
};
document.querySelectorAll(".tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    const view = btn.dataset.tab;
    document.querySelectorAll(".tab").forEach((b) => b.classList.toggle("active", b === btn));
    document.querySelectorAll(".view").forEach((s) => { s.hidden = s.dataset.view !== view; });
    $("#view-title").textContent = titles[view];
  });
});

const heute = new Date();
$("#today-label").textContent = heute.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });

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
    li.querySelector(".check").onclick = () => { t.done = !t.done; save(); };
    li.querySelector(".del").onclick = () => { tasks = tasks.filter((x) => x.id !== t.id); save(); };
    taskList.appendChild(li);
  });
  $("#task-empty").hidden = tasks.length > 0;
  function save() { store.set("tasks", tasks); renderTasks(); }
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
    li.innerHTML = `<div class="item-body"><div class="item-title note-text"></div></div><button class="del">×</button>`;
    li.querySelector(".note-text").textContent = n.text;
    li.querySelector(".del").onclick = () => {
      notes = notes.filter((x) => x.id !== n.id);
      store.set("notes", notes); renderNotes();
    };
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
    li.querySelector(".del").onclick = () => {
      events = events.filter((x) => x.id !== ev.id);
      store.set("events", events); renderEvents();
    };
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
const dayKey = (d) => d.toISOString().slice(0, 10);
const wochentage = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

function streakOf(done) {
  let s = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    if (done.includes(dayKey(d))) s++;
    else if (i > 0) break; // heute noch nicht erledigt zählt nicht als Abbruch
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
    top.style.display = "flex"; top.style.justifyContent = "space-between"; top.style.alignItems = "center";
    const title = document.createElement("div");
    title.className = "item-title"; title.textContent = h.text;
    const del = document.createElement("button");
    del.className = "del"; del.textContent = "×";
    del.onclick = () => { habits = habits.filter((x) => x.id !== h.id); store.set("habits", habits); renderHabits(); };
    top.append(title, del);

    const week = document.createElement("div");
    week.className = "habit-week";
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = dayKey(d);
      const cell = document.createElement("div");
      cell.className = "day" + (h.done.includes(key) ? " filled" : "") + (i === 0 ? " today" : "");
      cell.textContent = wochentage[d.getDay()];
      cell.onclick = () => {
        h.done = h.done.includes(key) ? h.done.filter((k) => k !== key) : [...h.done, key];
        store.set("habits", habits); renderHabits();
      };
      week.appendChild(cell);
    }
    const streak = document.createElement("div");
    streak.className = "streak";
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

// ---------- PWA: Service Worker registrieren ----------
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
