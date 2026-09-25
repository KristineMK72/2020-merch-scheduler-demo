// Realistic sample data inspired by 2020 Companies Self Schedule screenshots
// Locations: Minnesota / North Dakota market (Baxter, Fargo)
// Includes store codes, project codes, brands/scopes of work, availability

const FIRST_NAMES = [
  "James","Maria","Robert","Jennifer","Michael","Linda","William","Elizabeth",
  "David","Barbara","Richard","Susan","Joseph","Jessica","Thomas","Sarah",
  "Christopher","Karen","Charles","Nancy","Daniel","Lisa","Matthew","Betty",
  "Anthony","Margaret","Mark","Sandra","Donald","Ashley","Steven","Kimberly",
  "Paul","Emily","Andrew","Donna","Joshua","Michelle","Kenneth","Dorothy",
  "Kevin","Carol","Brian","Amanda","George","Melissa","Timothy","Deborah",
  "Ronald","Stephanie","Edward","Rebecca","Jason","Sharon","Jeffrey","Laura",
  "Ryan","Cynthia","Jacob","Kathleen","Gary","Amy","Nicholas","Angela",
  "Eric","Shirley","Jonathan","Anna","Stephen","Brenda","Larry","Pamela",
  "Justin","Emma","Scott","Nicole","Brandon","Helen","Benjamin","Samantha"
];

const LAST_NAMES = [
  "Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis",
  "Rodriguez","Martinez","Hernandez","Lopez","Gonzalez","Wilson","Anderson",
  "Thomas","Taylor","Moore","Jackson","Martin","Lee","Perez","Thompson",
  "White","Harris","Sanchez","Clark","Ramirez","Lewis","Robinson","Walker",
  "Young","Allen","King","Wright","Scott","Torres","Nguyen","Hill","Flores",
  "Green","Adams","Nelson","Baker","Hall","Rivera","Campbell","Mitchell",
  "Carter","Roberts","Kahler","Olson","Peterson","Anderson","Larson","Hansen"
];

const BRANDS = ["LG", "Dyson", "Midea", "HP", "Dell", "Samsung", "Sony", "Bose", "KitchenAid", "Whirlpool", "GE", "Frigidaire"];

function seededRandom(seed) {
  let s = seed;
  return function() {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}
const rand = seededRandom(42);

function pick(arr) { return arr[Math.floor(rand() * arr.length)]; }
function jitter(base, range) { return base + (rand() - 0.5) * range * 2; }

function generatePeople(count = 65) {
  const people = [];
  const used = new Set();
  const centers = [
    { lat: 46.34, lng: -94.28, label: "Baxter/Brainerd" },
    { lat: 46.88, lng: -96.79, label: "Fargo" },
    { lat: 45.56, lng: -94.16, label: "St Cloud" },
    { lat: 46.78, lng: -92.10, label: "Duluth" },
    { lat: 44.98, lng: -93.27, label: "Minneapolis" }
  ];

  for (let i = 0; i < count; i++) {
    let name;
    do {
      name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
    } while (used.has(name));
    used.add(name);

    const center = centers[i % centers.length];
    const lat = jitter(center.lat, 0.35);
    const lng = jitter(center.lng, 0.45);

    const numScopes = 2 + Math.floor(rand() * 4);
    const scopes = [];
    const brandCopy = [...BRANDS];
    for (let s = 0; s < numScopes && brandCopy.length; s++) {
      const idx = Math.floor(rand() * brandCopy.length);
      scopes.push(brandCopy.splice(idx, 1)[0]);
    }

    const status = rand() < 0.22 ? "assigned" : "available";

    people.push({
      id: `P${String(i + 1).padStart(3, "0")}`,
      name,
      lat,
      lng,
      status,
      scopes,
      rating: +(3.6 + rand() * 1.4).toFixed(1),
      jobsCompleted: Math.floor(15 + rand() * 220),
      phone: `(${218 + Math.floor(rand() * 4)}) ${Math.floor(100 + rand() * 900)}-${Math.floor(1000 + rand() * 9000)}`,
      market: center.label
    });
  }
  return people;
}

const STORE_TEMPLATES = [
  { code: "SS BBY", chain: "Best Buy", type: "Electronics" },
  { code: "SS COS", chain: "Costco", type: "Warehouse" },
  { code: "SS WMT", chain: "Walmart", type: "General Merch" },
  { code: "SS TGT", chain: "Target", type: "General Merch" },
  { code: "SS HD",  chain: "Home Depot", type: "Home Improvement" },
  { code: "SS LOW", chain: "Lowe's", type: "Home Improvement" }
];

const CITIES = [
  { name: "BAXTER MN", lat: 46.34, lng: -94.28 },
  { name: "FARGO ND", lat: 46.88, lng: -96.79 },
  { name: "BRAINERD MN", lat: 46.36, lng: -94.20 },
  { name: "ST CLOUD MN", lat: 45.56, lng: -94.16 },
  { name: "DULUTH MN", lat: 46.78, lng: -92.10 },
  { name: "MINNEAPOLIS MN", lat: 44.98, lng: -93.27 },
  { name: "MOORHEAD MN", lat: 46.87, lng: -96.77 },
  { name: "BEMIDJI MN", lat: 47.47, lng: -94.88 }
];

function generateStores(count = 38) {
  const stores = [];
  let projectId = 639500;

  for (let i = 0; i < count; i++) {
    const tmpl = STORE_TEMPLATES[i % STORE_TEMPLATES.length];
    const city = CITIES[i % CITIES.length];
    const storeNum = 100 + Math.floor(rand() * 900);
    const brand = pick(BRANDS);
    const projectCode = `${projectId + i} - ${brand} ${tmpl.chain.slice(0, 3).toUpperCase()}`;

    const hoursOptions = [1, 1, 1.25, 1.5, 2, 2, 2.5];
    const typicalHours = hoursOptions[Math.floor(rand() * hoursOptions.length)];

    stores.push({
      id: `S${String(i + 1).padStart(3, "0")}`,
      name: `${tmpl.code} ${storeNum} ${city.name.split(" ")[0]}...`,
      fullName: `${tmpl.code} ${storeNum} ${city.name}`,
      chain: tmpl.chain,
      type: tmpl.type,
      city: city.name,
      lat: jitter(city.lat, 0.08),
      lng: jitter(city.lng, 0.12),
      address: `${Math.floor(100 + rand() * 8900)} ${pick(["Main", "Industrial", "Commerce", "Market", "Retail", "Hwy"])} ${pick(["St", "Ave", "Blvd", "Dr", "Pkwy"])}`,
      projectCode,
      brand,
      typicalHours,
      windowStart: "2026-09-28",
      windowEnd: "2026-10-17"
    });
  }
  return stores;
}

const PEOPLE = generatePeople(65);
const STORES = generateStores(38);

window.DEMO_DATA = { PEOPLE, STORES, BRANDS };
