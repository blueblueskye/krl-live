// KRL Jabodetabek network: station positions (approximate, WGS84) and line order.
// Shared by the browser (map + animation) and /api/trains (to match API stations).
// Key = KRL station code. `a` = extra name spellings the API may use.

export const STATIONS = {
  // Bogor line + Nambo branch
  JAKK: { n: "Jakarta Kota", p: [-6.1376, 106.8146] },
  JAY:  { n: "Jayakarta", p: [-6.1414, 106.8231] },
  MGB:  { n: "Mangga Besar", p: [-6.1497, 106.8270] },
  SW:   { n: "Sawah Besar", p: [-6.1607, 106.8277] },
  JUA:  { n: "Juanda", p: [-6.1667, 106.8303] },
  GDD:  { n: "Gondangdia", p: [-6.1860, 106.8326] },
  CKI:  { n: "Cikini", p: [-6.1985, 106.8413] },
  MRI:  { n: "Manggarai", p: [-6.2099, 106.8502] },
  TEB:  { n: "Tebet", p: [-6.2260, 106.8583] },
  CW:   { n: "Cawang", p: [-6.2427, 106.8588] },
  DRN:  { n: "Duren Kalibata", p: [-6.2556, 106.8550] },
  PSMB: { n: "Pasar Minggu Baru", p: [-6.2627, 106.8517] },
  PSM:  { n: "Pasar Minggu", p: [-6.2843, 106.8445] },
  TNT:  { n: "Tanjung Barat", p: [-6.3077, 106.8388] },
  LNA:  { n: "Lenteng Agung", p: [-6.3306, 106.8350] },
  UP:   { n: "Universitas Pancasila", p: [-6.3388, 106.8344], a: ["univpancasila"] },
  UI:   { n: "Universitas Indonesia", p: [-6.3609, 106.8317], a: ["univindonesia"] },
  POC:  { n: "Pondok Cina", p: [-6.3690, 106.8323] },
  DPB:  { n: "Depok Baru", p: [-6.3911, 106.8217] },
  DP:   { n: "Depok", p: [-6.4048, 106.8172] },
  CTA:  { n: "Citayam", p: [-6.4487, 106.8025] },
  BJD:  { n: "Bojong Gede", p: [-6.4932, 106.7949], a: ["bojonggde"] },
  CLT:  { n: "Cilebut", p: [-6.5305, 106.8006] },
  BOO:  { n: "Bogor", p: [-6.5955, 106.7905] },
  PDRJ: { n: "Pondok Rajeg", p: [-6.4652, 106.8170] },
  CBN:  { n: "Cibinong", p: [-6.4675, 106.8525] },
  NMO:  { n: "Nambo", p: [-6.4680, 106.9170] },

  // Cikarang loop
  CKR:  { n: "Cikarang", p: [-6.2554, 107.1450] },
  TLM:  { n: "Metland Telaga Murni", p: [-6.2585, 107.0985], a: ["telagamurni", "metlandtelagamurni"] },
  CIT:  { n: "Cibitung", p: [-6.2614, 107.0838] },
  TB:   { n: "Tambun", p: [-6.2600, 107.0540] },
  BKST: { n: "Bekasi Timur", p: [-6.2470, 107.0182] },
  BKS:  { n: "Bekasi", p: [-6.2363, 106.9995] },
  KRI:  { n: "Kranji", p: [-6.2246, 106.9792] },
  CUK:  { n: "Cakung", p: [-6.2195, 106.9518] },
  KLDB: { n: "Klender Baru", p: [-6.2172, 106.9395] },
  BUA:  { n: "Buaran", p: [-6.2161, 106.9284] },
  KLD:  { n: "Klender", p: [-6.2133, 106.8999] },
  JNG:  { n: "Jatinegara", p: [-6.2150, 106.8705] },
  POK:  { n: "Pondok Jati", p: [-6.2027, 106.8696] },
  KMT:  { n: "Kramat", p: [-6.1946, 106.8606] },
  GST:  { n: "Gang Sentiong", p: [-6.1856, 106.8506] },
  PSE:  { n: "Pasar Senen", p: [-6.1747, 106.8446] },
  KMO:  { n: "Kemayoran", p: [-6.1632, 106.8448] },
  RJW:  { n: "Rajawali", p: [-6.1462, 106.8343] },
  KPB:  { n: "Kampung Bandan", p: [-6.1327, 106.8292] },
  AK:   { n: "Angke", p: [-6.1449, 106.7993] },
  DU:   { n: "Duri", p: [-6.1564, 106.8018] },
  THB:  { n: "Tanah Abang", p: [-6.1857, 106.8109] },
  KAT:  { n: "Karet", p: [-6.2009, 106.8160] },
  SUD:  { n: "Sudirman", p: [-6.2025, 106.8233] },

  // Tanjung Priok
  AC:   { n: "Ancol", p: [-6.1276, 106.8445] },
  TPK:  { n: "Tanjung Priok", p: [-6.1104, 106.8812] },

  // Rangkasbitung line
  PLM:  { n: "Palmerah", p: [-6.2075, 106.7973] },
  KBY:  { n: "Kebayoran", p: [-6.2374, 106.7826] },
  PDJ:  { n: "Pondok Ranji", p: [-6.2765, 106.7448] },
  JMU:  { n: "Jurangmangu", p: [-6.2887, 106.7290], a: ["jurangmangu"] },
  SDM:  { n: "Sudimara", p: [-6.2970, 106.7130] },
  RU:   { n: "Rawa Buntu", p: [-6.3149, 106.6763] },
  SRP:  { n: "Serpong", p: [-6.3201, 106.6655] },
  CSK:  { n: "Cisauk", p: [-6.3253, 106.6413] },
  CC:   { n: "Cicayur", p: [-6.3297, 106.6186] },
  PRP:  { n: "Parung Panjang", p: [-6.3441, 106.5701] },
  CJT:  { n: "Cilejit", p: [-6.3420, 106.5130] },
  DAR:  { n: "Daru", p: [-6.3245, 106.4910] },
  TEJ:  { n: "Tenjo", p: [-6.3274, 106.4595] },
  TGS:  { n: "Tigaraksa", p: [-6.3286, 106.4357], a: ["tigaraksa"] },
  CKY:  { n: "Cikoya", p: [-6.3436, 106.4205] },
  MJ:   { n: "Maja", p: [-6.3317, 106.3961] },
  CTR:  { n: "Citeras", p: [-6.3409, 106.3335] },
  RK:   { n: "Rangkasbitung", p: [-6.3530, 106.2510] },

  // Tangerang line
  GGL:  { n: "Grogol", p: [-6.1607, 106.7905] },
  PSG:  { n: "Pesing", p: [-6.1630, 106.7752] },
  TKO:  { n: "Taman Kota", p: [-6.1571, 106.7563] },
  BOI:  { n: "Bojong Indah", p: [-6.1610, 106.7426] },
  RW:   { n: "Rawa Buaya", p: [-6.1623, 106.7288] },
  KDS:  { n: "Kalideres", p: [-6.1558, 106.7055] },
  PI:   { n: "Poris", p: [-6.1695, 106.6838] },
  BPR:  { n: "Batu Ceper", p: [-6.1695, 106.6633] },
  TTI:  { n: "Tanah Tinggi", p: [-6.1771, 106.6487] },
  TNG:  { n: "Tangerang", p: [-6.1761, 106.6330] },
};

// Track drawing order. Consecutive stations in a list are joined by track.
export const LINES = [
  { name: "Bogor", color: "#E30A16", seq: ["JAKK","JAY","MGB","SW","JUA","GDD","CKI","MRI","TEB","CW","DRN","PSMB","PSM","TNT","LNA","UP","UI","POC","DPB","DP","CTA","BJD","CLT","BOO"] },
  { name: "Bogor (Nambo)", color: "#E30A16", seq: ["CTA","PDRJ","CBN","NMO"] },
  { name: "Cikarang", color: "#0084D8", seq: ["CKR","TLM","CIT","TB","BKST","BKS","KRI","CUK","KLDB","BUA","KLD","JNG","MRI","SUD","KAT","THB","DU","AK","KPB"] },
  { name: "Cikarang (Senen)", color: "#0084D8", seq: ["JNG","POK","KMT","GST","PSE","KMO","RJW","KPB"] },
  { name: "Rangkasbitung", color: "#16812B", seq: ["THB","PLM","KBY","PDJ","JMU","SDM","RU","SRP","CSK","CC","PRP","CJT","DAR","TEJ","TGS","CKY","MJ","CTR","RK"] },
  { name: "Tangerang", color: "#623814", seq: ["DU","GGL","PSG","TKO","BOI","RW","KDS","PI","BPR","TTI","TNG"] },
  { name: "Tanjung Priok", color: "#DD0067", seq: ["JAKK","KPB","AC","TPK"] },
];

export const norm = (s) =>
  String(s || "").toLowerCase()
    .replace(/\buniv\.?\b/g, "univ")
    .replace(/[^a-z]/g, "");

// Map an API station {id, name} to one of our keys, or null.
export function matchStation(id, name) {
  const code = String(id || "").toUpperCase();
  const nn = norm(name);
  for (const [k, s] of Object.entries(STATIONS)) {
    if (norm(s.n) === nn || (s.a || []).includes(nn)) return k;
  }
  if (STATIONS[code]) return code;
  return null;
}
