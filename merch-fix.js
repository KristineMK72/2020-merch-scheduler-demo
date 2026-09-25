// Fixes My Schedule assignment visibility + Assigned list route buttons
(function () {
  if (typeof state === "undefined") return;

  window.renderMerchAssignments = function () {
    const list = $("merchAssignments");
    if (!list) return;

    if (!state.selectedPersonId) {
      list.innerHTML = '<div class="empty-state">Select a merchandiser to see optimized route</div>';
      $("dayCount").textContent = "0";
      clearMerchMarkers();
      return;
    }

    const person = state.people.find((p) => p.id === state.selectedPersonId);
    if (!person) return;

    const allForPerson = state.assignments.filter((a) =>
      (a.personIds || []).includes(state.selectedPersonId)
    );

    let items = allForPerson.filter((a) => a.dayIndex === state.selectedDayIndex);
    if (!items.length && allForPerson.length) {
      const daysWithWork = [...new Set(allForPerson.map((a) => a.dayIndex))].sort();
      state.selectedDayIndex = daysWithWork[0];
      items = allForPerson.filter((a) => a.dayIndex === state.selectedDayIndex);
      renderWeekBar();
    }

    let sampleNote = "";
    if (!items.length) {
      const nearby = state.stores
        .map((s) => ({ s, d: haversineMiles(person.lat, person.lng, s.lat, s.lng) }))
        .filter((x) => x.d < 90)
        .sort((a, b) => a.d - b.d)
        .slice(0, 3);
      items = nearby.map((n, idx) => ({
        storeId: n.s.id,
        storeName: n.s.fullName,
        projectCode: n.s.projectCode,
        brand: n.s.brand,
        projectHours: n.s.typicalHours,
        startTime: ["09:00", "11:00", "13:30"][idx],
        endTime: ["10:30", "12:00", "15:00"][idx],
        status: "Scheduled",
        trackStatus: "Scheduled",
        lat: n.s.lat,
        lng: n.s.lng,
        demo: true
      }));
      sampleNote =
        '<div class="hint" style="margin-bottom:8px">Sample nearby stops (assign this person in Supervisor to see real jobs)</div>';
    }

    const stops = items
      .map((a) => {
        const store = state.stores.find((s) => s.id === a.storeId);
        return {
          ...a,
          lat: a.lat != null ? a.lat : store && store.lat,
          lng: a.lng != null ? a.lng : store && store.lng
        };
      })
      .filter((s) => s.lat != null);

    const route = nearestNeighborRoute(person, stops);
    const ordered = route.ordered.length ? route.ordered : items;

    const labels = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const days = getWeekDates();
    const d = days[state.selectedDayIndex];
    $("dayTitle").textContent = `Route – ${labels[state.selectedDayIndex]} ${d.getMonth() + 1}/${d.getDate()}`;
    $("dayCount").textContent = String(ordered.length);

    if (!ordered.length) {
      list.innerHTML = '<div class="empty-state">No stops this day</div>';
      clearMerchMarkers();
      return;
    }

    const routeSummary =
      route.ordered.length > 1
        ? `<div class="summary" style="margin-bottom:10px">
            <strong>Optimized route</strong> (nearest-neighbor)<br>
            ${route.ordered.length} stops · ~${route.totalMiles} mi · ~${route.totalMin} min drive
          </div>`
        : "";

    list.innerHTML =
      sampleNote +
      routeSummary +
      ordered
        .map(
          (a, i) => `
      <div class="merch-assignment">
        <div class="store-line">${route.ordered.length ? `${i + 1}. ` : ""}${a.storeName}</div>
        <div class="project-line">${a.projectCode}${a.legMin != null ? ` · leg ${a.legMin} min` : ""}${a.demo ? " · sample" : ""}</div>
        <div class="times">
          <span>Start ${a.startTime || "—"}</span>
          <span>End ${a.endTime || "—"}</span>
          <span>${a.projectHours}h</span>
        </div>
        <div class="status">✓ ${a.trackStatus || a.status || "Scheduled"}${a.deliveredAt ? " · Delivered" : ""}</div>
      </div>`
        )
        .join("");

    updateMerchMap(ordered, person, route);
  };

  window.renderAssignedList = function () {
    const list = $("assignedList");
    if (!list) return;
    if (!state.assignments.length) {
      list.innerHTML = '<div class="hint">No assignments yet — select a store (auto-picks closest)</div>';
      return;
    }
    list.innerHTML =
      `<button type="button" class="btn secondary full" id="showAllRoutesBtn" style="margin-bottom:8px">Show all routes on map</button>` +
      state.assignments
        .slice()
        .reverse()
        .slice(0, 30)
        .map((a) => {
          const idx = state.assignments.indexOf(a);
          return `<div class="list-item" data-aidx="${idx}" style="cursor:pointer" title="Click to view route">
        <div class="name">${a.storeName}</div>
        <div class="meta">${a.projectCode}<br>${(a.personNames || []).join(", ")} · ${a.totalDriveMin} min · ${a.projectHours}h</div>
        <span class="tag assigned">${a.trackStatus || a.status || "Scheduled"}</span>
      </div>`;
        })
        .join("");
    const btn = $("showAllRoutesBtn");
    if (btn) btn.addEventListener("click", showSupervisorRoutes);
    list.querySelectorAll("[data-aidx]").forEach((el) => {
      el.addEventListener("click", () => viewAssignmentRoute(parseInt(el.dataset.aidx, 10)));
    });
  };
})();
