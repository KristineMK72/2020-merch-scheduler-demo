function populateBulkBrandSelect() {
  const sel = $("bulkBrand");
  if (!sel) return;
  const brands = [...new Set(state.stores.map((s) => s.brand))].sort();
  const cur = sel.value;
  sel.innerHTML = brands.map((b) => {
    const open = state.stores.filter((s) => s.brand === b && !state.assignments.some((a) => a.storeId === s.id)).length;
    return `<option value="${b}">${b} (${open} open)</option>`;
  }).join("");
  if (cur && brands.includes(cur)) sel.value = cur;
}

/** Bulk assign by brand across USA: nearest with scope first, then list fallbacks */
function bulkAssignByBrand() {
  const brand = $("bulkBrand") && $("bulkBrand").value;
  if (!brand) return;
  const limit = Math.max(1, Math.min(100, parseInt(($("bulkLimit") && $("bulkLimit").value) || "30", 10)));
  const maxDrive = Math.max(15, parseInt(($("bulkMaxDrive") && $("bulkMaxDrive").value) || "120", 10));
  const resultsEl = $("brandBulkResults");

  const openStores = state.stores.filter(
    (s) => s.brand === brand && !state.assignments.some((a) => a.storeId === s.id)
  ).slice(0, limit);

  if (!openStores.length) {
    if (resultsEl) resultsEl.innerHTML = `<div class="hint">No open ${brand} projects left.</div>`;
    populateBulkBrandSelect();
    return;
  }

  const report = [];
  let assigned = 0;

  openStores.forEach((store) => {
    const ranked = state.people
      .filter((p) => p.status === "available")
      .map((p) => {
        const mins = driveMinutes(p.lat, p.lng, store.lat, store.lng);
        return {
          ...p,
          driveMin: mins,
          miles: +haversineMiles(p.lat, p.lng, store.lat, store.lng).toFixed(1),
          scopeMatch: p.scopes.includes(store.brand)
        };
      })
      .filter((p) => p.driveMin <= maxDrive)
      .sort((a, b) => {
        if (a.scopeMatch !== b.scopeMatch) return a.scopeMatch ? -1 : 1;
        return a.driveMin - b.driveMin;
      });

    if (!ranked.length) {
      report.push({ store, primary: null, fallbacks: [], reason: "No one within drive" });
      return;
    }

    const primary = ranked[0];
    const fallbacks = ranked.slice(1, 4);
    const person = state.people.find((x) => x.id === primary.id);
    if (!person) return;
    person.status = "assigned";

    state.assignments.push({
      storeId: store.id,
      storeName: store.fullName,
      projectCode: store.projectCode,
      brand: store.brand,
      personIds: [primary.id],
      personNames: [primary.name],
      projectHours: store.typicalHours,
      totalDriveMin: primary.driveMin,
      dayIndex: state.selectedDayIndex,
      startTime: "09:00",
      endTime: "11:00",
      status: "Scheduled",
      trackStatus: "Scheduled",
      deliveredAt: null,
      lastPing: new Date().toISOString(),
      lat: store.lat,
      lng: store.lng,
      timestamp: new Date(),
      fallbackNames: fallbacks.map((f) => `${f.name} (${f.driveMin}m)`)
    });
    assigned++;
    report.push({ store, primary, fallbacks, reason: null });
  });

  updateStats();
  renderStoreList(($("storeSearch") && $("storeSearch").value) || "");
  renderAssignedList();
  if (typeof renderTrackingList === "function") renderTrackingList();
  renderMarkers();
  refreshMerchIfNeeded();
  populateBulkBrandSelect();

  if (resultsEl) {
    resultsEl.innerHTML =
      `<div class="summary" style="margin-bottom:8px"><strong>${assigned}</strong> ${brand} projects assigned (nearest + scope)</div>` +
      report
        .map((r) => {
          if (!r.primary) {
            return `<div class="list-item"><div class="name">${r.store.fullName}</div>
              <div class="meta">${r.store.projectCode}</div>
              <span class="tag fallback">${r.reason}</span></div>`;
          }
          const fb =
            r.fallbacks.length
              ? `<div class="meta">Fallbacks: ${r.fallbacks
                  .map((f) => `${f.name} ${f.driveMin}m${f.scopeMatch ? "" : " (no scope)"}`)
                  .join("; ")}</div>`
              : `<div class="meta">No fallbacks in range</div>`;
          return `<div class="list-item">
            <div class="name">${r.store.fullName}</div>
            <div class="meta">${r.store.projectCode} · ${r.store.city}</div>
            <span class="tag assigned">★ ${r.primary.name} ${r.primary.driveMin} min</span>
            ${r.primary.scopeMatch ? '<span class="tag assigned">Scope ✓</span>' : '<span class="tag fallback">No scope</span>'}
            ${fb}
          </div>`;
        })
        .join("");
  }
}
