"""
Scrabble Solver Backend Server

Receives board state (15x15 2D array of characters) and player's rack (list of characters)
from the Scrabble Chrome Extension Side Panel.
"""

import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from constants import (
    BOARD_SIZE,
    LETTER_POINTS,
    MULTIPLIER_BOARD,
    TRIPLE_WORD_COORDINATES,
    DOUBLE_WORD_COORDINATES,
    TRIPLE_LETTER_COORDINATES,
    DOUBLE_LETTER_COORDINATES
)
from solution import create_or_load_trie, find_best_move

app = Flask(__name__)
# Enable CORS so the Chrome Extension side panel can communicate with backend
CORS(app, resources={r"/*": {"origins": "*"}})

PORT = int(os.environ.get("PORT", 5050))


def get_cell_char(cell):
    """Safely extracts the character from a cell whether it is a string or dict."""
    if isinstance(cell, str):
        return cell.strip()
    if isinstance(cell, dict):
        return (cell.get("letter") or "").strip()
    return ""


def print_board_and_rack(board, rack):
    """
    Pretty print the 15x15 Scrabble board and player's rack to console.
    """
    # Rack could be list of strings or list of dicts
    rack_chars = [r if isinstance(r, str) else r.get("letter", "?") for r in rack]
    rack_str = " ".join(rack_chars) if rack_chars else "(empty)"
    print("\n" + "=" * 53)
    print(f"  RACK: [ {rack_str} ]")
    print("=" * 53)
    # Column headers: A to O
    col_headers = " ".join(f"{chr(65 + c):2}" for c in range(BOARD_SIZE))
    print("      " + col_headers)
    print("    +" + "-" * (BOARD_SIZE * 3 + 1) + "+")
    for r_idx, row in enumerate(board):
        row_str = " ".join(f"{get_cell_char(ch) if get_cell_char(ch) else '.':2}" for ch in row)
        print(f"{r_idx + 1:2}  | {row_str} |")
    print("    +" + "-" * (BOARD_SIZE * 3 + 1) + "+")
    print("=" * 53 + "\n")


@app.route("/", methods=["GET"])
@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "ok",
        "service": "Scrabble Solver Server",
        "port": PORT,
        "board_size": f"{BOARD_SIZE}x{BOARD_SIZE}"
    })


@app.route("/solve", methods=["POST", "OPTIONS"])
def solve():
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200

    data = request.get_json(silent=True)
    if not data:
        return jsonify({
            "status": "error",
            "message": "Invalid JSON payload"
        }), 400

    board = data.get("board", [])
    rack = data.get("rack", [])

    # Validate board dimensions
    is_valid_board = (
        isinstance(board, list) and
        len(board) == BOARD_SIZE and
        all(isinstance(row, list) and len(row) == BOARD_SIZE for row in board)
    )

    if not is_valid_board:
        return jsonify({
            "status": "error",
            "message": f"Board must be a {BOARD_SIZE}x{BOARD_SIZE} 2D list of characters."
        }), 400

    if not isinstance(rack, list):
        return jsonify({
            "status": "error",
            "message": "Rack must be a list of characters."
        }), 400

    # Pretty print board and rack to the server terminal
    print_board_and_rack(board, rack)

    # Count placed tiles on the board
    placed_count = sum(1 for row in board for cell in row if get_cell_char(cell) != "")

    # Call solver algorithm placeholder
    best_move = find_best_move(board, rack)

    return jsonify({
        "status": "success",
        "message": f"Server successfully connected on port {PORT}. Received {placed_count} board tiles and {len(rack)} rack tiles.",
        "received": {
            "rack": rack,
            "board_tiles_count": placed_count
        },
        "suggested_move": best_move
    })


if __name__ == "__main__":
    print(f"Starting Scrabble Solver Server on http://127.0.0.1:{PORT} ...")
    app.run(host="0.0.0.0", port=PORT, debug=True)
