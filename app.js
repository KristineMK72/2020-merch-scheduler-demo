// 2020 Companies · Merch Scheduler Demo (National USA)
// Auto-assign closest + TSP routes + tracking hooks

const AVG_SPEED_MPH = 40;
const EARTH_RADIUS_MI = 3958.8;

function haversineMiles(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_MI * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function driveMinutes(lat1, lon1, lat2, lon2) {
  return Math.round((haversineMiles(lat1, lon1, lat2, lon2) / AVG_SPEED_MPH) * 60);
}
function nearestNeighborRoute(home, stops) {
  if (!stops.length) return { ordered: [], totalMiles: 0, totalMin: 0 };
  const remaining = stops.map((s) => ({ ...s }));
  const ordered = [];
  let cur = { lat: home.lat, lng: home.lng };
  let totalMiles = 0;
  while (remaining.length) {
    let bestI = 0, bestD = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversineMiles(cur.lat, cur.lng, remaining[i].lat, remaining[i].lng);
      if (d < bestD) { bestD = d; bestI = i; }
    }
    const next = remaining.splice(bestI, 1)[0];
    totalMiles += bestD;
    ordered.push({ ...next, legMiles: +bestD.toFixed(1), legMin: Math.round((bestD / AVG_SPEED_MPH) * 60) });
    cur = { lat: next.lat, lng: next.lng };
  }
  return { ordered, totalMiles: +totalMiles.toFixed(1), totalMin: Math.round((totalMiles / AVG_SPEED_MPH) * 60) };
}

const TILES = {
  streets: { url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", attribution: "&copy; OpenStreetMap", label: "Streets" },
  light: { url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", attribution: "&copy; OSM &copy; CARTO", label: "Light" },
  dark: { url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", attribution: "&copy; OSM &copy; CARTO", label: "Dark" }
};

const state = {
  people: structuredClone(window.DEMO_DATA.PEOPLE),
  stores: structuredClone(window.DEMO_DATA.STORES),
  selectedStoreId: null, candidates: [], assignments: [],
  map: null, merchMap: null, tileLayer: null, merchTileLayer: null,
  mapStyle: "streets", markers: { people: {}, stores: {} }, merchMarkers: [], routeLines: [],
  currentView: "supervisor", selectedPersonId: null, weekOffset: 0,
  selectedDayIndex: new Date().getDay(), autoAssign: true
};

const $ = (id) => document.getElementById(id);

function createIcon(type, label = "") {
  const cls = { person: "marker-person", store: "marker-store", assigned: "marker-assigned", selected: "marker-selected" }[type] || "marker-store";
  return L.divIcon({ className: "", html: `<div class="marker-icon ${cls}">${label}</div>`, iconSize: [26, 26], iconAnchor: [13, 13], popupAnchor: [0, -12] });
}
function setTileLayer(map, currentLayer, styleKey) {
  if (currentLayer) map.removeLayer(currentLayer);
  const t = TILES[styleKey] || TILES.streets;
  return L.tileLayer(t.url, { attribution: t.attribution, maxZoom: 19, subdomains: "abcd" }).addTo(map);
}
function initSupervisorMap() {
  const el = $("map"); if (!el) return;
  el.style.height = "100%"; el.style.minHeight = "220px";
  state.map = L.map("map", { center: [39.5, -98.0], zoom: 4, zoomControl: true });
  state.tileLayer = setTileLayer(state.map, null, state.mapStyle);
  renderMarkers();
  setTimeout(() => state.map.invalidateSize(), 100);
  setTimeout(() => state.map.invalidateSize(), 400);
}
function initMerchMap() {
  if (state.merchMap) return;
  const el = $("merchMap"); if (!el) return;
  el.style.height = "100%"; el.style.minHeight = "180px";
  state.merchMap = L.map("merchMap", { center: [39.5, -98.0], zoom: 4, zoomControl: true });
  state.merchTileLayer = setTileLayer(state.merchMap, null, state.mapStyle);
  setTimeout(() => state.merchMap.invalidateSize(), 150);
}
function toggleMapStyle() {
  const order = ["streets", "light", "dark"];
  state.mapStyle = order[(order.indexOf(state.mapStyle) + 1) % order.length];
  $("mapStyleBtn").textContent = TILES[state.mapStyle].label;
  if (state.map) state.tileLayer = setTileLayer(state.map, state.tileLayer, state.mapStyle);
  if (state.merchMap) state.merchTileLayer = setTileLayer(state.merchMap, state.merchTileLayer, state.mapStyle);
}
function renderMarkers() {
  if (!state.map) return;
  Object.values(state.markers.people).forEach((m) => state.map.removeLayer(m));
  Object.values(state.markers.stores).forEach((m) => state.map.removeLayer(m));
  state.markers.people = {}; state.markers.stores = {}; clearRoutes();
  const showAllPeople = !state.selectedStoreId || state.map.getZoom() >= 6;
  state.people.forEach((p) => {
    if (!showAllPeople && state.selectedStoreId) {
      const store = state.stores.find((s) => s.id === state.selectedStoreId);
      if (store && haversineMiles(p.lat, p.lng, store.lat, store.lng) > 350) return;
    }
    const isAssigned = p.status === "assigned";
    const icon = createIcon(isAssigned ? "assigned" : "person", isAssigned ? "✓" : "");
    const plat = p.liveLat != null ? p.liveLat : p.lat;
    const plng = p.liveLng != null ? p.liveLng : p.lng;
    const marker = L.marker([plat, plng], { icon }).addTo(state.map).bindPopup(
      `<strong>${p.name}</strong><div>${p.market} · ${p.status}</div><div>Scopes: ${p.scopes.slice(0, 5).join(", ")}</div><div>★ ${p.rating} · ${p.jobsCompleted} jobs</div>`
    );
    state.markers.people[p.id] = marker;
  });
  state.stores.forEach((s) => {
    const isSelected = s.id === state.selectedStoreId;
    const icon = createIcon(isSelected ? "selected" : "store", isSelected ? "★" : "");
    const marker = L.marker([s.lat, s.lng], { icon }).addTo(state.map).bindPopup(
      `<strong>${s.fullName}</strong><div>${s.projectCode}</div><div>${s.city} · ${s.brand} · ${s.typicalHours}h</div>`
    );
    marker.on("click", () => selectStore(s.id));
    state.markers.stores[s.id] = marker;
  });
}
function clearRoutes() { state.routeLines.forEach((l) => state.map && state.map.removeLayer(l)); state.routeLines = []; }
function drawRoutes(store, people) {
  clearRoutes(); if (!state.map) return;
  const needed = getPeopleNeeded();
  people.forEach((p, idx) => {
    const color = idx < needed ? "#2563eb" : "#d97706";
    state.routeLines.push(L.polyline([[p.lat, p.lng], [store.lat, store.lng]], { color, weight: 2.5, opacity: 0.8, dashArray: idx < needed ? null : "6 4" }).addTo(state.map));
  });
}
function renderStoreList(filter = "") {
  const list = $("storeList"); if (!list) return;
  const q = filter.toLowerCase();
  const filtered = state.stores.filter((s) =>
    s.fullName.toLowerCase().includes(q) || s.city.toLowerCase().includes(q) || s.chain.toLowerCase().includes(q) ||
    s.projectCode.toLowerCase().includes(q) || s.brand.toLowerCase().includes(q) || (s.market && s.market.toLowerCase().includes(q))
  );
  const shown = filtered.slice(0, 80);
  list.innerHTML = shown.map((s) => {
    const assigned = state.assignments.some((a) => a.storeId === s.id);
    return `<div class="list-item ${s.id === state.selectedStoreId ? "active" : ""}" data-id="${s.id}">
      <div class="name">${s.fullName}</div><div class="meta">${s.projectCode} · ${s.typicalHours}h · ${s.city}</div>
      ${assigned ? '<span class="tag assigned">Assigned</span>' : `<span class="tag primary">${s.brand}</span>`}</div>`;
  }).join("") + (filtered.length > 80 ? `<div class="hint">${filtered.length - 80} more — refine search</div>` : "");
  list.querySelectorAll(".list-item").forEach((el) => el.addEventListener("click", () => selectStore(el.dataset.id)));
}
function rankCandidates(store) {
  const maxDrive = getMaxDrive();
  return state.people.filter((p) => p.status === "available").map((p) => {
    const mins = driveMinutes(p.lat, p.lng, store.lat, store.lng);
    return { ...p, driveMin: mins, miles: +haversineMiles(p.lat, p.lng, store.lat, store.lng).toFixed(1), scopeMatch: p.scopes.includes(store.brand) };
  }).filter((p) => p.driveMin <= maxDrive).sort((a, b) => {
    if (a.scopeMatch !== b.scopeMatch) return a.scopeMatch ? -1 : 1;
    return a.driveMin - b.driveMin;
  });
}
function selectStore(storeId) {
  state.selectedStoreId = storeId; state.candidates = [];
  $("resultsPanel").style.display = "none";
  const store = state.stores.find((s) => s.id === storeId); if (!store) return;
  $("assignmentPanel").style.display = "block";
  $("selectedStoreInfo").innerHTML = `<div class="name">${store.fullName}</div><div class="meta">${store.projectCode}<br>${store.address}, ${store.city}<br>Brand: <strong>${store.brand}</strong> · ${store.windowStart} → ${store.windowEnd}</div>`;
  $("projectHours").value = store.typicalHours;
  renderStoreList($("storeSearch").value); renderMarkers();
  if (state.map) state.map.flyTo([store.lat, store.lng], 8, { duration: 0.6 });
  if (state.autoAssign) findClosestPeople();
}
function getPeopleNeeded() { return Math.max(1, parseInt($("peopleNeeded").value, 10) || 1); }
function getMaxDrive() { return Math.max(15, parseInt($("maxDrive").value, 10) || 120); }
function getProjectHours() { return Math.max(0.5, parseFloat($("projectHours").value) || 1.5); }
function findClosestPeople() {
  const store = state.stores.find((s) => s.id === state.selectedStoreId); if (!store) return;
  const needed = getPeopleNeeded();
  state.candidates = rankCandidates(store).slice(0, needed + 6);
  renderResults(store); drawRoutes(store, state.candidates);
  if (state.map && state.candidates.length) {
    const bounds = [[store.lat, store.lng]];
    state.candidates.slice(0, needed + 2).forEach((p) => bounds.push([p.lat, p.lng]));
    try { state.map.fitBounds(bounds, { padding: [40, 40], maxZoom: 10 }); } catch (_) {}
  }
}
function renderResults(store) {
  const needed = getPeopleNeeded(); const projectH = getProjectHours();
  const primaries = state.candidates.slice(0, needed);
  const totalDrive = primaries.reduce((s, p) => s + p.driveMin, 0);
  $("assignmentSummary").innerHTML = `<div><strong>Auto-selected</strong> closest ${primaries.length}</div>
    <div>Brand: <strong>${store.brand}</strong> · ${store.city}</div>
    <div>Drive: <strong>${totalDrive} min</strong> · person-hours <strong>${(totalDrive / 60 + projectH * needed).toFixed(1)}h</strong></div>`;
  $("peopleResults").innerHTML = state.candidates.map((p, idx) => {
    const role = idx < needed ? (idx === 0 ? "Closest" : "Primary") : "Fallback";
    const tagCls = idx < needed ? "primary" : "fallback";
    const scopeTag = p.scopeMatch ? `<span class="tag assigned">Scope ✓</span>` : `<span class="tag fallback">No ${store.brand}</span>`;
    return `<div class="list-item"><div class="name">${idx === 0 && idx < needed ? "★ " : ""}${p.name}</div>
      <div class="meta">${p.driveMin} min · ${p.miles} mi · ${p.market}</div>
      <span class="tag ${tagCls}">${role}</span> ${scopeTag}</div>`;
  }).join("") || '<div class="hint">No available people within max drive.</div>';
  $("resultsPanel").style.display = "block";
}
function confirmAssignment() {
  const store = state.stores.find((s) => s.id === state.selectedStoreId);
  if (!store || !state.candidates.length) return;
  const needed = getPeopleNeeded();
  const primaries = state.candidates.slice(0, needed); if (!primaries.length) return;
  primaries.forEach((p) => { const person = state.people.find((x) => x.id === p.id); if (person) person.status = "assigned"; });
  const totalDrive = primaries.reduce((s, p) => s + p.driveMin, 0);
  const hours = getProjectHours();
  const startH = 8 + Math.floor(Math.random() * 6);
  const startM = [0, 15, 30, 45][Math.floor(Math.random() * 4)];
  const endTotal = startH * 60 + startM + hours * 60;
  state.assignments.push({
    storeId: store.id, storeName: store.fullName, projectCode: store.projectCode, brand: store.brand,
    personIds: primaries.map((p) => p.id), personNames: primaries.map((p) => p.name),
    projectHours: hours, totalDriveMin: totalDrive, dayIndex: state.selectedDayIndex,
    startTime: `${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")}`,
    endTime: `${String(Math.floor(endTotal / 60)).padStart(2, "0")}:${String(Math.round(endTotal % 60)).padStart(2, "0")}`,
    status: "Scheduled", trackStatus: "Scheduled", deliveredAt: null, lastPing: new Date().toISOString(),
    lat: store.lat, lng: store.lng, timestamp: new Date()
  });
  state.selectedStoreId = null; state.candidates = [];
  $("assignmentPanel").style.display = "none"; $("resultsPanel").style.display = "none";
  clearRoutes(); updateStats(); renderStoreList($("storeSearch").value);
  renderAssignedList(); if (typeof renderTrackingList === "function") renderTrackingList();
  renderMarkers(); refreshMerchIfNeeded();
}
function autoAssignAllVisible() {
  let assigned = 0;
  state.stores.filter((s) => !state.assignments.some((a) => a.storeId === s.id)).slice(0, 25).forEach((store) => {
    const ranked = rankCandidates(store); if (!ranked.length) return;
    const pick = ranked[0]; const person = state.people.find((x) => x.id === pick.id);
    if (!person || person.status !== "available") return;
    person.status = "assigned";
    state.assignments.push({
      storeId: store.id, storeName: store.fullName, projectCode: store.projectCode, brand: store.brand,
      personIds: [pick.id], personNames: [pick.name], projectHours: store.typicalHours,
      totalDriveMin: pick.driveMin, dayIndex: state.selectedDayIndex, startTime: "09:00", endTime: "11:00",
      status: "Scheduled", trackStatus: "Scheduled", deliveredAt: null, lastPing: new Date().toISOString(),
      lat: store.lat, lng: store.lng, timestamp: new Date()
    });
    assigned++;
  });
  updateStats(); renderStoreList($("storeSearch").value); renderAssignedList();
  if (typeof renderTrackingList === "function") renderTrackingList();
  renderMarkers(); refreshMerchIfNeeded();
  alert(`Auto-assigned closest person to ${assigned} stores (max 25 per run).`);
}
function renderAssignedList() {
  const list = $("assignedList"); if (!list) return;
  if (!state.assignments.length) { list.innerHTML = '<div class="hint">Select a store — closest auto-picked</div>'; return; }
  list.innerHTML = state.assignments.slice().reverse().slice(0, 30).map((a) =>
    `<div class="list-item"><div class="name">${a.storeName}</div>
     <div class="meta">${a.projectCode}<br>${a.personNames.join(", ")} · ${a.totalDriveMin} min · ${a.projectHours}h</div>
     <span class="tag assigned">${a.trackStatus || a.status || "Scheduled"}</span></div>`).join("");
}
function updateStats() {
  $("statPeople").textContent = state.people.length;
  $("statStores").textContent = state.stores.length;
  $("statAssigned").textContent = state.assignments.length;
  if (state.assignments.length) {
    $("statDrive").textContent = Math.round(state.assignments.reduce((s, a) => s + a.totalDriveMin / Math.max(1, a.personIds.length), 0) / state.assignments.length);
  } else $("statDrive").textContent = "—";
}
function resetAll() {
  state.people.forEach((p) => { const o = window.DEMO_DATA.PEOPLE.find((x) => x.id === p.id); p.status = o ? o.status : "available"; p.liveLat = null; p.liveLng = null; });
  state.assignments = []; state.selectedStoreId = null; state.candidates = [];
  $("assignmentPanel").style.display = "none"; $("resultsPanel").style.display = "none";
  clearRoutes(); updateStats(); renderStoreList(); renderAssignedList();
  if (typeof renderTrackingList === "function") renderTrackingList();
  renderMarkers(); refreshMerchIfNeeded();
}
function switchView(view) {
  state.currentView = view;
  document.querySelectorAll(".view-btn").forEach((b) => b.classList.toggle("active", b.dataset.view === view));
  $("supervisorView").style.display = view === "supervisor" ? "grid" : "none";
  $("merchView").style.display = view === "merch" ? "flex" : "none";
  if (view === "supervisor" && state.map) setTimeout(() => state.map.invalidateSize(), 80);
  if (view === "merch") { initMerchMap(); populatePersonPicker(); renderWeekBar(); renderMerchAssignments(); setTimeout(() => state.merchMap && state.merchMap.invalidateSize(), 100); }
}
function populatePersonPicker() {
  const sel = $("personPicker"); if (!sel) return;
  const current = sel.value;
  sel.innerHTML = '<option value="">— Choose merchandiser —</option>' +
    state.people.slice().sort((a, b) => a.name.localeCompare(b.name)).map((p) => `<option value="${p.id}">${p.name} (${p.market})</option>`).join("");
  if (current) sel.value = current;
}
function selectPerson(personId) {
  state.selectedPersonId = personId || null;
  const p = state.people.find((x) => x.id === personId);
  if (p) {
    $("merchName").textContent = p.name;
    $("merchMeta").textContent = `${p.market} · ${p.scopes.slice(0, 4).join(", ")}`;
    $("merchAvatar").textContent = p.name.split(" ").map((n) => n[0]).join("").slice(0, 2);
  } else { $("merchName").textContent = "Select a person"; $("merchMeta").textContent = "Choose a merchandiser"; $("merchAvatar").textContent = "?"; }
  renderWeekBar(); renderMerchAssignments();
}
function getWeekDates() {
  const today = new Date(); const start = new Date(today);
  start.setDate(today.getDate() - today.getDay() + state.weekOffset * 7);
  const days = []; for (let i = 0; i < 7; i++) { const d = new Date(start); d.setDate(start.getDate() + i); days.push(d); }
  return days;
}
function renderWeekBar() {
  const days = getWeekDates(); const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const container = $("weekDays"); if (!container) return;
  container.innerHTML = days.map((d, i) => {
    const count = state.selectedPersonId ? state.assignments.filter((a) => a.personIds.includes(state.selectedPersonId) && a.dayIndex === i).length : 0;
    return `<button type="button" class="day-chip ${i === state.selectedDayIndex ? "active" : ""}" data-day="${i}">${labels[i]}(${count})<span class="count">${d.getMonth() + 1}/${d.getDate()}</span></button>`;
  }).join("");
  container.querySelectorAll(".day-chip").forEach((el) => el.addEventListener("click", () => { state.selectedDayIndex = parseInt(el.dataset.day, 10); renderWeekBar(); renderMerchAssignments(); }));
}
function renderMerchAssignments() {
  const list = $("merchAssignments"); if (!list) return;
  if (!state.selectedPersonId) { list.innerHTML = '<div class="empty-state">Select a merchandiser to see optimized route</div>'; $("dayCount").textContent = "0"; clearMerchMarkers(); return; }
  let items = state.assignments.filter((a) => a.personIds.includes(state.selectedPersonId) && a.dayIndex === state.selectedDayIndex);
  if (!items.length && !state.assignments.length) {
    const person = state.people.find((p) => p.id === state.selectedPersonId);
    const nearby = state.stores.map((s) => ({ s, d: haversineMiles(person.lat, person.lng, s.lat, s.lng) })).filter((x) => x.d < 80).sort((a, b) => a.d - b.d).slice(0, 3);
    items = nearby.map((n, idx) => ({ storeId: n.s.id, storeName: n.s.fullName, projectCode: n.s.projectCode, brand: n.s.brand, projectHours: n.s.typicalHours, startTime: ["09:00", "11:00", "13:30"][idx], endTime: ["10:30", "12:00", "15:00"][idx], status: "Scheduled", trackStatus: "Scheduled", lat: n.s.lat, lng: n.s.lng, demo: true }));
  }
  const person = state.people.find((p) => p.id === state.selectedPersonId);
  const stops = items.map((a) => { const store = state.stores.find((s) => s.id === a.storeId); return { ...a, lat: a.lat || (store && store.lat), lng: a.lng || (store && store.lng) }; }).filter((s) => s.lat != null);
  const route = nearestNeighborRoute(person, stops);
  const ordered = route.ordered.length ? route.ordered : items;
  const labels = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const days = getWeekDates(); const d = days[state.selectedDayIndex];
  $("dayTitle").textContent = `Route – ${labels[state.selectedDayIndex]} ${d.getMonth() + 1}/${d.getDate()}`;
  $("dayCount").textContent = String(ordered.length);
  if (!ordered.length) { list.innerHTML = '<div class="empty-state">No stops this day</div>'; clearMerchMarkers(); return; }
  const routeSummary = route.ordered.length > 1 ? `<div class="summary" style="margin-bottom:10px"><strong>Optimized route</strong><br>${route.ordered.length} stops · ~${route.totalMiles} mi · ~${route.totalMin} min</div>` : "";
  list.innerHTML = routeSummary + ordered.map((a, i) => `
    <div class="merch-assignment"><div class="store-line">${route.ordered.length ? `${i + 1}. ` : ""}${a.storeName}</div>
      <div class="project-line">${a.projectCode}${a.legMin != null ? ` · leg ${a.legMin} min` : ""}</div>
      <div class="times"><span>Start ${a.startTime || "—"}</span><span>End ${a.endTime || "—"}</span><span>${a.projectHours}h</span></div>
      <div class="status">✓ ${a.trackStatus || a.status || "Scheduled"}${a.deliveredAt ? " · Delivered" : ""}</div></div>`).join("");
  updateMerchMap(ordered, person, route);
}
function clearMerchMarkers() { if (!state.merchMap) return; state.merchMarkers.forEach((m) => state.merchMap.removeLayer(m)); state.merchMarkers = []; }
function updateMerchMap(items, person, route) {
  if (!state.merchMap || !person) return; clearMerchMarkers();
  state.merchMarkers.push(L.marker([person.lat, person.lng], { icon: createIcon("person", "H") }).addTo(state.merchMap).bindPopup(`<strong>${person.name}</strong><br>Home`));
  const bounds = [[person.lat, person.lng]]; let prev = { lat: person.lat, lng: person.lng };
  items.forEach((a, i) => {
    if (a.lat == null) return;
    state.merchMarkers.push(L.marker([a.lat, a.lng], { icon: createIcon("store", String(i + 1)) }).addTo(state.merchMap).bindPopup(`<strong>${i + 1}. ${a.storeName}</strong>`));
    bounds.push([a.lat, a.lng]);
    state.merchMarkers.push(L.polyline([[prev.lat, prev.lng], [a.lat, a.lng]], { color: "#2563eb", weight: 3, opacity: 0.75 }).addTo(state.merchMap));
    prev = { lat: a.lat, lng: a.lng };
  });
  if (bounds.length > 1) state.merchMap.fitBounds(bounds, { padding: [30, 30], maxZoom: 11 });
  else state.merchMap.setView([person.lat, person.lng], 9);
}
function refreshMerchIfNeeded() { if (state.currentView === "merch") { renderWeekBar(); renderMerchAssignments(); } }

document.addEventListener("DOMContentLoaded", () => {
  initSupervisorMap(); renderStoreList(); renderAssignedList(); updateStats();
  if (typeof renderTrackingList === "function") renderTrackingList();
  const sidebar = document.querySelector(".sidebar");
  if (sidebar && !$("autoAllBtn")) {
    const wrap = document.createElement("section"); wrap.className = "panel";
    wrap.innerHTML = '<h2>Bulk Auto-Assign</h2><p class="hint">Closest available person for up to 25 open stores.</p>';
    const btn = document.createElement("button"); btn.id = "autoAllBtn"; btn.className = "btn secondary full"; btn.textContent = "Auto-assign closest to many stores";
    btn.addEventListener("click", autoAssignAllVisible); wrap.appendChild(btn); sidebar.appendChild(wrap);
  }
  $("storeSearch").addEventListener("input", (e) => renderStoreList(e.target.value));
  $("findPeopleBtn").addEventListener("click", findClosestPeople);
  $("assignBtn").addEventListener("click", confirmAssignment);
  $("resetBtn").addEventListener("click", resetAll);
  $("mapStyleBtn").addEventListener("click", toggleMapStyle);
  if ($("simTrackBtn") && typeof simulateAdvanceAll === "function") $("simTrackBtn").addEventListener("click", simulateAdvanceAll);
  document.querySelectorAll(".view-btn").forEach((btn) => btn.addEventListener("click", () => switchView(btn.dataset.view)));
  $("personPicker").addEventListener("change", (e) => selectPerson(e.target.value));
  $("weekPrev").addEventListener("click", () => { state.weekOffset--; renderWeekBar(); renderMerchAssignments(); });
  $("weekNext").addEventListener("click", () => { state.weekOffset++; renderWeekBar(); renderMerchAssignments(); });
  if ($("maxDrive")) $("maxDrive").value = 120;
  window.addEventListener("resize", () => { if (state.map) state.map.invalidateSize(); if (state.merchMap) state.merchMap.invalidateSize(); });
  window.addEventListener("orientationchange", () => { setTimeout(() => { if (state.map) state.map.invalidateSize(); if (state.merchMap) state.merchMap.invalidateSize(); }, 200); });
  state.map && state.map.on("zoomend", () => { if (state.selectedStoreId) renderMarkers(); });
});
