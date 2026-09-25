// National USA — dense hypothetical field force + retail network
// Tracking-ready: availability, scopes, markets

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
  "Justin","Emma","Scott","Nicole","Brandon","Helen","Benjamin","Samantha",
  "Tyler","Rachel","Aaron","Olivia","Adam","Megan","Nathan","Hannah",
  "Derek","Monica","Victor","Grace","Marcus","Tina","Oscar","Nina"
];

const LAST_NAMES = [
  "Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis",
  "Rodriguez","Martinez","Hernandez","Lopez","Gonzalez","Wilson","Anderson",
  "Thomas","Taylor","Moore","Jackson","Martin","Lee","Perez","Thompson",
  "White","Harris","Sanchez","Clark","Ramirez","Lewis","Robinson","Walker",
  "Young","Allen","King","Wright","Scott","Torres","Nguyen","Hill","Flores",
  "Green","Adams","Nelson","Baker","Hall","Rivera","Campbell","Mitchell",
  "Carter","Roberts","Kahler","Olson","Peterson","Larson","Hansen","Kim",
  "Patel","Singh","Chen","Wang","Murphy","OBrien","Coleman","Brooks",
  "Foster","Bryant","Hayes","Reynolds","Fisher","Ellis","Harrison","Gibson"
];

const BRANDS = [
  "LG","Dyson","Midea","HP","Dell","Samsung","Sony","Bose",
  "KitchenAid","Whirlpool","GE","Frigidaire","Apple","Microsoft","Lenovo","Bosch",
  "Canon","Nikon","Philips","Cuisinart"
];

const METROS = [
  { lat: 32.78, lng: -96.80, label: "Dallas-FW", w: 22 },
  { lat: 33.75, lng: -84.39, label: "Atlanta", w: 18 },
  { lat: 41.88, lng: -87.63, label: "Chicago", w: 22 },
  { lat: 34.05, lng: -118.24, label: "Los Angeles", w: 26 },
  { lat: 37.77, lng: -122.42, label: "Bay Area", w: 18 },
  { lat: 40.71, lng: -74.01, label: "New York", w: 28 },
  { lat: 39.95, lng: -75.17, label: "Philadelphia", w: 14 },
  { lat: 42.36, lng: -71.06, label: "Boston", w: 14 },
  { lat: 38.91, lng: -77.04, label: "DC Metro", w: 16 },
  { lat: 25.76, lng: -80.19, label: "Miami", w: 8 },
  { lat: 29.76, lng: -95.37, label: "Houston", w: 18 },
  { lat: 33.45, lng: -112.07, label: "Phoenix", w: 14 },
  { lat: 39.74, lng: -104.99, label: "Denver", w: 12 },
  { lat: 47.61, lng: -122.33, label: "Seattle", w: 14 },
  { lat: 45.52, lng: -122.68, label: "Portland", w: 9 },
  { lat: 44.98, lng: -93.27, label: "Minneapolis", w: 12 },
  { lat: 46.34, lng: -94.28, label: "Baxter MN", w: 6 },
  { lat: 46.88, lng: -96.79, label: "Fargo", w: 5 },
  { lat: 39.10, lng: -84.51, label: "Cincinnati", w: 9 },
  { lat: 42.33, lng: -83.05, label: "Detroit", w: 12 },
  { lat: 41.50, lng: -81.69, label: "Cleveland", w: 9 },
  { lat: 38.63, lng: -90.20, label: "St Louis", w: 9 },
  { lat: 35.23, lng: -80.84, label: "Charlotte", w: 11 },
  { lat: 36.16, lng: -86.78, label: "Nashville", w: 9 },
  { lat: 30.27, lng: -97.74, label: "Austin", w: 11 },
  { lat: 29.42, lng: -98.49, label: "San Antonio", w: 9 },
  { lat: 36.17, lng: -115.14, label: "Las Vegas", w: 9 },
  { lat: 32.72, lng: -117.16, label: "San Diego", w: 11 },
  { lat: 40.44, lng: -79.99, label: "Pittsburgh", w: 8 },
  { lat: 43.04, lng: -87.91, label: "Milwaukee", w: 7 },
  { lat: 39.77, lng: -86.16, label: "Indianapolis", w: 9 },
  { lat: 35.15, lng: -90.05, label: "Memphis", w: 7 },
  { lat: 29.95, lng: -90.07, label: "New Orleans", w: 7 },
  { lat: 35.47, lng: -97.52, label: "Oklahoma City", w: 7 },
  { lat: 41.26, lng: -95.94, label: "Omaha", w: 5 },
  { lat: 43.07, lng: -89.40, label: "Madison", w: 5 },
  { lat: 47.25, lng: -122.44, label: "Tacoma", w: 5 },
  { lat: 33.77, lng: -84.30, label: "Decatur GA", w: 4 },
  { lat: 40.01, lng: -75.30, label: "King of Prussia", w: 5 },
  { lat: 27.95, lng: -82.46, label: "Tampa", w: 10 },
  { lat: 28.54, lng: -81.38, label: "Orlando", w: 10 },
  { lat: 35.78, lng: -78.64, label: "Raleigh", w: 8 },
  { lat: 39.96, lng: -83.00, label: "Columbus OH", w: 8 },
  { lat: 43.04, lng: -76.14, label: "Syracuse", w: 4 },
  { lat: 41.08, lng: -85.14, label: "Fort Wayne", w: 4 },
  { lat: 33.21, lng: -97.13, label: "Denton TX", w: 4 },
  { lat: 45.00, lng: -93.27, label: "St Paul", w: 5 },
  { lat: 37.34, lng: -121.89, label: "San Jose", w: 8 },
  { lat: 33.95, lng: -117.40, label: "Riverside", w: 6 },
  { lat: 38.58, lng: -121.49, label: "Sacramento", w: 7 }
];

function seededRandom(seed) {
  let s = seed;
  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}
const rand = seededRandom(2026);

function pick(arr) { return arr[Math.floor(rand() * arr.length)]; }
function jitter(base, range) { return base + (rand() - 0.5) * range * 2; }

function generatePeople() {
  const people = [];
  const used = new Set();
  let id = 1;
  METROS.forEach((metro) => {
    for (let i = 0; i < metro.w; i++) {
      let name;
      do { name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`; } while (used.has(name));
      used.add(name);
      const numScopes = 2 + Math.floor(rand() * 5);
      const scopes = [];
      const brandCopy = [...BRANDS];
      for (let s = 0; s < numScopes && brandCopy.length; s++) {
        const idx = Math.floor(rand() * brandCopy.length);
        scopes.push(brandCopy.splice(idx, 1)[0]);
      }
      people.push({
        id: `P${String(id++).padStart(4, "0")}`,
        name,
        lat: jitter(metro.lat, 0.32),
        lng: jitter(metro.lng, 0.40),
        status: rand() < 0.15 ? "assigned" : "available",
        scopes,
        rating: +(3.4 + rand() * 1.6).toFixed(1),
        jobsCompleted: Math.floor(8 + rand() * 280),
        phone: `(${200 + Math.floor(rand() * 700)}) ${Math.floor(100 + rand() * 900)}-${Math.floor(1000 + rand() * 9000)}`,
        market: metro.label,
        liveLat: null,
        liveLng: null
      });
    }
  });
  return people;
}

const STORE_TEMPLATES = [
  { code: "SS BBY", chain: "Best Buy", type: "Electronics" },
  { code: "SS COS", chain: "Costco", type: "Warehouse" },
  { code: "SS WMT", chain: "Walmart", type: "General Merch" },
  { code: "SS TGT", chain: "Target", type: "General Merch" },
  { code: "SS HD", chain: "Home Depot", type: "Home Improvement" },
  { code: "SS LOW", chain: "Lowe's", type: "Home Improvement" },
  { code: "SS SAM", chain: "Sam's Club", type: "Warehouse" },
  { code: "SS APP", chain: "Apple Store", type: "Electronics" },
  { code: "SS MS", chain: "Microsoft Store", type: "Electronics" },
  { code: "SS BB", chain: "Bed Bath", type: "Home" },
  { code: "SS BJ", chain: "BJ's", type: "Warehouse" },
  { code: "SS MCY", chain: "Macy's", type: "Department" }
];

function generateStores() {
  const stores = [];
  let projectId = 650000;
  let id = 1;
  METROS.forEach((metro) => {
    const n = 3 + Math.floor(rand() * 4);
    for (let i = 0; i < n; i++) {
      const tmpl = STORE_TEMPLATES[Math.floor(rand() * STORE_TEMPLATES.length)];
      const storeNum = 100 + Math.floor(rand() * 900);
      const brand = pick(BRANDS);
      const hoursOptions = [1, 1.25, 1.5, 2, 2, 2.5, 3];
      const typicalHours = hoursOptions[Math.floor(rand() * hoursOptions.length)];
      const cityShort = metro.label.split(/[-\s]/)[0].toUpperCase();
      stores.push({
        id: `S${String(id++).padStart(4, "0")}`,
        name: `${tmpl.code} ${storeNum} ${cityShort}...`,
        fullName: `${tmpl.code} ${storeNum} ${metro.label}`,
        chain: tmpl.chain,
        type: tmpl.type,
        city: metro.label,
        lat: jitter(metro.lat, 0.14),
        lng: jitter(metro.lng, 0.18),
        address: `${Math.floor(100 + rand() * 9900)} ${pick(["Main","Industrial","Commerce","Market","Retail","Hwy","Center","Plaza"])} ${pick(["St","Ave","Blvd","Dr","Pkwy"])}`,
        projectCode: `${projectId++} - ${brand} ${tmpl.chain.slice(0, 3).toUpperCase()}`,
        brand,
        typicalHours,
        windowStart: "2026-09-28",
        windowEnd: "2026-10-31",
        market: metro.label
      });
    }
  });
  return stores;
}

const PEOPLE = generatePeople();
const STORES = generateStores();

window.DEMO_DATA = { PEOPLE, STORES, BRANDS, METROS };
