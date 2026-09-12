const CRITERIA_KEY = "gtbone_attendance_criteria";

function getAttendanceCriteria() {
  const stored = Number(localStorage.getItem(CRITERIA_KEY));
  if (stored >= 1 && stored <= 100) return stored;
  return 75;
}

function setAttendanceCriteria(value) {
  const clamped = Math.min(100, Math.max(1, Math.round(value)));
  localStorage.setItem(CRITERIA_KEY, String(clamped));
  return clamped;
}

function pct(attended, total) {
  return total ? ((attended / total) * 100).toFixed(1) : "0.0";
}

function attendanceTier(percentValue, criteria) {
  if (percentValue < criteria) return "red";
  if (percentValue < criteria + 5) return "yellow";
  return "green";
}

function tierLabel(tier) {
  if (tier === "green") return "You're fine";
  if (tier === "yellow") return "Cutting it close";
  return "Below criteria";
}

function skippableClasses(attended, total, criteria) {
  const target = criteria / 100;
  if (target <= 0) return 0;
  const maxTotal = attended / target;
  return Math.max(0, Math.floor(Number((maxTotal - total).toFixed(6))));
}

function neededClasses(attended, total, criteria) {
  const target = criteria / 100;
  if (target >= 1) return null;
  const raw = (target * total - attended) / (1 - target);
  return Math.max(0, Math.ceil(Number(raw.toFixed(6))));
}

function meterSVG(percentValue, tier) {
  const r = 52;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, percentValue));
  const dash = (clamped / 100) * circumference;
  return `
    <svg class="meter-svg" viewBox="0 0 120 120">
      <circle class="meter-track" cx="60" cy="60" r="${r}"></circle>
      <circle class="meter-fill tier-${tier}" cx="60" cy="60" r="${r}"
        stroke-dasharray="${dash} ${circumference}"
        transform="rotate(-90 60 60)"></circle>
    </svg>
  `;
}

function computeStats(records) {
  const bySubject = {};
  let overallAttended = 0, overallTotal = 0;
  let lecAttended = 0, lecTotal = 0;
  let labAttended = 0, labTotal = 0;

  records.forEach(r => {
    if (!bySubject[r.subject]) bySubject[r.subject] = { attended: 0, total: 0 };
    bySubject[r.subject].total += 1;
    overallTotal += 1;
    if (r.class_type === "lecture") lecTotal += 1;
    if (r.class_type === "lab") labTotal += 1;
    if (r.status === "present") {
      bySubject[r.subject].attended += 1;
      overallAttended += 1;
      if (r.class_type === "lecture") lecAttended += 1;
      if (r.class_type === "lab") labAttended += 1;
    }
  });

  return {
    bySubject,
    overallAttended,
    overallTotal,
    overall: pct(overallAttended, overallTotal),
    lectures: pct(lecAttended, lecTotal),
    labs: pct(labAttended, labTotal)
  };
}

function groupByDate(records) {
  const map = {};
  records.forEach(r => {
    if (!map[r.date]) map[r.date] = [];
    map[r.date].push(r);
  });
  return Object.entries(map).sort((a, b) => (a[0] < b[0] ? 1 : -1));
}

async function renderAttendanceStatusView() {
  const wrap = document.getElementById("statusContent");
  if (!authState.session) {
    wrap.innerHTML = `<div class="empty-panel">Log in to see your attendance status.<button class="btn-primary" id="statusLoginBtn">Log in</button></div>`;
    document.getElementById("statusLoginBtn").onclick = () => showView("auth");
    return;
  }
  wrap.innerHTML = `<div class="empty-panel">Loading&hellip;</div>`;

  const { data, error } = await sb
    .from("attendance")
    .select("*")
    .eq("user_id", authState.user.id)
    .order("date", { ascending: false });

  if (error) {
    wrap.innerHTML = `<div class="empty-panel">${error.message}</div>`;
    return;
  }

  if (!data.length) {
    wrap.innerHTML = `<div class="empty-panel">No attendance recorded yet.</div>`;
    return;
  }

  const criteria = getAttendanceCriteria();
  const stats = computeStats(data);
  const overallPct = Number(stats.overall);
  const tier = attendanceTier(overallPct, criteria);

  const skip = skippableClasses(stats.overallAttended, stats.overallTotal, criteria);
  const needed = neededClasses(stats.overallAttended, stats.overallTotal, criteria);

  const projectionLine = tier === "red"
    ? `Attend your next <strong>${needed}</strong> class${needed === 1 ? "" : "es"} without missing to get back to ${criteria}%.`
    : `You can skip <strong>${skip}</strong> more class${skip === 1 ? "" : "es"} and stay at or above ${criteria}%.`;

  const subjectRows = Object.entries(stats.bySubject)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([subject, s]) => {
      const subjectPct = Number(pct(s.attended, s.total));
      const subjectTier = attendanceTier(subjectPct, criteria);
      const subjSkip = skippableClasses(s.attended, s.total, criteria);
      const subjNeeded = neededClasses(s.attended, s.total, criteria);
      const projCell = subjectTier === "red"
        ? `<span class="proj-cell proj-red">+${subjNeeded}</span>`
        : `<span class="proj-cell proj-green">${subjSkip > 0 ? "-" + subjSkip : "0"}</span>`;
      return `
        <tr>
          <td>${subject}</td>
          <td>${s.attended}</td>
          <td>${s.total}</td>
          <td class="pct-cell tier-text-${subjectTier}">${pct(s.attended, s.total)}%</td>
          <td>${projCell}</td>
        </tr>
      `;
    }).join("");

  const history = groupByDate(data);
  const historyHTML = history.map(([date, rows]) => {
    const present = rows.filter(r => r.status === "present").length;
    const absent = rows.filter(r => r.status === "absent").length;
    const label = new Date(date + "T00:00:00").toLocaleDateString(undefined, { day: "numeric", month: "long" });
    const detailRows = rows.map(r => `
      <div class="history-detail-row">
        <span>${r.subject}</span>
        <span class="badge-${r.status}">${r.status}</span>
      </div>
    `).join("");
    return `
      <div class="history-item">
        <button class="history-summary" data-date="${date}">
          <span>${label}</span>
          <span>${rows.length} classes &middot; ${present} present &middot; ${absent} absent</span>
        </button>
        <div class="history-detail" id="hist-${date}" style="display:none;">${detailRows}</div>
      </div>
    `;
  }).join("");

  wrap.innerHTML = `
    <div class="status-disclaimer">
      Heads up &mdash; these numbers are only as good as what you've marked yourself. This isn't synced with the official college portal (yet &mdash; working on it), so it can drift from the real thing. Treat it as your own tracker, not the final word.
    </div>

    <div class="meter-panel">
      <div class="meter-wrap">
        ${meterSVG(overallPct, tier)}
        <div class="meter-center">
          <div class="meter-pct">${stats.overall}%</div>
          <div class="meter-tag tier-text-${tier}">${tierLabel(tier)}</div>
        </div>
      </div>
      <div class="meter-side">
        <div class="meter-legend">
          <span class="legend-dot tier-green"></span>Fine
          <span class="legend-dot tier-yellow"></span>At risk
          <span class="legend-dot tier-red"></span>Below criteria
        </div>
        <div class="projection-line">${projectionLine}</div>
        <div class="criteria-row">
          <span>Minimum required</span>
          <div class="criteria-input-wrap">
            <input type="number" id="criteriaInput" min="1" max="100" value="${criteria}">
            <span>%</span>
          </div>
        </div>
      </div>
    </div>

    <div class="stat-grid" style="margin-top:20px;">
      <div class="stat-card"><span>Lectures</span><strong>${stats.lectures}%</strong></div>
      <div class="stat-card"><span>Labs</span><strong>${stats.labs}%</strong></div>
      <div class="stat-card"><span>Total marked</span><strong>${stats.overallTotal}</strong></div>
    </div>

    <div class="selector-label" style="margin-top:22px;">SUBJECT-WISE</div>
    <div class="table-wrap">
      <table class="subject-table">
        <thead><tr><th>Subject</th><th>Att.</th><th>Total</th><th>%</th><th>Skip/Need</th></tr></thead>
        <tbody>${subjectRows}</tbody>
      </table>
    </div>

    <div class="selector-label" style="margin-top:22px;">HISTORY</div>
    <div class="history-list">${historyHTML}</div>
  `;

  document.querySelectorAll(".history-summary").forEach(btn => {
    btn.onclick = () => {
      const el = document.getElementById(`hist-${btn.dataset.date}`);
      el.style.display = el.style.display === "none" ? "block" : "none";
    };
  });

  const criteriaInput = document.getElementById("criteriaInput");
  criteriaInput.onchange = () => {
    setAttendanceCriteria(Number(criteriaInput.value) || 75);
    renderAttendanceStatusView();
  };
}
