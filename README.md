# GrepOrEmbed

Standalone Vite + React case study of [arXiv:2605.15184](https://arxiv.org/abs/2605.15184) (PwC, May 2026), with corroboration from [arXiv:2605.05242](https://arxiv.org/abs/2605.05242).

Every chart number is computed in the browser from JSON transcribed from the paper's HTML tables. The playground runs a real grep scan and, after a one-time ~23 MB download, `all-MiniLM-L6-v2` embeddings, both locally.

The live question: is grep enough, or do embeddings win on this corpus?

## Run

```bash
npm install
npm run dev
```

The app is served at `http://localhost:5173/projects/grep-vs-embeddings/` because production lives on that subpath of the personal site.

```bash
npm run build
npm run preview
```

To serve at `/` instead, build with `VITE_BASE=/`.

## Layout

- `src/data/` transcribed tables and the demo corpus
- `src/components/charts/` Observable Plot figures plus an HTML heatmap
- `src/components/playground/` grep vs vector, paper-style questions, and bring-your-own text
- `docs/` outline, copy, and QA notes

This repo is isolated from the personal-site app on purpose.
