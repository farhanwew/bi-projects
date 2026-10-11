# BI projects

A collection of analysis and dashboard projects. Each project lives in its own folder.

| Project | What it is | Demo |
|---|---|---|
| [`frozen-food/`](frozen-food/) | Frozen food sales dashboard, April to September 2020 (Vite + React + [Arc UI](https://uiarc.dev)) | [GitHub Pages](https://farhanwew.github.io/bi-projects/) |

## About the data

The raw data and the analysis notebook are **not** in this repo. In the public version, customer names are replaced with "Pelanggan 001" and so on (ranked by revenue); amounts, dates and product names are unchanged. The dashboard copy itself is in Indonesian.

## Running the frozen-food dashboard

```bash
cd frozen-food/dashboard-web
npm install
cp src/data.publik.json src/data.json   # or generate the real data.json from the raw data with build_dashboard_data.py
npm run dev
```

Every push to `main` that touches `frozen-food/dashboard-web/` is deployed to GitHub Pages by `.github/workflows/deploy-frozen-food.yml`.
