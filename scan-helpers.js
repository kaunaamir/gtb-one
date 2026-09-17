function ttAllSections(collegeId) {
  const college = TIMETABLE_DATA[collegeId];
  if (!college) return [];
  const out = [];
  Object.entries(college.branches).forEach(([branchId, branch]) => {
    Object.entries(branch.semesters || {}).forEach(([yearKey, yearData]) => {
      Object.entries(yearData.sections).forEach(([sectionName, schedule]) => {
        out.push({
          branchId,
          branchLabel: branch.name,
          year: yearKey,
          section: sectionName,
          schedule
        });
      });
    });
  });
  return out;
}

function splitRooms(location) {
  if (!location) return [];
  return location.split("/").map(s => s.trim()).filter(Boolean);
}

function splitProfessors(professor) {
  if (!professor) return [];
  return professor.split(",").map(s => s.trim()).filter(Boolean);
}

function ttRoomStatus(collegeId, day, nowMinutes) {
  const sections = ttAllSections(collegeId);
  const allRooms = new Set();
  const occupied = [];

  sections.forEach(sec => {
    Object.entries(sec.schedule).forEach(([d, slots]) => {
      (slots || []).forEach(slot => {
        splitRooms(slot.location).forEach(room => allRooms.add(room));
        if (d === day && slot.type !== "break" && nowMinutes >= toMinutes(slot.start) && nowMinutes < toMinutes(slot.end)) {
          splitRooms(slot.location).forEach(room => {
            occupied.push({
              room,
              subject: slot.subject,
              type: slot.type,
              section: sec.section,
              branch: sec.branchLabel,
              professor: slot.professor,
              start: slot.start,
              end: slot.end
            });
          });
        }
      });
    });
  });

  const busyRoomNames = new Set(occupied.map(o => o.room));
  const emptyRooms = Array.from(allRooms).filter(r => !busyRoomNames.has(r)).sort();
  occupied.sort((a, b) => a.room.localeCompare(b.room));

  return { allRooms: Array.from(allRooms).sort(), emptyRooms, occupied };
}

function ttProfessorTokens(collegeId) {
  const set = new Set();
  ttAllSections(collegeId).forEach(sec => {
    Object.values(sec.schedule).forEach(slots => {
      (slots || []).forEach(slot => splitProfessors(slot.professor).forEach(p => set.add(p)));
    });
  });
  return Array.from(set).sort();
}

function ttProfessorSchedule(collegeId, token) {
  const result = {};
  WEEKDAYS.forEach(d => (result[d] = []));
  ttAllSections(collegeId).forEach(sec => {
    WEEKDAYS.forEach(day => {
      (sec.schedule[day] || []).forEach(slot => {
        if (slot.type === "break") return;
        if (!splitProfessors(slot.professor).includes(token)) return;
        result[day].push({
          start: slot.start,
          end: slot.end,
          subject: slot.subject,
          type: slot.type,
          section: sec.section,
          branch: sec.branchLabel,
          location: slot.location
        });
      });
    });
  });
  WEEKDAYS.forEach(day => result[day].sort((a, b) => a.start.localeCompare(b.start)));
  return result;
}

function ttProfessorNow(schedule, day, nowMinutes) {
  const todays = schedule[day] || [];
  return todays.find(s => nowMinutes >= toMinutes(s.start) && nowMinutes < toMinutes(s.end)) || null;
}
