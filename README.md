# AI Trainer Level 3 Exam Prep App

# 人工智能训练师三级 · 备考刷题系统

A browser-based exam preparation app for the **China AI Trainer Level 3 (人工智能训练师三级)** professional certification.

Built with Vue 3 + Vue Router 4 (CDN) — zero dependencies, no build tools required.

## Features

- **题库 Question Bank** — 833+ questions (judgment / single-choice / multi-choice), verified against the official exam PDF
- **练习模式 Practice Mode** — 10 questions per page, smart ordering (unseen → wrong → correct), progress persistence, inline stats, "redo page" button
- **考试模式 Exam Mode** — 190 questions, 90-minute countdown, auto-submit, score review
- **多用户 Multi-user** — Local login with per-user practice records and exam history (localStorage)
- **数据集 Datasets** — Bundled CSV/XLSX files for hands-on data processing exercises

## Quick Start

```bash
# Clone the repo
git clone https://github.com/wanhuw/ai_training.git
cd ai_training

# Start a local server (Python 3)
python -m http.server 8888

# Open in browser
# http://localhost:8888/index-vue.html
```

No Node.js, no npm install, no build step needed.

## Project Structure

```
├── index-vue.html          # Entry HTML
├── app-vue.js              # Vue app + all page components
├── questions-data.js       # Question bank data (833+ questions)
├── ops-data.js             # Practical operation task data
├── ops-page-component.js   # Operation page component
├── styles.css              # Global styles
├── pdf-reference-data.json # 900 questions extracted from official PDF
└── datasets/               # CSV/XLSX files for exercises
```

## Tech Stack

| Layer     | Technology                  |
|-----------|-----------------------------|
| Framework | Vue 3 (global production build via CDN) |
| Router    | Vue Router 4 (CDN)         |
| Styling   | Plain CSS                   |
| Storage   | localStorage               |
| Server    | Any static HTTP server      |

## Screenshots

_Coming soon_

## License

MIT
