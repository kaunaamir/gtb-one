let authTab = "login";

function renderAuthView() {
  if (authState.session) {
    showView("profile");
    return;
  }
  const wrap = document.getElementById("authContent");
  wrap.innerHTML = `
    <div class="tabs">
      <button class="tab-btn ${authTab === "login" ? "active" : ""}" data-tab="login">Log in</button>
      <button class="tab-btn ${authTab === "signup" ? "active" : ""}" data-tab="signup">Sign up</button>
    </div>
    <div id="authTabContent"></div>
  `;
  wrap.querySelectorAll(".tab-btn").forEach(btn => {
    btn.onclick = () => {
      authTab = btn.dataset.tab;
      renderAuthView();
    };
  });
  if (authTab === "login") renderLoginForm();
  else renderSignupForm();
}

function renderLoginForm() {
  const wrap = document.getElementById("authTabContent");
  wrap.innerHTML = `
    <form id="loginForm" class="stack-form">
      <label class="form-field"><span>Email</span><input type="email" id="liEmail" required></label>
      <label class="form-field"><span>Password</span><input type="password" id="liPassword" required></label>
      <div class="form-actions"><button type="submit" class="btn-primary">Log in</button></div>
      <button type="button" class="link-btn" id="forgotBtn">Forgot password?</button>
      <div class="form-error" id="loginError"></div>
    </form>
  `;
  document.getElementById("forgotBtn").onclick = renderForgotForm;
  document.getElementById("loginForm").onsubmit = async e => {
    e.preventDefault();
    const errorEl = document.getElementById("loginError");
    errorEl.textContent = "";
    const email = document.getElementById("liEmail").value.trim();
    const password = document.getElementById("liPassword").value;
    const { error } = await logInUser(email, password);
    if (error) {
      errorEl.textContent = error.message;
      return;
    }
    showToast("Logged in.");
    showView("profile");
  };
}

function renderForgotForm() {
  const wrap = document.getElementById("authTabContent");
  wrap.innerHTML = `
    <form id="forgotForm" class="stack-form">
      <p class="form-intro">Enter your email and we'll send a password reset link.</p>
      <label class="form-field"><span>Email</span><input type="email" id="fgEmail" required></label>
      <div class="form-actions"><button type="submit" class="btn-primary">Send reset link</button></div>
      <button type="button" class="link-btn" id="backToLoginBtn">Back to log in</button>
      <div class="form-error" id="forgotError"></div>
      <div class="form-success" id="forgotSuccess"></div>
    </form>
  `;
  document.getElementById("backToLoginBtn").onclick = renderLoginForm;
  document.getElementById("forgotForm").onsubmit = async e => {
    e.preventDefault();
    const errorEl = document.getElementById("forgotError");
    const successEl = document.getElementById("forgotSuccess");
    errorEl.textContent = "";
    successEl.textContent = "";
    const email = document.getElementById("fgEmail").value.trim();
    const { error } = await sendPasswordReset(email);
    if (error) {
      errorEl.textContent = error.message;
      return;
    }
    successEl.textContent = "Check your email for a reset link.";
  };
}

function showPasswordResetForm() {
  showView("auth");
  const wrap = document.getElementById("authContent");
  wrap.innerHTML = `
    <form id="resetForm" class="stack-form">
      <p class="form-intro">Set a new password.</p>
      <label class="form-field"><span>New password</span><input type="password" id="newPassword" required minlength="6"></label>
      <div class="form-actions"><button type="submit" class="btn-primary">Update password</button></div>
      <div class="form-error" id="resetError"></div>
    </form>
  `;
  document.getElementById("resetForm").onsubmit = async e => {
    e.preventDefault();
    const errorEl = document.getElementById("resetError");
    errorEl.textContent = "";
    const { error } = await updatePassword(document.getElementById("newPassword").value);
    if (error) {
      errorEl.textContent = error.message;
      return;
    }
    showToast("Password updated.");
    showView("profile");
  };
}

function renderSignupForm() {
  const wrap = document.getElementById("authTabContent");
  const colleges = ttAvailableColleges();
  const initCollege = colleges[0].id;
  const branches = ttAvailableBranches(initCollege);
  const initBranch = branches[0] ? branches[0].id : "";
  const semesters = ttAvailableSemesters(initCollege, initBranch);
  const initSemester = semesters[0] || "";
  const sections = ttSectionsFor(initCollege, initBranch, initSemester);

  wrap.innerHTML = `
    <form id="signupForm" class="stack-form">
      <label class="form-field"><span>Full name</span><input type="text" id="suName" required></label>
      <label class="form-field"><span>Email</span><input type="email" id="suEmail" required></label>
      <label class="form-field"><span>Password</span><input type="password" id="suPassword" required minlength="6"></label>
      <label class="form-field"><span>Roll number</span><input type="text" id="suRoll" required></label>
      <label class="form-field">
        <span>College</span>
        <select id="suCollege">${colleges.map(c => `<option value="${c.id}">${c.label}</option>`).join("")}</select>
      </label>
      <label class="form-field">
        <span>Branch</span>
        <select id="suBranch">${branches.map(b => `<option value="${b.id}">${b.label}</option>`).join("")}</select>
      </label>
      <label class="form-field">
        <span>Year</span>
        <select id="suYear">${[1, 2, 3, 4].map(y => `<option value="${y}">${y}</option>`).join("")}</select>
      </label>
      <label class="form-field">
        <span>Semester</span>
        <select id="suSemester">${semesters.map(s => `<option value="${s}">Sem ${s}</option>`).join("")}</select>
      </label>
      <label class="form-field">
        <span>Section</span>
        <select id="suSection">${sections.map(sec => `<option value="${sec}">${sec}</option>`).join("")}</select>
      </label>
      <div class="form-actions"><button type="submit" class="btn-primary">Create account</button></div>
      <div class="form-error" id="signupError"></div>
    </form>
  `;

  const collegeSel = document.getElementById("suCollege");
  const branchSel = document.getElementById("suBranch");
  const semesterSel = document.getElementById("suSemester");
  const sectionSel = document.getElementById("suSection");

  function refreshBranches() {
    const bs = ttAvailableBranches(collegeSel.value);
    branchSel.innerHTML = bs.map(b => `<option value="${b.id}">${b.label}</option>`).join("");
    refreshSemesters();
  }
  function refreshSemesters() {
    const sems = ttAvailableSemesters(collegeSel.value, branchSel.value);
    semesterSel.innerHTML = sems.map(s => `<option value="${s}">Sem ${s}</option>`).join("");
    refreshSections();
  }
  function refreshSections() {
    const secs = ttSectionsFor(collegeSel.value, branchSel.value, semesterSel.value);
    sectionSel.innerHTML = secs.map(sec => `<option value="${sec}">${sec}</option>`).join("");
  }
  collegeSel.onchange = refreshBranches;
  branchSel.onchange = refreshSemesters;
  semesterSel.onchange = refreshSections;

  document.getElementById("signupForm").onsubmit = async e => {
    e.preventDefault();
    const errorEl = document.getElementById("signupError");
    errorEl.textContent = "";

    const fields = {
      name: document.getElementById("suName").value.trim(),
      email: document.getElementById("suEmail").value.trim(),
      password: document.getElementById("suPassword").value,
      rollNumber: document.getElementById("suRoll").value.trim(),
      college: collegeSel.value,
      branch: branchSel.value,
      year: Number(document.getElementById("suYear").value),
      semester: Number(semesterSel.value),
      section: sectionSel.value
    };

    const { error } = await signUpUser(fields);
    if (error) {
      errorEl.textContent = error.message;
      return;
    }

    if (authState.session) {
      showToast("Account created.");
      showView("profile");
    } else {
      wrap.innerHTML = `<div class="form-success">Account created. Check your email to confirm, then log in.</div>`;
    }
  };
}
