# Setup

1. Create a public repo named exactly like your GitHub username.
2. Copy these files into it (keep the folder structure) and push to `main`.
3. Repo Settings > Actions > General > Workflow permissions > "Read and write permissions".
4. The Action runs on push and generates `assets/hero.png`. You can also run it manually from the Actions tab.

## Run locally (optional)
    npm install
    npm run setup
    npm run render

## Add a new section
Create `src/<name>.html` with a `<div id="card">...</div>`, then reference
`./assets/<name>.png` in README.md. Every .html in `src/` is rendered automatically.
