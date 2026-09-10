const authState = {
  session: null,
  user: null,
  profile: null,
  profileChecked: false
};

const authListeners = [];

function onAuthReady(fn) {
  authListeners.push(fn);
}

async function loadProfile(userId) {
  const { data, error } = await sb.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) {
    console.error(error);
    return null;
  }
  return data;
}

async function refreshAuthState(session) {
  authState.session = session;
  authState.user = session ? session.user : null;
  authState.profile = session ? await loadProfile(session.user.id) : null;
  authState.profileChecked = true;
  authListeners.forEach(fn => fn(authState));
}

async function initAuth() {
  const { data } = await sb.auth.getSession();
  await refreshAuthState(data.session);

  sb.auth.onAuthStateChange(async (event, session) => {
    if (event === "PASSWORD_RECOVERY") {
      showPasswordResetForm();
      return;
    }
    await refreshAuthState(session);
  });
}

async function signUpUser(fields) {
  const { data, error } = await sb.auth.signUp({
    email: fields.email,
    password: fields.password
  });
  if (error) return { error };

  if (data.user && data.session) {
    const { error: profileError } = await sb.from("profiles").insert({
      id: data.user.id,
      name: fields.name,
      email: fields.email,
      college: fields.college,
      branch: fields.branch,
      year: fields.year,
      semester: fields.semester,
      section: fields.section,
      roll_number: fields.rollNumber
    });
    if (profileError) return { error: profileError };
  }

  await refreshAuthState(data.session);
  return { data };
}

async function logInUser(email, password) {
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (!error) await refreshAuthState(data.session);
  return { data, error };
}

async function logOutUser() {
  await sb.auth.signOut();
  await refreshAuthState(null);
}

async function sendPasswordReset(email) {
  return sb.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + window.location.pathname
  });
}

async function updatePassword(newPassword) {
  return sb.auth.updateUser({ password: newPassword });
}
