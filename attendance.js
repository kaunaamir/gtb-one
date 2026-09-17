const ATTENDANCE_EXCLUDED_SUBJECTS = ["SCA"];

const attendanceState = {
  mode: "today",
  date: null,
  day: null,
  displayDate: null,
  sessions: [],
  marks: {},
  existingRecords: {}
};

function todaysDate() {
  return new Date();
}

function yesterdayDateStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return ttLocalDateStr(d);
}

function dateStrToLocalDate(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

async function loadAttendanceForDate(profile, dateStr) {
  const display = dateStrToLocalDate(dateStr);
  const day = ALL_DAYS[display.getDay()];
  attendanceState.date = dateStr;
  attendanceState.day = day;
  attendanceState.displayDate = display;

  if (!WEEKDAYS.includes(day)) {
    attendanceState.sessions = [];
    attendanceState.marks = {};
    attendanceState.existingRecords = {};
    return;
  }

  const raw = ttDaySchedule(profile.college, profile.branch, profile.semester, profile.section, day);
  const merged = ttMergeClassSessions(raw).filter(s => !ATTENDANCE_EXCLUDED_SUBJECTS.includes(s.subject));
  attendanceState.sessions = merged.map(s => ({
    ...s,
    id: ttSessionId(profile.college, profile.branch, profile.semester, profile.section, day, s)
  }));

  const { data, error } = await sb
    .from("attendance")
    .select("*")
    .eq("user_id", authState.user.id)
    .eq("date", dateStr);

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

  if (attendanceState.mode === "today" && !attendanceState.date) {
    attendanceState.date = ttLocalDateStr(todaysDate());
  }

  wrap.innerHTML = `<div class="empty-panel">Loading classes&hellip;</div>`;

  loadAttendanceForDate(authState.profile, attendanceState.date).then(() => {
    renderAttendanceBody();
  });
}

function renderAttendanceBody() {
  const wrap = document.getElementById("attendanceContent");
  const p = authState.profile;
  const isToday = attendanceState.mode === "today";
  const dateLabel = attendanceState.displayDate.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });

  const topActions = `
    <div class="att-top-actions">
      <button class="btn-ghost btn-status-top" id="viewStatusBtn">View Attendance Status &#8594;</button>
      ${isToday
        ? `<button class="btn-ghost btn-status-top" id="openBackfillBtn">+ Add Past Attendance</button>`
        : `<button class="btn-ghost btn-status-top" id="backToTodayBtn">&#8592; Back to Today</button>`}
    </div>
  `;

  const header = `
    <div class="att-header">
      <div class="att-date">${dateLabel}${!isToday ? " &middot; backfill" : ""}</div>
      <div class="att-context">${collegeLabel(p.college)} &middot; ${branchLabel(p.college, p.branch)} &middot; ${p.section}</div>
    </div>
  `;

  const datePickerBlock = !isToday ? `
    <div class="backfill-picker">
      <label>Date</label>
      <input type="date" id="backfillDateInput" value="${attendanceState.date}" max="${yesterdayDateStr()}">
    </div>
  ` : "";

  if (!attendanceState.sessions.length) {
    wrap.innerHTML = `
      ${topActions}
      ${datePickerBlock}
      ${header}
      <div class="empty-panel">${WEEKDAYS.includes(attendanceState.day) ? "No classes scheduled." : "No classes on this day."}</div>
    `;
    wireCommonActions();
    return;
  }

  const rows = attendanceState.sessions.map(s => attendanceRowHTML(s)).join("");
  const hasExisting = Object.keys(attendanceState.existingRecords).length > 0;
  const saveLabel = isToday
    ? (hasExisting ? "Update Today's Attendance" : "Save Today's Attendance")
    : (hasExisting ? "Update Attendance for this Date" : "Save Attendance for this Date");

  wrap.innerHTML = `
    ${topActions}
    ${datePickerBlock}
    ${header}
    <div class="att-disclaimer">Heads up &mdash; this only counts what you mark here. It's not synced with the official college portal yet, so treat it as your own tracker, not the final word.</div>
    <div class="bulk-row">
      <button class="btn-ghost" id="markAllPresent">Mark All Present</button>
      <button class="btn-ghost" id="markAllAbsent">Mark All Absent</button>
    </div>
    <div class="att-list">${rows}</div>
    <div class="save-bar">
      <div class="form-error" id="attError"></div>
      <button class="btn-primary btn-wide" id="saveAttendanceBtn">${saveLabel}</button>
    </div>
  `;

  document.getElementById("markAllPresent").onclick = () => setAllMarks("present");
  document.getElementById("markAllAbsent").onclick = () => setAllMarks("absent");
  document.getElementById("saveAttendanceBtn").onclick = saveAttendance;

  attendanceState.sessions.forEach(s => refreshSegmentUI(s.id));
  attendanceState.sessions.forEach(s => {
    document.querySelectorAll(`.seg[data-session="${s.id}"] button`).forEach(btn => {
      btn.onclick = () => {
        attendanceState.marks[s.id] = btn.dataset.value || null;
        refreshSegmentUI(s.id);
      };
    });
  });

  wireCommonActions();
}

function wireCommonActions() {
  const statusBtn = document.getElementById("viewStatusBtn");
  if (statusBtn) statusBtn.onclick = () => showView("attendance-status");

  const openBtn = document.getElementById("openBackfillBtn");
  if (openBtn) {
    openBtn.onclick = () => {
      attendanceState.mode = "backfill";
      attendanceState.date = yesterdayDateStr();
      renderAttendanceView();
    };
  }

  const backBtn = document.getElementById("backToTodayBtn");
  if (backBtn) {
    backBtn.onclick = () => {
      attendanceState.mode = "today";
      attendanceState.date = ttLocalDateStr(todaysDate());
      renderAttendanceView();
    };
  }

  const dateInput = document.getElementById("backfillDateInput");
  if (dateInput) {
    dateInput.onchange = () => {
      if (!dateInput.value) return;
      attendanceState.date = dateInput.value;
      renderAttendanceView();
    };
  }
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
          <button data-value="cancelled" class="seg-btn seg-cancelled">Cancelled</button>
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

async function saveAttendance() {
  const errorEl = document.getElementById("attError");
  errorEl.textContent = "";

  const unmarked = attendanceState.sessions.filter(s => !attendanceState.marks[s.id]);
  if (unmarked.length) {
    errorEl.textContent = `Mark all classes before saving (${unmarked.length} left).`;
    return;
  }

  const toUpsert = [];
  const toDeleteIds = [];

  attendanceState.sessions.forEach(s => {
    const mark = attendanceState.marks[s.id];
    if (mark === "cancelled") {
      if (attendanceState.existingRecords[s.id]) toDeleteIds.push(s.id);
      return;
    }
    toUpsert.push({
      user_id: authState.user.id,
      date: attendanceState.date,
      timetable_session_id: s.id,
      subject: s.subject,
      class_type: s.type,
      status: mark,
      source: "manual"
    });
  });

  if (toUpsert.length) {
    const { error } = await sb.from("attendance").upsert(toUpsert, { onConflict: "user_id,date,timetable_session_id" });
    if (error) {
      errorEl.textContent = error.message;
      return;
    }
  }

  if (toDeleteIds.length) {
    const { error } = await sb
      .from("attendance")
      .delete()
      .eq("user_id", authState.user.id)
      .eq("date", attendanceState.date)
      .in("timetable_session_id", toDeleteIds);
    if (error) {
      errorEl.textContent = error.message;
      return;
    }
  }

  showToast("Attendance saved.");
  loadAttendanceForDate(authState.profile, attendanceState.date).then(renderAttendanceBody);
}
