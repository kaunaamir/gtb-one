const roomsViewState = {
  college: null
};

function renderRoomsView() {
  const wrap = document.getElementById("roomsContent");
  const colleges = ttAvailableColleges();
  if (!roomsViewState.college) {
    roomsViewState.college = (typeof state !== "undefined" && state.college) || colleges[0].id;
  }

  const now = new Date();
  const day = ALL_DAYS[now.getDay()];
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  wrap.innerHTML = `
    <div class="selector-block">
      <div class="selector-label">COLLEGE</div>
      <div class="chip-row" id="roomsCollegeChips"></div>
    </div>
    <div class="live-line" id="roomsLiveLine"></div>
    <div id="roomsBody"></div>
  `;

  const chipRow = document.getElementById("roomsCollegeChips");
  colleges.forEach(c => {
    const btn = document.createElement("button");
    btn.className = "chip" + (c.id === roomsViewState.college ? " active" : "");
    btn.textContent = c.label;
    btn.onclick = () => {
      roomsViewState.college = c.id;
      renderRoomsView();
    };
    chipRow.appendChild(btn);
  });

  if (!WEEKDAYS.includes(day)) {
    document.getElementById("roomsBody").innerHTML = `<div class="empty-panel">No classes running today &mdash; every room is free.</div>`;
    document.getElementById("roomsLiveLine").textContent = `${day}, ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    return;
  }

  const status = ttRoomStatus(roomsViewState.college, day, nowMinutes);
  document.getElementById("roomsLiveLine").textContent = `As of ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}, ${day}`;

  const emptyHTML = status.emptyRooms.length
    ? `<div class="room-chip-grid">${status.emptyRooms.map(r => `<div class="room-chip room-chip-empty">${r}</div>`).join("")}</div>`
    : `<div class="empty-panel">No rooms free right now.</div>`;

  const busyHTML = status.occupied.length
    ? `<div class="busy-list">${status.occupied.map(o => `
        <div class="busy-row">
          <div class="busy-room">${o.room}</div>
          <div class="busy-detail">
            <div class="busy-subject type-${o.type}">${o.subject}</div>
            <div class="busy-meta">${o.section} &middot; until ${ttFormatTime(o.end)}</div>
          </div>
        </div>
      `).join("")}</div>`
    : `<div class="empty-panel">Nothing in session right now.</div>`;

  document.getElementById("roomsBody").innerHTML = `
    <div class="selector-label" style="margin-top:18px;">EMPTY NOW &middot; ${status.emptyRooms.length}</div>
    ${emptyHTML}
    <div class="selector-label" style="margin-top:24px;">IN USE &middot; ${status.occupied.length}</div>
    ${busyHTML}
  `;
}
