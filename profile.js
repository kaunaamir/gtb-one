function collegeLabel(id) {
  const c = COLLEGE_META.find(c => c.id === id);
  return c ? c.label : id;
}

function branchLabel(collegeId, branchId) {
  const b = (BRANCH_META[collegeId] || []).find(b => b.id === branchId);
  return b ? b.label : branchId;
}

function renderProfileView() {
  const wrap = document.getElementById("profileContent");
  if (!authState.session) {
    wrap.innerHTML = `<div class="empty-panel">Log in to view your profile.<button class="btn-primary" id="profileLoginBtn">Log in</button></div>`;
    document.getElementById("profileLoginBtn").onclick = () => showView("auth");
    return;
  }
  if (authState.profile) {
    renderProfileReadOnly(wrap);
  } else {
    renderProfileForm(wrap, null);
  }
}

function renderProfileReadOnly(wrap) {
  const p = authState.profile;
  wrap.innerHTML = `
    <div class="info-card">
      <div class="info-row"><span>Name</span><strong>${p.name}</strong></div>
      <div class="info-row"><span>Email</span><strong>${p.email}</strong></div>
      <div class="info-row"><span>College</span><strong>${collegeLabel(p.college)}</strong></div>
      <div class="info-row"><span>Branch</span><strong>${branchLabel(p.college, p.branch)}</strong></div>
      <div class="info-row"><span>Year</span><strong>${p.year}</strong></div>
      <div class="info-row"><span>Semester</span><strong>${p.semester}</strong></div>
      <div class="info-row"><span>Section</span><strong>${p.section}</strong></div>
      <div class="info-row"><span>Roll number</span><strong>${p.roll_number}</strong></div>
    </div>
    <button class="btn-ghost" id="editProfileBtn">Edit profile</button>
    <button class="btn-ghost" id="logoutBtn">Log out</button>
  `;
  document.getElementById("editProfileBtn").onclick = () => renderProfileForm(wrap, p);
  document.getElementById("logoutBtn").onclick = async () => {
    await logOutUser();
    showView("timetable");
  };
}

function buildProfileFormFields(existing) {
  const colleges = ttAvailableColleges();
  const selCollege = (existing && existing.college) || (colleges[0] && colleges[0].id) || "";
  const branches = ttAvailableBranches(selCollege);
  const selBranch = (existing && existing.branch) || (branches[0] && branches[0].id) || "";
  const semesters = ttAvailableSemesters(selCollege, selBranch);
  const selSemester = (existing && existing.semester) || semesters[0] || "";
  const sections = ttSectionsFor(selCollege, selBranch, selSemester);
  const selSection = (existing && existing.section) || sections[0] || "";

  return `
    <form id="profileForm" class="stack-form">
      <label class="form-field">
        <span>Full name</span>
        <input type="text" id="pfName" required value="${existing ? existing.name : ""}">
      </label>
      <label class="form-field">
        <span>Roll number</span>
        <input type="text" id="pfRoll" required value="${existing ? existing.roll_number : ""}">
      </label>
      <label class="form-field">
        <span>College</span>
        <select id="pfCollege">${colleges.map(c => `<option value="${c.id}" ${c.id === selCollege ? "selected" : ""}>${c.label}</option>`).join("")}</select>
      </label>
      <label class="form-field">
        <span>Branch</span>
        <select id="pfBranch">${branches.map(b => `<option value="${b.id}" ${b.id === selBranch ? "selected" : ""}>${b.label}</option>`).join("")}</select>
      </label>
      <label class="form-field">
        <span>Year</span>
        <select id="pfYear">${[1, 2, 3, 4].map(y => `<option value="${y}" ${existing && existing.year === y ? "selected" : ""}>${y}</option>`).join("")}</select>
      </label>
      <label class="form-field">
        <span>Semester</span>
        <select id="pfSemester">${semesters.map(s => `<option value="${s}" ${s === selSemester ? "selected" : ""}>Sem ${s}</option>`).join("")}</select>
      </label>
      <label class="form-field">
        <span>Section</span>
        <select id="pfSection">${sections.map(sec => `<option value="${sec}" ${sec === selSection ? "selected" : ""}>${sec}</option>`).join("")}</select>
      </label>
      <div class="form-actions">
        <button type="submit" class="btn-primary">${existing ? "Save changes" : "Create profile"}</button>
        ${existing ? `<button type="button" class="btn-ghost" id="pfCancel">Cancel</button>` : ""}
      </div>
      <div class="form-error" id="pfError"></div>
    </form>
  `;
}

function wireProfileFormCascade() {
  const collegeSel = document.getElementById("pfCollege");
  const branchSel = document.getElementById("pfBranch");
  const semesterSel = document.getElementById("pfSemester");
  const sectionSel = document.getElementById("pfSection");

  function refreshBranches() {
    const branches = ttAvailableBranches(collegeSel.value);
    branchSel.innerHTML = branches.map(b => `<option value="${b.id}">${b.label}</option>`).join("");
    refreshSemesters();
  }
  function refreshSemesters() {
    const semesters = ttAvailableSemesters(collegeSel.value, branchSel.value);
    semesterSel.innerHTML = semesters.map(s => `<option value="${s}">Sem ${s}</option>`).join("");
    refreshSections();
  }
  function refreshSections() {
    const sections = ttSectionsFor(collegeSel.value, branchSel.value, semesterSel.value);
    sectionSel.innerHTML = sections.map(sec => `<option value="${sec}">${sec}</option>`).join("");
  }

  collegeSel.onchange = refreshBranches;
  branchSel.onchange = refreshSemesters;
  semesterSel.onchange = refreshSections;
}

function renderProfileForm(wrap, existing) {
  wrap.innerHTML = (existing ? "" : `<p class="form-intro">Complete your profile so GTB One can show your timetable and attendance automatically.</p>`) + buildProfileFormFields(existing);
  wireProfileFormCascade();

  if (existing) {
    document.getElementById("pfCancel").onclick = () => renderProfileView();
  }

  document.getElementById("profileForm").onsubmit = async e => {
    e.preventDefault();
    const errorEl = document.getElementById("pfError");
    errorEl.textContent = "";

    const payload = {
      id: authState.user.id,
      name: document.getElementById("pfName").value.trim(),
      email: authState.user.email,
      college: document.getElementById("pfCollege").value,
      branch: document.getElementById("pfBranch").value,
      year: Number(document.getElementById("pfYear").value),
      semester: Number(document.getElementById("pfSemester").value),
      section: document.getElementById("pfSection").value,
      roll_number: document.getElementById("pfRoll").value.trim()
    };

    const { error } = await sb.from("profiles").upsert(payload, { onConflict: "id" });
    if (error) {
      errorEl.textContent = error.message;
      return;
    }
    authState.profile = payload;
    showToast(existing ? "Profile updated." : "Profile created.");
    renderProfileView();
  };
}
