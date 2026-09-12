const TIMETABLE_SELECTION_KEY = "gtbone_last_timetable";

const state = {
  college: "gtb4cec",
  branch: "cse",
  semester: 1,
  section: null,
  day: ALL_DAYS[new Date().getDay()],
  view: "feed"
};

function loadSavedTimetableSelection() {
  try {
    const raw = localStorage.getItem(TIMETABLE_SELECTION_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (!saved || typeof saved !== "object") return;
    if (saved.college && TIMETABLE_DATA[saved.college]) state.college = saved.college;
    const branch = TIMETABLE_DATA[state.college] && TIMETABLE_DATA[state.college].branches[saved.branch];
    if (saved.branch && branch) state.branch = saved.branch;
    if (saved.semester && branch && branch.semesters[String(saved.semester)]) state.semester = saved.semester;
    if (saved.section) state.section = saved.section;
  } catch (e) {}
}

function saveTimetableSelection() {
  try {
    localStorage.setItem(TIMETABLE_SELECTION_KEY, JSON.stringify({
      college: state.college,
      branch: state.branch,
      semester: state.semester,
      section: state.section
    }));
  } catch (e) {}
}

loadSavedTimetableSelection();

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
  return Object.keys(sem.sections).filter(name =>
    Object.values(sem.sections[name]).some(dayArr => Array.isArray(dayArr) && dayArr.length > 0)
  );
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
  ACADEMIC_YEARS.forEach(year => {
    const available = ttYearHasContent(state.college, state.branch, year);
    const resolved = ttResolveSemesterForYear(state.college, state.branch, year);
    const btn = document.createElement("button");
    btn.className = "chip" + (state.semester === resolved ? " active" : "");
    btn.textContent = `YEAR ${year}`;
    btn.disabled = !available;
    btn.onclick = () => {
      state.semester = resolved;
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
  const schedule = currentSchedule();
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
      if (slot.group) details.push(`<span>Group ${slot.group}</span>`);
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

  const schedule = currentSchedule();
  if (!schedule.length) {
    gridWrap.innerHTML = `<div class="gv-empty">No classes on ${state.day}.</div>`;
    return;
  }

  const live = findLiveSlot(schedule);
  schedule.forEach(slot => {
    const card = document.createElement("div");
    card.className = `gv-card type-${slot.type}` + (live === slot ? " is-now" : "");

    const time = document.createElement("div");
    time.className = "gv-time";
    time.innerHTML = `<span>${formatTime(slot.start)}</span><span class="gv-arrow">&#8595;</span><span class="gv-end">${formatTime(slot.end)}</span>`;

    const body = document.createElement("div");
    body.className = "gv-body";

    if (slot.type === "break") {
      body.innerHTML = `
        <div class="gv-type">Break</div>
        <div class="gv-subject">${slot.subject || "Break"}</div>
        ${slot.location ? `<div class="gv-meta"><div class="gv-meta-row"><span class="gv-meta-icon">&#128205;</span>${slot.location}</div></div>` : ""}
      `;
    } else {
      const metaRows = [];
      if (slot.location) metaRows.push(`<div class="gv-meta-row"><span class="gv-meta-icon">&#128205;</span>${slot.location}</div>`);
      if (slot.professor) metaRows.push(`<div class="gv-meta-row"><span class="gv-meta-icon">&#128100;</span>${slot.professor}</div>`);
      if (slot.group) metaRows.push(`<div class="gv-meta-row"><span class="gv-meta-icon">&#128101;</span>Group ${slot.group}</div>`);
      body.innerHTML = `
        <div class="gv-type">${slot.type}</div>
        <div class="gv-subject">${slot.subject}</div>
        <div class="gv-meta">${metaRows.join("")}</div>
      `;
    }

    card.appendChild(time);
    card.appendChild(body);
    gridWrap.appendChild(card);
  });
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
  saveTimetableSelection();
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
