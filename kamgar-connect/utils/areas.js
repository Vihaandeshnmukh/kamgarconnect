// Named areas of Aurangabad (Chhatrapati Sambhajinagar), used to describe where a worker is in rough terms
// ("near CIDCO N-5") without ever sending their GPS position. Coordinates are area centres, [lng, lat].
const AREAS = [
  ['CIDCO N-5', 75.3693, 19.8762], ['CIDCO N-2', 75.3800, 19.8720], ['Waluj MIDC', 75.2353, 19.8427], ['Garkheda', 75.3360, 19.8640],
  ['Osmanpura', 75.3270, 19.8700], ['Shendra MIDC', 75.4597, 19.8869], ['Chikalthana', 75.3990, 19.8800], ['Paithan Gate', 75.3220, 19.8890],
  ['Satara Parisar', 75.3200, 19.8410], ['Harsul', 75.3400, 19.9370], ['Jalna Road', 75.3550, 19.8760], ['Beed Bypass', 75.3300, 19.8500],
  ['Kranti Chowk', 75.3230, 19.8770], ['Railway Station', 75.3150, 19.8680], ['Padegaon', 75.2900, 19.8930], ['Bajaj Nagar', 75.2450, 19.8350]
].map(([name, lng, lat]) => ({ name, lng, lat }));

function km(a, b) { // [lng, lat] pairs, great-circle distance in km
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b[1] - a[1]) * rad, dLng = (b[0] - a[0]) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
const hasPoint = (loc) => !!(loc && Array.isArray(loc.coordinates) && (loc.coordinates[0] || loc.coordinates[1]));
// Nearest named area within 6 km, else null
function nearestArea(loc) {
  if (!hasPoint(loc)) return null;
  let best = null, bestKm = 6;
  for (const a of AREAS) { const d = km(loc.coordinates, [a.lng, a.lat]); if (d < bestKm) { best = a; bestKm = d; } }
  return best;
}
// Distance rounded up to the next half kilometre (so exact positions can't be worked out)
const roughKm = (d) => Math.max(0.5, Math.ceil(d * 2) / 2);
module.exports = { AREAS, km, nearestArea, hasPoint, roughKm };
