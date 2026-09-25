// 2020 Companies · Merch Scheduler Demo
// Supervisor map + My Schedule (merchandiser) views
// Light streets map by default; toggle to dark

const AVG_SPEED_MPH = 40;
const EARTH_RADIUS_MI = 3958.8;

function haversineMiles(lat1, lon1, lat2, lon2) {
  const toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_MI * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function driveMinutes(lat1, lon1, lat2, lon2) {
  return Math.round((haversineMiles(lat1, lon1, lat2, lon2) / AVG_SPEED_MPH) * 60);
}

const TILES = {
  streets: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap",
    label: "Streets"
  },
  light: {
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution: "&copy; OSM &copy; CARTO",
    label: "Light"
  },
  dark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: "&copy; OSM &copy; CARTO",
    label: "Dark"
  }
};

const state = {
  people: structuredClone(window.DEMO_DATA.PEOPLE),
  stores: structuredClone(window.DEMO_DATA.STORES),
  selectedStoreId: null,
  candidates: [],
  assignments: [],
  map: null,
  merchMap: null,
  tileLayer: null,
  merchTileLayer: null,
  mapStyle: "streets",
  markers: { people: {}, stores: {} },
  merchMarkers: [],
  routeLines: [],
  currentView: "supervisor",
  selectedPersonId: null,
  weekOffset: 0,
  selectedDayIndex: new Date().getDay()
};

const $ = (id) => document.getElementById(id);

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
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -12]
  });
}

function setTileLayer(map, currentLayer, styleKey) {
  if (currentLayer) map.removeLayer(currentLayer);
  const t = TILES[styleKey] || TILES.streets;
  const layer = L.tileLayer(t.url, {
    attribution: t.attribution,
    maxZoom: 19,
    subdomains: "abcd"
  }).addTo(map);
  return layer;
}

function initSupervisorMap() {
  const el = $("map");
  if (!el) return;
  el.style.height = "100%";
  el.style.minHeight = "220px";

  state.map = L.map("map", {
    center: [46.4, -94.5],
    zoom: 8,
    zoomControl: true
  });

  state.tileLayer = setTileLayer(state.map, null, state.mapStyle);
  renderMarkers();

  setTimeout(() => { state.map.invalidateSize(); }, 100);
  setTimeout(() => state.map.invalidateSize(), 400);
}

function initMerchMap() {
  if (state.merchMap) return;
  const el = $("merchMap");
  if (!el) return;
  el.style.height = "100%";
  el.style.minHeight = "180px";

  state.merchMap = L.map("merchMap", {
    center: [46.4, -94.5],
    zoom: 8,
    zoomControl: true
  });
  state.merchTileLayer = setTileLayer(state.merchMap, null, state.mapStyle);
  setTimeout(() => state.merchMap.invalidateSize(), 150);
}

function toggleMapStyle() {
  const order = ["streets", "light", "dark"];
  const idx = order.indexOf(state.mapStyle);
  state.mapStyle = order[(idx + 1) % order.length];
  $("mapStyleBtn").textContent = TILES[state.mapStyle].label;

  if (state.map) {
    state.tileLayer = setTileLayer(state.map, state.tileLayer, state.mapStyle);
  }
  if (state.merchMap) {
    state.merchTileLayer = setTileLayer(state.merchMap, state.merchTileLayer, state.mapStyle);
  }
}

function renderMarkers() {
  if (!state.map) return;
  Object.values(state.markers.people).forEach((m) => state.map.removeLayer(m));
  Object.values(state.markers.stores).forEach((m) => state.map.removeLayer(m));
  state.markers.people = {};
  state.markers.stores = {};
  clearRoutes();

  state.people.forEach((p) => {
    const isAssigned = p.status === "assigned";
    const icon = createIcon(isAssigned ? "assigned" : "person", isAssigned ? "✓" : "");
    const marker = L.marker([p.lat, p.lng], { icon })
      .addTo(state.map)
      .bindPopup(
        `<strong>${p.name}</strong>
        <div>Status: <b>${p.status}</b></div>
        <div>Scopes: ${p.scopes.join(", ")}</div>
        <div>★ ${p.rating} · ${p.jobsCompleted} jobs · ${p.market}</div>`
      );
    state.markers.people[p.id] = marker;
  });

  state.stores.forEach((s) => {
    const isSelected = s.id === state.selectedStoreId;
    const icon = createIcon(isSelected ? "selected" : "store", isSelected ? "★" : "");
    const marker = L.marker([s.lat, s.lng], { icon })
      .addTo(state.map)
      .bindPopup(
        `<strong>${s.fullName}</strong>
        <div>${s.projectCode}</div>
        <div>${s.address}, ${s.city}</div>
        <div>Brand: ${s.brand} · ${s.typicalHours}h</div>`
      );
    marker.on("click", () => selectStore(s.id));
    state.markers.stores[s.id] = marker;
  });
}

function clearRoutes() {
  state.routeLines.forEach((l) => state.map && state.map.removeLayer(l));
  state.routeLines = [];
}

function drawRoutes(store, people) {
  clearRoutes();
  if (!state.map) return;
  const needed = getPeopleNeeded();
  people.forEach((p, idx) => {
    const color = idx < needed ? "#2563eb" : "#d97706";
    const line = L.polyline(
      [[p.lat, p.lng], [store.lat, store.lng]],
      { color, weight: 2.5, opacity: 0.8, dashArray: idx < needed ? null : "6 4" }
    ).addTo(state.map);
    state.routeLines.push(line);
  });
}

function renderStoreList(filter = "") {
  const list = $("storeList");
  if (!list) return;
  const q = filter.toLowerCase();
  const filtered = state.stores.filter(
    (s) =>
      s.fullName.toLowerCase().includes(q) ||
      s.city.toLowerCase().includes(q) ||
      s.chain.toLowerCase().includes(q) ||
      s.projectCode.toLowerCase().includes(q) ||
      s.brand.toLowerCase().includes(q)
  );

  list.innerHTML = filtered
    .map((s) => {
      const assigned = state.assignments.some((a) => a.storeId === s.id);
      return `
      <div class="list-item ${s.id === state.selectedStoreId ? "active" : ""}" data-id="${s.id}">
        <div class="name">${s.fullName}</div>
        <div class="meta">${s.projectCode} · ${s.typicalHours}h</div>
        ${assigned ? '<span class="tag assigned">Assigned</span>' : `<span class="tag primary">${s.brand}</span>`}
      </div>`;
    })
    .join("");

  list.querySelectorAll(".list-item").forEach((el) => {
    el.addEventListener("click", () => selectStore(el.dataset.id));
  });
}

function selectStore(storeId) {
  state.selectedStoreId = storeId;
  state.candidates = [];
  $("resultsPanel").style.display = "none";

  const store = state.stores.find((s) => s.id === storeId);
  if (!store) return;

  $("assignmentPanel").style.display = "block";
  $("selectedStoreInfo").innerHTML = `
    <div class="name">${store.fullName}</div>
    <div class="meta">
      ${store.projectCode}<br>
      ${store.address}, ${store.city}<br>
      Brand: <strong>${store.brand}</strong> · ${store.windowStart} → ${store.windowEnd}
    </div>`;
  $("projectHours").value = store.typicalHours;

  renderStoreList($("storeSearch").value);
  renderMarkers();
  if (state.map) state.map.flyTo([store.lat, store.lng], 10, { duration: 0.5 });
}

function getPeopleNeeded() {
  return Math.max(1, parseInt($("peopleNeeded").value, 10) || 1);
}
function getMaxDrive() {
  return Math.max(15, parseInt($("maxDrive").value, 10) || 75);
}
function getProjectHours() {
  return Math.max(0.5, parseFloat($("projectHours").value) || 1.5);
}

function findClosestPeople() {
  const store = state.stores.find((s) => s.id === state.selectedStoreId);
  if (!store) return;
  const needed = getPeopleNeeded();
  const maxDrive = getMaxDrive();

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

  state.candidates = ranked.slice(0, needed + 5);
  renderResults(store);
  drawRoutes(store, state.candidates);
}

function renderResults(store) {
  const needed = getPeopleNeeded();
  const projectH = getProjectHours();
  const primaries = state.candidates.slice(0, needed);
  const fallbacks = state.candidates.slice(needed);
  const totalDrive = primaries.reduce((s, p) => s + p.driveMin, 0);
  const personHours = totalDrive / 60 + projectH * needed;

  $("assignmentSummary").innerHTML = `
    <div><strong>${primaries.length}</strong> primary + <strong>${fallbacks.length}</strong> fallback</div>
    <div>Brand: <strong>${store.brand}</strong></div>
    <div>Drive (primaries): <strong>${totalDrive} min</strong></div>
    <div>Est. person-hours: <strong>${personHours.toFixed(1)}h</strong></div>`;

  $("peopleResults").innerHTML =
    state.candidates
      .map((p, idx) => {
        const role = idx < needed ? "Primary" : "Fallback";
        const tagCls = idx < needed ? "primary" : "fallback";
        const scopeTag = p.scopeMatch
          ? `<span class="tag assigned">Scope ✓</span>`
          : `<span class="tag fallback">No ${store.brand}</span>`;
        return `
        <div class="list-item">
          <div class="name">${p.name}</div>
          <div class="meta">${p.driveMin} min · ${p.miles} mi · ★ ${p.rating} · ${p.market}</div>
          <span class="tag ${tagCls}">${role}</span> ${scopeTag}
        </div>`;
      })
      .join("") || '<div class="hint">No available people within max drive time.</div>';

  $("resultsPanel").style.display = "block";
}

function confirmAssignment() {
  const store = state.stores.find((s) => s.id === state.selectedStoreId);
  if (!store || !state.candidates.length) return;
  const needed = getPeopleNeeded();
  const primaries = state.candidates.slice(0, needed);
  if (!primaries.length) return;

  primaries.forEach((p) => {
    const person = state.people.find((x) => x.id === p.id);
    if (person) person.status = "assigned";
  });

  const totalDrive = primaries.reduce((s, p) => s + p.driveMin, 0);
  const hours = getProjectHours();
  const startH = 9 + Math.floor(Math.random() * 5);
  const startM = [0, 15, 30, 45][Math.floor(Math.random() * 4)];
  const endTotal = startH * 60 + startM + hours * 60;
  const endH = Math.floor(endTotal / 60);
  const endM = Math.round(endTotal % 60);

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
    endTime: `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`,
    status: "Scheduled",
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
  refreshMerchIfNeeded();
}

function renderAssignedList() {
  const list = $("assignedList");
  if (!list) return;
  if (!state.assignments.length) {
    list.innerHTML = '<div class="hint">No assignments yet</div>';
    return;
  }
  list.innerHTML = state.assignments
    .slice()
    .reverse()
    .map(
      (a) => `
    <div class="list-item">
      <div class="name">${a.storeName}</div>
      <div class="meta">${a.projectCode}<br>${a.personNames.join(", ")} · ${a.totalDriveMin} min · ${a.projectHours}h</div>
      <span class="tag assigned">Scheduled</span>
    </div>`
    )
    .join("");
}

function updateStats() {
  $("statPeople").textContent = state.people.length;
  $("statStores").textContent = state.stores.length;
  $("statAssigned").textContent = state.assignments.length;
  if (state.assignments.length) {
    const avg = Math.round(
      state.assignments.reduce((s, a) => s + a.totalDriveMin / a.personIds.length, 0) /
        state.assignments.length
    );
    $("statDrive").textContent = avg;
  } else {
    $("statDrive").textContent = "—";
  }
}

function resetAll() {
  state.people.forEach((p) => {
    const o = window.DEMO_DATA.PEOPLE.find((x) => x.id === p.id);
    p.status = o ? o.status : "available";
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
  refreshMerchIfNeeded();
}

function switchView(view) {
  state.currentView = view;
  document.querySelectorAll(".view-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.view === view);
  });
  $("supervisorView").style.display = view === "supervisor" ? "grid" : "none";
  $("merchView").style.display = view === "merch" ? "flex" : "none";

  if (view === "supervisor" && state.map) {
    setTimeout(() => state.map.invalidateSize(), 80);
  }
  if (view === "merch") {
    initMerchMap();
    populatePersonPicker();
    renderWeekBar();
    renderMerchAssignments();
    setTimeout(() => state.merchMap && state.merchMap.invalidateSize(), 100);
  }
}

function populatePersonPicker() {
  const sel = $("personPicker");
  if (!sel) return;
  const current = sel.value;
  sel.innerHTML =
    '<option value="">— Choose merchandiser —</option>' +
    state.people
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((p) => `<option value="${p.id}">${p.name} (${p.market})</option>`)
      .join("");
  if (current) sel.value = current;
}

function selectPerson(personId) {
  state.selectedPersonId = personId || null;
  const p = state.people.find((x) => x.id === personId);
  if (p) {
    $("merchName").textContent = p.name;
    $("merchMeta").textContent = `${p.market} · Scopes: ${p.scopes.slice(0, 4).join(", ")}`;
    $("merchAvatar").textContent = p.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2);
  } else {
    $("merchName").textContent = "Select a person";
    $("merchMeta").textContent = "Choose a merchandiser below";
    $("merchAvatar").textContent = "?";
  }
  renderWeekBar();
  renderMerchAssignments();
}

function getWeekDates() {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - today.getDay() + state.weekOffset * 7);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return days;
}

function renderWeekBar() {
  const days = getWeekDates();
  const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const container = $("weekDays");
  if (!container) return;

  container.innerHTML = days
    .map((d, i) => {
      const count = state.selectedPersonId
        ? state.assignments.filter(
            (a) => a.personIds.includes(state.selectedPersonId) && a.dayIndex === i
          ).length
        : 0;
      return `
      <button type="button" class="day-chip ${i === state.selectedDayIndex ? "active" : ""}" data-day="${i}">
        ${labels[i]}(${count})
        <span class="count">${d.getMonth() + 1}/${d.getDate()}</span>
      </button>`;
    })
    .join("");

  container.querySelectorAll(".day-chip").forEach((el) => {
    el.addEventListener("click", () => {
      state.selectedDayIndex = parseInt(el.dataset.day, 10);
      renderWeekBar();
      renderMerchAssignments();
    });
  });
}

function renderMerchAssignments() {
  const list = $("merchAssignments");
  if (!list) return;

  if (!state.selectedPersonId) {
    list.innerHTML = '<div class="empty-state">Select a merchandiser to see their schedule</div>';
    $("dayCount").textContent = "0";
    clearMerchMarkers();
    return;
  }

  let items = state.assignments.filter(
    (a) => a.personIds.includes(state.selectedPersonId) && a.dayIndex === state.selectedDayIndex
  );

  if (items.length === 0 && state.assignments.length === 0) {
    const person = state.people.find((p) => p.id === state.selectedPersonId);
    const nearby = state.stores
      .map((s) => ({
        s,
        d: haversineMiles(person.lat, person.lng, s.lat, s.lng)
      }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 2);
    items = nearby.map((n, idx) => ({
      storeId: n.s.id,
      storeName: n.s.fullName,
      projectCode: n.s.projectCode,
      brand: n.s.brand,
      projectHours: n.s.typicalHours,
      startTime: idx === 0 ? "09:00" : "11:30",
      endTime: idx === 0 ? "11:00" : "12:30",
      status: "Scheduled",
      demo: true
    }));
  }

  const labels = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const days = getWeekDates();
  const d = days[state.selectedDayIndex];
  $("dayTitle").textContent = `Assignments – ${labels[state.selectedDayIndex]}, ${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
  $("dayCount").textContent = String(items.length);

  if (!items.length) {
    list.innerHTML = '<div class="empty-state">No assignments this day</div>';
    clearMerchMarkers();
    return;
  }

  list.innerHTML = items
    .map(
      (a) => `
    <div class="merch-assignment">
      <div class="store-line">${a.storeName}</div>
      <div class="project-line">${a.projectCode}</div>
      <div class="times">
        <span>Start ${a.startTime || "—"}</span>
        <span>End ${a.endTime || "—"}</span>
        <span>${a.projectHours}h</span>
      </div>
      <div class="status">✓ ${a.status || "Scheduled"}</div>
    </div>`
    )
    .join("");

  updateMerchMap(items);
}

function clearMerchMarkers() {
  if (!state.merchMap) return;
  state.merchMarkers.forEach((m) => state.merchMap.removeLayer(m));
  state.merchMarkers = [];
}

function updateMerchMap(items) {
  if (!state.merchMap) return;
  clearMerchMarkers();
  const person = state.people.find((p) => p.id === state.selectedPersonId);
  if (!person) return;

  const home = L.marker([person.lat, person.lng], {
    icon: createIcon("person", "H")
  })
    .addTo(state.merchMap)
    .bindPopup(`<strong>${person.name}</strong><br>Home`);
  state.merchMarkers.push(home);

  const bounds = [[person.lat, person.lng]];
  items.forEach((a) => {
    const store = state.stores.find((s) => s.id === a.storeId);
    if (!store) return;
    const m = L.marker([store.lat, store.lng], {
      icon: createIcon("store", "S")
    })
      .addTo(state.merchMap)
      .bindPopup(`<strong>${store.fullName}</strong><br>${a.projectCode}`);
    state.merchMarkers.push(m);
    bounds.push([store.lat, store.lng]);
    const line = L.polyline(
      [[person.lat, person.lng], [store.lat, store.lng]],
      { color: "#2563eb", weight: 2, opacity: 0.7 }
    ).addTo(state.merchMap);
    state.merchMarkers.push(line);
  });

  if (bounds.length > 1) {
    state.merchMap.fitBounds(bounds, { padding: [30, 30], maxZoom: 11 });
  } else {
    state.merchMap.setView([person.lat, person.lng], 10);
  }
}

function refreshMerchIfNeeded() {
  if (state.currentView === "merch") {
    renderWeekBar();
    renderMerchAssignments();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initSupervisorMap();
  renderStoreList();
  renderAssignedList();
  updateStats();

  $("storeSearch").addEventListener("input", (e) => renderStoreList(e.target.value));
  $("findPeopleBtn").addEventListener("click", findClosestPeople);
  $("assignBtn").addEventListener("click", confirmAssignment);
  $("resetBtn").addEventListener("click", resetAll);
  $("mapStyleBtn").addEventListener("click", toggleMapStyle);

  document.querySelectorAll(".view-btn").forEach((btn) => {
    btn.addEventListener("click", () => switchView(btn.dataset.view));
  });

  $("personPicker").addEventListener("change", (e) => selectPerson(e.target.value));
  $("weekPrev").addEventListener("click", () => {
    state.weekOffset--;
    renderWeekBar();
    renderMerchAssignments();
  });
  $("weekNext").addEventListener("click", () => {
    state.weekOffset++;
    renderWeekBar();
    renderMerchAssignments();
  });

  window.addEventListener("resize", () => {
    if (state.map) state.map.invalidateSize();
    if (state.merchMap) state.merchMap.invalidateSize();
  });
  window.addEventListener("orientationchange", () => {
    setTimeout(() => {
      if (state.map) state.map.invalidateSize();
      if (state.merchMap) state.merchMap.invalidateSize();
    }, 200);
  });
});
