// ----- Live tracking (package / job delivery style) -----
const TRACK_FLOW = ["Scheduled", "En Route", "On Site", "Completed"];

function advanceTrackStatus(a) {
  const i = TRACK_FLOW.indexOf(a.trackStatus || "Scheduled");
  if (i < 0 || i >= TRACK_FLOW.length - 1) return false;
  a.trackStatus = TRACK_FLOW[i + 1];
  a.lastPing = new Date().toISOString();
  if (a.trackStatus === "Completed") {
    a.deliveredAt = new Date().toISOString();
    a.status = "Completed";
    (a.personIds || []).forEach((pid) => {
      const p = state.people.find((x) => x.id === pid);
      if (p) p.status = "available";
    });
  } else if (a.trackStatus === "En Route" || a.trackStatus === "On Site") {
    (a.personIds || []).forEach((pid) => {
      const p = state.people.find((x) => x.id === pid);
      if (!p) return;
      const t = a.trackStatus === "En Route" ? 0.45 : 0.92;
      p.liveLat = p.lat + (a.lat - p.lat) * t;
      p.liveLng = p.lng + (a.lng - p.lng) * t;
      p.status = "assigned";
    });
  }
  return true;
}

function renderTrackingList() {
  const list = $("trackingList");
  if (!list) return;
  const active = state.assignments.filter((a) => (a.trackStatus || "Scheduled") !== "Completed");
  const done = state.assignments.filter((a) => a.trackStatus === "Completed");
  if (!state.assignments.length) {
    list.innerHTML = '<div class="hint">Assign work to see live tracking</div>';
    return;
  }
  const badge = (ts) => {
    const colors = {
      Scheduled: "primary",
      "En Route": "fallback",
      "On Site": "fallback",
      Completed: "assigned"
    };
    return `<span class="tag ${colors[ts] || "primary"}">${ts}</span>`;
  };
  list.innerHTML =
    active.slice().reverse().slice(0, 20).map((a) => `
      <div class="list-item">
        <div class="name">${a.storeName}</div>
        <div class="meta">${a.personNames.join(", ")} · ${a.projectCode}</div>
        ${badge(a.trackStatus || "Scheduled")}
        <button type="button" class="btn secondary small track-next" data-idx="${state.assignments.indexOf(a)}" style="margin-top:6px;width:100%">
          Next: ${TRACK_FLOW[Math.min(TRACK_FLOW.indexOf(a.trackStatus || "Scheduled") + 1, 3)] || "—"}
        </button>
      </div>`).join("") +
    (done.length ? `<div class="hint" style="margin-top:8px">${done.length} completed / delivered</div>` : "");

  list.querySelectorAll(".track-next").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const i = parseInt(btn.dataset.idx, 10);
      const a = state.assignments[i];
      if (a) {
        advanceTrackStatus(a);
        renderTrackingList();
        renderAssignedList();
        renderMarkers();
        updateStats();
        refreshMerchIfNeeded();
      }
    });
  });
}

function simulateAdvanceAll() {
  let n = 0;
  state.assignments.forEach((a) => {
    if ((a.trackStatus || "Scheduled") !== "Completed") {
      if (advanceTrackStatus(a)) n++;
    }
  });
  renderTrackingList();
  renderAssignedList();
  renderMarkers();
  updateStats();
  refreshMerchIfNeeded();
  if (n === 0) alert("No active jobs to advance (all completed or none assigned).");
}
