# Uncloud — Smoking Cessation App

A full-stack application to help people quit smoking. It generates personalized quit plans, tracks daily progress, predicts relapse risk using an ML model, and provides an AI-powered support chatbot.

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Python, FastAPI
- **AI**: Google Gemini API
- **ML**: Scikit-learn (relapse risk prediction)

## Features

- Personalized quit plans based on smoking history and Fagerstrom dependency score
- Daily mood, craving, and cigarette logging
- Relapse risk prediction (Low / Medium / High)
- AI chatbot for real-time support
- Progress tracking with badges and weekly summaries
- Community and resource pages

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+
- A [Google Gemini API key](https://aistudio.google.com/app/apikey)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env      # then add your GEMINI_API_KEY
python main.py
```

The API will be available at `http://localhost:8000`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:3000`.

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|---|---|
| `GEMINI_API_KEY` | Your Google Gemini API key |

### Frontend (`frontend/.env.local`)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API URL (default: `http://localhost:8000`) |

## Project Structure

```
├── backend/
│   ├── main.py                      # FastAPI app and all endpoints
│   ├── relapse_model_pipeline.pkl   # Trained ML model
│   ├── requirements.txt
│   ├── .env.example
│   └── data/                        # JSON data store (users, chats)
└── frontend/
    ├── app/                         # Next.js pages
    ├── components/                  # Reusable UI components
    ├── services/                    # API and Gemini service clients
    └── contexts/                    # React context providers
```

## Author

Jatin Yadav
