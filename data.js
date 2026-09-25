// National USA sample data — many markets, many people, many stores
// Brands/scopes + availability for Salesforce-style demo

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
  "Tyler","Rachel","Aaron","Olivia","Adam","Megan","Nathan","Hannah"
];

const LAST_NAMES = [
  "Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis",
  "Rodriguez","Martinez","Hernandez","Lopez","Gonzalez","Wilson","Anderson",
  "Thomas","Taylor","Moore","Jackson","Martin","Lee","Perez","Thompson",
  "White","Harris","Sanchez","Clark","Ramirez","Lewis","Robinson","Walker",
  "Young","Allen","King","Wright","Scott","Torres","Nguyen","Hill","Flores",
  "Green","Adams","Nelson","Baker","Hall","Rivera","Campbell","Mitchell",
  "Carter","Roberts","Kahler","Olson","Peterson","Larson","Hansen","Kim",
  "Patel","Singh","Chen","Wang","Murphy","OBrien","Coleman","Brooks"
];

const BRANDS = [
  "LG","Dyson","Midea","HP","Dell","Samsung","Sony","Bose",
  "KitchenAid","Whirlpool","GE","Frigidaire","Apple","Microsoft","Lenovo","Bosch"
];

const METROS = [
  { lat: 32.78, lng: -96.80, label: "Dallas-FW", w: 12 },
  { lat: 33.75, lng: -84.39, label: "Atlanta", w: 10 },
  { lat: 41.88, lng: -87.63, label: "Chicago", w: 12 },
  { lat: 34.05, lng: -118.24, label: "Los Angeles", w: 14 },
  { lat: 37.77, lng: -122.42, label: "Bay Area", w: 10 },
  { lat: 40.71, lng: -74.01, label: "New York", w: 14 },
  { lat: 39.95, lng: -75.17, label: "Philadelphia", w: 8 },
  { lat: 42.36, lng: -71.06, label: "Boston", w: 8 },
  { lat: 38.91, lng: -77.04, label: "DC Metro", w: 9 },
  { lat: 25.76, lng: -80.19, label: "Miami", w: 8 },
  { lat: 29.76, lng: -95.37, label: "Houston", w: 10 },
  { lat: 33.45, lng: -112.07, label: "Phoenix", w: 8 },
  { lat: 39.74, lng: -104.99, label: "Denver", w: 7 },
  { lat: 47.61, lng: -122.33, label: "Seattle", w: 8 },
  { lat: 45.52, lng: -122.68, label: "Portland", w: 5 },
  { lat: 44.98, lng: -93.27, label: "Minneapolis", w: 7 },
  { lat: 46.34, lng: -94.28, label: "Baxter MN", w: 4 },
  { lat: 46.88, lng: -96.79, label: "Fargo", w: 3 },
  { lat: 39.10, lng: -84.51, label: "Cincinnati", w: 5 },
  { lat: 42.33, lng: -83.05, label: "Detroit", w: 7 },
  { lat: 41.50, lng: -81.69, label: "Cleveland", w: 5 },
  { lat: 38.63, lng: -90.20, label: "St Louis", w: 5 },
  { lat: 35.23, lng: -80.84, label: "Charlotte", w: 6 },
  { lat: 36.16, lng: -86.78, label: "Nashville", w: 5 },
  { lat: 30.27, lng: -97.74, label: "Austin", w: 6 },
  { lat: 29.42, lng: -98.49, label: "San Antonio", w: 5 },
  { lat: 36.17, lng: -115.14, label: "Las Vegas", w: 5 },
  { lat: 32.72, lng: -117.16, label: "San Diego", w: 6 },
  { lat: 33.45, lng: -111.93, label: "Scottsdale", w: 3 },
  { lat: 40.44, lng: -79.99, label: "Pittsburgh", w: 4 },
  { lat: 43.04, lng: -87.91, label: "Milwaukee", w: 4 },
  { lat: 39.77, lng: -86.16, label: "Indianapolis", w: 5 },
  { lat: 35.15, lng: -90.05, label: "Memphis", w: 4 },
  { lat: 29.95, lng: -90.07, label: "New Orleans", w: 4 },
  { lat: 35.47, lng: -97.52, label: "Oklahoma City", w: 4 },
  { lat: 41.26, lng: -95.94, label: "Omaha", w: 3 },
  { lat: 43.07, lng: -89.40, label: "Madison", w: 3 },
  { lat: 47.25, lng: -122.44, label: "Tacoma", w: 3 },
  { lat: 33.77, lng: -84.30, label: "Decatur GA", w: 2 },
  { lat: 40.01, lng: -75.30, label: "King of Prussia", w: 3 }
];

function seededRandom(seed) {
  let s = seed;
  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}
const rand = seededRandom(99);

function pick(arr) {
  return arr[Math.floor(rand() * arr.length)];
}
function jitter(base, range) {
  return base + (rand() - 0.5) * range * 2;
}

function generatePeople() {
  const people = [];
  const used = new Set();
  let id = 1;

  METROS.forEach((metro) => {
    const count = metro.w;
    for (let i = 0; i < count; i++) {
      let name;
      do {
        name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
      } while (used.has(name));
      used.add(name);

      const numScopes = 2 + Math.floor(rand() * 5);
      const scopes = [];
      const brandCopy = [...BRANDS];
      for (let s = 0; s < numScopes && brandCopy.length; s++) {
        const idx = Math.floor(rand() * brandCopy.length);
        scopes.push(brandCopy.splice(idx, 1)[0]);
      }

      people.push({
        id: `P${String(id++).padStart(3, "0")}`,
        name,
        lat: jitter(metro.lat, 0.28),
        lng: jitter(metro.lng, 0.35),
        status: rand() < 0.18 ? "assigned" : "available",
        scopes,
        rating: +(3.5 + rand() * 1.5).toFixed(1),
        jobsCompleted: Math.floor(10 + rand() * 250),
        phone: `(${200 + Math.floor(rand() * 700)}) ${Math.floor(100 + rand() * 900)}-${Math.floor(1000 + rand() * 9000)}`,
        market: metro.label
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
  { code: "SS BB", chain: "Bed Bath", type: "Home" }
];

function generateStores() {
  const stores = [];
  let projectId = 640000;
  let id = 1;

  METROS.forEach((metro) => {
    const n = 2 + Math.floor(rand() * 3);
    for (let i = 0; i < n; i++) {
      const tmpl = STORE_TEMPLATES[Math.floor(rand() * STORE_TEMPLATES.length)];
      const storeNum = 100 + Math.floor(rand() * 900);
      const brand = pick(BRANDS);
      const hoursOptions = [1, 1.25, 1.5, 2, 2, 2.5, 3];
      const typicalHours = hoursOptions[Math.floor(rand() * hoursOptions.length)];
      const cityShort = metro.label.split(/[-\s]/)[0].toUpperCase();

      stores.push({
        id: `S${String(id++).padStart(3, "0")}`,
        name: `${tmpl.code} ${storeNum} ${cityShort}...`,
        fullName: `${tmpl.code} ${storeNum} ${metro.label}`,
        chain: tmpl.chain,
        type: tmpl.type,
        city: metro.label,
        lat: jitter(metro.lat, 0.12),
        lng: jitter(metro.lng, 0.15),
        address: `${Math.floor(100 + rand() * 9900)} ${pick(["Main", "Industrial", "Commerce", "Market", "Retail", "Hwy", "Center"])} ${pick(["St", "Ave", "Blvd", "Dr", "Pkwy"])}`,
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
