# Scrabble Solver

A Google Chrome Extension (Manifest V3) and Python backend to find the highest-scoring Scrabble plays on [playscrabble.com](https://playscrabble.com).

## Setup & Installation

### 1. Load the Chrome Extension

1. Open Google Chrome and go to `chrome://extensions/`.
2. Enable the **Developer mode** toggle in the top-right corner.
3. Click **Load unpacked**.
4. Select this directory (`scrabble`).

### 2. Run the Backend Server

Start the Python backend server:

```bash
python server.py
```

It will run on: `http://127.0.0.1:5050`
