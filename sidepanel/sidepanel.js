/**
 * Scrabble State Reader - Side Panel Controller
 * Reads board & rack and sends to Python backend for solver computation & pretty printing.
 */

const SERVER_URL = "http://127.0.0.1:5050";

document.addEventListener("DOMContentLoaded", () => {
  setupEventListeners();
  checkTabConnection();
  checkServerConnection();
});

function setupEventListeners() {
  document.getElementById("btn-scan").addEventListener("click", scanAndSendToServer);
  document.getElementById("btn-test-server").addEventListener("click", () => {
    checkServerConnection(true);
  });
}

/**
 * Checks connection to playscrabble.com tab
 */
async function checkTabConnection() {
  const badge = document.getElementById("connection-status");
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs || tabs.length === 0) {
      badge.textContent = "Tab: None";
      badge.className = "status-badge disconnected";
      return;
    }

    const tab = tabs[0];
    if (tab.url && tab.url.includes("playscrabble.com")) {
      badge.textContent = "Tab: playscrabble.com";
      badge.className = "status-badge connected";
    } else {
      badge.textContent = "Tab: Not PlayScrabble";
      badge.className = "status-badge disconnected";
    }
  } catch (e) {
    badge.textContent = "Tab: Ready";
    badge.className = "status-badge";
  }
}

/**
 * Checks connectivity to the Python backend server
 */
async function checkServerConnection(showToastNotification = false) {
  const badge = document.getElementById("server-status");
  try {
    const res = await fetch(`${SERVER_URL}/health`, { method: "GET" });
    if (res.ok) {
      badge.textContent = "Server: Online (5050)";
      badge.className = "status-badge connected";
      if (showToastNotification) showToast("Python server is online on port 5050!");
      return true;
    } else {
      throw new Error(`Server returned HTTP ${res.status}`);
    }
  } catch (err) {
    badge.textContent = "Server: Offline";
    badge.className = "status-badge disconnected";
    if (showToastNotification) showToast("Server offline (run: python server.py)", 3000);
    return false;
  }
}

/**
 * Reads board & rack from active tab and sends directly to Python backend
 */
async function scanAndSendToServer() {
  const btn = document.getElementById("btn-scan");
  const label = btn.querySelector(".btn-label");

  try {
    btn.classList.add("loading");
    label.textContent = "Reading Game...";

    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs || tabs.length === 0) {
      throw new Error("No active browser tab found.");
    }

    const tab = tabs[0];
    if (!tab.url || !tab.url.includes("playscrabble.com")) {
      throw new Error("Please switch to a tab with playscrabble.com.");
    }

    // 1. Read Board & Rack from Content Script
    let response;
    try {
      response = await chrome.tabs.sendMessage(tab.id, { action: "SCAN_SCRABBLE_STATE" });
    } catch (err) {
      // Fallback: Inject content script dynamically if not present
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content/content.js"]
      });
      response = await chrome.tabs.sendMessage(tab.id, { action: "SCAN_SCRABBLE_STATE" });
    }

    if (!response || !response.success || !response.data) {
      throw new Error(response?.error || "Failed to read board/rack state.");
    }

    const gameState = response.data; // { board: 15x15 2D array of chars, rack: list of chars }

    // 2. Call Python Server /solve endpoint
    label.textContent = "Calling Server...";
    let serverConnected = false;
    let suggestedMove = null;

    try {
      const serverRes = await fetch(`${SERVER_URL}/solve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          board: gameState.board,
          rack: gameState.rack
        })
      });

      if (serverRes.ok) {
        serverConnected = true;
        const result = await serverRes.json();
        suggestedMove = result?.suggested_move;
      }
    } catch (serverErr) {
      serverConnected = false;
    }

    // Update server status badge
    const serverBadge = document.getElementById("server-status");
    if (serverConnected) {
      serverBadge.textContent = "Server: Connected (200)";
      serverBadge.className = "status-badge connected";
      if (suggestedMove && suggestedMove.word) {
        displayBestMove(suggestedMove);
        showToast(`Best move: ${suggestedMove.word} (+${suggestedMove.score} pts)`);
      } else {
        displayBestMove(null);
        showToast("Connected. No move available.", 2500);
      }
    } else {
      serverBadge.textContent = "Server: Offline";
      serverBadge.className = "status-badge disconnected";
      showToast("Read state, but server offline (port 5050)");
    }
  } catch (err) {
    console.error(err);
    showToast(err.message, 3500);
  } finally {
    btn.classList.remove("loading");
    label.textContent = "Read Board & Rack";
    checkTabConnection();
  }
}

/**
 * Standard Scrabble Letter Point Values
 */
const LETTER_POINTS = {
  A: 1, B: 3, C: 3, D: 2, E: 1, F: 4, G: 2, H: 4, I: 1,
  J: 8, K: 5, L: 1, M: 3, N: 1, O: 1, P: 3, Q: 10, R: 1,
  S: 1, T: 1, U: 1, V: 4, W: 4, X: 8, Y: 4, Z: 10
};

/**
 * Maps coordinate (row, col) to standard Scrabble notation (e.g. (7, 3) -> "D8")
 */
function formatStartCell(start) {
  if (!start) return { label: "—", coords: "" };
  let row, col;
  if (Array.isArray(start) && start.length >= 2) {
    row = start[0];
    col = start[1];
  } else if (typeof start === "object" && start !== null) {
    row = start.row ?? start.r;
    col = start.col ?? start.c;
  }
  if (row === undefined || col === undefined || isNaN(row) || isNaN(col)) {
    return { label: "—", coords: "" };
  }
  const colLetter = String.fromCharCode(65 + col);
  const rowNumber = row + 1;
  return {
    label: `${colLetter}${rowNumber}`,
    coords: `(r:${row}, c:${col})`
  };
}

/**
 * Maps direction (e.g. [0, 1] or [1, 0]) to an arrow (→ or ↓) and label
 */
function formatDirection(dir) {
  let isDown = false;
  if (Array.isArray(dir) && dir.length >= 2) {
    const [dRow, dCol] = dir;
    if (dRow === 1 && dCol === 0) {
      isDown = true;
    }
  } else if (typeof dir === "string") {
    if (dir.toLowerCase().includes("down") || dir.toLowerCase().includes("vert")) {
      isDown = true;
    }
  }

  if (isDown) {
    return {
      arrow: "↓",
      name: "Down",
      type: "Vertical",
      className: "dir-down"
    };
  } else {
    return {
      arrow: "→",
      name: "Right",
      type: "Across",
      className: "dir-right"
    };
  }
}

/**
 * Renders the word letters as Scrabble-styled tiles
 */
function renderWordTiles(word) {
  const container = document.getElementById("word-tiles");
  if (!container) return;
  container.innerHTML = "";
  if (!word) return;

  for (const char of word.toUpperCase()) {
    const tile = document.createElement("div");
    tile.className = "scrabble-tile";

    const letterSpan = document.createElement("span");
    letterSpan.className = "tile-letter";
    letterSpan.textContent = char;

    const pointSpan = document.createElement("span");
    pointSpan.className = "tile-point";
    pointSpan.textContent = LETTER_POINTS[char] ?? "";

    tile.appendChild(letterSpan);
    tile.appendChild(pointSpan);
    container.appendChild(tile);
  }
}

/**
 * Visualizes the best move on the side panel
 */
function displayBestMove(move) {
  const resultSection = document.getElementById("move-result-section");
  const noMoveBanner = document.getElementById("no-move-banner");
  if (!resultSection || !noMoveBanner) return;

  if (!move || !move.word || move.word.length === 0) {
    resultSection.classList.add("hidden");
    noMoveBanner.classList.remove("hidden");
    const msgEl = document.getElementById("no-move-msg");
    if (msgEl) {
      msgEl.textContent = "No valid move found (or center square already filled).";
    }
    return;
  }

  noMoveBanner.classList.add("hidden");
  resultSection.classList.remove("hidden");

  // 1. Render tiles
  renderWordTiles(move.word);

  // 2. Score
  const score = move.score || 0;
  const scorePill = document.getElementById("move-score-pill");
  if (scorePill) scorePill.textContent = `+${score} pts`;
  const totalScore = document.getElementById("move-total-score");
  if (totalScore) totalScore.textContent = score;

  // 3. Start cell notation: (7, 3) -> "D8"
  const startInfo = formatStartCell(move.start);
  const startCellEl = document.getElementById("move-start-cell");
  if (startCellEl) startCellEl.textContent = startInfo.label;
  const startCoordEl = document.getElementById("move-start-coord");
  if (startCoordEl) startCoordEl.textContent = startInfo.coords;

  // 4. Direction arrow & label
  const dirInfo = formatDirection(move.direction);
  const arrowEl = document.getElementById("move-dir-arrow");
  if (arrowEl) {
    arrowEl.textContent = dirInfo.arrow;
    arrowEl.className = `dir-arrow ${dirInfo.className}`;
  }
  const dirNameEl = document.getElementById("move-dir-name");
  if (dirNameEl) dirNameEl.textContent = dirInfo.name;
  const dirTypeEl = document.getElementById("move-dir-type");
  if (dirTypeEl) dirTypeEl.textContent = dirInfo.type;
}

/**
 * Toast helper
 */
let toastTimeout = null;
function showToast(msg, duration = 2200) {
  const toast = document.getElementById("toast");
  document.getElementById("toast-text").textContent = msg;
  toast.classList.remove("hidden");
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.add("hidden"), duration);
}

