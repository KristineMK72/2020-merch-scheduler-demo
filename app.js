// 2020 Companies · Merch Scheduler Demo (Supervisor view)
// Matches Self Schedule concepts: store codes, project codes, brand scopes, hours, availability
// Drive time = Haversine × 40 mph (demo approximation; prod would use routing + Salesforce data)

const AVG_SPEED_MPH = 40;
const EARTH_RADIUS_MI = 3958.8;

function haversineMiles(lat1, lon1, lat2, lon2) {
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_MI * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function driveMinutes(lat1, lon1, lat2, lon2) {
  const miles = haversineMiles(lat1, lon1, lat2, lon2);
  return Math.round((miles / AVG_SPEED_MPH) * 60);
}

const state = {
  people: structuredClone(window.DEMO_DATA.PEOPLE),
  stores: structuredClone(window.DEMO_DATA.STORES),
  selectedStoreId: null,
  candidates: [],
  assignments: [],
  map: null,
  markers: { people: {}, stores: {} },
  routeLines: []
};

const $ = id => document.getElementById(id);

function initMap() {
  state.map = L.map("map", {
    center: [46.4, -94.5],
    zoom: 8,
    zoomControl: true
  });

  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    attribution: "&copy; OpenStreetMap &copy; CARTO",
    subdomains: "abcd",
    maxZoom: 19
  }).addTo(state.map);

  renderMarkers();
}

function createIcon(type, label = "") {
  const cls = {
    person: "marker-person",
    store: "marker-store",
    assigned: "marker-assigned",
    selected: "marker-selected"
  }[type] || "marker-store";

  return L.divIcon({
    className: "",
    html: `<div class="marker-icon ${cls}">${label}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14]
  });
}

function renderMarkers() {
  Object.values(state.markers.people).forEach(m => state.map.removeLayer(m));
  Object.values(state.markers.stores).forEach(m => state.map.removeLayer(m));
  state.markers.people = {};
  state.markers.stores = {};
  clearRoutes();

  state.people.forEach(p => {
    const isAssigned = p.status === "assigned";
    const icon = createIcon(isAssigned ? "assigned" : "person", isAssigned ? "✓" : "");
    const marker = L.marker([p.lat, p.lng], { icon })
      .addTo(state.map)
      .bindPopup(`
        <strong>${p.name}</strong>
        <div>Status: <b>${p.status}</b></div>
        <div>Scopes: ${p.scopes.join(", ")}</div>
        <div>★ ${p.rating} · ${p.jobsCompleted} jobs · ${p.market}</div>
        <div>${p.phone}</div>
      `);
    state.markers.people[p.id] = marker;
  });

  state.stores.forEach(s => {
    const isSelected = s.id === state.selectedStoreId;
    const icon = createIcon(isSelected ? "selected" : "store", isSelected ? "★" : "");
    const marker = L.marker([s.lat, s.lng], { icon })
      .addTo(state.map)
      .bindPopup(`
        <strong>${s.fullName}</strong>
        <div>${s.projectCode}</div>
        <div>${s.address}, ${s.city}</div>
        <div>Brand: ${s.brand} · Typical ${s.typicalHours}h</div>
        <div style="margin-top:6px"><em>Select to assign people</em></div>
      `);
    marker.on("click", () => selectStore(s.id));
    state.markers.stores[s.id] = marker;
  });
}

function clearRoutes() {
  state.routeLines.forEach(l => state.map.removeLayer(l));
  state.routeLines = [];
}

function drawRoutes(store, people) {
  clearRoutes();
  const needed = getPeopleNeeded();
  people.forEach((p, idx) => {
    const color = idx < needed ? "#3b82f6" : "#f59e0b";
    const line = L.polyline(
      [[p.lat, p.lng], [store.lat, store.lng]],
      { color, weight: 2.5, opacity: 0.75, dashArray: idx < needed ? null : "6 4" }
    ).addTo(state.map);
    state.routeLines.push(line);
  });
}

function renderStoreList(filter = "") {
  const list = $("storeList");
  const q = filter.toLowerCase();
  const filtered = state.stores.filter(s =>
    s.fullName.toLowerCase().includes(q) ||
    s.city.toLowerCase().includes(q) ||
    s.chain.toLowerCase().includes(q) ||
    s.projectCode.toLowerCase().includes(q) ||
    s.brand.toLowerCase().includes(q)
  );

  list.innerHTML = filtered.map(s => {
    const assigned = state.assignments.some(a => a.storeId === s.id);
    return `
      <div class="list-item ${s.id === state.selectedStoreId ? "active" : ""}" data-id="${s.id}">
        <div class="name">${s.fullName}</div>
        <div class="meta">${s.projectCode} · ${s.typicalHours}h</div>
        ${assigned ? '<span class="tag assigned">Assigned</span>' : `<span class="tag primary">${s.brand}</span>`}
      </div>
    `;
  }).join("");

  list.querySelectorAll(".list-item").forEach(el => {
    el.addEventListener("click", () => selectStore(el.dataset.id));
  });
}

function selectStore(storeId) {
  state.selectedStoreId = storeId;
  state.candidates = [];
  $("resultsPanel").style.display = "none";

  const store = state.stores.find(s => s.id === storeId);
  if (!store) return;

  $("assignmentPanel").style.display = "block";
  $("selectedStoreInfo").innerHTML = `
    <div class="name">${store.fullName}</div>
    <div class="meta">
      ${store.projectCode}<br>
      ${store.address}, ${store.city}<br>
      Brand / Scope: <strong>${store.brand}</strong> · Window: ${store.windowStart} → ${store.windowEnd}
    </div>
  `;
  $("projectHours").value = store.typicalHours;

  renderStoreList($("storeSearch").value);
  renderMarkers();
  state.map.flyTo([store.lat, store.lng], 10, { duration: 0.6 });
}

function getPeopleNeeded() {
  return Math.max(1, parseInt($("peopleNeeded").value, 10) || 1);
}
function getMaxDrive() {
  return Math.max(15, parseInt($("maxDrive").value, 10) || 60);
}
function getProjectHours() {
  return Math.max(0.5, parseFloat($("projectHours").value) || 1.5);
}

function findClosestPeople() {
  const store = state.stores.find(s => s.id === state.selectedStoreId);
  if (!store) return;

  const needed = getPeopleNeeded();
  const maxDrive = getMaxDrive();

  const ranked = state.people
    .filter(p => p.status === "available")
    .map(p => {
      const mins = driveMinutes(p.lat, p.lng, store.lat, store.lng);
      const scopeMatch = p.scopes.includes(store.brand);
      return {
        ...p,
        driveMin: mins,
        miles: +(haversineMiles(p.lat, p.lng, store.lat, store.lng)).toFixed(1),
        scopeMatch
      };
    })
    .filter(p => p.driveMin <= maxDrive)
    .sort((a, b) => {
      if (a.scopeMatch !== b.scopeMatch) return a.scopeMatch ? -1 : 1;
      return a.driveMin - b.driveMin;
    });

  state.candidates = ranked.slice(0, needed + 5);
  renderResults(store);
  drawRoutes(store, state.candidates);
}

function renderResults(store) {
  const needed = getPeopleNeeded();
  const projectH = getProjectHours();
  const primaries = state.candidates.slice(0, needed);
  const fallbacks = state.candidates.slice(needed);

  const totalDrive = primaries.reduce((sum, p) => sum + p.driveMin, 0);
  const personHours = (totalDrive / 60) + projectH * needed;

  $("assignmentSummary").innerHTML = `
    <div><strong>${primaries.length}</strong> primary + <strong>${fallbacks.length}</strong> fallback</div>
    <div>Brand scope: <strong>${store.brand}</strong></div>
    <div>Total one-way drive (primaries): <strong>${totalDrive} min</strong></div>
    <div>Project: <strong>${projectH}h</strong> each → Est. person-hours: <strong>${personHours.toFixed(1)}h</strong></div>
  `;

  $("peopleResults").innerHTML = state.candidates.map((p, idx) => {
    const role = idx < needed ? "Primary" : "Fallback";
    const tagCls = idx < needed ? "primary" : "fallback";
    const scopeTag = p.scopeMatch
      ? `<span class="tag assigned">Scope ✓</span>`
      : `<span class="tag fallback">No ${store.brand}</span>`;
    return `
      <div class="list-item">
        <div class="name">${p.name}</div>
        <div class="meta">
          ${p.driveMin} min · ${p.miles} mi · ★ ${p.rating} · ${p.market}
        </div>
        <span class="tag ${tagCls}">${role}</span> ${scopeTag}
      </div>
    `;
  }).join("") || '<div class="hint">No available people within max drive time who match filters.</div>';

  $("resultsPanel").style.display = "block";
}

function confirmAssignment() {
  const store = state.stores.find(s => s.id === state.selectedStoreId);
  if (!store || state.candidates.length === 0) return;

  const needed = getPeopleNeeded();
  const primaries = state.candidates.slice(0, needed);
  if (primaries.length === 0) return;

  primaries.forEach(p => {
    const person = state.people.find(x => x.id === p.id);
    if (person) person.status = "assigned";
  });

  const totalDrive = primaries.reduce((s, p) => s + p.driveMin, 0);

  state.assignments.push({
    storeId: store.id,
    storeName: store.fullName,
    projectCode: store.projectCode,
    brand: store.brand,
    personIds: primaries.map(p => p.id),
    personNames: primaries.map(p => p.name),
    projectHours: getProjectHours(),
    totalDriveMin: totalDrive,
    timestamp: new Date()
  });

  state.selectedStoreId = null;
  state.candidates = [];
  $("assignmentPanel").style.display = "none";
  $("resultsPanel").style.display = "none";
  clearRoutes();

  updateStats();
  renderStoreList($("storeSearch").value);
  renderAssignedList();
  renderMarkers();
}

function renderAssignedList() {
  const list = $("assignedList");
  if (state.assignments.length === 0) {
    list.innerHTML = '<div class="hint">No assignments yet — select a store to begin</div>';
    return;
  }
  list.innerHTML = state.assignments.slice().reverse().map(a => `
    <div class="list-item">
      <div class="name">${a.storeName}</div>
      <div class="meta">${a.projectCode}<br>${a.personNames.join(", ")} · ${a.totalDriveMin} min drive · ${a.projectHours}h</div>
      <span class="tag assigned">Scheduled</span>
    </div>
  `).join("");
}

function updateStats() {
  $("statPeople").textContent = state.people.length;
  $("statStores").textContent = state.stores.length;
  $("statAssigned").textContent = state.assignments.length;

  if (state.assignments.length > 0) {
    const avg = Math.round(
      state.assignments.reduce((s, a) => s + a.totalDriveMin / a.personIds.length, 0) / state.assignments.length
    );
    $("statDrive").textContent = avg;
  } else {
    $("statDrive").textContent = "—";
  }
}

function resetAll() {
  state.people.forEach(p => {
    const original = window.DEMO_DATA.PEOPLE.find(o => o.id === p.id);
    p.status = original ? original.status : "available";
  });
  state.assignments = [];
  state.selectedStoreId = null;
  state.candidates = [];
  $("assignmentPanel").style.display = "none";
  $("resultsPanel").style.display = "none";
  clearRoutes();
  updateStats();
  renderStoreList();
  renderAssignedList();
  renderMarkers();
}

document.addEventListener("DOMContentLoaded", () => {
  initMap();
  renderStoreList();
  renderAssignedList();
  updateStats();

  $("storeSearch").addEventListener("input", e => renderStoreList(e.target.value));
  $("findPeopleBtn").addEventListener("click", findClosestPeople);
  $("assignBtn").addEventListener("click", confirmAssignment);
  $("resetBtn").addEventListener("click", resetAll);
});
