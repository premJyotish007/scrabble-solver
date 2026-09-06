

import sqlite3
import pickle
from pathlib import Path
from constants import (
    BOARD_SIZE,
    LETTER_POINTS,
    MULTIPLIER_BOARD,
    TRIPLE_WORD_COORDINATES,
    DOUBLE_WORD_COORDINATES,
    TRIPLE_LETTER_COORDINATES,
    DOUBLE_LETTER_COORDINATES,
    DIRECTIONS
)
from collections import Counter

def create_or_load_trie():
    file_path = Path("trie.pickle")
    if not file_path.is_file():
        connection = sqlite3.connect("NWL2023.db")
        cursor = connection.cursor()
        cursor.execute("SELECT word FROM words")
        rows = cursor.fetchall()
        words = [row[0] for row in rows]
        trie = {"": {}}
        for word in words:
            node = trie[""]
            for char in word:
                if char not in node:
                    node[char] = {}
                node = node[char]
            node[""] = {}
        with open("trie.pickle", "wb") as f:
            pickle.dump(trie, f)
        return trie
    else:
        with open("trie.pickle", "rb") as f:
            return pickle.load(f)

def calculate_score(word, starting, dir, board):
    i, j = starting
    score = 0
    new_tiles = 0
    overall_multiplier = 1
    for idx in range(len(word)):
        char = word[idx]
        i_idx, j_idx = i + idx * dir[0], j + idx * dir[1]
        if not board[i_idx][j_idx]:
            new_tiles += 1
            if MULTIPLIER_BOARD[i_idx][j_idx] == "DL":
                score += LETTER_POINTS[char] * 2
            elif MULTIPLIER_BOARD[i_idx][j_idx] == "TL":
                score += LETTER_POINTS[char] * 3
            else:
                score += LETTER_POINTS[char]
                if MULTIPLIER_BOARD[i_idx][j_idx] == "DW":
                    overall_multiplier = 2
                elif MULTIPLIER_BOARD[i_idx][j_idx] == "TW":
                    overall_multiplier = 3
        elif len(board[i_idx][j_idx]) == 1:
            score += LETTER_POINTS[char]
    return score * overall_multiplier + (50 if new_tiles == 7 else 0)



def find_best_move(board, rack):
    """
    Algorithm placeholder for finding the best Scrabble word to play
    given the 15x15 board state and the player's rack.

    Args:
        board: 15x15 list of lists containing characters ("" for empty, "A"-"Z" for placed letters)
        rack: list of single characters on the player's rack (e.g. ['E', 'I', 'U', 'R', 'R', 'M', 'B'])

    Returns:
        dict or None: Details of the suggested move (e.g. word, start_row, start_col, direction, score)
    """
    trie = create_or_load_trie()
    # NOTE: Algorithm implementation will go here (e.g. using NWL2023.db dictionary)
    if board[7][7]:
        # case of middle square is filled, which means we can only connect to existing words on the board
        return {"score": 0, "direction": (0, 0), "word": "", "start": (7, 7)}

    # case of empty middle square, check every permutation of the rack and see which gives highest score
    permutations = []
    def rec(word, rem, node):
        nonlocal permutations
        if "" in node:
            permutations.append(word)
        for key in rem:
            if rem[key] > 0:
                if key in node:
                    rem[key] -= 1
                    rec(f"{word}{key}", rem, node[key])
                    rem[key] += 1
    rec("", Counter(rack), trie[""])
    score, direction, word, start = 0, (0,0), "", (0, 0)

    for p in permutations:
        i, j = 7, 7
        for d_i, d_j in DIRECTIONS:
            i = 7 - len(p) + 1 if d_i == 1 else 7
            j = 7 - len(p) + 1 if d_j == 1 else 7
            for idx in range(len(p)):
                curr_start = (i + idx * d_i, j + idx * d_j)
                curr_score = calculate_score(p, curr_start, (d_i, d_j), board)
                if curr_score > score:
                    score = curr_score
                    direction = (d_i, d_j)
                    word = p
                    start = curr_start
    return {
        "score": score,
        "direction": direction,
        "word": word,
        "start": start
    }

from pprint import pprint

if __name__ == "__main__":
    board=[["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
           ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
           ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
           ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
           ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
           ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
           ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
           ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
           ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
           ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
           ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
           ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
           ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
           ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
           ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]]

    # create_or_load_trie()
    pprint(LETTER_POINTS)
    for row in MULTIPLIER_BOARD:
        print(row)
    rack = ["I", "U", "E", "Y", "V", "N", "H"]
    find_best_move(board, rack)
