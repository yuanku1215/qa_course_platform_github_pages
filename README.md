# Quantum Annealing Course Platform (GitHub Pages)

This repository is a static course site designed for GitHub Pages.
Videos are embedded from YouTube. Course metadata is stored in `data/courses.json`.

## Publish on GitHub Pages
1. Push this repository to GitHub.
2. In your repo: Settings -> Pages
3. Set Source to "Deploy from a branch"
4. Select Branch: `main` and Folder: `/root`
5. Save, then wait for GitHub Pages to publish.

## Local preview
```bash
python3 -m http.server 8000
```
Then open:
- http://127.0.0.1:8000

## Edit content
- Update `data/courses.json`
- Replace `youtube_id` with your real YouTube video IDs
- Optionally add `resources` links for slides and code
