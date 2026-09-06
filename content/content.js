/**
 * PlayScrabble.com DOM Scraper Content Script
 * 
 * Simple character-only extraction:
 * - board: 15x15 2D array of characters (empty string "" for unoccupied cells)
 * - rack: list of characters on the player's rack (e.g. ["E", "I", "U", "R", "R", "M", "B"])
 */

(() => {
  /**
   * Scans the 15x15 board table for placed characters.
   * Returns a 15x15 2D array of strings ("" where empty).
   */
  function extractBoard() {
    const board = [];
    for (let r = 0; r < 15; r++) {
      const row = [];
      for (let c = 0; c < 15; c++) {
        let cellEl = document.getElementById(`${r}-${c}`);

        // Fallback: If no id, attempt to find cell by table row/column
        if (!cellEl) {
          const rows = document.querySelectorAll("table tr");
          if (rows[r]) {
            const cells = rows[r].querySelectorAll("td");
            if (cells[c]) cellEl = cells[c];
          }
        }

        let letter = "";
        if (cellEl) {
          // Look for single-character letter element (A-Z)
          const letterCandidates = Array.from(cellEl.querySelectorAll("span, div")).filter((el) => {
            const t = el.textContent.trim().toUpperCase();
            return /^[A-Z]$/.test(t) && el.children.length === 0;
          });

          if (letterCandidates.length > 0) {
            letter = letterCandidates[0].textContent.trim().toUpperCase();
          }
        }
        row.push(letter);
      }
      board.push(row);
    }
    return board;
  }

  /**
   * Scans player's rack tiles.
   * Returns a list of characters (e.g. ["E", "I", "U", "R", "R", "M", "B"]).
   */
  function extractRack() {
    const rack = [];
    const boardTable = document.querySelector("table");
    const allDivs = Array.from(document.querySelectorAll("div"));

    // Find rack tile candidate elements outside the board table
    const candidates = allDivs.filter((el) => {
      if (boardTable && boardTable.contains(el)) return false;

      const span = el.querySelector(":scope > span, span");
      const div = el.querySelector(":scope > div, div");
      if (!span || !div) return false;

      const l = span.textContent.trim().toUpperCase();
      const p = div.textContent.trim();

      const validLetter = l.length === 1 && /^[A-Z]$/.test(l);
      const validBlank = l.length === 0 || l === "?" || l === " ";
      const validPoints = /^\d{1,2}$/.test(p);

      return (validLetter || validBlank) && validPoints;
    });

    // Remove duplicate/nested matches
    const uniqueTiles = [];
    for (const el of candidates) {
      const alreadyHasRelated = uniqueTiles.some((u) => u.contains(el) || el.contains(u));
      if (!alreadyHasRelated && uniqueTiles.length < 7) {
        uniqueTiles.push(el);
      }
    }

    for (const el of uniqueTiles) {
      const span = el.querySelector("span");
      const rawLetter = span ? span.textContent.trim().toUpperCase() : "";
      const letter = rawLetter.length === 1 && /^[A-Z]$/.test(rawLetter) ? rawLetter : "?";
      rack.push(letter);
    }

    return rack;
  }

  /**
   * Complete Game State Extraction
   */
  function extractFullState() {
    return {
      board: extractBoard(),
      rack: extractRack()
    };
  }

  // Listen for messages from the Chrome Extension side panel
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "SCAN_SCRABBLE_STATE") {
      try {
        const state = extractFullState();
        sendResponse({ success: true, data: state });
      } catch (err) {
        sendResponse({ success: false, error: err.message || String(err) });
      }
    } else if (request.action === "PING") {
      sendResponse({ success: true, url: window.location.href });
    }
    return true;
  });

  console.log("[Scrabble State Reader] Content script ready on", window.location.href);
})();
