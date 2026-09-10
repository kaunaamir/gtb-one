const state = {
  college: "gtb4cec",
  branch: "cse",
  semester: 1,
  section: null,
  day: ALL_DAYS[new Date().getDay()],
  view: "feed"
};

function getBranchData() {
  const college = TIMETABLE_DATA[state.college];
  if (!college) return null;
  const branch = college.branches[state.branch];
  if (!branch) return null;
  const sem = branch.semesters[String(state.semester)];
  if (!sem) return null;
  return sem;
}

function getSections() {
  const sem = getBranchData();
  if (!sem) return [];
  return Object.keys(sem.sections);
}

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function formatTime(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

function renderCollegeSelect() {
  const select = document.getElementById("collegeSelect");
  select.innerHTML = "";
  COLLEGE_META.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.available ? c.label : `${c.label} (soon)`;
    if (!c.available) opt.disabled = true;
    select.appendChild(opt);
  });
  select.value = state.college;
  select.onchange = () => {
    state.college = select.value;
    const branches = BRANCH_META[state.college] || [];
    const firstAvailable = branches.find(b => b.available);
    state.branch = firstAvailable ? firstAvailable.id : null;
    state.section = null;
    renderAll();
  };
}

function renderBranchChips() {
  const row = document.getElementById("branchChips");
  row.innerHTML = "";
  const branches = BRANCH_META[state.college] || [];
  branches.forEach(b => {
    const btn = document.createElement("button");
    btn.className = "chip" + (b.id === state.branch ? " active" : "");
    btn.textContent = b.label;
    btn.disabled = !b.available;
    btn.title = b.available ? b.full : `${b.full} — coming soon`;
    btn.onclick = () => {
      state.branch = b.id;
      state.section = null;
      renderAll();
    };
    row.appendChild(btn);
  });
}

function renderSemesterChips() {
  const row = document.getElementById("semesterChips");
  row.innerHTML = "";
  const branch = TIMETABLE_DATA[state.college] && TIMETABLE_DATA[state.college].branches[state.branch];
  SEMESTER_META.forEach(s => {
    const available = !!(branch && branch.semesters[String(s)]);
    const btn = document.createElement("button");
    btn.className = "chip" + (s === state.semester ? " active" : "");
    btn.textContent = `SEM ${s}`;
    btn.disabled = !available;
    btn.onclick = () => {
      state.semester = s;
      state.section = null;
      renderAll();
    };
    row.appendChild(btn);
  });
}

function renderSectionSelect() {
  const wrap = document.getElementById("sectionChips");
  wrap.innerHTML = "";
  const sections = getSections();
  if (!state.section || !sections.includes(state.section)) {
    state.section = sections[0] || null;
  }
  sections.forEach(sec => {
    const btn = document.createElement("button");
    btn.className = "chip" + (sec === state.section ? " active" : "");
    btn.textContent = sec;
    btn.onclick = () => {
      state.section = sec;
      renderAll();
    };
    wrap.appendChild(btn);
  });
}

function renderDayStrip() {
  const strip = document.getElementById("dayStrip");
  strip.innerHTML = "";
  const todayName = ALL_DAYS[new Date().getDay()];
  ALL_DAYS.forEach(day => {
    const btn = document.createElement("button");
    btn.className = "day-chip" + (day === state.day ? " active" : "") + (day === todayName ? " is-today" : "");
    btn.innerHTML = `${day.slice(0, 3)}<span class="dot"></span>`;
    btn.onclick = () => {
      state.day = day;
      renderAll();
    };
    strip.appendChild(btn);
  });
}

function currentSchedule() {
  const sem = getBranchData();
  if (!sem || !state.section) return [];
  return sem.sections[state.section] && sem.sections[state.section][state.day] || [];
}

function findLiveSlot(schedule) {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const todayName = ALL_DAYS[now.getDay()];
  if (state.day !== todayName) return null;
  return schedule.find(s => nowMin >= toMinutes(s.start) && nowMin < toMinutes(s.end)) || null;
}

function findNextSlot(schedule) {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const todayName = ALL_DAYS[now.getDay()];
  if (state.day !== todayName) return null;
  return schedule.find(s => toMinutes(s.start) > nowMin && s.type !== "break") || null;
}

function renderNowBand() {
  const schedule = currentSchedule().filter(s => s.type !== "break" || true);
  const live = findLiveSlot(schedule);
  const clockEl = document.getElementById("nowClock");
  const now = new Date();
  clockEl.textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const titleEl = document.getElementById("nowTitle");
  const metaEl = document.getElementById("nowMeta");
  const trackFill = document.getElementById("progressFill");
  const timesRow = document.getElementById("progressTimes");
  const labelEl = document.getElementById("nowLabel");

  if (!state.section) {
    labelEl.textContent = "Live status";
    titleEl.textContent = "Pick a branch and section";
    metaEl.innerHTML = "";
    trackFill.style.width = "0%";
    timesRow.innerHTML = "";
    return;
  }

  if (live && live.type !== "break") {
    labelEl.textContent = "Now";
    titleEl.textContent = live.subject;
    const bits = [];
    if (live.location) bits.push(`<span>${live.location}</span>`);
    if (live.professor) bits.push(`<span>${live.professor}</span>`);
    metaEl.innerHTML = bits.join("");
    const startM = toMinutes(live.start);
    const endM = toMinutes(live.end);
    const nowM = now.getHours() * 60 + now.getMinutes();
    const pct = Math.min(100, Math.max(0, ((nowM - startM) / (endM - startM)) * 100));
    trackFill.style.width = pct + "%";
    timesRow.innerHTML = `<span>${formatTime(live.start)}</span><span>${formatTime(live.end)}</span>`;
  } else if (live && live.type === "break") {
    labelEl.textContent = "Now";
    titleEl.textContent = "Break";
    metaEl.innerHTML = `<span>Back at ${formatTime(live.end)}</span>`;
    trackFill.style.width = "50%";
    timesRow.innerHTML = `<span>${formatTime(live.start)}</span><span>${formatTime(live.end)}</span>`;
  } else {
    const next = findNextSlot(schedule);
    labelEl.textContent = ALL_DAYS[now.getDay()] === state.day ? "Next up" : "Viewing";
    if (next) {
      titleEl.textContent = next.subject;
      const bits = [`<span>Starts ${formatTime(next.start)}</span>`];
      if (next.location) bits.push(`<span>${next.location}</span>`);
      metaEl.innerHTML = bits.join("");
    } else {
      titleEl.textContent = schedule.length ? "No more classes today" : "No classes scheduled";
    }
    trackFill.style.width = "0%";
    timesRow.innerHTML = "";
  }
}

function renderFeed() {
  const wrap = document.getElementById("timeline");
  const grid = document.getElementById("gridView");
  wrap.style.display = "";
  grid.style.display = "none";
  wrap.innerHTML = "";
  const schedule = currentSchedule();
  if (!schedule.length) {
    wrap.innerHTML = `<div class="timeline-empty">No classes on ${state.day}.</div>`;
    return;
  }
  const live = findLiveSlot(schedule);
  schedule.forEach(slot => {
    const row = document.createElement("div");
    row.className = "slot" + (live === slot ? " is-now" : "");
    const rail = document.createElement("div");
    rail.className = "slot-rail";
    rail.innerHTML = `<div class="slot-time">${formatTime(slot.start)}<br>${formatTime(slot.end)}</div>`;
    const card = document.createElement("div");
    card.className = `slot-card type-${slot.type}`;
    if (slot.type === "break") {
      card.innerHTML = `<div class="slot-subject">Break</div>`;
    } else {
      const details = [];
      if (slot.location) details.push(`<span>${slot.location}</span>`);
      if (slot.professor) details.push(`<span>${slot.professor}</span>`);
      card.innerHTML = `
        <div class="slot-type">${slot.type}</div>
        <div class="slot-subject">${slot.subject}</div>
        <div class="slot-detail">${details.join("")}</div>
      `;
    }
    row.appendChild(rail);
    row.appendChild(card);
    wrap.appendChild(row);
  });
}

function renderGrid() {
  const wrap = document.getElementById("timeline");
  const gridWrap = document.getElementById("gridView");
  wrap.style.display = "none";
  gridWrap.style.display = "";
  gridWrap.innerHTML = "";
  const sem = getBranchData();
  if (!sem || !state.section) return;
  const bySection = sem.sections[state.section] || {};
  const slotSet = new Set();
  WEEKDAYS.forEach(day => (bySection[day] || []).forEach(s => slotSet.add(`${s.start}-${s.end}`)));
  const slots = Array.from(slotSet).sort((a, b) => toMinutes(a.split("-")[0]) - toMinutes(b.split("-")[0]));

  const table = document.createElement("table");
  table.className = "week-grid";
  const thead = document.createElement("thead");
  thead.innerHTML = `<tr><th>Time</th>${WEEKDAYS.map(d => `<th>${d.slice(0, 3)}</th>`).join("")}</tr>`;
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  slots.forEach(slotKey => {
    const [start, end] = slotKey.split("-");
    const tr = document.createElement("tr");
    let rowHtml = `<td>${formatTime(start)}</td>`;
    WEEKDAYS.forEach(day => {
      const match = (bySection[day] || []).find(s => s.start === start && s.end === end);
      if (!match) {
        rowHtml += `<td></td>`;
      } else if (match.type === "break") {
        rowHtml += `<td><div class="cell-block type-break">Break</div></td>`;
      } else {
        rowHtml += `<td><div class="cell-block type-${match.type}">${match.subject}${match.location ? `<br>${match.location}` : ""}</div></td>`;
      }
    });
    tr.innerHTML = rowHtml;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  gridWrap.appendChild(table);
}

function renderViewToggle() {
  document.getElementById("feedBtn").classList.toggle("active", state.view === "feed");
  document.getElementById("gridBtn").classList.toggle("active", state.view === "grid");
}

function renderSchedule() {
  renderViewToggle();
  if (state.view === "feed") renderFeed();
  else renderGrid();
}

function renderUpdated() {
  document.getElementById("updatedTag").textContent = `Last updated ${LAST_UPDATED}`;
}

function renderAll() {
  renderCollegeSelect();
  renderBranchChips();
  renderSemesterChips();
  renderSectionSelect();
  renderDayStrip();
  renderNowBand();
  renderSchedule();
  renderUpdated();
}

document.getElementById("feedBtn").onclick = () => {
  state.view = "feed";
  renderSchedule();
};
document.getElementById("gridBtn").onclick = () => {
  state.view = "grid";
  renderSchedule();
};

renderAll();
setInterval(() => {
  renderNowBand();
  if (state.view === "feed") renderFeed();
}, 30000);
