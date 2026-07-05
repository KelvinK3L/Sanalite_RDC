# Copilot Instructions for SanaLite RDC

## What this project is
- A small hospital management app with a Python/Flask backend and static HTML/JS frontend.
- The runnable server is `web/server.py`; it starts a Flask+SocketIO API and also opens a Tkinter server manager UI.
- Data is persisted directly in JSON files under `web/`: `utilisateurs.json`, `personnel.json`, `patients.json`.

## Key files
- `web/server.py`: main entrypoint, routes, file-based persistence, Socket.IO broadcast, and Tkinter start/stop UI.
- `web/script.js`: login/registration client logic for `index.html` / `s_inscrire.html`.
- `web/Menu/script.js`: dashboard and personnel management frontend for pages under `web/Menu/`.
- `web/index.html`, `web/s_inscrire.html`, `web/dashboard.html`: front-facing pages that depend on localStorage state.

## How to run
- Activate the repository Python venv if available: `source .venv/bin/activate`
- Start the app from repository root: `python web/server.py`
- The server listens on `http://127.0.0.1:5000` and serves static pages from `web/`.
- The Flask app is tightly coupled to its working directory; changes to static paths should preserve the use of `send_from_directory(".", filename)`.

## Important patterns
- Frontend state is stored in `localStorage` keys: `role`, `user`, `centre_sante`, `theme`.
- Login and registration both POST JSON to backend endpoints:
  - `/inscription` -> save to `utilisateurs.json`
  - `/connexion` -> validate against `utilisateurs.json`
- Personnel CRUD uses JSON files and index-based routing:
  - GET `/personnel`
  - POST `/personnel`
  - DELETE `/personnel/{index}`
  - PUT `/personnel/toggle/{index}`
  - PUT `/personnel/justifier/{index}`
- Patient data uses `patients.json` with generated `dossier` values.
- Real-time updates are emitted via `socketio.emit("update_personnel", ...)` and consumed by `web/Menu/script.js`.

## What to preserve in edits
- Keep French UI labels and alert messages consistent with existing pages.
- Preserve the JSON file lock pattern in `web/server.py` when reading/writing `personnel.json` and `patients.json`.
- Avoid adding a new database layer unless the user explicitly requests it; the current architecture is file-based.
- `web/app.py` appears unused, so focus changes on `web/server.py` unless explicitly refactoring route structure.

## Avoid assumptions
- There is no `requirements.txt` or CI config in the repo.
- Do not assume tests exist; if testing is needed, ask before adding a new test framework.
- Do not assume a separate backend service; the backend and static frontend are served together from `web/server.py`.
