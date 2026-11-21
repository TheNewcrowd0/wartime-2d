// === START OF CHUNK 1 OF 8 ===
const canvas = document.getElementById("battlefield");
const ctx = canvas.getContext("2d");

const MAP_W = 4400, MAP_H = 2000;

const GRID_CELL_SIZE = 100;

function createSpatialGrid(units) {
  const grid = new Map();

  for (const unit of units) {
    const col = Math.floor(unit.x / GRID_CELL_SIZE);
    const row = Math.floor(unit.y / GRID_CELL_SIZE);
    const key = `${col},${row}`;

    if (!grid.has(key)) {
      grid.set(key, []);
    }

    grid.get(key).push(unit);
  }

  return grid;
}

function getNearbyUnits(grid, x, y, radius) {
  const nearby = [];

  const minCol = Math.floor((x - radius) / GRID_CELL_SIZE);
  const maxCol = Math.floor((x + radius) / GRID_CELL_SIZE);
  const minRow = Math.floor((y - radius) / GRID_CELL_SIZE);
  const maxRow = Math.floor((y + radius) / GRID_CELL_SIZE);

  for (let col = minCol; col <= maxCol; col++) {
    for (let row = minRow; row <= maxRow; row++) {
      const cell = grid.get(`${col},${row}`);

      if (cell) nearby.push(...cell);
    }
  }

  return nearby;
}

const MAX_ALLY_WAVE = 76, MAX_ENEMY_WAVE = 90, MAX_ALLY_HARD = 90, MAX_BUNKERS = 160;
let cam = { x: 0, y: 750 }, diffMult = 1.05, biome = "forest", muted = false;
let gameStarted = false, paused = false, helpOpen = false, gameOver = "";
let domTimer = 2400, totalKills = 0, orderBanner = { text: "", timer: 0 };

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playSound(freq, type, dur, vol = 0.08) {
  if (muted) return;
  if (audioCtx.state === "suspended") audioCtx.resume();
  const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
  osc.type = type; osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(30, audioCtx.currentTime + dur);
  gain.gain.setValueAtTime(vol, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
  osc.connect(gain); gain.connect(audioCtx.destination);
  osc.start(); osc.stop(audioCtx.currentTime + dur);
}

function toggleMute() {
  muted = !muted;
  document.getElementById("mute-btn").innerText = muted ? "🔇" : "🔊";
}

function setBiome(b) {
  biome = b;
  ["forest", "desert", "island"].forEach(id => {
    document.getElementById("b-" + id).style.background = id === b ? "#1f6feb" : "#334155";
  });
}

let player = { x: 180, y: 1000, size: 15, speed: 1.95, hp: 160, maxHp: 160, angle: 0, dmg: 26, fireRate: 32, gunLv: 1, kills: 0, rank: 0, deadTimer: 0, healDelay: 0, vehicle: null, inCover: false, inWater: false, inStealth: false, inSmoke: false, inBuilding: false };
let allyHQ = { x: 75, y: 1000, hp: 10000, maxHp: 10000, timer: 0 };
let enemyHQ = { x: 4325, y: 1000, hp: 10000, maxHp: 10000, timer: 0 };
let mouse = { x: 400, y: 250, down: false }, keys = {};
let gold = 110, cooldown = 0, order = "CHARGE", wave = 1;
const ORDERS = ["CHARGE", "FOLLOW", "HOLD", "FLANK", "FOCUS_HQ", "RETREAT"];

function cycleOrder() {
  order = ORDERS[(ORDERS.indexOf(order) + 1) % ORDERS.length];
  orderBanner = { text: `📢 ORDER: ${order}`, timer: 110 };
  playSound(520, "triangle", 0.08, 0.06);
}

let allies = [], enemies = [], bullets = [], explosions = [], craters = [], bunkers = [], buildings = [], scenery = [], trees = [], mines = [], smokes = [], flashes = [], shellTrails = [], bridges = [], flags = [];
// === END OF CHUNK 1 OF 8 ===

// === START OF CHUNK 2 OF 8 ===
function generateMap() {
  scenery = []; trees = []; bunkers = []; buildings = []; bridges = [];
  canvas.style.background = biome === "desert" ? "#4a3b22" : biome === "island" ? "#1e3a3a" : "#2b261e";

  if (biome === "forest") {
    flags = [
      { name: "West Timber Mill", x: 1050, y: 650, progress: 0, owner: "neutral" },
      { name: "South Crossing", x: 1350, y: 1450, progress: 0, owner: "neutral" },
      { name: "Central Crossroads", x: 2200, y: 1000, progress: 0, owner: "neutral" },
      { name: "North Outpost", x: 3050, y: 550, progress: 0, owner: "neutral" },
      { name: "East Ridge", x: 3350, y: 1350, progress: 0, owner: "neutral" }
    ];
    buildings.push(
      { x: 1450, y: 860, w: 190, h: 140, hp: 2200, maxHp: 2200, name: "WEST COMMAND FORT", spawnCd: 600 },
      { x: 2760, y: 980, w: 190, h: 140, hp: 2200, maxHp: 2200, name: "EAST COMMAND FORT", spawnCd: 600 },
      { x: 2110, y: 380, w: 170, h: 120, hp: 1800, maxHp: 1800, name: "NORTH BARRACKS", spawnCd: 600 },
      { x: 2110, y: 1500, w: 170, h: 120, hp: 1800, maxHp: 1800, name: "SOUTH VEHICLE DEPOT", spawnCd: 600 }
    );
  } else if (biome === "desert") {
    flags = [
      { name: "West Oasis", x: 1100, y: 1000, progress: 0, owner: "neutral" },
      { name: "North Dune", x: 2200, y: 340, progress: 0, owner: "neutral" },
      { name: "Citadel Courtyard", x: 2200, y: 1000, progress: 0, owner: "neutral" },
      { name: "South Canyon", x: 2200, y: 1660, progress: 0, owner: "neutral" },
      { name: "East Refinery", x: 3300, y: 1000, progress: 0, owner: "neutral" }
    ];
    buildings.push(
      { x: 2080, y: 740, w: 240, h: 160, hp: 3000, maxHp: 3000, name: "GRAND CITADEL", spawnCd: 500 },
      { x: 2080, y: 1100, w: 240, h: 160, hp: 3000, maxHp: 3000, name: "ARMOR FOUNDRY", spawnCd: 500 },
      { x: 1250, y: 450, w: 160, h: 120, hp: 1800, maxHp: 1800, name: "DESERT OUTPOST", spawnCd: 650 },
      { x: 2990, y: 1430, w: 160, h: 120, hp: 1800, maxHp: 1800, name: "SCORPION BASE", spawnCd: 650 }
    );
  } else {
    flags = [
      { name: "West Harbor", x: 1150, y: 1000, progress: 0, owner: "neutral" },
      { name: "North Bridge", x: 2200, y: 360, progress: 0, owner: "neutral" },
      { name: "Grand Causeway", x: 2200, y: 1000, progress: 0, owner: "neutral" },
      { name: "South Bridge", x: 2200, y: 1640, progress: 0, owner: "neutral" },
      { name: "East Harbor", x: 3250, y: 1000, progress: 0, owner: "neutral" }
    ];
    bridges = [
      { x: 1960, y: 290, w: 480, h: 140 },
      { x: 1960, y: 920, w: 480, h: 160 },
      { x: 1960, y: 1570, w: 480, h: 140 }
    ];
    buildings.push(
      { x: 1720, y: 920, w: 180, h: 160, hp: 2400, maxHp: 2400, name: "WEST BRIDGEHEAD", spawnCd: 550 },
      { x: 2500, y: 920, w: 180, h: 160, hp: 2400, maxHp: 2400, name: "EAST BRIDGEHEAD", spawnCd: 550 }
    );
  }

  for (let i = 0; i < 210; i++) {
    const types = biome === "desert" ? ["dirt", "dirt", "rocks", "trench", "pond"] :
                  biome === "island" ? ["grass", "pond", "rocks", "trench"] :
                  ["grass", "grass", "dirt", "pond", "rocks", "trench"];
    const type = types[Math.floor(Math.random() * types.length)];
    const sx = 220 + Math.random() * (MAP_W - 440), sy = 60 + Math.random() * (MAP_H - 120);
    if (biome === "island" && Math.abs(sx - 2200) < 280) continue;
    if (Math.abs(sy - 1000) > 95 && !flags.some(f => Math.hypot(sx - f.x, sy - f.y) < 140)) {
      scenery.push({ type, x: sx, y: sy, r: type === "pond" ? 50 + Math.random() * 35 : 32 + Math.random() * 48, angle: Math.random() * Math.PI });
    }
  }

  const treeCount = biome === "desert" ? 22 : 95;
  for (let i = 0; i < treeCount; i++) {
    const tx = 220 + Math.random() * (MAP_W - 440), ty = 60 + Math.random() * (MAP_H - 120);
    if (biome === "island" && Math.abs(tx - 2200) < 260) continue;
    if (Math.abs(ty - 1000) > 105 && !flags.some(f => Math.hypot(tx - f.x, ty - f.y) < 125) &&
        !buildings.some(b => tx > b.x - 25 && tx < b.x + b.w + 25 && ty > b.y - 25 && ty < b.y + b.h + 25)) {
      trees.push({ x: tx, y: ty, r: 16 + Math.random() * 8, kind: biome === "desert" ? "palm" : (Math.random() < 0.5 ? "pine" : "oak") });
    }
  }

  for (let i = 0; i < 120; i++) {
    let isLog = i >= 78;
    let vertical = Math.random() < 0.65;
    let w = vertical ? (isLog ? 18 : 24) : (isLog ? 88 : 78 + Math.random() * 40);
    let h = vertical ? (isLog ? 88 : 78 + Math.random() * 40) : (isLog ? 18 : 24);
    let wx = 280 + Math.random() * (MAP_W - 560), wy = 70 + Math.random() * (MAP_H - 170);
    if (biome === "island" && Math.abs((wx + w / 2) - 2200) < 250) continue;
    let distToFlag = Math.min(...flags.map(f => Math.hypot((wx + w / 2) - f.x, (wy + h / 2) - f.y)));
    let nearBldg = buildings.some(b => wx + w > b.x - 20 && wx < b.x + b.w + 20 && wy + h > b.y - 20 && wy < b.y + b.h + 20);
    if (distToFlag > 110 && !nearBldg && Math.abs((wy + h / 2) - 1000) > 55) {
      bunkers.push({ x: wx, y: wy, w, h, hp: isLog ? 260 : 520, maxHp: isLog ? 260 : 520, isLog });
    }
  }
}
// === END OF CHUNK 2 OF 8 ===
// === START OF CHUNK 3 OF 8 ===
function startGame(mult) {
  diffMult = mult; generateMap(); gameStarted = true;
  document.getElementById("title-screen").classList.add("hidden");
  playSound(420, "triangle", 0.25, 0.12);
}

function togglePause() {
  if (!gameStarted || gameOver || helpOpen) return;
  paused = !paused;
  document.getElementById("pause-screen").classList.toggle("hidden", !paused);
}

function toggleHelp() {
  if (!gameStarted || gameOver) return;
  helpOpen = !helpOpen; paused = helpOpen;
  document.getElementById("help-screen").classList.toggle("hidden", !helpOpen);
  if (!helpOpen) document.getElementById("pause-screen").classList.add("hidden");
}

function toggleVehicle() {
  if (!gameStarted || paused || gameOver || player.deadTimer > 0) return;
  if (player.vehicle) {
    let v = player.vehicle;
    allies.push(makeBot("ally", v.type));
    let bot = allies.at(-1);
    bot.x = player.x; bot.y = player.y; bot.hp = v.hp; bot.maxHp = v.maxHp;
    player.vehicle = null;
    player.size = 15;
    orderBanner = { text: "🏃 EXITED VEHICLE", timer: 90 };
    playSound(300, "sine", 0.14);
    return;
  }
  let idx = allies.findIndex(a => ["tank", "jeep", "arty"].includes(a.type) && Math.hypot(a.x - player.x, a.y - player.y) < 55);
  if (idx !== -1) {
    let v = allies.splice(idx, 1).at(0);
    player.vehicle = { type: v.type, hp: v.hp, maxHp: v.maxHp };
    player.x = v.x; player.y = v.y;
    player.size = v.type === "arty" ? 17 : v.type === "tank" ? 16 : 14;
    let label = v.type === "arty" ? "🚀 DRIVING ARTILLERY" : v.type === "tank" ? "🛡️ DRIVING HEAVY TANK" : "🚙 DRIVING ARMORED JEEP";
    orderBanner = { text: label, timer: 110 };
    playSound(560, "square", 0.16);
  }
}

window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase(); keys[k] = true;
  if (k === "h") toggleHelp();
  if (k === "p" || e.key === "Escape") { if (helpOpen) toggleHelp(); else togglePause(); }
  if (!gameStarted || paused) return;
  if (k === "z") toggleVehicle();
  if (k === "q") spawnSquad();
  if (k === "e") buyHeavy();
  if (k === "j") buyJeep();
  if (k === "k") buyArtillery();
  if (k === "m") buyMedic();
  if (k === "n") buySniper();
  if (k === "c") buyBuilder();
  if (k === "v") buyRecon();
  if (k === "x") deploySmoke();
  if (k === "b") buildWall();
  if (k === "g") placeMine();
  if (k === "r") { if (gameOver) location.reload(); else repairNear(); }
  if (k === "1") buyWeapon();
  if (k === "f") cycleOrder();
});
window.addEventListener("keyup", (e) => (keys[e.key.toLowerCase()] = false));
canvas.addEventListener("mousemove", (e) => { const r = canvas.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
canvas.addEventListener("mousedown", () => (mouse.down = true));
window.addEventListener("mouseup", () => (mouse.down = false));
// === END OF CHUNK 3 OF 8 ===\

// === START OF CHUNK 4 OF 8 ===
function makeBot(team, type) {
  const isBoss = type === "boss", isTank = type === "tank", isMedic = type === "medic";
  const isSniper = type === "sniper", isRocket = type === "rocket", isBuilder = type === "builder";
  const isRecon = type === "recon", isJeep = type === "jeep", isArty = type === "arty";
  const isEnemy = team === "enemy";
  const mult = isEnemy ? diffMult : 1;
  return {
    team, type, x: isEnemy ? 4220 : 180, y: Math.random() * 1720 + 140,
    size: isBoss ? 23 : isArty ? 17 : isTank ? 15 : isJeep ? 13 : isMedic ? 11 : (isSniper || isRocket || isBuilder || isRecon) ? 10 : 8,
    speed: (isBoss ? 0.42 : isArty ? 0.48 : isTank ? 0.58 : isJeep ? 1.25 : isRecon ? 1.35 : isSniper ? 0.72 : isRocket ? 0.68 : isBuilder ? 0.85 : isMedic ? 0.82 : 0.86) * (isEnemy ? 1.02 : 1),
    hp: (isBoss ? 420 : isTank ? 185 : isArty ? 120 : isJeep ? 105 : isMedic ? 80 : isBuilder ? 85 : isRecon ? 60 : isRocket ? 70 : isSniper ? 55 : 48) * mult,
    maxHp: (isBoss ? 420 : isTank ? 185 : isArty ? 120 : isJeep ? 105 : isMedic ? 80 : isBuilder ? 85 : isRecon ? 60 : isRocket ? 70 : isSniper ? 55 : 48) * mult,
    dmg: (isBoss ? 26 : isTank ? 24 : isSniper ? 52 : isArty ? 36 : isRocket ? 38 : isJeep ? 12 : isRecon ? 10 : isBuilder ? 8 : 11) * mult,
    rate: isBoss ? 90 : isArty ? 160 : isTank ? 88 : isSniper ? 135 : isRocket ? 115 : isBuilder ? 75 : isJeep ? 24 : isRecon ? 45 : 58,
    range: isArty ? 820 : isSniper ? 700 : isRocket ? 520 : isRecon ? 460 : isJeep ? 410 : isBuilder ? 260 : 410,
    vision: isRecon ? 940 : isJeep ? 540 : isSniper ? 360 : 240,
    kills: 0, rank: 0, timer: Math.floor(Math.random() * 45), buildCd: 260 + Math.floor(Math.random() * 180),
    stuckTimer: 0, avoidDir: Math.random() < 0.5 ? 1 : -1,
    angle: isEnemy ? Math.PI : 0, strafe: Math.random() < 0.5 ? -1 : 1, strafeTimer: 0, lane: Math.floor(Math.random() * 5)
  };
}

function spawnSquad() { if (gold >= 35 && !gameOver && allies.length < MAX_ALLY_HARD) { gold -= 35; playSound(320, "sine", 0.12); for (let i = 0; i < Math.min(4, MAX_ALLY_HARD - allies.length); i++) allies.push(makeBot("ally", "inf")); } }
function buyHeavy() { if (gold >= 60 && !gameOver && allies.length < MAX_ALLY_HARD) { gold -= 60; playSound(180, "sawtooth", 0.2); allies.push(makeBot("ally", "tank")); } }
function buyJeep() { if (gold >= 55 && !gameOver && allies.length < MAX_ALLY_HARD) { gold -= 55; playSound(290, "square", 0.16); allies.push(makeBot("ally", "jeep")); } }
function buyArtillery() { if (gold >= 85 && !gameOver && allies.length < MAX_ALLY_HARD) { gold -= 85; playSound(130, "sawtooth", 0.26); allies.push(makeBot("ally", "arty")); } }
function buyMedic() { if (gold >= 45 && !gameOver && allies.length < MAX_ALLY_HARD) { gold -= 45; playSound(520, "sine", 0.15); allies.push(makeBot("ally", "medic")); } }
function buySniper() { if (gold >= 50 && !gameOver && allies.length < MAX_ALLY_HARD) { gold -= 50; playSound(780, "triangle", 0.16); allies.push(makeBot("ally", "sniper")); } }
function buyBuilder() { if (gold >= 40 && !gameOver && allies.length < MAX_ALLY_HARD) { gold -= 40; playSound(440, "square", 0.14); allies.push(makeBot("ally", "builder")); } }
function buyRecon() { if (gold >= 30 && !gameOver && allies.length < MAX_ALLY_HARD) { gold -= 30; playSound(680, "sine", 0.14); allies.push(makeBot("ally", "recon")); } }

function deploySmoke() {
  if (gold >= 15 && player.deadTimer === 0 && !gameOver && smokes.length < 8) {
    gold -= 15; playSound(160, "sine", 0.35, 0.1);
    smokes.push({ x: mouse.x + cam.x, y: mouse.y + cam.y, r: 120, life: 1800 });
  }
}

function getWallPreview() {
  let sideways = Math.abs(Math.cos(player.angle)) > 0.7;
  let w = sideways ? 28 : 84, h = sideways ? 84 : 28, dist = 62;
  return { x: player.x + Math.cos(player.angle) * dist - w / 2, y: player.y + Math.sin(player.angle) * dist - h / 2, w, h };
}

function buildWall() {
  if (gold >= 25 && player.deadTimer === 0 && !gameOver) {
    let wall = getWallPreview();
    let overlaps = player.x + player.size > wall.x && player.x - player.size < wall.x + wall.w && player.y + player.size > wall.y && player.y - player.size < wall.y + wall.h;
    if (!overlaps) { gold -= 25; playSound(140, "square", 0.12); bunkers.push({ x: wall.x, y: wall.y, w: wall.w, h: wall.h, hp: 520, maxHp: 520, isLog: false }); }
  }
}

function placeMine() {
  if (gold >= 20 && player.deadTimer === 0 && !gameOver && mines.length < 20) {
    gold -= 20; playSound(480, "square", 0.1);
    mines.push({ x: player.x, y: player.y, r: 10 });
  }
}

function repairNear() {
  if (gold < 15 || player.deadTimer > 0 || gameOver) return;
  let repaired = false;
  if (player.vehicle && player.vehicle.hp < player.vehicle.maxHp) {
    player.vehicle.hp = Math.min(player.vehicle.maxHp, player.vehicle.hp + 90); repaired = true;
  }
  bunkers.forEach(b => { if (b.hp < b.maxHp && Math.hypot((b.x + b.w / 2) - player.x, (b.y + b.h / 2) - player.y) < 170) { b.hp = Math.min(b.maxHp, b.hp + 150); repaired = true; } });
  buildings.forEach(b => { if (b.hp < b.maxHp && Math.hypot((b.x + b.w / 2) - player.x, (b.y + b.h / 2) - player.y) < 190) { b.hp = Math.min(b.maxHp, b.hp + 220); repaired = true; } });
  if (allyHQ.hp < allyHQ.maxHp && Math.hypot(allyHQ.x - player.x, allyHQ.y - player.y) < 190) { allyHQ.hp = Math.min(allyHQ.maxHp, allyHQ.hp + 250); repaired = true; }
  if (repaired) { gold -= 15; playSound(620, "sine", 0.18); explosions.push({ x: player.x, y: player.y, r: 45, a: 0.45, color: "56, 189, 248" }); }
}

function buyWeapon() {
  const cost = player.gunLv * 30 + 30;
  if (gold >= cost && player.gunLv < 4 && !gameOver) { gold -= cost; player.gunLv++; player.dmg += 7; player.fireRate = Math.max(15, player.fireRate - 4); playSound(600, "triangle", 0.2); }
}

setInterval(() => {
  if (!gameStarted || paused || gameOver) return;
  gold += 3 + (flags.filter(f => f.owner === "ally").length * 2);
  if (player.deadTimer === 0 && player.healDelay <= 0 && player.hp < player.maxHp) player.hp = Math.min(player.maxHp, player.hp + 3);
}, 1000);

setInterval(() => {
  if (!gameStarted || paused || gameOver) return;
  const allyRage = allyHQ.hp <= 2500, enemyRage = enemyHQ.hp <= 2500;
  if (allies.length < MAX_ALLY_WAVE) {
    for (let i = 0; i < (allyRage ? 8 : 6); i++) if (allies.length < MAX_ALLY_WAVE) allies.push(makeBot("ally", "inf"));
    if (allies.length < MAX_ALLY_WAVE) allies.push(makeBot("ally", allyRage ? "boss" : "tank"));
    if (wave % 2 === 0 && allies.length < MAX_ALLY_WAVE) allies.push(makeBot("ally", "jeep"));
    if (wave % 2 === 1 && allies.filter(u => u.type === "builder").length < 4 && allies.length < MAX_ALLY_WAVE) allies.push(makeBot("ally", "builder"));
    if (wave % 3 === 1 && allies.filter(u => u.type === "recon").length < 3 && allies.length < MAX_ALLY_WAVE) allies.push(makeBot("ally", "recon"));
  }
  if (enemies.length < MAX_ENEMY_WAVE) {
    for (let i = 0; i < (enemyRage ? 9 : 6) + Math.floor(wave / 4); i++) if (enemies.length < MAX_ENEMY_WAVE) enemies.push(makeBot("enemy", "inf"));
    if (enemies.length < MAX_ENEMY_WAVE) enemies.push(makeBot("enemy", "tank"));
    if (wave % 2 === 0 && enemies.length < MAX_ENEMY_WAVE) enemies.push(makeBot("enemy", "jeep"));
    if (wave % 2 === 1 && enemies.filter(u => u.type === "builder").length < 4 && enemies.length < MAX_ENEMY_WAVE) enemies.push(makeBot("enemy", "builder"));
    if ((wave % 2 === 0 || enemyRage) && enemies.length < MAX_ENEMY_WAVE) enemies.push(makeBot("enemy", "rocket"));
    if ((wave % 3 === 0 || enemyRage) && enemies.length < MAX_ENEMY_WAVE) enemies.push(makeBot("enemy", "arty"));
    if ((wave % 3 === 0 || enemyRage) && enemies.length < MAX_ENEMY_WAVE) enemies.push(makeBot("enemy", "boss"));
  }
  wave++;
}, 15000);
// === END OF CHUNK 4 OF 8 ===

// === START OF CHUNK 5 OF 8 ===
function hitWall(x, y, pad = 0, ignoreLogs = false) {
  return bunkers.find(b => (!ignoreLogs || !b.isLog) && x + pad > b.x && x - pad < b.x + b.w && y + pad > b.y && y - pad < b.y + b.h);
}

function insideBuilding(x, y) {
  return buildings.find(b => x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h);
}

function inWaterPond(x, y) {
  if (biome === "island" && Math.abs(x - 2200) < 210) {
    if (!bridges.some(br => x > br.x && x < br.x + br.w && y > br.y && y < br.y + br.h)) return true;
  }
  return scenery.some(s => s.type === "pond" && Math.hypot(x - s.x, y - s.y) < s.r - 4);
}

function inSmokeCloud(x, y) { return smokes.some(s => Math.hypot(x - s.x, y - s.y) < s.r); }

function inStealthCover(x, y) {
  return trees.some(t => Math.hypot(x - t.x, y - t.y) < t.r + 6) || scenery.some(s => s.type === "trench" && Math.hypot(x - s.x, y - s.y) < s.r);
}

function isSpottedByAllies(x, y) {
  if (player.deadTimer === 0 && Math.hypot(x - player.x, y - player.y) < 580) return true;
  if (Math.hypot(x - allyHQ.x, y - allyHQ.y) < 520) return true;
  if (flags.some(f => f.owner === "ally" && Math.hypot(x - f.x, y - f.y) < 520)) return true;
  return allies.some(a => Math.hypot(x - a.x, y - a.y) < (a.vision || 230));
}

// Cache enemy visibility for the minimap
let spottedEnemyCache = new Map();
let spottedCacheFrame = 7;

function refreshSpottedEnemyCache() {
  if (++spottedCacheFrame < 8) return;

  spottedCacheFrame = 0;

  const updatedCache = new Map();

  for (const enemy of enemies) {
    updatedCache.set(
      enemy,
      isSpottedByAllies(enemy.x, enemy.y)
    );
  }

  spottedEnemyCache = updatedCache;
}


function promoteUnit(unit) {
  if (!unit) return;
  unit.kills = (unit.kills || 0) + 1;
  let newRank = unit.kills >= 6 ? 3 : unit.kills >= 3 ? 2 : unit.kills >= 1 ? 1 : 0;
  if (newRank > (unit.rank || 0)) {
    unit.rank = newRank; unit.dmg = Math.round(unit.dmg * 1.2);
    unit.maxHp = Math.round(unit.maxHp * 1.15); unit.hp = Math.min(unit.maxHp, unit.hp + 25);
    if (unit === player) playSound(720, "triangle", 0.25, 0.1);
  }
}


function getPeekBarrel() {
  let nearWall = hitWall(player.x, player.y, player.size + 14);
  player.inCover = Boolean(nearWall);

  let forwardX = Math.cos(player.angle);
  let forwardY = Math.sin(player.angle);

  // Normal firing position when not behind a wall.
  if (!nearWall || nearWall.isLog) {
    return {
      x: player.x + forwardX * 18,
      y: player.y + forwardY * 18
    };
  }

  // Try peeking around either side of the wall.
  let perp = player.angle + Math.PI / 2;

  for (let side of [1, -1]) {
    let px = player.x + Math.cos(perp) * 22 * side + forwardX * 18;
    let py = player.y + Math.sin(perp) * 22 * side + forwardY * 18;

    if (!hitWall(px, py, 4)) {
      return { x: px, y: py };
    }
  }

  // No clear firing position.
  return null;
}


function findTarget(bot) {
  let foes = bot.team === "ally" ? enemies : (player.deadTimer > 0 ? allies : [player, ...allies]);
  let best = bot.team === "ally" ? enemyHQ : allyHQ;
  let minD = Math.hypot(best.x - bot.x, best.y - bot.y);
  foes.forEach(f => {
    let rawD = Math.hypot(f.x - bot.x, f.y - bot.y);
    if ((inSmokeCloud(f.x, f.y) && rawD > 145) || (inStealthCover(f.x, f.y) && rawD > 190)) return;
    let d = rawD * (f === player ? 0.85 : 1);
    if (d < minD) { minD = d; best = f; }
  });
  return { target: best, dist: Math.hypot(best.x - bot.x, best.y - bot.y) };
}

function firePlayerGun() {
let barrel = getPeekBarrel();

if (!barrel) return;

flashes.push({ x: barrel.x, y: barrel.y, r: 9, a: 1 });
  let vType = player.vehicle ? player.vehicle.type : "none";
  let jitter = () => (Math.random() - 0.5) * 0.06;

  if (vType === "arty") {
    playSound(120, "sawtooth", 0.22, 0.08);
    [-0.16, 0, 0.16].forEach(off => {
      let a = player.angle + off + jitter();
      bullets.push({ team: "ally", fromPlayer: true, owner: player, x: barrel.x, y: barrel.y, vx: Math.cos(a) * 7.8, vy: Math.sin(a) * 7.8, dmg: 38, isRocket: true, life: 105 });
    });
  } else if (vType === "tank") {
    playSound(140, "sawtooth", 0.18, 0.08);
    let a = player.angle + jitter() * 0.5;
    bullets.push({ team: "ally", fromPlayer: true, owner: player, x: barrel.x, y: barrel.y, vx: Math.cos(a) * 9.5, vy: Math.sin(a) * 9.5, dmg: 52, isRocket: true, life: 72 });
  } else if (vType === "jeep") {
    playSound(280, "square", 0.06, 0.05);
    [-0.06, 0.06].forEach(off => {
      let a = player.angle + off + jitter();
      bullets.push({ team: "ally", fromPlayer: true, owner: player, x: barrel.x, y: barrel.y, vx: Math.cos(a) * 10.5, vy: Math.sin(a) * 10.5, dmg: 16, life: 52 });
    });
  } else {
    playSound(210, "square", 0.09, 0.05);
    let angles = player.gunLv === 2 ? [-0.07, 0.07] : player.gunLv >= 3 ? [-0.14, 0, 0.14] : Array.of(0);
    angles.forEach(off => {
      let a = player.angle + off + jitter();
      bullets.push({ team: "ally", fromPlayer: true, owner: player, x: barrel.x, y: barrel.y, vx: Math.cos(a) * 9.2, vy: Math.sin(a) * 9.2, dmg: player.dmg, life: 62 });
    });
  }
}

function getSmartAngle(bot, desiredAngle) {
  const offsets = [0, 0.6 * bot.avoidDir, -0.6 * bot.avoidDir, 1.2 * bot.avoidDir, -1.2 * bot.avoidDir, 2.0 * bot.avoidDir, -2.0 * bot.avoidDir];
  const lookAhead = bot.size + 26;
  for (let off of offsets) {
    let testA = desiredAngle + off;
    let tx = bot.x + Math.cos(testA) * lookAhead, ty = bot.y + Math.sin(testA) * lookAhead;
    if (tx > 35 && tx < MAP_W - 35 && ty > 35 && ty < MAP_H - 35 && !hitWall(tx, ty, bot.size + 2)) return testA;
  }
  return desiredAngle + (Math.PI / 2) * bot.avoidDir;
}
// === END OF CHUNK 5 OF 8 ===

// === START OF CHUNK 6 OF 8 (OPTIMIZED) ===
function updateBots(list) {
  const rage = (list === allies && allyHQ.hp <= 2500) || (list === enemies && enemyHQ.hp <= 2500);
  const ownedAllyFlags = flags.filter(f => f.owner === "ally");
  const frontFlag = ownedAllyFlags.length > 0 ? ownedAllyFlags.at(ownedAllyFlags.length - 1) : { x: 520, y: 1000 };
  const unitGrid = createSpatialGrid(list);
  for (let i = list.length - 1; i >= 0; i--) {
    let b = list.at(i);
    if (b.hp <= 0) {
      if (b.team === "enemy") {
        totalKills++;
        gold += b.type === "boss" ? 50 : (b.type === "tank" || b.type === "arty") ? 22 : (b.type === "jeep" || b.type === "rocket") ? 16 : (b.type === "builder" ? 14 : 8);
        if (b.lastHitBy) promoteUnit(b.lastHitBy);
      }
      if (Math.abs(b.x - player.x) < 550 && Math.abs(b.y - player.y) < 550) playSound(110, "sawtooth", 0.18, 0.05);
      explosions.push({ x: b.x, y: b.y, r: b.type === "boss" ? 38 : (b.type === "tank" || b.type === "arty") ? 28 : 14, a: 1 });
      if (b.type !== "inf" && b.type !== "medic" && b.type !== "sniper" && b.type !== "builder" && b.type !== "recon" && craters.length < 50) craters.push({ x: b.x, y: b.y, r: 16 });
      list.splice(i, 1); continue;
    }

    if (b.team === "ally" && Math.abs(b.x - allyHQ.x) < 220 && Math.abs(b.y - allyHQ.y) < 220 && b.hp < b.maxHp) b.hp = Math.min(b.maxHp, b.hp + 0.25);
    if (b.type === "medic") {
      if (player.deadTimer === 0 && Math.hypot(player.x - b.x, player.y - b.y) < 135) player.hp = Math.min(player.maxHp, player.hp + 0.08);
      allies.forEach(a => { if (a !== b && Math.abs(a.x - b.x) < 135 && Math.abs(a.y - b.y) < 135) a.hp = Math.min(a.maxHp, a.hp + 0.06); });
    }
    if (b.type === "builder") {
      let myHQ = b.team === "ally" ? allyHQ : enemyHQ;
      if (myHQ.hp < myHQ.maxHp && Math.hypot(myHQ.x - b.x, myHQ.y - b.y) < 180) myHQ.hp = Math.min(myHQ.maxHp, myHQ.hp + 0.35);
      if (--b.buildCd <= 0 && bunkers.length < MAX_BUNKERS) {
        b.buildCd = 340 + Math.floor(Math.random() * 160);
        let dir = b.team === "ally" ? 1 : -1;
        let bx = b.x + dir * 32 - 12, by = b.y - 36;
        let clear = !hitWall(bx + 12, by + 36, 45) && !flags.some(f => Math.hypot(bx - f.x, by - f.y) < 105) && bx > 140 && bx < MAP_W - 160;
        if (clear) { bunkers.push({ x: bx, y: by, w: 24, h: 72, hp: 380, maxHp: 380, isLog: false }); explosions.push({ x: bx + 12, y: by + 36, r: 24, a: 0.45, color: "250, 204, 21" }); }
      }
    }

    // Stagger target scanning every 4 frames for 4x faster AI!
    if (!b.cachedTarget || (b.timer + i) % 4 === 0 || b.cachedTarget.hp <= 0) {
      b.cachedTarget = findTarget(b).target;
    }
    let target = b.cachedTarget;
    let dist = Math.hypot(target.x - b.x, target.y - b.y);

    let myFlag = flags.at(b.lane);
    let holdDist = b.type === "arty" ? 590 : b.type === "sniper" ? 480 : b.type === "rocket" ? 370 : (b.type === "builder" ? 310 : 250);
    let goalX = dist > 540 ? myFlag.x : target.x, goalY = dist > 540 ? myFlag.y : target.y, forceMove = false;

    if (b.team === "ally") {
      if (order === "FOLLOW" && player.deadTimer === 0) {
        let ringA = (i * 1.1) + (b.lane * 0.5);
        goalX = player.x + Math.cos(ringA) * 85; goalY = player.y + Math.sin(ringA) * 85;
        forceMove = Math.hypot(b.x - player.x, b.y - player.y) > 130;
      } else if (order === "HOLD") {
        goalX = frontFlag.x - 40; goalY = frontFlag.y + ((b.lane - 2) * 55);
        forceMove = Math.hypot(b.x - goalX, b.y - goalY) > 140;
      } else if (order === "FLANK") {
        let topSide = b.lane % 2 === 0;
        goalX = b.x < 3250 ? 3350 : enemyHQ.x; goalY = topSide ? 200 : MAP_H - 200;
        forceMove = b.x < 3200 && dist > 260;
      } else if (order === "FOCUS_HQ") {
        goalX = enemyHQ.x; goalY = enemyHQ.y + ((b.lane - 2) * 45);
      } else if (order === "RETREAT") {
        goalX = allyHQ.x + 110; goalY = allyHQ.y + ((b.lane - 2) * 60);
        forceMove = Math.hypot(b.x - allyHQ.x, b.y - allyHQ.y) > 190;
      } else if (b.type === "medic" && player.deadTimer === 0) {
        goalX = player.x - 38; goalY = player.y;
      }
    }

    b.angle = Math.atan2(target.y - b.y, target.x - b.x);
    if (++b.strafeTimer > 65) { b.strafeTimer = 0; b.strafe *= -1; }
    let rawA = (forceMove || b.type === "medic" || dist > holdDist) ? Math.atan2(goalY - b.y, goalX - b.x) : b.angle + (Math.PI / 2) * b.strafe;
    if (b.stuckTimer > 0) { b.stuckTimer--; rawA += (Math.PI / 2) * b.avoidDir; }
    let moveA = getSmartAngle(b, rawA);

    let waterMult = inWaterPond(b.x, b.y) ? 0.5 : 1;
    let spd = b.speed * (rage ? 1.15 : 1) * (order === "RETREAT" && b.team === "ally" ? 1.25 : 1) * waterMult;
    let vx = Math.cos(moveA) * spd, vy = Math.sin(moveA) * spd;

    // Fast bounding-box pre-filter before separation math
    
// Spatial grid: check only nearby units
const nearbyUnits = getNearbyUnits(
  unitGrid,
  b.x,
  b.y,
  b.size + 40
);

for (const o of nearbyUnits) {
  if (o === b) continue;

  let dx = b.x - o.x;
  let dy = b.y - o.y;
  let minR = b.size + o.size + 10;

  if (Math.abs(dx) < minR && Math.abs(dy) < minR) {
    let dSq = dx * dx + dy * dy;

    if (dSq < minR * minR && dSq > 0) {
      let d = Math.sqrt(dSq);
      vx += (dx / d) * 0.7;
      vy += (dy / d) * 0.7;
    }
  }
}

    let oldX = b.x, oldY = b.y;
    if (!hitWall(b.x + vx, b.y, b.size)) b.x += vx;
    if (!hitWall(b.x, b.y + vy, b.size)) b.y += vy;
    b.x = Math.max(30, Math.min(MAP_W - 30, b.x)); b.y = Math.max(30, Math.min(MAP_H - 30, b.y));
    if (Math.abs(b.x - oldX) + Math.abs(b.y - oldY) < spd * 0.25) { b.stuckTimer = 35; if (Math.random() < 0.1) b.avoidDir *= -1; }

    if (b.type !== "medic" && ++b.timer >= (rage ? b.rate * 0.8 : b.rate) && dist < b.range) {
      b.timer = 0;
      if (Math.abs(b.x - player.x) < 520 && Math.abs(b.y - player.y) < 350) {
        flashes.push({ x: b.x + Math.cos(b.angle) * (b.size + 5), y: b.y + Math.sin(b.angle) * (b.size + 5), r: 6, a: 1 });
      }
      let spread = (b.type === "boss" || b.type === "arty") ? [-0.18, 0, 0.18] : Array.of(0);
      let bSpd = b.type === "sniper" ? 13 : (b.type === "rocket" || b.type === "arty") ? 7.2 : 8.2;
      spread.forEach(s => bullets.push({
        team: b.team, fromPlayer: b.type === "arty", owner: b, x: b.x, y: b.y,
        vx: Math.cos(b.angle + s) * bSpd, vy: Math.sin(b.angle + s) * bSpd,
        dmg: b.dmg, isRocket: b.type === "rocket" || b.type === "arty", isSniper: b.type === "sniper"
      }));
    }
  }
}
// === END OF CHUNK 6 OF 8 (OPTIMIZED) ===

// === START OF CHUNK 7 OF 8 ===
function update() {
  if (!gameStarted || paused || gameOver) return;
  if (player.healDelay > 0) player.healDelay--;
  if (orderBanner.timer > 0) orderBanner.timer--;

  for (let i = smokes.length - 1; i >= 0; i--) { if (--smokes.at(i).life <= 0) smokes.splice(i, 1); }

  if (player.deadTimer > 0) {
    player.inCover = false; player.inWater = false; player.inStealth = false; player.inSmoke = false; player.inBuilding = false;
    if (--player.deadTimer === 0) {
      player.hp = player.maxHp;
      let ownedFlags = flags.filter(f => f.owner === "ally");
      let spawn = ownedFlags.length > 0 ? ownedFlags.at(ownedFlags.length - 1) : { x: 180, y: 1000 };
      player.x = spawn.x - 40; player.y = spawn.y;
    }
  } else {
    let stuck = hitWall(player.x, player.y, player.size - 2);
    if (stuck) player.x += (player.x < stuck.x + stuck.w / 2) ? -4 : 4;

    player.inWater = inWaterPond(player.x, player.y);
    player.inSmoke = inSmokeCloud(player.x, player.y);
    player.inStealth = inStealthCover(player.x, player.y);
    player.inBuilding = Boolean(insideBuilding(player.x, player.y));

    let vType = player.vehicle ? player.vehicle.type : "none";
    let baseSpd = vType === "jeep" ? 3.2 : vType === "tank" ? 1.45 : vType === "arty" ? 1.3 : player.speed;
    let moveSpd = baseSpd * (player.inWater ? 0.5 : 1);
    let nx = player.x, ny = player.y;
    if ((keys["w"] || keys["arrowup"]) && player.y > 30) ny -= moveSpd;
    if ((keys["s"] || keys["arrowdown"]) && player.y < MAP_H - 30) ny += moveSpd;
    if ((keys["a"] || keys["arrowleft"]) && player.x > 30) nx -= moveSpd;
    if ((keys["d"] || keys["arrowright"]) && player.x < MAP_W - 30) nx += moveSpd;
    if (!hitWall(nx, player.y, player.size)) player.x = nx;
    if (!hitWall(player.x, ny, player.size)) player.y = ny;

    player.angle = Math.atan2((mouse.y + cam.y) - player.y, (mouse.x + cam.x) - player.x);
    getPeekBarrel();
    if (cooldown > 0) cooldown--;
    let curRate = vType === "jeep" ? 14 : vType === "tank" ? 44 : vType === "arty" ? 72 : player.fireRate;
    if (mouse.down && cooldown === 0) { cooldown = curRate; firePlayerGun(); }
  }

  cam.x = Math.max(0, Math.min(MAP_W - canvas.width, player.x - canvas.width / 2));
  cam.y = Math.max(0, Math.min(MAP_H - canvas.height, player.y - canvas.height / 2));

  buildings.forEach(b => {
    let bluesInside = (player.deadTimer === 0 ? [player, ...allies] : allies).filter(u => u.x > b.x && u.x < b.x + b.w && u.y > b.y && u.y < b.y + b.h);
    let redsInside = enemies.filter(u => u.x > b.x && u.x < b.x + b.w && u.y > b.y && u.y < b.y + b.h);
    if (bluesInside.length > 0 && redsInside.length === 0) {
      bluesInside.forEach(u => { if (u.hp < u.maxHp) u.hp = Math.min(u.maxHp, u.hp + 0.14); });
      if (--b.spawnCd <= 0 && allies.length < MAX_ALLY_HARD) {
        b.spawnCd = 950;
        let unit = makeBot("ally", b.name.includes("VEHICLE") || b.name.includes("FOUNDRY") ? "jeep" : "inf");
        unit.x = b.x + b.w / 2; unit.y = b.y + b.h / 2;
        allies.push(unit);
      }
    }
  });

  for (let i = mines.length - 1; i >= 0; i--) {
    let m = mines.at(i);
    if (enemies.some(en => Math.hypot(en.x - m.x, en.y - m.y) < en.size + 14)) {
      playSound(85, "sawtooth", 0.35, 0.14);
      explosions.push({ x: m.x, y: m.y, r: 58, a: 1 });
      if (craters.length < 70) craters.push({ x: m.x, y: m.y, r: 22 });
      enemies.forEach(en => { if (Math.hypot(en.x - m.x, en.y - m.y) < 75) { en.hp -= 130; en.lastHitBy = player; } });
      mines.splice(i, 1);
    }
  }

  flags.forEach(f => {
    let blues = (player.deadTimer === 0 ? [player, ...allies] : allies).filter(u => Math.hypot(u.x - f.x, u.y - f.y) < 95).length;
    let reds = enemies.filter(u => Math.hypot(u.x - f.x, u.y - f.y) < 95).length;
    if (blues > reds) f.progress = Math.min(100, f.progress + 0.14);
    if (reds > blues) f.progress = Math.max(-100, f.progress - 0.14);
    f.owner = f.progress >= 100 ? "ally" : f.progress <= -100 ? "enemy" : "neutral";
  });

  let allyFlagCount = flags.filter(f => f.owner === "ally").length;
  if (allyFlagCount === 5) { if (--domTimer <= 0) gameOver = "🏆 TOTAL DOMINATION! All 5 Sectors Held!"; }
  else { domTimer = Math.min(2400, domTimer + 2); }

  if (++allyHQ.timer > 55 && enemies.length > 0) {
    let t = enemies.find(u => Math.hypot(u.x - allyHQ.x, u.y - allyHQ.y) < 420);
    if (t) { allyHQ.timer = 0; let a = Math.atan2(t.y - allyHQ.y, t.x - allyHQ.x); bullets.push({ team: "ally", fromPlayer: false, x: 105, y: 1000, vx: Math.cos(a) * 9, vy: Math.sin(a) * 9, dmg: 26, life: 55 }); }
  }
  if (++enemyHQ.timer > 55) {
    let targets = player.deadTimer > 0 ? allies : [player, ...allies];
    let t = targets.find(u => Math.hypot(u.x - enemyHQ.x, u.y - enemyHQ.y) < 420);
    if (t) { enemyHQ.timer = 0; let a = Math.atan2(t.y - enemyHQ.y, t.x - enemyHQ.x); bullets.push({ team: "enemy", fromPlayer: false, x: 4295, y: 1000, vx: Math.cos(a) * 9, vy: Math.sin(a) * 9, dmg: 24, life: 55 }); }
  }

  updateBots(allies); updateBots(enemies);

  for (let i = bullets.length - 1; i >= 0; i--) {
    let bl = bullets.at(i); bl.x += bl.vx; bl.y += bl.vy;
    if (bl.life === undefined) bl.life = bl.isSniper ? 85 : bl.isRocket ? 105 : 65;
    if (bl.isRocket && Math.random() < 0.65 && shellTrails.length < 180) shellTrails.push({ x: bl.x, y: bl.y, r: 3.5, a: 0.45 });

    if (--bl.life <= 0) {
      if (bl.isRocket) {
        explosions.push({ x: bl.x, y: bl.y, r: 44, a: 0.9 });
        let splashTargets = bl.team === "ally" ? enemies : (player.deadTimer > 0 ? allies : [player, ...allies]);
        splashTargets.forEach(s => { if (Math.hypot(s.x - bl.x, s.y - bl.y) < 65) { s.hp -= bl.dmg * 0.7; s.lastHitBy = bl.owner; } });
      }
      bullets.splice(i, 1); continue;
    }

    
let wall = hitWall(bl.x, bl.y, 0, bl.fromPlayer);

if (wall) {
  // Protect the wall the player is currently using as cover.
  let isPlayerProtectingThisWall =
    bl.owner === player &&
    hitWall(player.x, player.y, player.size + 14) === wall;

  if (!isPlayerProtectingThisWall) {
    wall.hp -= bl.dmg * (bl.isRocket ? 2.5 : 1);

    if (wall.hp <= 0) {
      bunkers = bunkers.filter(w => w !== wall);
    }
  }

  if (bl.isRocket) {
    explosions.push({ x: bl.x, y: bl.y, r: 28, a: 0.9 });
  }

  bullets.splice(i, 1);
  continue;
}

    if (bl.x < 0 || bl.x > MAP_W || bl.y < 0 || bl.y > MAP_H) { bullets.splice(i, 1); continue; }

    if (bl.team === "ally") {
      if (Math.hypot(bl.x - enemyHQ.x, bl.y - enemyHQ.y) < 48) {
        enemyHQ.hp -= bl.dmg;
        if (bl.isRocket) explosions.push({ x: bl.x, y: bl.y, r: 42, a: 0.9 });
        bullets.splice(i, 1); continue;
      }
      for (let en of enemies) {
        if (Math.hypot(bl.x - en.x, bl.y - en.y) < en.size + 4) {
          if (bl.isRocket) {
            playSound(95, "sawtooth", 0.25, 0.08);
            explosions.push({ x: bl.x, y: bl.y, r: 48, a: 0.95 });
            enemies.forEach(s => { if (Math.hypot(s.x - bl.x, s.y - bl.y) < 70) { s.hp -= bl.dmg; s.lastHitBy = bl.owner; } });
          } else { en.hp -= bl.dmg; en.lastHitBy = bl.owner; }
          bullets.splice(i, 1); break;
        }
      }
    } else {
      if (Math.hypot(bl.x - allyHQ.x, bl.y - allyHQ.y) < 48) { allyHQ.hp -= bl.dmg; bullets.splice(i, 1); continue; }
      let bldg = insideBuilding(bl.x, bl.y);
      if (bldg && !insideBuilding(player.x, player.y)) {
        bldg.hp -= bl.dmg;
        if (bldg.hp <= 0) { buildings = buildings.filter(w => w !== bldg); explosions.push({ x: bldg.x + bldg.w / 2, y: bldg.y + bldg.h / 2, r: 75, a: 1 }); }
        bullets.splice(i, 1); continue;
      }
      if (player.deadTimer === 0 && Math.hypot(bl.x - player.x, bl.y - player.y) < player.size) {
        let dmgMult = player.inBuilding ? 0.5 : (player.inSmoke ? 0.55 : (player.inCover ? 0.6 : (player.inStealth ? 0.75 : 1)));
        let incoming = bl.dmg * dmgMult;
        if (bl.isRocket) explosions.push({ x: bl.x, y: bl.y, r: 30, a: 0.9 });
        bullets.splice(i, 1);
        if (player.vehicle) {
          player.vehicle.hp -= incoming;
          if (player.vehicle.hp <= 0) {
            playSound(85, "sawtooth", 0.4, 0.16);
            explosions.push({ x: player.x, y: player.y, r: 48, a: 1 });
            player.vehicle = null; player.size = 15;
            orderBanner = { text: "💥 VEHICLE DESTROYED - EJECTED!", timer: 110 };
          }
        } else {
          player.hp -= incoming; player.healDelay = 240;
          if (player.hp <= 0) { player.deadTimer = 240; playSound(80, "sawtooth", 0.4, 0.15); explosions.push({ x: player.x, y: player.y, r: 40, a: 1 }); }
        }
        continue;
      }
      for (let al of allies) {
        if (Math.hypot(bl.x - al.x, bl.y - al.y) < al.size + 4) {
          let def = insideBuilding(al.x, al.y) ? 0.5 : (inSmokeCloud(al.x, al.y) ? 0.55 : (inStealthCover(al.x, al.y) ? 0.75 : 1));
          al.hp -= bl.dmg * def;
          if (bl.isRocket) explosions.push({ x: bl.x, y: bl.y, r: 28, a: 0.9 });
          bullets.splice(i, 1); break;
        }
      }
    }
  }

  if (allyHQ.hp <= 0) { allyHQ.hp = 0; gameOver = "💀 DEFEAT! Your HQ Was Destroyed!"; }
  if (enemyHQ.hp <= 0) { enemyHQ.hp = 0; gameOver = "🏆 VICTORY! Enemy HQ Destroyed!"; }

  document.getElementById("ally-hq").innerText = Math.max(0, Math.round(allyHQ.hp));
  document.getElementById("enemy-hq").innerText = Math.max(0, Math.round(enemyHQ.hp));
  document.getElementById("hp").innerText = player.vehicle ? `${Math.round(player.vehicle.hp)} (Veh)` : Math.max(0, Math.round(player.hp));
  document.getElementById("gold").innerText = Math.floor(gold);
  document.getElementById("pop").innerText = `${allies.length}/${MAX_ALLY_HARD}`;
  document.getElementById("kills").innerText = totalKills;
  document.getElementById("flags").innerText = `${allyFlagCount} / 5`;
  document.getElementById("order").innerText = order;
  document.getElementById("gun-lv").innerText = player.gunLv;
}

// === END OF CHUNK 7 OF 8 ===

// === START OF OPTIMIZED DRAW TOP ===
function drawUnit(x, y, size, angle, color, isCircle, barrelLen = 7, type = "inf") {
  ctx.save();
  ctx.translate(x, y);

  // Ground shadow
  ctx.fillStyle = "rgba(0, 0, 0, 0.32)";
  ctx.beginPath();
  ctx.ellipse(2, 3, size * 1.05, size * 0.85, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.rotate(angle);

  if (type === "tank" || type === "boss") {
    // Treads
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(-size - 2, -size - 3, (size + 2) * 2, 5);
    ctx.fillRect(-size - 2, size - 2, (size + 2) * 2, 5);
    // Armored Hull
    ctx.fillStyle = color;
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 1.8;
    ctx.fillRect(-size, -size + 1, size * 2, (size - 1) * 2);
    ctx.strokeRect(-size, -size + 1, size * 2, (size - 1) * 2);
    // Engine grill
    ctx.fillStyle = "rgba(15, 23, 42, 0.55)";
    ctx.fillRect(-size + 2, -size + 4, 5, (size - 4) * 2);
    // Cannon & Muzzle Brake
    ctx.fillStyle = "#94a3b8";
    ctx.fillRect(0, -3, size + barrelLen + 4, 6);
    ctx.fillStyle = "#334155";
    ctx.fillRect(size + barrelLen + 1, -4, 4, 8);
    // Turret Dome
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(-1, 0, size * 0.62, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (type === "jeep" || type === "arty") {
    // Tires
    ctx.fillStyle = "#090d16";
    ctx.fillRect(-size + 1, -size - 3, 7, 3);
    ctx.fillRect(size - 8, -size - 3, 7, 3);
    ctx.fillRect(-size + 1, size, 7, 3);
    ctx.fillRect(size - 8, size, 7, 3);
    // Chassis
    ctx.fillStyle = color;
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 1.5;
    ctx.fillRect(-size, -size + 1, size * 2, (size - 1) * 2);
    ctx.strokeRect(-size, -size + 1, size * 2, (size - 1) * 2);
    // Windshield
    ctx.fillStyle = "#38bdf8";
    ctx.fillRect(size * 0.25, -size + 3, 4, (size - 3) * 2);
    if (type === "arty") {
      // Twin Rocket Rails
      ctx.fillStyle = "#475569";
      ctx.fillRect(-size + 2, -6, size + 9, 4);
      ctx.fillRect(-size + 2, 2, size + 9, 4);
      ctx.fillStyle = "#f97316";
      ctx.fillRect(6, -5.5, 4, 3);
      ctx.fillRect(6, 2.5, 4, 3);
    } else {
      // Roof HMG
      ctx.fillStyle = "#cbd5e1";
      ctx.fillRect(-1, -2, size + 7, 4);
    }
  } else {
    // Soldier Shoulders / Vest
    ctx.fillStyle = color;
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.72, size * 1.12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Weapon / Launcher
    if (type === "rocket") {
      ctx.fillStyle = "#334155";
      ctx.fillRect(-6, 3, size + barrelLen + 7, 5);
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(size + barrelLen - 1, 2.5, 3, 6);
    } else {
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(1, -2, size + barrelLen, 3.5);
      if (type === "sniper") {
        ctx.fillStyle = "#38bdf8";
        ctx.fillRect(4, -3, 5, 1.5);
      }
    }

    // Helmet
    ctx.fillStyle = type === "medic" ? "#f8fafc" : type === "builder" ? "#facc15" : type === "sniper" ? "#14532d" : "#334155";
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.65, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (type === "medic") {
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(-3, -1, 6, 2);
      ctx.fillRect(-1, -3, 2, 6);
    }
  }
  ctx.restore();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save(); ctx.translate(-cam.x, -cam.y);

  const onScreen = (x, y, pad = 120) => x + pad > cam.x && x - pad < cam.x + canvas.width && y + pad > cam.y && y - pad < cam.y + canvas.height;

  ctx.strokeStyle = "rgba(255, 255, 255, 0.03)"; ctx.lineWidth = 1;
  for (let gx = Math.floor(cam.x / 100) * 100; gx < cam.x + canvas.width + 100; gx += 100) { ctx.beginPath(); ctx.moveTo(gx, cam.y); ctx.lineTo(gx, cam.y + canvas.height); ctx.stroke(); }
  for (let gy = Math.floor(cam.y / 100) * 100; gy < cam.y + canvas.height + 100; gy += 100) { ctx.beginPath(); ctx.moveTo(cam.x, gy); ctx.lineTo(cam.x + canvas.width, gy); ctx.stroke(); }

  if (biome === "island") {
    ctx.fillStyle = "#1d4ed8"; ctx.fillRect(1990, 0, 420, MAP_H);
    ctx.fillStyle = "rgba(180, 155, 115, 0.4)";
    ctx.fillRect(1975, 0, 15, MAP_H); ctx.fillRect(2410, 0, 15, MAP_H);
    bridges.forEach(br => {
      ctx.fillStyle = "#57534e"; ctx.fillRect(br.x, br.y, br.w, br.h);
      ctx.strokeStyle = "#facc15"; ctx.lineWidth = 3; ctx.strokeRect(br.x, br.y, br.w, br.h);
    });
  }

  scenery.forEach(s => {
    if (!onScreen(s.x, s.y, s.r + 10)) return;
    if (s.type === "grass") { ctx.fillStyle = "rgba(45, 82, 36, 0.5)"; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill(); }
    else if (s.type === "dirt") { ctx.fillStyle = biome === "desert" ? "rgba(180, 140, 80, 0.35)" : "rgba(74, 58, 40, 0.55)"; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill(); }
    else if (s.type === "trench") { ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.angle); ctx.fillStyle = "#1c1917"; ctx.fillRect(-s.r, -8, s.r * 2, 16); ctx.strokeStyle = "#57534e"; ctx.lineWidth = 2; ctx.strokeRect(-s.r, -8, s.r * 2, 16); ctx.restore(); }
    else if (s.type === "pond") { ctx.fillStyle = "#1d4ed8"; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#60a5fa"; ctx.lineWidth = 2; ctx.stroke(); }
    else if (s.type === "rocks") { ctx.fillStyle = "#57534e"; ctx.beginPath(); ctx.arc(s.x - 7, s.y, 8, 0, Math.PI * 2); ctx.arc(s.x + 8, s.y + 4, 6, 0, Math.PI * 2); ctx.fill(); }
  });

  ctx.strokeStyle = "#78716c"; ctx.lineWidth = 16; ctx.strokeRect(8, 8, MAP_W - 16, MAP_H - 16);
  if (biome !== "island") {
    ctx.fillStyle = "#221e17"; ctx.fillRect(0, 955, MAP_W, 90);
    ctx.fillStyle = "rgba(250, 204, 21, 0.25)";
    for (let rx = Math.max(120, Math.floor(cam.x / 50) * 50); rx < Math.min(MAP_W - 120, cam.x + canvas.width + 50); rx += 50) ctx.fillRect(rx, 998, 24, 4);
  }

  craters.forEach(c => { if (onScreen(c.x, c.y, 30)) { ctx.fillStyle = "rgba(15,12,8,0.5)"; ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2); ctx.fill(); } });

  buildings.forEach(b => {
    if (!onScreen(b.x + b.w / 2, b.y + b.h / 2, b.w)) return;
    ctx.fillStyle = "rgba(30, 41, 59, 0.85)"; ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = "#94a3b8"; ctx.lineWidth = 4; ctx.strokeRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = "#f8fafc"; ctx.font = "bold 11px sans-serif"; ctx.textAlign = "center"; ctx.fillText(b.name, b.x + b.w / 2, b.y + 16);
    ctx.fillStyle = "#0f172a"; ctx.fillRect(b.x + 16, b.y - 10, b.w - 32, 5);
    ctx.fillStyle = "#38bdf8"; ctx.fillRect(b.x + 16, b.y - 10, ((b.w - 32) * b.hp) / b.maxHp, 5);
  });

  mines.forEach(m => {
    if (!onScreen(m.x, m.y, 20)) return;
    ctx.fillStyle = "#334155"; ctx.beginPath(); ctx.arc(m.x, m.y, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ef4444"; ctx.beginPath(); ctx.arc(m.x, m.y, 2.2, 0, Math.PI * 2); ctx.fill();
  });

  flags.forEach(f => {
    if (!onScreen(f.x, f.y, 120)) return;
    ctx.fillStyle = f.owner === "ally" ? "rgba(59, 130, 246, 0.14)" : f.owner === "enemy" ? "rgba(239, 68, 68, 0.14)" : "rgba(168, 162, 158, 0.08)";
    ctx.beginPath(); ctx.arc(f.x, f.y, 90, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = f.owner === "ally" ? "#3b82f6" : f.owner === "enemy" ? "#ef4444" : "#a8a29e"; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = ctx.strokeStyle; ctx.font = "bold 13px sans-serif"; ctx.textAlign = "center"; ctx.fillText(`${f.name} (${Math.round(f.progress)}%)`, f.x, f.y - 98);
  });

  bunkers.forEach(b => {
    if (!onScreen(b.x + b.w / 2, b.y + b.h / 2, 100)) return;
    ctx.fillStyle = b.isLog ? (b.hp > 130 ? "#78350f" : "#451a03") : (b.hp > 250 ? "#78716c" : "#57534e");
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = b.isLog ? "#b45309" : "#1c1917"; ctx.lineWidth = 2; ctx.strokeRect(b.x, b.y, b.w, b.h);
    // Sandbag / timber texture lines
    ctx.strokeStyle = "rgba(0,0,0,0.35)"; ctx.lineWidth = 1;
    if (b.w > b.h) { for (let sx = b.x + 14; sx < b.x + b.w; sx += 14) { ctx.beginPath(); ctx.moveTo(sx, b.y); ctx.lineTo(sx, b.y + b.h); ctx.stroke(); } }
    else { for (let sy = b.y + 14; sy < b.y + b.h; sy += 14) { ctx.beginPath(); ctx.moveTo(b.x, sy); ctx.lineTo(b.x + b.w, sy); ctx.stroke(); } }
  });

  ctx.fillStyle = allyHQ.hp <= 2500 ? "#f97316" : "#1d4ed8"; ctx.fillRect(35, 940, 70, 120);
  ctx.strokeStyle = "#93c5fd"; ctx.lineWidth = 3; ctx.strokeRect(35, 940, 70, 120);
  ctx.fillStyle = "#0f172a"; ctx.fillRect(25, 926, 90, 7);
  ctx.fillStyle = "#3b82f6"; ctx.fillRect(25, 926, 90 * Math.max(0, allyHQ.hp / allyHQ.maxHp), 7);

  ctx.fillStyle = enemyHQ.hp <= 2500 ? "#f97316" : "#b91c1c"; ctx.fillRect(4295, 940, 70, 120);
  ctx.strokeStyle = "#fca5a5"; ctx.lineWidth = 3; ctx.strokeRect(4295, 940, 70, 120);
  ctx.fillStyle = "#0f172a"; ctx.fillRect(4285, 926, 90, 7);
  ctx.fillStyle = "#ef4444"; ctx.fillRect(4285, 926, 90 * Math.max(0, enemyHQ.hp / enemyHQ.maxHp), 7);
// === END OF OPTIMIZED DRAW TOP ===

// === START OF OPTIMIZED DRAW BOTTOM (FINAL) ===
  if (player.deadTimer === 0) {
    let badge = player.inBuilding ? "🏠 GARRISON (-50% DMG)" : player.inSmoke ? "💨 SMOKE (-45% DMG)" : player.inCover ? "🛡️ COVER (-40% DMG)" : player.inStealth ? "🌿 STEALTH (-25% DMG)" : "";
    if (badge) {
      ctx.strokeStyle = "#facc15"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(player.x, player.y, player.size + 6, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = "#fde047"; ctx.font = "bold 11px sans-serif"; ctx.textAlign = "center"; ctx.fillText(badge, player.x, player.y - 25);
    }
    if (player.vehicle) {
      let vType = player.vehicle.type;
      let vCol = vType === "arty" ? "#14b8a6" : vType === "tank" ? "#22c55e" : "#3b82f6";
      drawUnit(player.x, player.y, player.size, player.angle, vCol, false, 9, vType);
      ctx.strokeStyle = "#38bdf8"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(player.x, player.y, player.size + 4, 0, Math.PI * 2); ctx.stroke();
    } else {
      drawUnit(player.x, player.y, player.size, player.angle, "#38bdf8", true);
    }
    if (player.rank > 0) { ctx.fillStyle = "#facc15"; ctx.font = "11px sans-serif"; ctx.textAlign = "center"; ctx.fillText("⭐".repeat(player.rank), player.x, player.y + 27); }
    if (orderBanner.timer > 0) { ctx.fillStyle = "#fde047"; ctx.font = "bold 14px sans-serif"; ctx.textAlign = "center"; ctx.fillText(orderBanner.text, player.x, player.y - 42); }
    let prev = getWallPreview();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.25)"; ctx.lineWidth = 1.5; ctx.strokeRect(prev.x, prev.y, prev.w, prev.h);
  }

  for (let i = 0; i < allies.length + enemies.length; i++) {
    let b = i < allies.length ? allies[i] : enemies[i - allies.length];
    if (!onScreen(b.x, b.y, 45)) continue;
    let col = b.type === "medic" ? "#e2e8f0" : b.type === "sniper" ? "#15803d" : b.type === "rocket" ? "#ea580c" :
      b.type === "recon" ? "#0284c7" : b.type === "jeep" ? (b.team === "ally" ? "#2563eb" : "#dc2626") :
      b.type === "arty" ? (b.team === "ally" ? "#0d9488" : "#9333ea") :
      b.type === "builder" ? (b.team === "ally" ? "#eab308" : "#d97706") :
      (b.team === "ally" ? (b.type === "boss" ? "#059669" : b.type === "tank" ? "#166534" : "#22c55e") :
      (b.type === "boss" ? "#7e22ce" : b.type === "tank" ? "#991b1b" : "#dc2626"));
    let bLen = b.type === "sniper" ? 13 : b.type === "rocket" ? 10 : 7;
    drawUnit(b.x, b.y, b.size, b.angle, col, b.type === "medic" || b.type === "sniper" || b.type === "builder" || b.type === "recon", bLen, b.type);
    if (b.type !== "inf") {
      ctx.fillStyle = "#0f172a"; ctx.fillRect(b.x - b.size, b.y - b.size - 7, b.size * 2, 3.5);
      ctx.fillStyle = b.team === "ally" ? "#22c55e" : "#ef4444"; ctx.fillRect(b.x - b.size, b.y - b.size - 7, (b.hp / b.maxHp) * b.size * 2, 3.5);
    }
    if (b.rank > 0) { ctx.fillStyle = "#fde047"; ctx.font = "10px sans-serif"; ctx.textAlign = "center"; ctx.fillText("⭐".repeat(b.rank), b.x, b.y + b.size + 11); }
  }

  trees.forEach(t => {
    if (!onScreen(t.x, t.y, 40)) return;
    ctx.fillStyle = "rgba(0, 0, 0, 0.28)"; ctx.beginPath(); ctx.arc(t.x + 4, t.y + 5, t.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#451a03"; ctx.fillRect(t.x - 3, t.y + 4, 6, 12);
    ctx.fillStyle = t.kind === "pine" ? "#14532d" : t.kind === "palm" ? "#3f6212" : "#166534";
    ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = t.kind === "pine" ? "#15803d" : t.kind === "palm" ? "#65a30d" : "#22c55e";
    ctx.beginPath(); ctx.arc(t.x - 2, t.y - 3, t.r * 0.65, 0, Math.PI * 2); ctx.fill();
  });

  for (let i = shellTrails.length - 1; i >= 0; i--) {
    let st = shellTrails[i];
    if (onScreen(st.x, st.y, 20)) {
      ctx.fillStyle = `rgba(226, 232, 240, ${st.a})`;
      ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2); ctx.fill();
    }
    st.r += 0.14;
    if ((st.a -= 0.018) <= 0) shellTrails.splice(i, 1);
  }

  smokes.forEach(s => {
    if (!onScreen(s.x, s.y, s.r)) return;
    ctx.fillStyle = `rgba(203, 213, 225, ${Math.min(0.62, (s.life / 1800) * 0.85)})`;
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
  });

  for (let i = flashes.length - 1; i >= 0; i--) {
    let f = flashes[i];
    if (onScreen(f.x, f.y, 20)) { ctx.fillStyle = `rgba(254, 240, 138, ${f.a})`; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill(); }
    if ((f.a -= 0.28) <= 0) flashes.splice(i, 1);
  }

  bullets.forEach(b => {
    if (!onScreen(b.x, b.y, 20)) return;
    if (b.isRocket) {
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(Math.atan2(b.vy, b.vx));
      ctx.fillStyle = "#f97316"; ctx.fillRect(-6, -2.5, 11, 5);
      ctx.fillStyle = "#fef08a"; ctx.fillRect(-8, -1.5, 4, 3);
      ctx.restore();
    } else {
      ctx.strokeStyle = b.isSniper ? "#67e8f9" : (b.team === "ally" ? "#fde047" : "#fb7185");
      ctx.lineWidth = b.isSniper ? 2.5 : 2;
      ctx.beginPath();
      ctx.moveTo(b.x - b.vx * 1.4, b.y - b.vy * 1.4);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  });

  for (let i = explosions.length - 1; i >= 0; i--) {
    let ex = explosions[i];
    if (onScreen(ex.x, ex.y, ex.r)) { ctx.fillStyle = `rgba(${ex.color || "255,140,0"},${ex.a})`; ctx.beginPath(); ctx.arc(ex.x, ex.y, ex.r, 0, Math.PI * 2); ctx.fill(); }
    if ((ex.a -= 0.06) <= 0) explosions.splice(i, 1);
  }
  ctx.restore();

  if (flags.every(f => f.owner === "ally") && !gameOver) {
    ctx.fillStyle = "rgba(30, 58, 138, 0.85)"; ctx.fillRect(240, 14, 380, 34);
    ctx.fillStyle = "#facc15"; ctx.font = "bold 16px sans-serif"; ctx.textAlign = "center";
    ctx.fillText(`🚩 DOMINATION VICTORY IN ${(domTimer / 60).toFixed(1)}s!`, 430, 36);
  }

  const mw = 196, mh = 90, mx = canvas.width - mw - 12, my = canvas.height - mh - 12;
  ctx.save(); ctx.beginPath(); ctx.rect(mx, my, mw, mh); ctx.clip();
  ctx.fillStyle = "#030712"; ctx.fillRect(mx, my, mw, mh);
  if (biome === "island") { ctx.fillStyle = "rgba(29, 78, 216, 0.35)"; ctx.fillRect(mx + (1990 / MAP_W) * mw, my, (420 / MAP_W) * mw, mh); }

  ctx.fillStyle = "rgba(30, 58, 138, 0.45)";
  if (player.deadTimer === 0) { ctx.beginPath(); ctx.arc(mx + (player.x / MAP_W) * mw, my + (player.y / MAP_H) * mh, (580 / MAP_W) * mw, 0, Math.PI * 2); ctx.fill(); }
  ctx.beginPath(); ctx.arc(mx + (allyHQ.x / MAP_W) * mw, my + (allyHQ.y / MAP_H) * mh, (520 / MAP_W) * mw, 0, Math.PI * 2); ctx.fill();
  flags.forEach(f => { if (f.owner === "ally") { ctx.beginPath(); ctx.arc(mx + (f.x / MAP_W) * mw, my + (f.y / MAP_H) * mh, (520 / MAP_W) * mw, 0, Math.PI * 2); ctx.fill(); } });
  allies.forEach(a => {
    if (a.type === "recon" || a.type === "jeep") { ctx.fillStyle = "rgba(56, 189, 248, 0.25)"; ctx.beginPath(); ctx.arc(mx + (a.x / MAP_W) * mw, my + (a.y / MAP_H) * mh, (a.vision / MAP_W) * mw, 0, Math.PI * 2); ctx.fill(); }
  });

  buildings.forEach(b => { ctx.fillStyle = "#64748b"; ctx.fillRect(mx + (b.x / MAP_W) * mw, my + (b.y / MAP_H) * mh, 5, 4); });
  flags.forEach(f => { ctx.fillStyle = f.owner === "ally" ? "#3b82f6" : f.owner === "enemy" ? "#ef4444" : "#cbd5e1"; ctx.beginPath(); ctx.arc(mx + (f.x / MAP_W) * mw, my + (f.y / MAP_H) * mh, 4, 0, Math.PI * 2); ctx.fill(); });
  allies.forEach(a => { ctx.fillStyle = a.type === "recon" ? "#38bdf8" : "#4ade80"; ctx.fillRect(mx + (a.x / MAP_W) * mw, my + (a.y / MAP_H) * mh, 2, 2); });
  refreshSpottedEnemyCache();

enemies.forEach(e => {
  if (spottedEnemyCache.get(e)) {
    ctx.fillStyle = "#f87171";
    ctx.fillRect(mx + (e.x / MAP_W) * mw, my + (e.y / MAP_H) * mh, 2.3, 2.3);
  }
});
  if (player.deadTimer === 0) { ctx.fillStyle = "#38bdf8"; ctx.beginPath(); ctx.arc(mx + (player.x / MAP_W) * mw, my + (player.y / MAP_H) * mh, 3.5, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
  ctx.strokeStyle = "#475569"; ctx.lineWidth = 2; ctx.strokeRect(mx, my, mw, mh);

  if (player.deadTimer > 0) { ctx.fillStyle = "#facc15"; ctx.font = "bold 24px sans-serif"; ctx.textAlign = "center"; ctx.fillText(`RESPAWNING IN ${Math.ceil(player.deadTimer / 60)}...`, 430, 45); }
  if (gameOver) {
    ctx.fillStyle = "rgba(0,0,0,0.85)"; ctx.fillRect(0, 0, 860, 500);
    ctx.fillStyle = "#fff"; ctx.font = "bold 32px sans-serif"; ctx.textAlign = "center";
    ctx.fillText(gameOver + " (Press R)", 430, 250);
  }
}
function loop() { update(); draw(); requestAnimationFrame(loop); }
loop();
// === END OF OPTIMIZED DRAW BOTTOM (FINAL) ===

