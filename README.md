# 2020 Companies · Merch Scheduler Demo

Interactive **supervisor map dashboard** that shows how field merchandising assignments could work with geography, drive time, and Salesforce-style data (availability + brand scopes of work).

Built to complement the existing **Self Schedule** mobile experience.

## What it demonstrates

- Map of field merchandisers (homes) and retail stores / projects
- Store codes and project codes that match real Self Schedule format  
  (e.g. `SS BBY 522 Baxter...`, `639692 - LG BBY`)
- Brand / scope-of-work filtering (people trained on LG, Dyson, Midea, HP, Dell, etc.)
- Availability status (some people already assigned)
- Auto-rank closest available people by estimated drive time
- Primary assignees + fallback candidates
- Total drive time + project hours / person-hours
- One-click confirm → locks the assignment

## Quick Start

```bash
# Local
npx serve .
# open http://localhost:3000
```

Or just open `index.html` in a browser.

## How a supervisor would use it

1. Browse the map (purple = merchandiser homes, cyan = stores)
2. Select a store / project (map click or search list)
3. Review brand, window dates, typical hours
4. Set people needed + max drive time
5. **Find Closest People** — ranks by scope match first, then drive time
6. Review primaries (solid blue lines) + fallbacks (dashed orange)
7. Confirm Assignment → people marked assigned, stats update

## Data model (mirrors Salesforce concepts)

| Field | Source concept |
|-------|----------------|
| Person availability | Salesforce availability / current schedule |
| Brand scopes | Scope of work / training / certifications |
| Store + project code | Self Schedule assignment record |
| Window start/end | Project date range |
| Typical hours | Scheduled hours on the assignment |

Drive times in the demo are Haversine × 40 mph. Production would use a real routing engine + live traffic.

## Deploy

Static site — works on Vercel, Netlify, GitHub Pages, or any static host.

---

**Demo only** — not connected to live 2020 Companies or Salesforce systems.
