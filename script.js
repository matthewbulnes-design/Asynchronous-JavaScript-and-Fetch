
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
  } catch {
  }
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
  statusEl.textContent = msg;
  statusEl.style.color = isError ? "#fca5a5" : "#a7f3d0";
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
  return moveSelects.map(s => s.value).filter(v => v !== "");
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

  if (team.length === 0) {
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = "No team members yet. Load a Pokémon, pick moves, click Add to Team.";
    teamGrid.appendChild(p);
    return;
  }

  team.forEach((member, idx) => {
    const card = document.createElement("div");
    card.className = "teamCard";

    const header = document.createElement("div");
    header.className = "teamHeader";

    const img = document.createElement("img");
    img.src = member.sprite;
    img.alt = member.name;

    const titleWrap = document.createElement("div");
    const h = document.createElement("h3");
    h.textContent = `${idx + 1}. ${member.name}`;
    const small = document.createElement("div");
    small.className = "muted";
    small.textContent = `ID: ${member.id}`;

    titleWrap.appendChild(h);
    titleWrap.appendChild(small);

    header.appendChild(img);
    header.appendChild(titleWrap);

    const ul = document.createElement("ul");
    ul.className = "movesList";
    member.moves.forEach(m => {
      const li = document.createElement("li");
      li.textContent = m;
      ul.appendChild(li);
    });

    const audioWrap = document.createElement("div");
    audioWrap.style.marginTop = "10px";
    if (member.cryUrl) {
      const audio = document.createElement("audio");
      audio.controls = true;
      audio.src = member.cryUrl;
      audioWrap.appendChild(audio);
    } else {
      const note = document.createElement("div");
      note.className = "muted";
      note.textContent = "No cry audio available for this Pokémon.";
      audioWrap.appendChild(note);
    }

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.textContent = "Remove";
    removeBtn.className = "danger";
    removeBtn.style.marginTop = "10px";
    removeBtn.onclick = () => {
      team.splice(idx, 1);
      renderTeam();
    };

    card.appendChild(header);
    card.appendChild(ul);
    card.appendChild(audioWrap);
    card.appendChild(removeBtn);

    teamGrid.appendChild(card);
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
    pokeImgEl.src = spriteUrl;
    pokeImgEl.alt = displayName;

    const cryUrl = pickCryUrl(data);
    pokeAudioEl.src = "";
    audioNoteEl.textContent = "";

    if (cryUrl) {
      pokeAudioEl.src = cryUrl;
      audioNoteEl.textContent = "";
    } else {
      audioNoteEl.textContent = "No cry audio found for this Pokémon.";
    }

    const moveNames = (data.moves || []).map(m => m.move.name);
    moveNames.sort(); 

    fillMoveDropdowns(moveNames);

    addBtn.disabled = false;
    setStatus(`Loaded ${displayName}. Pick 4 moves and click "Add to Team".`);
  } catch (err) {
    setStatus(err.message || "Something went wrong.", true);
  }
}

function handleAddToTeam() {
  if (!currentPokemon) return;

  if (team.length >= 6) {
    setStatus("Team is full (6). Remove one or clear the team.", true);
    return;
  }

  const selected = getSelectedMoves();

  if (selected.length !== 4) {
    setStatus("Please select exactly 4 moves (one in each dropdown).", true);
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

renderTeam();
clearMoveDropdowns();