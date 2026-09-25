/** Supervisor: draw all assigned routes (home → store) on the main map */
function showSupervisorRoutes() {
  if (!state.map) return;
  clearRoutes();
  const active = state.assignments.filter((a) => (a.trackStatus || "Scheduled") !== "Completed");
  if (!active.length) {
    alert("No active assignments to show. Assign some stores first.");
    return;
  }
  const bounds = [];
  active.forEach((a) => {
    (a.personIds || []).forEach((pid) => {
      const p = state.people.find((x) => x.id === pid);
      if (!p || a.lat == null) return;
      const line = L.polyline(
        [
          [p.liveLat != null ? p.liveLat : p.lat, p.liveLng != null ? p.liveLng : p.lng],
          [a.lat, a.lng]
        ],
        { color: "#2563eb", weight: 2.5, opacity: 0.75 }
      ).addTo(state.map);
      state.routeLines.push(line);
      bounds.push([p.lat, p.lng], [a.lat, a.lng]);
      line.bindPopup(
        `<strong>${p.name}</strong> → ${a.storeName}<br>${a.projectCode}<br>${a.totalDriveMin || "—"} min · ${a.trackStatus || a.status}`
      );
    });
  });
  if (bounds.length) {
    try {
      state.map.fitBounds(bounds, { padding: [40, 40], maxZoom: 9 });
    } catch (_) {}
  }
}

function viewAssignmentRoute(assignmentIndex) {
  const a = state.assignments[assignmentIndex];
  if (!a || !state.map) return;
  clearRoutes();
  const bounds = [[a.lat, a.lng]];
  (a.personIds || []).forEach((pid) => {
    const p = state.people.find((x) => x.id === pid);
    if (!p) return;
    const from = [p.liveLat != null ? p.liveLat : p.lat, p.liveLng != null ? p.liveLng : p.lng];
    state.routeLines.push(
      L.polyline([from, [a.lat, a.lng]], { color: "#2563eb", weight: 3, opacity: 0.85 }).addTo(state.map)
    );
    bounds.push(from);
  });
  try {
    state.map.fitBounds(bounds, { padding: [50, 50], maxZoom: 11 });
  } catch (_) {}
}
