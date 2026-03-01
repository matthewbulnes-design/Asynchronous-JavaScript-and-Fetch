const memoryCache = new Map();
const LS_PREFIX = "pokeCache_v1_";

function normalizeKey(input) {
  return String(input).trim().toLowerCase();
}

function loadFromLocalStorage(key) {
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveToLocalStorage(key, data) {
  try {
    localStorage.setItem(LS_PREFIX + key, JSON.stringify(data));
  } catch {}
}

async function fetchPokemon(nameOrId) {
  const key = normalizeKey(nameOrId);

  if (memoryCache.has(key)) return memoryCache.get(key);

  const fromLS = loadFromLocalStorage(key);
  if (fromLS) {
    memoryCache.set(key, fromLS);
    return fromLS;
  }

  const url = `https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(key)}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error("Pokemon not found. Try a name like 'pikachu' or an ID like '25'.");
  }

  const data = await res.json();
  memoryCache.set(key, data);
  saveToLocalStorage(key, data);
  return data;
}

const pokemonInput = document.getElementById("pokemonInput");
const submitBtn = document.getElementById("submitBtn");
const statusEl = document.getElementById("status");

const pokeNameEl = document.getElementById("pokeName");
const pokeImgEl = document.getElementById("pokeImg");
const pokeAudioEl = document.getElementById("pokeAudio");
const audioNoteEl = document.getElementById("audioNote");

const moveSelects = [
  document.getElementById("move1"),
  document.getElementById("move2"),
  document.getElementById("move3"),
  document.getElementById("move4"),
];

const addBtn = document.getElementById("addBtn");
const teamGrid = document.getElementById("teamGrid");
const clearBtn = document.getElementById("clearBtn");

let currentPokemon = null;
let team = [];

function setStatus(msg, isError = false) {
  statusEl.textContent = "";
}

function capitalize(s) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function clearMoveDropdowns() {
  for (const sel of moveSelects) {
    sel.innerHTML = "";
  }
}

function fillMoveDropdowns(moves) {
  clearMoveDropdowns();

  for (const sel of moveSelects) {
    const opt0 = document.createElement("option");
    opt0.value = "";
    opt0.textContent = "-- choose a move --";
    sel.appendChild(opt0);

    for (const moveName of moves) {
      const opt = document.createElement("option");
      opt.value = moveName;
      opt.textContent = moveName;
      sel.appendChild(opt);
    }
  }
}

function getSelectedMoves() {
  return moveSelects.map((s) => s.value).filter((v) => v !== "");
}

function hasDuplicateMoves(selectedMoves) {
  return new Set(selectedMoves).size !== selectedMoves.length;
}

function pickBestSprite(pokeData) {
  return (
    pokeData?.sprites?.other?.["official-artwork"]?.front_default ||
    pokeData?.sprites?.front_default ||
    ""
  );
}

function pickCryUrl(pokeData) {
  return pokeData?.cries?.latest || pokeData?.cries?.legacy || "";
}

function renderTeam() {
  teamGrid.innerHTML = "";
  if (team.length === 0) return;

  team.forEach((member) => {
    const row = document.createElement("div");
    row.className = "teamCard";

    const left = document.createElement("div");
    left.className = "teamHeader";

    const img = document.createElement("img");
    img.src = member.sprite;
    img.alt = member.name;
    left.appendChild(img);

    const ul = document.createElement("ul");
    ul.className = "movesList";
    member.moves.forEach((m) => {
      const li = document.createElement("li");
      li.textContent = m;
      ul.appendChild(li);
    });

    row.appendChild(left);
    row.appendChild(ul);
    teamGrid.appendChild(row);
  });
}

async function handleSubmit() {
  const inputVal = pokemonInput.value.trim();
  if (!inputVal) {
    setStatus("Please enter a Pokémon name or ID.", true);
    return;
  }

  setStatus("Loading Pokémon data...");
  addBtn.disabled = true;
  currentPokemon = null;

  try {
    const data = await fetchPokemon(inputVal);
    currentPokemon = data;

    const displayName = capitalize(data.name);
    pokeNameEl.textContent = displayName;

    const spriteUrl = pickBestSprite(data);
    if (spriteUrl) {
      pokeImgEl.src = spriteUrl;
      pokeImgEl.alt = displayName;
    }

    const cryUrl = pickCryUrl(data);
    pokeAudioEl.src = "";
    audioNoteEl.textContent = "";

    if (cryUrl) {
      pokeAudioEl.src = cryUrl;
      audioNoteEl.textContent = "";
    } else {
      audioNoteEl.textContent = "No cry audio found for this Pokémon.";
    }

    const moveNames = (data.moves || []).map((m) => m.move.name);
    moveNames.sort();

    fillMoveDropdowns(moveNames);

    addBtn.disabled = false;
    setStatus(`Loaded ${displayName}.`);
  } catch (err) {
    setStatus(err.message || "Something went wrong.", true);
  }
}

function handleAddToTeam() {
  if (!currentPokemon) return;

  if (team.length >= 6) {
    setStatus("Team is full (6).", true);
    return;
  }

  const selected = getSelectedMoves();

  if (selected.length !== 4) {
    setStatus("Please select exactly 4 moves.", true);
    return;
  }

  if (hasDuplicateMoves(selected)) {
    setStatus("No duplicates — choose 4 different moves.", true);
    return;
  }

  const member = {
    id: currentPokemon.id,
    name: capitalize(currentPokemon.name),
    sprite: pickBestSprite(currentPokemon),
    cryUrl: pickCryUrl(currentPokemon),
    moves: selected,
  };

  team.push(member);
  renderTeam();
  setStatus(`${member.name} added to your team!`);
}

submitBtn.addEventListener("click", handleSubmit);

pokemonInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") handleSubmit();
});

addBtn.addEventListener("click", handleAddToTeam);

clearBtn.addEventListener("click", () => {
  team = [];
  renderTeam();
  setStatus("Team cleared.");
});

pokeImgEl.src = "initialpoke.png";
pokeImgEl.alt = "No Pokemon selected";

renderTeam();
clearMoveDropdowns();