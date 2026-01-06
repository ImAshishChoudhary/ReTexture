# ReTexture Backend API

FastAPI backend for ReTexture - AI-powered creative generation and compliance validation.

## Features

- 🎨 AI Image Variations (3 styles: studio, lifestyle, creative)
- ✅ Tesco Retail Media Compliance Validation
- 🔧 Auto-fix for compliance issues
- 📝 Headline & Subheading Generation
- 🖼️ Background Removal

## Local Development

### Prerequisites
- Python 3.12+
- uv (recommended) or pip

### Setup

1. **Install dependencies:**
```bash
# Using uv (recommended)
uv sync

# Or using pip
pip install -r requirements.txt
```

2. **Configure environment:**
```bash
cp .env.example .env
# Edit .env and add your GOOGLE_API_KEY
```

3. **Run the server:**
```bash
# Using uv
uv run uvicorn app.main:app --reload --port 8000

# Or using uvicorn directly
uvicorn app.main:app --reload --port 8000
```

4. **Access the API:**
- API: http://localhost:8000
- Docs: http://localhost:8000/docs
- Health: http://localhost:8000/health

## Production Deployment

See [DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md) for complete instructions.

### Quick Deploy to Render

1. Push code to GitHub
2. Create new Web Service on Render
3. Configure:
   - **Root Directory:** `Agents`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Add environment variable: `GOOGLE_API_KEY`
5. Deploy!

## API Endpoints

### Health Check
```bash
GET /health
```

### AI Generation
```bash
POST /generate/variations/stream
```

### Validation
```bash
POST /validate
POST /validate/auto-fix
POST /validate/headline
POST /validate/subheading
```

### Background Removal
```bash
POST /remove-bg
```

## Environment Variables

Required:
- `GOOGLE_API_KEY` - Google Gemini API key for AI generation

Optional:
- `GCP_PROJECT_ID` - Google Cloud Project ID (default: firstproject-c5ac2)
- `GCP_LOCATION` - GCP location (default: us-central1)
- `GEMINI_MODEL_ID` - Gemini model (default: gemini-2.5-flash-image)

## Project Structure

```
Agents/
├── app/
│   ├── main.py              # FastAPI app entry point
│   ├── agents/              # AI agent system
│   ├── core/                # Core services (AI, compliance, etc.)
│   ├── routers/             # API endpoints
│   └── resources/           # Compliance rules & prompts
├── requirements.txt         # Python dependencies
├── render.yaml             # Render deployment config
└── .env                    # Environment variables (local only)
```

## Tech Stack

- **Framework:** FastAPI
- **AI:** Google Gemini 2.5 Flash
- **Image Processing:** Pillow, rembg
- **Server:** Uvicorn

## License

MIT