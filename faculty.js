const facultyViewState = {
  college: null,
  query: "",
  selected: null
};

function renderFacultyView() {
  const wrap = document.getElementById("facultyContent");
  const colleges = ttAvailableColleges();
  if (!facultyViewState.college) {
    facultyViewState.college = (typeof state !== "undefined" && state.college) || colleges[0].id;
  }

  wrap.innerHTML = `
    <div class="selector-block">
      <div class="selector-label">COLLEGE</div>
      <div class="chip-row" id="facultyCollegeChips"></div>
    </div>
    <div class="selector-block">
      <div class="selector-label">TEACHER</div>
      <input type="text" id="facultySearch" class="faculty-search" placeholder="Type a name&hellip;" autocomplete="off">
      <div class="faculty-results" id="facultyResults"></div>
    </div>
    <div id="facultyBody"></div>
  `;

  const chipRow = document.getElementById("facultyCollegeChips");
  colleges.forEach(c => {
    const btn = document.createElement("button");
    btn.className = "chip" + (c.id === facultyViewState.college ? " active" : "");
    btn.textContent = c.label;
    btn.onclick = () => {
      facultyViewState.college = c.id;
      facultyViewState.selected = null;
      facultyViewState.query = "";
      renderFacultyView();
    };
    chipRow.appendChild(btn);
  });

  const searchInput = document.getElementById("facultySearch");
  searchInput.value = facultyViewState.query;
  searchInput.oninput = () => {
    facultyViewState.query = searchInput.value;
    facultyViewState.selected = null;
    renderFacultyResults();
    renderFacultyBody();
  };

  renderFacultyResults();
  renderFacultyBody();
}

function renderFacultyResults() {
  const resultsEl = document.getElementById("facultyResults");
  const q = facultyViewState.query.trim().toLowerCase();
  if (!q || facultyViewState.selected) {
    resultsEl.innerHTML = "";
    resultsEl.style.display = "none";
    return;
  }
  const tokens = ttProfessorTokens(facultyViewState.college).filter(p => p.toLowerCase().includes(q)).slice(0, 8);
  if (!tokens.length) {
    resultsEl.innerHTML = `<div class="faculty-result-empty">No match.</div>`;
    resultsEl.style.display = "block";
    return;
  }
  resultsEl.innerHTML = tokens.map(t => `<button class="faculty-result-item" data-token="${t}">${t}</button>`).join("");
  resultsEl.style.display = "block";
  resultsEl.querySelectorAll("button").forEach(btn => {
    btn.onclick = () => {
      facultyViewState.selected = btn.dataset.token;
      facultyViewState.query = btn.dataset.token;
      document.getElementById("facultySearch").value = btn.dataset.token;
      renderFacultyResults();
      renderFacultyBody();
    };
  });
}

function renderFacultyBody() {
  const bodyEl = document.getElementById("facultyBody");
  const token = facultyViewState.selected;
  if (!token) {
    bodyEl.innerHTML = `<div class="empty-panel">Search a teacher's name to see where they are.</div>`;
    return;
  }

  const schedule = ttProfessorSchedule(facultyViewState.college, token);
  const now = new Date();
  const day = ALL_DAYS[now.getDay()];
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const current = WEEKDAYS.includes(day) ? ttProfessorNow(schedule, day, nowMinutes) : null;

  const nowCardHTML = current
    ? `<div class="now-band faculty-now-band">
        <div class="now-eyebrow"><span class="now-label">Right now</span></div>
        <div class="now-title">${current.subject}</div>
        <div class="now-meta"><span>${current.location || "Location TBD"}</span><span>${current.section}</span><span>until ${ttFormatTime(current.end)}</span></div>
      </div>`
    : `<div class="empty-panel">${token} isn't in a class right now.</div>`;

  const daysHTML = WEEKDAYS.map(d => {
    const rows = schedule[d];
    if (!rows.length) return "";
    return `
      <div class="faculty-day-block">
        <div class="faculty-day-label">${d}${d === day ? " &middot; today" : ""}</div>
        ${rows.map(r => `
          <div class="faculty-row ${current && d === day && r.start === current.start ? "is-now" : ""}">
            <div class="faculty-time">${ttFormatTime(r.start)}&ndash;${ttFormatTime(r.end)}</div>
            <div class="faculty-info">
              <div class="faculty-subject type-${r.type}">${r.subject}</div>
              <div class="faculty-meta">${r.location || "&mdash;"} &middot; ${r.section} &middot; ${r.branch}</div>
            </div>
          </div>
        `).join("")}
      </div>
    `;
  }).join("");

  bodyEl.innerHTML = `
    ${nowCardHTML}
    <div class="selector-label" style="margin-top:22px;">WEEKLY SCHEDULE</div>
    ${daysHTML || `<div class="empty-panel">No classes found for ${token}.</div>`}
  `;
}
