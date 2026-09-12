const attendanceState = {
  date: null,
  day: null,
  sessions: [],
  marks: {},
  existingRecords: {}
};

function todaysDayAndDate() {
  const now = new Date();
  return { day: ALL_DAYS[now.getDay()], date: ttLocalDateStr(now), display: now };
}

async function loadTodaysAttendance(profile) {
  const { day, date } = todaysDayAndDate();
  attendanceState.date = date;
  attendanceState.day = day;

  if (!WEEKDAYS.includes(day)) {
    attendanceState.sessions = [];
    return;
  }

  const raw = ttDaySchedule(profile.college, profile.branch, profile.semester, profile.section, day);
  const merged = ttMergeClassSessions(raw);
  attendanceState.sessions = merged.map(s => ({
    ...s,
    id: ttSessionId(profile.college, profile.branch, profile.semester, profile.section, day, s)
  }));

  const { data, error } = await sb
    .from("attendance")
    .select("*")
    .eq("user_id", authState.user.id)
    .eq("date", date);

  attendanceState.existingRecords = {};
  attendanceState.marks = {};
  if (!error && data) {
    data.forEach(row => {
      attendanceState.existingRecords[row.timetable_session_id] = row;
      attendanceState.marks[row.timetable_session_id] = row.status;
    });
  }
  attendanceState.sessions.forEach(s => {
    if (!(s.id in attendanceState.marks)) attendanceState.marks[s.id] = null;
  });
}

function renderAttendanceView() {
  const wrap = document.getElementById("attendanceContent");
  if (!authState.session) {
    wrap.innerHTML = `<div class="empty-panel">Log in to mark today's attendance.<button class="btn-primary" id="attLoginBtn">Log in</button></div>`;
    document.getElementById("attLoginBtn").onclick = () => showView("auth");
    return;
  }
  if (!authState.profile) {
    wrap.innerHTML = `<div class="empty-panel">Complete your profile first so we know your timetable.<button class="btn-primary" id="attProfileBtn">Complete profile</button></div>`;
    document.getElementById("attProfileBtn").onclick = () => showView("profile");
    return;
  }

  wrap.innerHTML = `<div class="empty-panel">Loading today's classes&hellip;</div>`;

  loadTodaysAttendance(authState.profile).then(() => {
    const { display } = todaysDayAndDate();
    const dateLabel = display.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
    const p = authState.profile;

    if (!attendanceState.sessions.length) {
      wrap.innerHTML = `
        <div class="att-top-actions">
          <button class="btn-ghost btn-status-top" id="viewStatusBtn">View Attendance Status &#8594;</button>
        </div>
        <div class="att-header">
          <div class="att-date">${dateLabel}</div>
          <div class="att-context">${collegeLabel(p.college)} &middot; ${branchLabel(p.college, p.branch)} &middot; ${p.section}</div>
        </div>
        <div class="empty-panel">No classes scheduled today.</div>
      `;
      document.getElementById("viewStatusBtn").onclick = () => showView("attendance-status");
      return;
    }

    const rows = attendanceState.sessions.map(s => attendanceRowHTML(s)).join("");

    wrap.innerHTML = `
      <div class="att-top-actions">
        <button class="btn-ghost btn-status-top" id="viewStatusBtn">View Attendance Status &#8594;</button>
      </div>
      <div class="att-header">
        <div class="att-date">${dateLabel}</div>
        <div class="att-context">${collegeLabel(p.college)} &middot; ${branchLabel(p.college, p.branch)} &middot; ${p.section}</div>
      </div>
      <div class="att-disclaimer">Heads up &mdash; this only counts what you mark here. It's not synced with the official college portal yet, so treat it as your own tracker, not the final word.</div>
      <div class="bulk-row">
        <button class="btn-ghost" id="markAllPresent">Mark All Present</button>
        <button class="btn-ghost" id="markAllAbsent">Mark All Absent</button>
      </div>
      <div class="att-list">${rows}</div>
      <div class="save-bar">
        <div class="form-error" id="attError"></div>
        <button class="btn-primary btn-wide" id="saveAttendanceBtn">${Object.keys(attendanceState.existingRecords).length ? "Update Today's Attendance" : "Save Today's Attendance"}</button>
      </div>
    `;

    document.getElementById("markAllPresent").onclick = () => setAllMarks("present");
    document.getElementById("markAllAbsent").onclick = () => setAllMarks("absent");
    document.getElementById("saveAttendanceBtn").onclick = saveTodaysAttendance;
    document.getElementById("viewStatusBtn").onclick = () => showView("attendance-status");

    attendanceState.sessions.forEach(s => refreshSegmentUI(s.id));

    attendanceState.sessions.forEach(s => {
      document.querySelectorAll(`.seg[data-session="${s.id}"] button`).forEach(btn => {
        btn.onclick = () => {
          attendanceState.marks[s.id] = btn.dataset.value || null;
          refreshSegmentUI(s.id);
        };
      });
    });
  });
}

function attendanceRowHTML(s) {
  return `
    <div class="att-row type-${s.type}">
      <div class="att-time">
        <span>${ttFormatTime(s.start)}</span>
        <span class="gv-arrow">&#8595;</span>
        <span class="gv-end">${ttFormatTime(s.end)}</span>
      </div>
      <div class="att-body">
        <div class="att-type">${s.type}</div>
        <div class="att-subject">${s.subject}</div>
        <div class="att-meta">
          ${s.location ? `<span>${s.location}</span>` : ""}
          ${s.professor ? `<span>${s.professor}</span>` : ""}
        </div>
        <div class="seg" data-session="${s.id}">
          <button data-value="" class="seg-btn seg-unmarked">Not marked</button>
          <button data-value="present" class="seg-btn seg-present">Present</button>
          <button data-value="absent" class="seg-btn seg-absent">Absent</button>
        </div>
      </div>
    </div>
  `;
}

function refreshSegmentUI(sessionId) {
  const mark = attendanceState.marks[sessionId];
  document.querySelectorAll(`.seg[data-session="${sessionId}"] button`).forEach(btn => {
    btn.classList.toggle("active", (btn.dataset.value || null) === mark);
  });
}

function setAllMarks(value) {
  attendanceState.sessions.forEach(s => {
    attendanceState.marks[s.id] = value;
    refreshSegmentUI(s.id);
  });
}

async function saveTodaysAttendance() {
  const errorEl = document.getElementById("attError");
  errorEl.textContent = "";

  const unmarked = attendanceState.sessions.filter(s => !attendanceState.marks[s.id]);
  if (unmarked.length) {
    errorEl.textContent = `Mark all classes before saving (${unmarked.length} left).`;
    return;
  }

  const records = attendanceState.sessions.map(s => ({
    user_id: authState.user.id,
    date: attendanceState.date,
    timetable_session_id: s.id,
    subject: s.subject,
    class_type: s.type,
    status: attendanceState.marks[s.id],
    source: "manual"
  }));

  const { error } = await sb.from("attendance").upsert(records, { onConflict: "user_id,date,timetable_session_id" });
  if (error) {
    errorEl.textContent = error.message;
    return;
  }
  showToast("Attendance saved.");
}
