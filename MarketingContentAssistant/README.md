# Marketing Content Prompt Assistant

## What
An assistant to auto-generate marketing content using Google Gemini. Supports templates (product/audience/tone) and simple A/B prompt testing.

## Quick start
1. Copy `.env.example` to `.env` and add `GEMINI_API_KEY`.
2. Install dependencies:
pip install -r requirements.txt
3. Open `Marketing_Content_Assistant.ipynb` in Jupyter and run cells from top to bottom. The notebook will start a local Flask API and serve endpoints used by the `frontend/` static files.
4. Open `frontend/index.html` in a browser (or visit the Flask static route if you run the server).

## Files
- `templates/prompt_templates.json` — prompt templates
- `frontend/` — simple UI
- `data/ab_test_results.csv` — stored A/B results
- `Marketing_Content_Assistant.ipynb` — main notebook with backend logic and server

## Notes
- Do not commit `.env`.
- Gemini API key must be valid and active.