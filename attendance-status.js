function pct(attended, total) {
  return total ? ((attended / total) * 100).toFixed(1) : "0.0";
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
    overall: pct(overallAttended, overallTotal),
    lectures: pct(lecAttended, lecTotal),
    labs: pct(labAttended, labTotal),
    overallTotal
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

  const stats = computeStats(data);
  const subjectRows = Object.entries(stats.bySubject)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([subject, s]) => `
      <tr>
        <td>${subject}</td>
        <td>${s.attended}</td>
        <td>${s.total}</td>
        <td>${pct(s.attended, s.total)}%</td>
      </tr>
    `).join("");

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
    <div class="stat-grid">
      <div class="stat-card"><span>Overall</span><strong>${stats.overall}%</strong></div>
      <div class="stat-card"><span>Lectures</span><strong>${stats.lectures}%</strong></div>
      <div class="stat-card"><span>Labs</span><strong>${stats.labs}%</strong></div>
    </div>
    <div class="selector-label" style="margin-top:22px;">SUBJECT-WISE</div>
    <div class="table-wrap">
      <table class="subject-table">
        <thead><tr><th>Subject</th><th>Attended</th><th>Total</th><th>%</th></tr></thead>
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
}
