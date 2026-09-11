const VIEWS = ["timetable", "auth", "profile", "attendance", "attendance-status", "rooms", "faculty"];

function showView(name) {
  VIEWS.forEach(v => {
    const el = document.getElementById(`view-${v}`);
    if (el) el.style.display = v === name ? "" : "none";
  });
  document.querySelectorAll(".bottom-nav-item[data-view]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.view === name);
  });
  if (name === "auth") renderAuthView();
  if (name === "profile") renderProfileView();
  if (name === "attendance") renderAttendanceView();
  if (name === "attendance-status") renderAttendanceStatusView();
  if (name === "rooms") renderRoomsView();
  if (name === "faculty") renderFacultyView();
}

function showToast(message) {
  const el = document.getElementById("toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => el.classList.remove("show"), 3200);
}

function initials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0].toUpperCase())
    .join("");
}

function renderAccountControl() {
  const el = document.getElementById("accountControl");
  if (!authState.session) {
    el.innerHTML = `<button class="btn-ghost account-login-btn" id="topLoginBtn">Log in</button>`;
    document.getElementById("topLoginBtn").onclick = () => showView("auth");
    return;
  }
  const name = authState.profile ? authState.profile.name : authState.user.email;
  el.innerHTML = `
    <div class="account-menu-wrap">
      <button class="avatar-btn" id="avatarBtn">${initials(name)}</button>
      <div class="account-menu" id="accountMenu" style="display:none;">
        <button data-view="profile">Profile</button>
        <button data-view="attendance">Attendance</button>
        <button data-view="attendance-status">Attendance Status</button>
        <button id="menuLogoutBtn">Log out</button>
      </div>
    </div>
  `;
  const menu = document.getElementById("accountMenu");
  document.getElementById("avatarBtn").onclick = () => {
    menu.style.display = menu.style.display === "none" ? "block" : "none";
  };
  menu.querySelectorAll("button[data-view]").forEach(btn => {
    btn.onclick = () => {
      menu.style.display = "none";
      showView(btn.dataset.view);
    };
  });
  document.getElementById("menuLogoutBtn").onclick = async () => {
    menu.style.display = "none";
    await logOutUser();
    showView("timetable");
  };
  document.addEventListener("click", e => {
    if (!el.contains(e.target)) menu.style.display = "none";
  }, { once: true });
}

document.querySelectorAll(".bottom-nav-item[data-view]").forEach(btn => {
  btn.onclick = () => showView(btn.dataset.view);
});

onAuthReady(() => {
  renderAccountControl();
  if (["profile", "attendance", "attendance-status"].includes(currentView())) {
    showView(currentView());
  }
});

function currentView() {
  const active = document.querySelector(".bottom-nav-item.active");
  return active ? active.dataset.view || "timetable" : "timetable";
}

initAuth().then(() => {
  renderAccountControl();
  showView("timetable");
});
