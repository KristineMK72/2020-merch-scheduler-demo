// Person pick: tap candidates to select/deselect before Confirm
(function () {
  if (typeof state === "undefined") return;
  if (!("selectedPersonIds" in state)) state.selectedPersonIds = [];

  window.findClosestPeople = function () {
    const store = state.stores.find((s) => s.id === state.selectedStoreId);
    if (!store) return;
    const needed = getPeopleNeeded();
    state.candidates = rankCandidates(store).slice(0, needed + 6);
    state.selectedPersonIds = state.candidates.slice(0, needed).map((p) => p.id);
    renderResults(store);
    drawRoutes(store, state.candidates.filter((p) => state.selectedPersonIds.includes(p.id)));
    if (state.map && state.candidates.length) {
      const bounds = [[store.lat, store.lng]];
      state.candidates.slice(0, needed + 2).forEach((p) => bounds.push([p.lat, p.lng]));
      try { state.map.fitBounds(bounds, { padding: [40, 40], maxZoom: 10 }); } catch (_) {}
    }
  };

  window.renderResults = function (store) {
    const needed = getPeopleNeeded();
    const projectH = getProjectHours();
    if (!state.selectedPersonIds.length && state.candidates.length) {
      state.selectedPersonIds = state.candidates.slice(0, needed).map((p) => p.id);
    }
    const selected = state.candidates.filter((p) => state.selectedPersonIds.includes(p.id));
    const totalDrive = selected.reduce((s, p) => s + p.driveMin, 0);
    const personHours = totalDrive / 60 + projectH * Math.max(1, selected.length || needed);

    $("assignmentSummary").innerHTML = `
      <div><strong>${selected.length ? "Selected " + selected.length : "None selected"}</strong> · tap a name to choose</div>
      <div>Brand: <strong>${store.brand}</strong> · ${store.city}</div>
      <div>Drive (selected): <strong>${totalDrive} min</strong></div>
      <div>Est. person-hours: <strong>${personHours.toFixed(1)}h</strong></div>
      <div class="hint" style="margin-top:6px">Auto = closest in this city. Tap anyone to pick manually.</div>`;

    $("peopleResults").innerHTML =
      state.candidates
        .map((p, idx) => {
          const isSel = state.selectedPersonIds.includes(p.id);
          const role = idx === 0 ? "Closest" : idx < needed ? "Primary" : "Fallback";
          const tagCls = isSel ? "assigned" : idx < needed ? "primary" : "fallback";
          const scopeTag = p.scopeMatch
            ? `<span class="tag assigned">Scope ✓</span>`
            : `<span class="tag fallback">No ${store.brand}</span>`;
          return `
          <div class="list-item ${isSel ? "active" : ""}" data-person-id="${p.id}" style="cursor:pointer">
            <div class="name">${isSel ? "✓ " : ""}${idx === 0 ? "★ " : ""}${p.name}</div>
            <div class="meta">${p.driveMin} min · ${p.miles} mi · ${p.market} · ★ ${p.rating}</div>
            <span class="tag ${tagCls}">${isSel ? "Selected" : role}</span> ${scopeTag}
          </div>`;
        })
        .join("") || '<div class="hint">No available people within max drive.</div>';

    $("peopleResults").querySelectorAll("[data-person-id]").forEach((el) => {
      el.addEventListener("click", () => {
        const id = el.dataset.personId;
        const i = state.selectedPersonIds.indexOf(id);
        if (i >= 0) state.selectedPersonIds.splice(i, 1);
        else {
          if (state.selectedPersonIds.length >= needed) state.selectedPersonIds.shift();
          state.selectedPersonIds.push(id);
        }
        renderResults(store);
        const picked = state.candidates.filter((p) => state.selectedPersonIds.includes(p.id));
        drawRoutes(store, picked.length ? picked : state.candidates.slice(0, needed));
      });
    });

    $("resultsPanel").style.display = "block";
  };

  window.confirmAssignment = function () {
    const store = state.stores.find((s) => s.id === state.selectedStoreId);
    if (!store || !state.candidates.length) return;
    const needed = getPeopleNeeded();
    let primaries = state.candidates.filter((p) => state.selectedPersonIds.includes(p.id));
    if (!primaries.length) primaries = state.candidates.slice(0, needed);
    if (!primaries.length) return;

    primaries.forEach((p) => {
      const person = state.people.find((x) => x.id === p.id);
      if (person) person.status = "assigned";
    });

    const totalDrive = primaries.reduce((s, p) => s + p.driveMin, 0);
    const hours = getProjectHours();
    const startH = 8 + Math.floor(Math.random() * 6);
    const startM = [0, 15, 30, 45][Math.floor(Math.random() * 4)];
    const endTotal = startH * 60 + startM + hours * 60;

    state.assignments.push({
      storeId: store.id,
      storeName: store.fullName,
      projectCode: store.projectCode,
      brand: store.brand,
      personIds: primaries.map((p) => p.id),
      personNames: primaries.map((p) => p.name),
      projectHours: hours,
      totalDriveMin: totalDrive,
      dayIndex: state.selectedDayIndex,
      startTime: `${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")}`,
      endTime: `${String(Math.floor(endTotal / 60)).padStart(2, "0")}:${String(Math.round(endTotal % 60)).padStart(2, "0")}`,
      status: "Scheduled",
      trackStatus: "Scheduled",
      deliveredAt: null,
      lastPing: new Date().toISOString(),
      lat: store.lat,
      lng: store.lng,
      timestamp: new Date()
    });

    state.selectedStoreId = null;
    state.candidates = [];
    state.selectedPersonIds = [];
    $("assignmentPanel").style.display = "none";
    $("resultsPanel").style.display = "none";
    clearRoutes();
    updateStats();
    renderStoreList(($("storeSearch") && $("storeSearch").value) || "");
    renderAssignedList();
    if (typeof renderTrackingList === "function") renderTrackingList();
    if (typeof populateBulkBrandSelect === "function") populateBulkBrandSelect();
    renderMarkers();
    refreshMerchIfNeeded();
  };
})();
