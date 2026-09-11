function ttLookupBranch(collegeId, branchId) {
  const college = TIMETABLE_DATA[collegeId];
  return college ? college.branches[branchId] : null;
}

function ttLookupSemester(collegeId, branchId, semester) {
  const branch = ttLookupBranch(collegeId, branchId);
  return branch ? branch.semesters[String(semester)] : null;
}

function ttAvailableColleges() {
  return COLLEGE_META.filter(c => c.available);
}

function ttAvailableBranches(collegeId) {
  return (BRANCH_META[collegeId] || []).filter(b => b.available);
}

function ttYearFromSemester(semester) {
  return Math.ceil(Number(semester) / 2);
}

function ttResolveSemesterForYear(collegeId, branchId, year) {
  const branch = ttLookupBranch(collegeId, branchId);
  const odd = 2 * year - 1;
  const even = 2 * year;
  if (branch && ttSemesterHasContent(branch.semesters[String(odd)])) return odd;
  if (branch && ttSemesterHasContent(branch.semesters[String(even)])) return even;
  return odd;
}

function ttYearHasContent(collegeId, branchId, year) {
  const branch = ttLookupBranch(collegeId, branchId);
  if (!branch) return false;
  const odd = 2 * year - 1;
  const even = 2 * year;
  return ttSemesterHasContent(branch.semesters[String(odd)]) || ttSemesterHasContent(branch.semesters[String(even)]);
}

const ACADEMIC_YEARS = [1, 2, 3, 4];

function ttSemesterHasContent(semesterData) {
  if (!semesterData) return false;
  return Object.values(semesterData.sections).some(secDays =>
    Object.values(secDays).some(dayArr => Array.isArray(dayArr) && dayArr.length > 0)
  );
}

function ttAvailableSemesters(collegeId, branchId) {
  const branch = ttLookupBranch(collegeId, branchId);
  if (!branch) return [];
  return SEMESTER_META.filter(s => ttSemesterHasContent(branch.semesters[String(s)]));
}

function ttSectionsFor(collegeId, branchId, semester) {
  const sem = ttLookupSemester(collegeId, branchId, semester);
  if (!sem) return [];
  return Object.keys(sem.sections).filter(name =>
    Object.values(sem.sections[name]).some(dayArr => Array.isArray(dayArr) && dayArr.length > 0)
  );
}

function ttDaySchedule(collegeId, branchId, semester, section, day) {
  const sem = ttLookupSemester(collegeId, branchId, semester);
  if (!sem || !sem.sections[section]) return [];
  return sem.sections[section][day] || [];
}

function ttMergeClassSessions(daySlots) {
  const real = daySlots.filter(s => s.type !== "break");
  const buckets = {};
  const order = [];
  real.forEach(slot => {
    const key = [slot.subject, slot.group || "", slot.type, slot.location || "", slot.professor || ""].join("|");
    if (!buckets[key]) {
      buckets[key] = [];
      order.push(key);
    }
    buckets[key].push(slot);
  });

  const merged = [];
  order.forEach(key => {
    const items = buckets[key].slice().sort((a, b) => a.start.localeCompare(b.start));
    let current = null;
    items.forEach(slot => {
      if (current && current.end === slot.start) {
        current.end = slot.end;
      } else {
        current = Object.assign({}, slot);
        merged.push(current);
      }
    });
  });

  return merged.sort((a, b) => a.start.localeCompare(b.start) || (a.group || "").localeCompare(b.group || ""));
}

function ttSessionId(collegeId, branchId, semester, section, day, session) {
  return [collegeId, branchId, semester, section, day, session.start, session.subject, session.group || ""].join("|");
}

function ttLocalDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function ttFormatTime(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}
