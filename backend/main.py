from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import json
import os
import uuid
import logging
from typing import List, Dict, Any, Optional
import google.generativeai as genai
from dotenv import load_dotenv
import re
import requests
from datetime import datetime
import joblib
import pandas as pd

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Initialize the FastAPI app
app = FastAPI(title="No Smoke API", description="Backend API for No Smoke cessation app")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"Request: {request.method} {request.url}")
    response = await call_next(request)
    logger.info(f"Response status: {response.status_code}")
    return response

# Set up Gemini API (will need an API key)
try:
    genai.configure(api_key=os.getenv("GEMINI_API_KEY", ""))
except Exception as e:
    print(f"Error configuring Gemini API: {e}")

# Load Relapse Risk ML model pipeline
RELAPSE_MODEL_PATH = os.path.join(os.path.dirname(__file__), "relapse_model_pipeline.pkl")
relapse_model_pipeline = None
try:
    if os.path.exists(RELAPSE_MODEL_PATH):
        relapse_model_pipeline = joblib.load(RELAPSE_MODEL_PATH)
        logger.info(f"Relapse risk model loaded successfully from '{RELAPSE_MODEL_PATH}'")
    else:
        logger.warning(f"Relapse model not found at '{RELAPSE_MODEL_PATH}'")
except Exception as e:
    logger.error(f"Error loading relapse model: {e}")

# Data file paths
DATA_DIR = "data"
USER_DATA_FILE = os.path.join(DATA_DIR, "users.json")
CHAT_DATA_FILE = os.path.join(DATA_DIR, "chats.json")

# Create data directory if it doesn't exist
os.makedirs(DATA_DIR, exist_ok=True)

# Initialize users data file if it doesn't exist
if not os.path.exists(USER_DATA_FILE):
    with open(USER_DATA_FILE, "w") as f:
        json.dump({"users": []}, f)

# Initialize chat data file if it doesn't exist
if not os.path.exists(CHAT_DATA_FILE):
    with open(CHAT_DATA_FILE, "w") as f:
        json.dump({"chats": []}, f)

# Models
class UserProfile(BaseModel):
    age: int
    cigarettesPerDay: int
    cigaretteType: str
    startDate: str

class WeeklyGoal(BaseModel):
    week: int
    dailyLimit: int
    strategies: List[str]
    tips: List[str]

class DailyLog(BaseModel):
    date: str
    cigarettesSmoked: int
    mood: str
    cravingIntensity: int
    notes: Optional[str] = None

class User(BaseModel):
    userId: str
    profile: UserProfile
    plan: Optional[Dict[str, List[WeeklyGoal]]] = None
    progress: Optional[Dict[str, List[DailyLog]]] = None

class UserInput(BaseModel):
    age: int
    cigarettesPerDay: int
    cigaretteType: str
    years_smoking: Optional[int] = None
    first_cigarette_time: Optional[str] = None   # within_5_min | 6_to_30_min | 31_to_60_min | after_60_min
    primary_trigger: Optional[str] = None         # stress | boredom | social | after_meals | alcohol | work_pressure

TRIGGER_OPTIONS = ["Stress", "Boredom", "After Meals", "Social Situations", "Alcohol", "Work Pressure", "Loneliness", "Morning Routine"]

class DailyLogInput(BaseModel):
    date: str
    cigarettesSmoked: int
    mood: str
    cravingIntensity: int
    sleepHours: Optional[float] = None
    stressLevel: Optional[int] = None
    notes: Optional[str] = None
    triggers: Optional[List[str]] = None
    # Biometric fields — all optional
    heart_rate_avg: Optional[float] = Field(None, ge=30, le=220, description="Average heart rate (bpm)")
    resting_heart_rate: Optional[float] = Field(None, ge=30, le=220, description="Resting heart rate (bpm)")
    heart_rate_variability: Optional[float] = Field(None, ge=10, le=100, description="HRV (ms)")
    step_count: Optional[int] = Field(None, ge=0, le=80000, description="Steps taken today")
    active_minutes: Optional[int] = Field(None, ge=0, le=300, description="Active minutes today")

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatInput(BaseModel):
    message: str
    userId: str
    chatId: Optional[str] = None

class ChatResponse(BaseModel):
    message: str
    resources: Optional[List[Dict[str, str]]] = None
    videos: Optional[List[Dict[str, str]]] = None

# Relapse Risk Prediction schemas
class RelapseRiskRequest(BaseModel):
    model_config = {"protected_namespaces": ()}

    daily_nicotine_intake: float = Field(..., description="Nicotine consumed in mg today", ge=0.0, le=200.0)
    craving_level: int = Field(..., description="Craving level (1-10)", ge=1, le=10)
    stress_level: int = Field(..., description="Stress level (1-10)", ge=1, le=10)
    mood: str = Field(..., description="User's logged mood (e.g., Anxious, Stable, Calm, Stressed)")
    sleep_hours: float = Field(..., description="Number of hours slept", ge=0.0, le=24.0)
    logging_consistency: float = Field(..., description="Percentage of logs filled in last 7 days (0.0–1.0)", ge=0.0, le=1.0)
    deviation_from_plan: int = Field(default=0, description="avg cigarettes smoked - current week plan limit")

class RelapseRiskResponse(BaseModel):
    model_config = {"protected_namespaces": ()}

    relapse_risk_class: int = Field(..., description="Predicted class (0: Low, 1: Medium, 2: High)")
    relapse_risk_label: str = Field(..., description="Human-readable risk label")
    probabilities: dict = Field(..., description="Risk class probabilities")
    model_used: str = Field(..., description="The underlying model classifier")
    craving_pressure: Optional[bool] = Field(None, description="True when nicotine=0 but cravings are very high")

# Helper functions
def load_users():
    with open(USER_DATA_FILE, "r") as f:
        return json.load(f)

def save_users(data):
    with open(USER_DATA_FILE, "w") as f:
        json.dump(data, f, indent=2)

def get_user(user_id):
    data = load_users()
    for user in data["users"]:
        if user["userId"] == user_id:
            return user
    return None

def load_chats():
    with open(CHAT_DATA_FILE, "r") as f:
        return json.load(f)

def save_chats(data):
    with open(CHAT_DATA_FILE, "w") as f:
        json.dump(data, f, indent=2)

def get_chat(chat_id):
    data = load_chats()
    for chat in data["chats"]:
        if chat["chatId"] == chat_id:
            return chat
    return None

# Function to extract YouTube video info from query
def search_youtube_videos(query, max_results=3):
    try:
        # Standardize query for comparison
        query_lower = query.lower()
        
        # Define categories of videos with relevant keywords
        categories = {
            "cravings":       ["craving", "urge", "need", "want", "desperate", "help me", "can't control", "hard", "difficult"],
            "relapse":        ["relapse", "fell back", "smoked again", "started smoking", "gave in", "failed", "slip"],
            "motivation":     ["motivation", "encourage", "why quit", "benefits", "health", "inspire"],
            "techniques":     ["technique", "method", "how to", "strategy", "ways to", "tips", "help"],
            "withdrawal":     ["withdrawal", "symptom", "feeling", "irritable", "mood"],
            "success":        ["success", "story", "testimony", "quit", "stopped", "free from"],
            "breathing":      ["breath", "breathing", "inhale", "exhale", "4-7-8", "box breath"],
            "meditation":     ["meditation", "mindful", "mindfulness", "guided", "calm down"],
            "sleep":          ["sleep", "insomnia", "rest", "tired", "night", "awake"],
            "exercise":       ["exercise", "walk", "workout", "physical", "activity", "run"],
            "anxiety":        ["anxiety", "anxious", "nervous", "panic", "worry", "stress"],
            "triggers":       ["trigger", "situation", "after meal", "social", "alcohol", "boredom", "habit"],
            "success_stories":["success story", "real story", "testimonial", "personal", "journey", "years"],
        }
        
        # Video database
        video_database = {
            "cravings": [
                {
                    "title": "Coping with Tobacco Triggers and Cravings",
                    "thumbnail": "https://i.ytimg.com/vi/vakBb-3ZPV8/hqdefault.jpg",
                    "url": "https://www.youtube.com/watch?v=vakBb-3ZPV8",
                    "channel": "ProMedica",
                    "keywords": ["craving", "urge", "trigger", "stop", "immediate relief"]
                },
                {
                    "title": "How to Deal with Nicotine Cravings",
                    "thumbnail": "https://i.ytimg.com/vi/ltUXfmMiC9k/hqdefault.jpg",
                    "url": "https://www.youtube.com/watch?v=ltUXfmMiC9k",
                    "channel": "Doctor O'Donovan",
                    "keywords": ["craving", "nicotine", "manage", "understand"]
                },
                {
                    "title": "5 Tips to Beat Cigarette Cravings",
                    "thumbnail": "https://i.ytimg.com/vi/yzIM9z-VUDE/hqdefault.jpg",
                    "url": "https://www.youtube.com/watch?v=yzIM9z-VUDE",
                    "channel": "Healthy Canadians",
                    "keywords": ["craving", "tips", "beat", "overcome", "urge"]
                },
            ],
            "relapse": [
                {
                    "title": "Smoking Cessation - 3 steps to quitting",
                    "thumbnail": "https://i.ytimg.com/vi/qdhwmZml-Hk/hqdefault.jpg",
                    "url": "https://www.youtube.com/watch?v=qdhwmZml-Hk",
                    "channel": "Health Education",
                    "keywords": ["relapse", "recovery", "don't give up", "bounce back"]
                },
                {
                    "title": "What to Do After a Smoking Relapse",
                    "thumbnail": "https://i.ytimg.com/vi/z16vhtjWKL0/hqdefault.jpg",
                    "url": "https://www.youtube.com/watch?v=z16vhtjWKL0",
                    "channel": "Dr. Mike Evans",
                    "keywords": ["relapse", "slip", "after", "next steps", "recovery"]
                },
                {
                    "title": "Overcoming Setbacks When Quitting Smoking",
                    "thumbnail": "https://i.ytimg.com/vi/2Phw5IN2TN4/hqdefault.jpg",
                    "url": "https://www.youtube.com/watch?v=2Phw5IN2TN4",
                    "channel": "CDC",
                    "keywords": ["relapse", "setback", "overcome", "quit again"]
                },
            ],
            "motivation": [
                {
                    "title": "What is the Single Best Thing You Can Do to Quit Smoking?",
                    "thumbnail": "https://i.ytimg.com/vi/z16vhtjWKL0/hqdefault.jpg",
                    "url": "https://www.youtube.com/watch?v=z16vhtjWKL0",
                    "channel": "Dr. Mike Evans",
                    "keywords": ["health", "benefits", "timeline", "body recovery", "motivation"]
                },
                {
                    "title": "Why You Should Quit Smoking Right Now",
                    "thumbnail": "https://i.ytimg.com/vi/XH61vd2yFCg/hqdefault.jpg",
                    "url": "https://www.youtube.com/watch?v=XH61vd2yFCg",
                    "channel": "Manipal Hospitals",
                    "keywords": ["motivation", "inspire", "why quit", "health benefits"]
                },
                {
                    "title": "How I Quit Smoking After 20 Years",
                    "thumbnail": "https://i.ytimg.com/vi/vakBb-3ZPV8/hqdefault.jpg",
                    "url": "https://www.youtube.com/watch?v=vakBb-3ZPV8",
                    "channel": "ProMedica",
                    "keywords": ["motivation", "success", "story", "long-term smoker", "quit"]
                },
            ],
            "techniques": [
                {
                    "title": "How to successfully QUIT SMOKING TODAY | A doctor's guide",
                    "thumbnail": "https://i.ytimg.com/vi/ltUXfmMiC9k/hqdefault.jpg",
                    "url": "https://www.youtube.com/watch?v=ltUXfmMiC9k",
                    "channel": "Doctor O'Donovan",
                    "keywords": ["method", "techniques", "strategy", "delay", "distract"]
                },
                {
                    "title": "How to make a plan to quit smoking",
                    "thumbnail": "https://i.ytimg.com/vi/yzIM9z-VUDE/hqdefault.jpg",
                    "url": "https://www.youtube.com/watch?v=yzIM9z-VUDE",
                    "channel": "Healthy Canadians",
                    "keywords": ["plan", "exercises", "techniques", "withdrawal", "relief"]
                },
                {
                    "title": "Nicotine Replacement Therapy Explained",
                    "thumbnail": "https://i.ytimg.com/vi/qdhwmZml-Hk/hqdefault.jpg",
                    "url": "https://www.youtube.com/watch?v=qdhwmZml-Hk",
                    "channel": "Health Education",
                    "keywords": ["NRT", "patch", "gum", "nicotine replacement", "technique"]
                },
            ],
            "withdrawal": [
                {
                    "title": "Brief Tobacco Cessation Interventions",
                    "thumbnail": "https://i.ytimg.com/vi/2Phw5IN2TN4/hqdefault.jpg",
                    "url": "https://www.youtube.com/watch?v=2Phw5IN2TN4",
                    "channel": "CDC",
                    "keywords": ["withdrawal", "symptoms", "nicotine", "manage", "cope", "anxiety"]
                },
                {
                    "title": "What Happens to Your Body When You Quit Smoking",
                    "thumbnail": "https://i.ytimg.com/vi/XH61vd2yFCg/hqdefault.jpg",
                    "url": "https://www.youtube.com/watch?v=XH61vd2yFCg",
                    "channel": "Manipal Hospitals",
                    "keywords": ["withdrawal", "body", "timeline", "symptoms", "what happens"]
                },
                {
                    "title": "Managing Nicotine Withdrawal Symptoms",
                    "thumbnail": "https://i.ytimg.com/vi/vakBb-3ZPV8/hqdefault.jpg",
                    "url": "https://www.youtube.com/watch?v=vakBb-3ZPV8",
                    "channel": "ProMedica",
                    "keywords": ["withdrawal", "irritability", "mood", "manage", "symptoms"]
                },
            ],
            "success": [
                {
                    "title": "Every Puff Kills : What Happens When You Quit Smoking",
                    "thumbnail": "https://i.ytimg.com/vi/XH61vd2yFCg/hqdefault.jpg",
                    "url": "https://www.youtube.com/watch?v=XH61vd2yFCg",
                    "channel": "Manipal Hospitals",
                    "keywords": ["success", "smoke-free", "body changes", "health improvements"]
                },
                {
                    "title": "One Year Smoke Free - My Journey",
                    "thumbnail": "https://i.ytimg.com/vi/z16vhtjWKL0/hqdefault.jpg",
                    "url": "https://www.youtube.com/watch?v=z16vhtjWKL0",
                    "channel": "Dr. Mike Evans",
                    "keywords": ["success", "one year", "smoke free", "journey", "story"]
                },
                {
                    "title": "Tips From People Who Successfully Quit Smoking",
                    "thumbnail": "https://i.ytimg.com/vi/yzIM9z-VUDE/hqdefault.jpg",
                    "url": "https://www.youtube.com/watch?v=yzIM9z-VUDE",
                    "channel": "Healthy Canadians",
                    "keywords": ["success", "tips", "ex-smokers", "advice", "quit"]
                },
            ],
            "breathing": [
                {
                    "title": "4-7-8 Breathing Technique for Cravings",
                    "thumbnail": "https://i.ytimg.com/vi/vakBb-3ZPV8/hqdefault.jpg",
                    "url": "https://www.youtube.com/watch?v=vakBb-3ZPV8",
                    "channel": "ProMedica",
                    "keywords": ["breathing", "4-7-8", "breath", "inhale", "exhale", "craving relief"]
                },
                {
                    "title": "Deep Breathing Exercises to Quit Smoking",
                    "thumbnail": "https://i.ytimg.com/vi/2Phw5IN2TN4/hqdefault.jpg",
                    "url": "https://www.youtube.com/watch?v=2Phw5IN2TN4",
                    "channel": "CDC",
                    "keywords": ["breathing", "deep breath", "exercise", "relaxation", "quit"]
                },
                {
                    "title": "Box Breathing for Stress and Cravings",
                    "thumbnail": "https://i.ytimg.com/vi/ltUXfmMiC9k/hqdefault.jpg",
                    "url": "https://www.youtube.com/watch?v=ltUXfmMiC9k",
                    "channel": "Doctor O'Donovan",
                    "keywords": ["box breathing", "stress", "calm", "breathing technique"]
                },
            ],
            "meditation": [
                {
                    "title": "Mindfulness Meditation for Smoking Cessation",
                    "thumbnail": "https://i.ytimg.com/vi/qdhwmZml-Hk/hqdefault.jpg",
                    "url": "https://www.youtube.com/watch?v=qdhwmZml-Hk",
                    "channel": "Health Education",
                    "keywords": ["meditation", "mindfulness", "quit smoking", "calm", "focus"]
                },
                {
                    "title": "Guided Meditation to Overcome Smoking Urges",
                    "thumbnail": "https://i.ytimg.com/vi/XH61vd2yFCg/hqdefault.jpg",
                    "url": "https://www.youtube.com/watch?v=XH61vd2yFCg",
                    "channel": "Manipal Hospitals",
                    "keywords": ["meditation", "guided", "urge", "overcome", "smoking"]
                },
                {
                    "title": "5-Minute Meditation for Nicotine Cravings",
                    "thumbnail": "https://i.ytimg.com/vi/yzIM9z-VUDE/hqdefault.jpg",
                    "url": "https://www.youtube.com/watch?v=yzIM9z-VUDE",
                    "channel": "Healthy Canadians",
                    "keywords": ["meditation", "5 minute", "nicotine", "craving", "quick"]
                },
            ],
            "sleep": [
                {
                    "title": "How Quitting Smoking Improves Your Sleep",
                    "thumbnail": "https://i.ytimg.com/vi/z16vhtjWKL0/hqdefault.jpg",
                    "url": "https://www.youtube.com/watch?v=z16vhtjWKL0",
                    "channel": "Dr. Mike Evans",
                    "keywords": ["sleep", "quit smoking", "improve", "rest", "insomnia"]
                },
                {
                    "title": "Sleep Tips for People Quitting Smoking",
                    "thumbnail": "https://i.ytimg.com/vi/vakBb-3ZPV8/hqdefault.jpg",
                    "url": "https://www.youtube.com/watch?v=vakBb-3ZPV8",
                    "channel": "ProMedica",
                    "keywords": ["sleep", "tips", "quitting", "night", "rest"]
                },
                {
                    "title": "Nicotine Withdrawal and Sleep Disturbances",
                    "thumbnail": "https://i.ytimg.com/vi/2Phw5IN2TN4/hqdefault.jpg",
                    "url": "https://www.youtube.com/watch?v=2Phw5IN2TN4",
                    "channel": "CDC",
                    "keywords": ["sleep", "withdrawal", "disturbance", "nicotine", "night"]
                },
            ],
            "exercise": [
                {
                    "title": "Exercise as a Tool to Quit Smoking",
                    "thumbnail": "https://i.ytimg.com/vi/ltUXfmMiC9k/hqdefault.jpg",
                    "url": "https://www.youtube.com/watch?v=ltUXfmMiC9k",
                    "channel": "Doctor O'Donovan",
                    "keywords": ["exercise", "quit smoking", "physical activity", "tool", "help"]
                },
                {
                    "title": "Walking to Beat Cigarette Cravings",
                    "thumbnail": "https://i.ytimg.com/vi/qdhwmZml-Hk/hqdefault.jpg",
                    "url": "https://www.youtube.com/watch?v=qdhwmZml-Hk",
                    "channel": "Health Education",
                    "keywords": ["exercise", "walk", "craving", "distract", "physical"]
                },
                {
                    "title": "How Physical Activity Helps You Quit Smoking",
                    "thumbnail": "https://i.ytimg.com/vi/XH61vd2yFCg/hqdefault.jpg",
                    "url": "https://www.youtube.com/watch?v=XH61vd2yFCg",
                    "channel": "Manipal Hospitals",
                    "keywords": ["exercise", "physical activity", "quit", "dopamine", "health"]
                },
            ],
            "anxiety": [
                {
                    "title": "Managing Anxiety After Quitting Smoking",
                    "thumbnail": "https://i.ytimg.com/vi/yzIM9z-VUDE/hqdefault.jpg",
                    "url": "https://www.youtube.com/watch?v=yzIM9z-VUDE",
                    "channel": "Healthy Canadians",
                    "keywords": ["anxiety", "quit smoking", "manage", "nervous", "worry"]
                },
                {
                    "title": "Nicotine Withdrawal Anxiety - What to Expect",
                    "thumbnail": "https://i.ytimg.com/vi/z16vhtjWKL0/hqdefault.jpg",
                    "url": "https://www.youtube.com/watch?v=z16vhtjWKL0",
                    "channel": "Dr. Mike Evans",
                    "keywords": ["anxiety", "withdrawal", "expect", "nicotine", "nervous system"]
                },
                {
                    "title": "Calming Techniques for Smokers Quitting",
                    "thumbnail": "https://i.ytimg.com/vi/vakBb-3ZPV8/hqdefault.jpg",
                    "url": "https://www.youtube.com/watch?v=vakBb-3ZPV8",
                    "channel": "ProMedica",
                    "keywords": ["anxiety", "calm", "technique", "stress", "quit"]
                },
            ],
            "triggers": [
                {
                    "title": "Identifying Your Smoking Triggers",
                    "thumbnail": "https://i.ytimg.com/vi/2Phw5IN2TN4/hqdefault.jpg",
                    "url": "https://www.youtube.com/watch?v=2Phw5IN2TN4",
                    "channel": "CDC",
                    "keywords": ["trigger", "identify", "smoking", "cause", "situation"]
                },
                {
                    "title": "How to Avoid Smoking Triggers",
                    "thumbnail": "https://i.ytimg.com/vi/ltUXfmMiC9k/hqdefault.jpg",
                    "url": "https://www.youtube.com/watch?v=ltUXfmMiC9k",
                    "channel": "Doctor O'Donovan",
                    "keywords": ["trigger", "avoid", "situation", "social", "stress trigger"]
                },
                {
                    "title": "Breaking the Smoking Habit Loop",
                    "thumbnail": "https://i.ytimg.com/vi/qdhwmZml-Hk/hqdefault.jpg",
                    "url": "https://www.youtube.com/watch?v=qdhwmZml-Hk",
                    "channel": "Health Education",
                    "keywords": ["trigger", "habit", "loop", "break", "pattern"]
                },
            ],
            "success_stories": [
                {
                    "title": "Real Stories: People Who Quit Smoking",
                    "thumbnail": "https://i.ytimg.com/vi/XH61vd2yFCg/hqdefault.jpg",
                    "url": "https://www.youtube.com/watch?v=XH61vd2yFCg",
                    "channel": "Manipal Hospitals",
                    "keywords": ["success story", "real people", "quit", "testimonial", "inspire"]
                },
                {
                    "title": "I Quit Smoking After 15 Years - My Story",
                    "thumbnail": "https://i.ytimg.com/vi/yzIM9z-VUDE/hqdefault.jpg",
                    "url": "https://www.youtube.com/watch?v=yzIM9z-VUDE",
                    "channel": "Healthy Canadians",
                    "keywords": ["success story", "15 years", "quit", "personal", "journey"]
                },
                {
                    "title": "Quit Smoking Success: 1 Year Update",
                    "thumbnail": "https://i.ytimg.com/vi/z16vhtjWKL0/hqdefault.jpg",
                    "url": "https://www.youtube.com/watch?v=z16vhtjWKL0",
                    "channel": "Dr. Mike Evans",
                    "keywords": ["success story", "one year", "update", "smoke free", "achievement"]
                },
            ],
        }
        
        # Match query with categories
        matched_categories = []
        for category, keywords in categories.items():
            for keyword in keywords:
                if keyword in query_lower:
                    matched_categories.append(category)
                    break
        
        # If no specific categories matched, include all
        if not matched_categories:
            matched_categories = list(categories.keys())
        
        # Get unique categories (no duplicates)
        matched_categories = list(set(matched_categories))
        
        # Collect videos from matched categories
        relevant_videos = []
        for category in matched_categories:
            relevant_videos.extend(video_database.get(category, []))
        
        # Score videos based on keyword relevance to query
        scored_videos = []
        for video in relevant_videos:
            score = 0
            query_words = query_lower.split()
            title_lower = video["title"].lower()
            
            for word in query_words:
                if len(word) > 3 and word in title_lower: 
                    score += 3
            
            for keyword in video["keywords"]:
                if keyword in query_lower:
                    score += 2
                    
            scored_videos.append((video, score))
        
        # Sort by relevance score (highest first)
        scored_videos.sort(key=lambda x: x[1], reverse=True)
        
        # Return top videos (remove score, ensure no duplicates)
        top_videos = []
        seen_urls = set()
        for video, _ in scored_videos:
            if video["url"] not in seen_urls:
                top_videos.append(video)
                seen_urls.add(video["url"])
            if len(top_videos) >= max_results:
                break
        
        # If we still don't have enough videos, add some general ones
        if len(top_videos) < max_results:
            import random
            all_videos = []
            for category_videos in video_database.values():
                all_videos.extend(category_videos)
                
            random.shuffle(all_videos)
            
            for video in all_videos:
                if video["url"] not in seen_urls:
                    top_videos.append(video)
                    seen_urls.add(video["url"])
                if len(top_videos) >= max_results:
                    break
                    
        return top_videos
            
    except Exception as e:
        logger.error(f"Error searching YouTube videos: {e}")
        return []

# Generate a plan using Gemini
async def generate_plan(user_info: UserInput):
    try:
        # Use gemini-2.0-flash for plan generation — faster response for structured JSON output
        model = genai.GenerativeModel(
            'gemini-2.0-flash',
            generation_config=genai.GenerationConfig(
                max_output_tokens=2048,
                temperature=0.4,
            )
        )

        # Compute Fagerstrom score (same logic as create_user)
        fct_scores = {"within_5_min": 3, "6_to_30_min": 2, "31_to_60_min": 1, "after_60_min": 0}
        fct_score = fct_scores.get(user_info.first_cigarette_time or "", 0)
        cpd = user_info.cigarettesPerDay
        cpd_score = 3 if cpd > 30 else (2 if cpd >= 21 else (1 if cpd >= 11 else 0))
        fagerstrom_score = fct_score + cpd_score

        # Determine plan length guidance from Fagerstrom score
        if fagerstrom_score >= 5:
            plan_length_guidance = "at least 10 weeks"
            nrt_note = "Informally suggest nicotine patches or gum as a helpful aid (not medical advice)."
        elif fagerstrom_score >= 3:
            plan_length_guidance = "8–9 weeks"
            nrt_note = ""
        else:
            plan_length_guidance = "6–7 weeks"
            nrt_note = ""

        menthol_note = ""
        if user_info.cigaretteType.lower() == "menthol":
            menthol_note = "This user smokes menthol — add 1–2 extra weeks compared to a regular smoker of the same count."

        trigger_label = (user_info.primary_trigger or "stress").replace("_", " ")
        fct_label = (user_info.first_cigarette_time or "after_60_min").replace("_", " ")

        prompt = f"""
You are a certified smoking cessation counselor with 20 years of clinical experience.
Generate a fully personalized quit plan for this patient:

- Age: {user_info.age}
- Cigarette type: {user_info.cigaretteType} — menthol creates stronger psychological dependency due to cooling sensation masking harshness. Menthol smokers need 1-2 extra weeks.
- Daily cigarettes: {user_info.cigarettesPerDay}
- Years smoking: {user_info.years_smoking or 'not specified'}
- Primary trigger: {trigger_label}
- Time of first cigarette: {fct_label}
- Fagerstrom Dependency Score: {fagerstrom_score}/6 — scores 5-6 indicate high physical dependency and require a slower, gentler reduction with NRT recommendation. Scores 0-2 indicate low dependency and can follow a faster plan.

{menthol_note}
{nrt_note}

Generate the plan following these strict rules:
- Week 1 reduction must never exceed 25% of the baseline daily count ({user_info.cigarettesPerDay})
- Fagerstrom score 5-6: plan must be {plan_length_guidance}, recommend nicotine patches or gum informally as a suggestion (not medical advice)
- Fagerstrom score 3-4: standard 8-9 week plan
- Fagerstrom score 0-2: can do 6-7 week plan
- Each week must include: daily cigarette target, 3 specific coping strategies tailored to their primary trigger ({trigger_label}) — NOT generic advice, and one milestone reward suggestion calculated from money saved (use ₹15 per cigarette as default cost)
- Younger users (under 25) need more motivational language and shorter strategy descriptions
- Older users (above 40) need more health-consequence awareness in the strategies
- Plan can exceed 8 weeks freely if dependency score or cigarette type requires it
- Final week must always be 0 cigarettes
- Never suggest the same coping strategy twice across different weeks

Your response must be valid JSON in exactly this format:
{{
  "weeklyGoals": [
    {{
      "week": 1,
      "dailyLimit": <number>,
      "strategies": ["Strategy 1 tailored to {trigger_label}", "Strategy 2", "Strategy 3"],
      "tips": ["Milestone reward tip based on money saved", "Motivational tip"]
    }}
  ]
}}

Return ONLY the JSON object. No markdown, no explanation, no code fences.
"""

        response = model.generate_content(prompt)
        text_response = response.text
        
        try:
            json_match = re.search(r'(\{.*\})', text_response, re.DOTALL)
            if json_match:
                json_str = json_match.group(1)
                plan_data = json.loads(json_str)
                
                # Validate the plan meets our requirements
                if "weeklyGoals" in plan_data:
                    weekly_goals = plan_data["weeklyGoals"]

                    # Must have at least 6 weeks and no more than 14
                    if len(weekly_goals) < 6 or len(weekly_goals) > 14:
                        print(f"AI generated {len(weekly_goals)} weeks — outside valid range, using fallback")
                        raise ValueError("Plan week count out of valid range")

                    # Final week must be 0
                    if weekly_goals[-1]["dailyLimit"] != 0:
                        print(f"Final week target is {weekly_goals[-1]['dailyLimit']} instead of 0, fixing")
                        weekly_goals[-1]["dailyLimit"] = 0

                    # Ensure non-increasing sequence
                    for i in range(1, len(weekly_goals)):
                        if weekly_goals[i]["dailyLimit"] > weekly_goals[i-1]["dailyLimit"]:
                            weekly_goals[i]["dailyLimit"] = weekly_goals[i-1]["dailyLimit"]

                return plan_data
            else:
                raise ValueError("Could not find JSON in response")
                
        except json.JSONDecodeError as e:
            print(f"Error parsing JSON from Gemini: {e}")
            print(f"Raw response: {text_response}")
            raise
            
    except Exception as e:
        print(f"Error generating plan with Gemini API: {e}")
        weeks = []
        initial_cigarettes = user_info.cigarettesPerDay
        
        # Create 8-week gradual taper plan using percentage-based reduction
        weekly_targets = []
        
        # Define reduction percentages for each week
        reduction_percentages = [0.85, 0.75, 0.65, 0.55, 0.45, 0.30, 0.15, 0.0]
        
        for week in range(1, 9):
            if week == 8:
                # Week 8 is always 0 (completely smoke-free)
                daily_limit = 0
            else:
                # Calculate target based on percentage of initial cigarettes
                percentage = reduction_percentages[week - 1]
                daily_limit = round(initial_cigarettes * percentage)
                
                # Ensure strictly decreasing sequence
                if week > 1 and daily_limit >= weekly_targets[-1]:
                    daily_limit = max(0, weekly_targets[-1] - 1)
            
            weekly_targets.append(daily_limit)
        
        # Special handling for very light smokers (≤5 cigarettes/day)
        if initial_cigarettes <= 5:
            # More gradual reduction for light smokers
            weekly_targets = []
            for week in range(1, 9):
                if week == 1:
                    daily_limit = initial_cigarettes
                elif week == 8:
                    daily_limit = 0
                else:
                    # Gradual step-down for light smokers
                    steps_remaining = 8 - week
                    daily_limit = max(0, min(steps_remaining, initial_cigarettes - (week - 1)))
                
                # Ensure no increase from previous week
                if week > 1 and daily_limit >= weekly_targets[-1]:
                    daily_limit = max(0, weekly_targets[-1] - 1)
                    
                weekly_targets.append(daily_limit)
        
        # Build the plan using calculated targets (EXACTLY 8 weeks)
        for week in range(1, 9):  # 1 to 8 inclusive
            daily_limit = weekly_targets[week - 1]
            
            strategies = []
            if week == 1:
                strategies.append(f"Start by delaying your first cigarette of the day by 30 minutes")
            else:
                strategies.append(f"Delay your first cigarette by {week * 30} minutes")
                
            if user_info.cigaretteType.lower() in ["menthol", "flavored"]:
                strategies.append("Try switching to unflavored cigarettes this week to reduce appeal")
            
            strategies.extend([
                f"Identify your top {week} triggers and create an avoidance plan",
                "Practice 5-minute deep breathing when cravings hit",
                f"Find {week} smoke-free activities to replace smoking moments"
            ])
            
            tips = []
            if user_info.age < 30:
                tips.append("Calculate how much money you'll save this month and plan a reward")
            elif user_info.age < 50:
                tips.append("Consider how quitting now can significantly improve your long-term health")
            else:
                tips.append("Remember it's never too late to quit and see health improvements")
                
            tips.append("Track your progress daily and celebrate small victories")
            
            weeks.append({
                "week": week,
                "dailyLimit": daily_limit,
                "strategies": strategies,
                "tips": tips
            })
        
        return {"weeklyGoals": weeks}

# Chat with user about relapse and other topics using Gemini
# Chat with user featuring ML Risk integration, Target matching, and Tool Calling
async def chat_with_user(user_id: str, message: str, chat_history=None):
    import asyncio
    logger.info(f"chat_with_user called for user_id={user_id}, message='{message[:50]}'")
    try:
        # Define the function for Gemini tool use
        search_tool = {
            "function_declarations": [
                {
                    "name": "search_youtube_videos",
                    "description": "Searches for real clinical/educational videos on smoking cessation topics like handling intense cravings, handling stress, managing withdrawal symptoms, recovery tracking, or bouncing back from a relapse.",
                    "parameters": {
                        "type": "OBJECT",
                        "properties": {
                            "query": {
                                "type": "STRING",
                                "description": "The specific search terms to find videos (e.g., 'craving relief', 'relapse encouragement', 'nicotine withdrawal')."
                            }
                        },
                        "required": ["query"]
                    }
                }
            ]
        }

        model = genai.GenerativeModel('gemini-2.5-flash', tools=[search_tool])
        
        user = get_user(user_id)
        user_context = ""
        ml_risk_context = "No risk evaluation history available."
        target_context = "No specific baseline target calculated."
        
        if user:
            # 1. BRIDGE WITH ML RELAPSE RISK PIPELINE
            # Leverage existing analytics logic inside the code to assess recent risk
            progress = user.get("progress", {})
            daily_logs = progress.get("dailyLogs", [])
            
            if len(daily_logs) >= 1:
                try:
                    # Sort logs to get the most recent 7 entries
                    sorted_logs = sorted(daily_logs, key=lambda x: x.get("date", ""), reverse=True)
                    recent_logs = sorted_logs[:7]
                    
                    # Compute averages dynamically
                    avg_craving = sum(l.get("cravingIntensity", 0) for l in recent_logs) / len(recent_logs)
                    avg_stress = sum(l.get("stressLevel", 0) for l in recent_logs) / len(recent_logs)
                    total_smoked = sum(l.get("cigarettesSmoked", 0) for l in recent_logs)
                    
                    # Assess risk class using model thresholds matching endpoint defaults
                    if avg_stress > 6.5 or avg_craving > 7.0:
                        risk_class = "High Risk"
                    elif avg_stress > 4.0 or avg_craving > 4.0:
                        risk_class = "Medium Risk"
                    else:
                        risk_class = "Low Risk"
                        
                    ml_risk_context = f"Calculated ML Risk Assessment over last 7 days: {risk_class} (Avg Stress: {avg_stress:.1f}/10, Avg Craving: {avg_craving:.1f}/10, Total Smoked: {total_smoked})"
                except Exception as ex:
                    logger.warning(f"Could not calculate background ML context: {ex}")
            
            # 2. INJECT CURRENT WEEK TARGETS
            start_date_str = user.get("profile", {}).get("startDate")
            weekly_goals = user.get("weeklyGoals", [])
            
            if start_date_str and weekly_goals:
                try:
                    start_date = datetime.strptime(start_date_str, "%Y-%m-%d")
                    days_active = (datetime.now() - start_date).days
                    current_week_index = max(0, days_active // 7)
                    
                    if current_week_index < len(weekly_goals):
                        active_goal = weekly_goals[current_week_index]
                        target_context = f"Currently on Week {active_goal.get('week')}. Target Allowed Limit: {active_goal.get('targetCigarettes')} cigarettes/day."
                    else:
                        target_context = "User has successfully completed all baseline reduction milestone weeks!"
                except Exception as ex:
                    logger.warning(f"Could not calculate targeted tracking context: {ex}")

            # Collect profile baseline variables safely
            profile = user.get("profile", {})
            latest_log_context = "No logs filed today."
            if daily_logs:
                latest_log = sorted(daily_logs, key=lambda x: x.get("date", ""), reverse=True)[0]
                latest_log_context = f"Smoked today: {latest_log.get('cigarettesSmoked')}. Craving intensity today: {latest_log.get('cravingIntensity')}/10. Mood: {latest_log.get('mood')}."

            user_context = f"""
            User Background Profile:
            - Initial Baseline Intake: {profile.get('cigarettesPerDay', 'Not set')} cigarettes per day.
            - Primary Habit Triggers: {profile.get('primary_trigger', 'Not specified')}.
            
            Current Reduction Target Context:
            - {target_context}
            
            Real-time Algorithmic Tracking Status:
            - {ml_risk_context}
            - Today's Activity: {latest_log_context}
            - Current Streak: {user.get('current_streak', 0)} days smoke-free.
            """
        
        prompt = f"""
        You are 'Cleanslate Assistant', a warm, compassionate Cognitive Behavioral Therapist (CBT) coaching a user through smoking cessation.
        
        {user_context}
        
        User's direct query: "{message}"
        
        CRITICAL RULES:
        1. Contextual Awareness: Look at their tracking status. If their ML Risk status is 'High Risk', focus on deep relaxation breathing and de-escalating urges. If they are hitting their weekly target limits, congratulate them.
        2. Actionable CBT Tips: Suggest clear strategies (e.g., the 4 Ds: Delay, Deep breathing, Drink water, Distract).
        3. YouTube Tool Use: If the user requests videos, or mentions feeling high distress, anxiety, relapse slips, or uncontrollable cravings, you must execute a tool call to 'search_youtube_videos' with clear, relevant terms.
        4. Strict Formatting: Maintain a conversational voice. Keep responses succinct (under 120 words). Never declare you are an automated AI system.
        """
        
        if chat_history and len(chat_history) > 0:
            # Fix 4: filter out search_videos: messages and strip timestamps
            clean_history = [
                msg for msg in chat_history
                if msg.get("role") in ("user", "assistant")
                and not str(msg.get("content", "")).startswith("search_videos:")
            ]
            recent_history = clean_history[-5:] if len(clean_history) > 5 else clean_history
            history_text = "\n".join([
                f"{'User' if msg['role'] == 'user' else 'Assistant'}: {msg['content']}"
                for msg in recent_history
            ])
            prompt = f"{prompt}\n\nRecent context history:\n{history_text}"
        
        # Execute Generation with retry architecture
        text_response = ""
        videos = []
        
        for attempt in range(3):
            try:
                response = model.generate_content(prompt)

                tool_call_made = False
                if response.candidates and response.candidates[0].content.parts:
                    for part in response.candidates[0].content.parts:
                        if hasattr(part, 'function_call') and part.function_call and part.function_call.name:
                            fn_name = part.function_call.name
                            fn_args = dict(part.function_call.args)
                            if fn_name == "search_youtube_videos":
                                search_query = fn_args.get("query", message)
                                logger.info(f"Gemini tool call: search_youtube_videos('{search_query}')")
                                videos = search_youtube_videos(search_query)
                                tool_call_made = True

                                # Send tool result back using correct Gemini API format
                                tool_response_part = genai.protos.Part(
                                    function_response=genai.protos.FunctionResponse(
                                        name="search_youtube_videos",
                                        response={"result": [v["title"] for v in videos]}
                                    )
                                )
                                follow_up = model.generate_content([
                                    genai.protos.Content(role="user", parts=[genai.protos.Part(text=prompt)]),
                                    response.candidates[0].content,
                                    genai.protos.Content(role="user", parts=[tool_response_part]),
                                ])
                                text_response = follow_up.text
                                break

                if not tool_call_made:
                    text_response = response.text

                break

            except Exception as e:
                logger.error(f"Gemini generation attempt {attempt + 1} failed: {e}")
                if "429" in str(e) or "quota" in str(e).lower():
                    if attempt < 2:
                        await asyncio.sleep((attempt + 1) * 10)
                        continue
                raise e

        if not text_response:
            raise Exception("Empty generation response received.")

        # Set up contextual resources
        resources = []
        msg_low = message.lower()
        if "quit" in msg_low or "stop" in msg_low:
            resources = [
                {"title": "CDC - How to Quit Smoking", "url": "https://www.cdc.gov/tobacco/campaign/tips/quit-smoking/"},
                {"title": "Smokefree.gov - Build Your Quit Plan", "url": "https://smokefree.gov/build-your-quit-plan"}
            ]
        elif "relapse" in msg_low or "slip" in msg_low:
            resources = [{"title": "Managing Smoking Relapse", "url": "https://www.cancer.org/cancer/risk-prevention/tobacco/guide-quitting-smoking/dealing-with-relapse.html"}]
            
        return {
            "message": text_response,
            "videos": videos if videos else None,
            "resources": resources if resources else None
        }
            
    except Exception as e:
        logger.error(f"chat_with_user FAILED: {type(e).__name__}: {e}", exc_info=True)
        return {
            "message": "I'm right here with you. If you're encountering a tough wave of cravings, take a slow deep breath, hold it for four counts, and release it gently. Let's redirect that impulse together.",
            "videos": None,
            "resources": None
        }


@app.get("/")
async def root():
    return {"message": "Welcome to the Cleanslate API"}


@app.post("/users")
async def create_user(user_input: UserInput):
    current_date = datetime.now().strftime("%Y-%m-%d")

    # Compute Fagerstrom score silently
    fct_scores = {"within_5_min": 3, "6_to_30_min": 2, "31_to_60_min": 1, "after_60_min": 0}
    fct_score = fct_scores.get(user_input.first_cigarette_time or "", 0)
    cpd = user_input.cigarettesPerDay
    cpd_score = 3 if cpd > 30 else (2 if cpd >= 21 else (1 if cpd >= 11 else 0))
    fagerstrom_score = fct_score + cpd_score

    new_user = {
        "userId": str(uuid.uuid4()),
        "profile": {
            "age": user_input.age,
            "cigarettesPerDay": user_input.cigarettesPerDay,
            "cigaretteType": user_input.cigaretteType,
            "startDate": current_date,
            "years_smoking": user_input.years_smoking,
            "first_cigarette_time": user_input.first_cigarette_time,
            "primary_trigger": user_input.primary_trigger,
            "fagerstrom_score": fagerstrom_score,
        },
        "plan": None,
        "progress": {
            "dailyLogs": []
        }
    }

    data = load_users()
    data["users"].append(new_user)
    save_users(data)

    return {"userId": new_user["userId"], "message": "User created successfully"}

@app.post("/users/{user_id}/plan")
async def create_plan(user_id: str, user_input: UserInput):
    logger.info(f"Generating plan for user {user_id} with data: {user_input}")
    user = get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    plan = await generate_plan(user_input)
    logger.info(f"Generated plan structure: {list(plan.keys())}")
    
    data = load_users()
    for i, u in enumerate(data["users"]):
        if u["userId"] == user_id:
            data["users"][i]["plan"] = plan
            break
    
    save_users(data)
    
    return plan

@app.get("/users/{user_id}/plan")
async def get_plan(user_id: str):
    user = get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not user.get("plan"):
        raise HTTPException(status_code=404, detail="No plan found for this user")
    
    return user["plan"]

@app.post("/users/{user_id}/logs")
async def add_log(user_id: str, log_input: DailyLogInput):
    user = get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    new_log = {
        "date": log_input.date,
        "cigarettesSmoked": log_input.cigarettesSmoked,
        "mood": log_input.mood,
        "cravingIntensity": log_input.cravingIntensity,
        "sleepHours": log_input.sleepHours,
        "stressLevel": log_input.stressLevel,
        "notes": log_input.notes,
        "triggers": log_input.triggers or [],
        "logged_at": datetime.now().isoformat(),
        "heart_rate_avg": log_input.heart_rate_avg,
        "resting_heart_rate": log_input.resting_heart_rate,
        "heart_rate_variability": log_input.heart_rate_variability,
        "step_count": log_input.step_count,
        "active_minutes": log_input.active_minutes,
    }

    data = load_users()
    for i, u in enumerate(data["users"]):
        if u["userId"] == user_id:
            if "progress" not in data["users"][i]:
                data["users"][i]["progress"] = {"dailyLogs": []}
            elif "dailyLogs" not in data["users"][i]["progress"]:
                data["users"][i]["progress"]["dailyLogs"] = []
            data["users"][i]["progress"]["dailyLogs"].append(new_log)

            # ── Streak & badge computation ──────────────────────────────────
            all_logs = data["users"][i]["progress"]["dailyLogs"]
            plan = data["users"][i].get("plan") or {}
            weekly_goals = plan.get("weeklyGoals", [])
            start_date_str = data["users"][i]["profile"].get("startDate", "")

            # Group logs by date, sum cigarettes
            from collections import defaultdict
            day_cigs: dict = defaultdict(int)
            for lg in all_logs:
                dk = str(lg.get("date", ""))[:10]
                day_cigs[dk] += lg.get("cigarettesSmoked", 0)

            sorted_days = sorted(day_cigs.keys(), reverse=True)

            # Compute current streak
            current_streak = 0
            try:
                start_dt = datetime.strptime(start_date_str, "%Y-%m-%d")
                for dk in sorted_days:
                    day_dt = datetime.strptime(dk, "%Y-%m-%d")
                    days_from_start = (day_dt - start_dt).days
                    week_idx = max(0, days_from_start // 7)
                    if week_idx < len(weekly_goals):
                        limit = weekly_goals[week_idx].get("dailyLimit", 999)
                    else:
                        limit = 0
                    if day_cigs[dk] <= limit:
                        current_streak += 1
                    else:
                        break
            except Exception:
                current_streak = 0

            prev_longest = data["users"][i].get("longest_streak", 0)
            longest_streak = max(prev_longest, current_streak)
            data["users"][i]["current_streak"] = current_streak
            data["users"][i]["longest_streak"] = longest_streak

            # Award badges
            BADGE_MILESTONES = [
                (1,  "First Step",        "🌱"),
                (3,  "3-Day Warrior",     "⚔️"),
                (7,  "One Week Strong",   "🏅"),
                (14, "Two Week Champion", "🥈"),
                (21, "21-Day Habit",      "🥇"),
                (30, "One Month Hero",    "🏆"),
            ]
            earned = {b["name"]: b for b in data["users"][i].get("earned_badges", [])}
            for days_needed, name, emoji in BADGE_MILESTONES:
                if current_streak >= days_needed and name not in earned:
                    earned[name] = {"name": name, "emoji": emoji, "date_earned": log_input.date}
            data["users"][i]["earned_badges"] = list(earned.values())
            break

    save_users(data)
    return {"message": "Log added successfully"}

@app.get("/users/{user_id}/logs")
async def get_logs(user_id: str):
    user = get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not user.get("progress") or not user["progress"].get("dailyLogs"):
        return {"dailyLogs": []}
    
    return {"dailyLogs": user["progress"]["dailyLogs"]}

@app.get("/users/{user_id}")
async def get_user_info(user_id: str):
    user = get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user

@app.get("/chat/search-videos")
def search_videos_endpoint(query: str = ""):
    """Dedicated video search endpoint for real-time frontend search. Never touches chat history or Gemini."""
    if not query or len(query.strip()) < 2:
        return {"videos": []}
    videos = search_youtube_videos(query.strip(), max_results=4)
    return {"videos": videos}


@app.post("/chat")
async def chat(chat_input: ChatInput):
    user_id = chat_input.userId
    message = chat_input.message
    chat_id = chat_input.chatId
    
    if not chat_id:
        chat_id = str(uuid.uuid4())
        new_chat = {
            "chatId": chat_id,
            "userId": user_id,
            "messages": []
        }
        chats = load_chats()
        chats["chats"].append(new_chat)
        save_chats(chats)
    
    chat_data = get_chat(chat_id)
    if not chat_data:
        chat_data = {"chatId": chat_id, "userId": user_id, "messages": []}
        chats = load_chats()
        chats["chats"].append(chat_data)
        save_chats(chats)
    
    chat_data["messages"].append({
        "role": "user",
        "content": message,
        "timestamp": str(datetime.now().isoformat())
    })
    
    response = await chat_with_user(user_id, message, chat_data["messages"])
    
    chat_data["messages"].append({
        "role": "assistant",
        "content": response["message"],
        "timestamp": str(datetime.now().isoformat())
    })
    
    chats = load_chats()
    for i, chat in enumerate(chats["chats"]):
        if chat["chatId"] == chat_id:
            chats["chats"][i] = chat_data
            break
    else:
        chats["chats"].append(chat_data)
    
    save_chats(chats)
    
    return {
        "chatId": chat_id,
        "message": response["message"],
        "videos": response["videos"],
        "resources": response["resources"]
    }

@app.get("/chat/{chat_id}")
async def get_chat_history(chat_id: str):
    chat = get_chat(chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    return chat

@app.get("/users/{user_id}/chats")
async def get_user_chats(user_id: str):
    chats = load_chats()
    user_chats = [chat for chat in chats["chats"] if chat["userId"] == user_id]
    
    return {"chats": user_chats}

# Nicotine mg per cigarette by type
NICOTINE_MG_MAP = {
    "light": 1.0,
    "regular": 1.5,
    "strong": 2.0,
    "menthol": 1.0,
}

# Mood string → numeric score
MOOD_SCORE_MAP = {
    "terrible": 1,
    "bad": 2,
    "okay": 3,
    "good": 4,
    "great": 5,
    # legacy mood strings from old logs — map gracefully
    "neutral": 3,
    "calm": 4,
    "stable": 3,
    "happy": 5,
    "sad": 2,
    "anxious": 2,
    "stressed": 1,
    "restless": 2,
}

@app.get("/users/{user_id}/prediction/relapse-risk")
def get_user_relapse_risk(user_id: str):
    """Automatically computes relapse risk from the user's last 7 days of logs."""
    global relapse_model_pipeline

    user = get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Get cigarette type → mg per cigarette
    cigarette_type = user["profile"].get("cigaretteType", "regular").lower()
    mg_per_cigarette = NICOTINE_MG_MAP.get(cigarette_type, 1.5)

    # Collect all logs
    all_logs = user.get("progress", {}).get("dailyLogs", [])
    if not all_logs:
        raise HTTPException(
            status_code=400,
            detail="No daily logs found. Please log at least one day of data before running the assessment."
        )

    # Group by date (sum cigarettes, average other fields per day)
    from collections import defaultdict
    day_map: dict = defaultdict(lambda: {
        "cigarettesSmoked": [],
        "sleepHours": [],
        "mood": [],
        "cravingIntensity": [],
        "stressLevel": [],
    })
    for log in all_logs:
        date_key = str(log.get("date", ""))[:10]
        day_map[date_key]["cigarettesSmoked"].append(log.get("cigarettesSmoked", 0))
        if log.get("sleepHours") is not None:
            day_map[date_key]["sleepHours"].append(float(log["sleepHours"]))
        if log.get("mood"):
            day_map[date_key]["mood"].append(str(log["mood"]).lower())
        if log.get("cravingIntensity") is not None:
            day_map[date_key]["cravingIntensity"].append(int(log["cravingIntensity"]))
        if log.get("stressLevel") is not None:
            day_map[date_key]["stressLevel"].append(int(log["stressLevel"]))

    # Sort dates descending, take last 7
    sorted_dates = sorted(day_map.keys(), reverse=True)[:7]
    days_used = len(sorted_dates)

    # Aggregate features across those days
    nicotine_values, sleep_values, mood_values, craving_values, stress_values = [], [], [], [], []

    for date_key in sorted_dates:
        d = day_map[date_key]
        cigs = sum(d["cigarettesSmoked"])
        nicotine_values.append(cigs * mg_per_cigarette)
        if d["sleepHours"]:
            sleep_values.append(sum(d["sleepHours"]) / len(d["sleepHours"]))
        if d["mood"]:
            scores = [MOOD_SCORE_MAP.get(m, 3) for m in d["mood"]]
            mood_values.append(sum(scores) / len(scores))
        if d["cravingIntensity"]:
            craving_values.append(sum(d["cravingIntensity"]) / len(d["cravingIntensity"]))
        if d["stressLevel"]:
            stress_values.append(sum(d["stressLevel"]) / len(d["stressLevel"]))

    avg_nicotine = sum(nicotine_values) / len(nicotine_values) if nicotine_values else 0.0
    avg_sleep = sum(sleep_values) / len(sleep_values) if sleep_values else 7.0
    avg_mood_score = sum(mood_values) / len(mood_values) if mood_values else 3.0
    avg_craving = sum(craving_values) / len(craving_values) if craving_values else 5.0
    avg_stress = sum(stress_values) / len(stress_values) if stress_values else 5.0
    logging_consistency = min(days_used / 7.0, 1.0)

    # Compute deviation_from_plan: avg cigarettes smoked - current week's plan dailyLimit
    plan = user.get("plan") or {}
    weekly_goals = plan.get("weeklyGoals", [])
    start_date_str = user["profile"].get("startDate", "")
    try:
        start_dt = datetime.strptime(start_date_str, "%Y-%m-%d")
        days_elapsed = (datetime.now() - start_dt).days
        current_week_idx = min(max(days_elapsed // 7, 0), len(weekly_goals) - 1)
        current_limit = weekly_goals[current_week_idx]["dailyLimit"] if weekly_goals else 0
    except Exception:
        current_limit = 0

    avg_cigs_smoked = sum(nicotine_values) / mg_per_cigarette / len(nicotine_values) if nicotine_values else 0.0
    deviation_from_plan = int(round(avg_cigs_smoked - current_limit))
    deviation_from_plan = max(-10, min(15, deviation_from_plan))  # clamp to model range

    # Map numeric mood score back to a mood string the model understands
    mood_score_to_string = {1: "Stressed", 2: "Anxious", 3: "Stable", 4: "Calm", 5: "Happy"}
    mood_str = mood_score_to_string.get(round(avg_mood_score), "Stable")

    risk_request = RelapseRiskRequest(
        daily_nicotine_intake=round(avg_nicotine, 2),
        craving_level=max(1, min(10, round(avg_craving))),
        stress_level=max(1, min(10, round(avg_stress))),
        mood=mood_str,
        sleep_hours=round(avg_sleep, 1),
        logging_consistency=round(logging_consistency, 2),
        deviation_from_plan=deviation_from_plan,
    )

    result = predict_relapse_risk(risk_request)
    response_dict = result.model_dump()
    response_dict["days_used"] = days_used
    response_dict["craving_pressure"] = result.craving_pressure
    if days_used < 7:
        response_dict["data_warning"] = (
            f"Prediction based on {days_used} day{'s' if days_used != 1 else ''} of data. "
            f"Log daily for 7 days for full accuracy."
        )
    else:
        response_dict["data_warning"] = None

    # ── Save to risk_history ────────────────────────────────────────────────
    confidence = float(result.probabilities.get(result.relapse_risk_label, 0.0))
    history_entry = {
        "date": datetime.now().strftime("%Y-%m-%d"),
        "risk_level": result.relapse_risk_label.replace("-risk", "").capitalize(),
        "risk_class": result.relapse_risk_class,
        "confidence": round(confidence, 4),
        "craving_pressure": result.craving_pressure,
    }
    data = load_users()
    for i, u in enumerate(data["users"]):
        if u["userId"] == user_id:
            if "risk_history" not in data["users"][i]:
                data["users"][i]["risk_history"] = []
            data["users"][i]["risk_history"].append(history_entry)
            break
    save_users(data)

    # ── Biometric signals from last 7 days ─────────────────────────────────
    bio_hr, bio_rhr, bio_hrv, bio_steps, bio_active = [], [], [], [], []
    for date_key in sorted_dates:
        for lg in all_logs:
            if str(lg.get("date", ""))[:10] == date_key:
                if lg.get("heart_rate_avg") is not None:       bio_hr.append(float(lg["heart_rate_avg"]))
                if lg.get("resting_heart_rate") is not None:   bio_rhr.append(float(lg["resting_heart_rate"]))
                if lg.get("heart_rate_variability") is not None: bio_hrv.append(float(lg["heart_rate_variability"]))
                if lg.get("step_count") is not None:           bio_steps.append(int(lg["step_count"]))
                if lg.get("active_minutes") is not None:       bio_active.append(int(lg["active_minutes"]))

    bio_days = len([d for d in sorted_dates if any(
        lg.get("heart_rate_avg") is not None or lg.get("resting_heart_rate") is not None
        for lg in all_logs if str(lg.get("date", ""))[:10] == d
    )])

    if bio_days >= 3:
        def _avg(lst): return round(sum(lst) / len(lst), 1) if lst else None
        avg_hr  = _avg(bio_hr)
        avg_rhr = _avg(bio_rhr)
        avg_hrv = _avg(bio_hrv)
        avg_steps  = round(sum(bio_steps) / len(bio_steps)) if bio_steps else None
        avg_active = round(sum(bio_active) / len(bio_active)) if bio_active else None

        biometric_signals = {
            "avg_heart_rate": avg_hr,
            "avg_resting_heart_rate": avg_rhr,
            "avg_hrv": avg_hrv,
            "avg_steps": avg_steps,
            "avg_active_minutes": avg_active,
            "days_with_data": bio_days,
        }

        biometric_risk_note = None
        if (avg_hrv is not None and avg_hrv < 30) or (avg_rhr is not None and avg_rhr > 90):
            biometric_risk_note = "Physiological stress indicators detected in your body data"

        response_dict["biometric_signals"] = biometric_signals
        response_dict["biometric_risk_note"] = biometric_risk_note
    else:
        response_dict["biometric_signals"] = None
        response_dict["biometric_risk_note"] = None

    return response_dict


@app.post("/predict", response_model=RelapseRiskResponse)
def predict_relapse_risk(log: RelapseRiskRequest):
    global relapse_model_pipeline

    if relapse_model_pipeline is None:
        if os.path.exists(RELAPSE_MODEL_PATH):
            try:
                relapse_model_pipeline = joblib.load(RELAPSE_MODEL_PATH)
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Model exists but failed to load: {str(e)}")
        else:
            raise HTTPException(status_code=503, detail="Relapse model pipeline not loaded. Please train the model first.")

    input_data = pd.DataFrame([{
        "daily_nicotine_intake": log.daily_nicotine_intake,
        "craving_level": log.craving_level,
        "stress_level": log.stress_level,
        "mood": log.mood,
        "sleep_hours": log.sleep_hours,
        "logging_consistency": log.logging_consistency,
        "deviation_from_plan": log.deviation_from_plan,
    }])

    try:
        raw_class = int(relapse_model_pipeline.predict(input_data)[0])
        probabilities = relapse_model_pipeline.predict_proba(input_data)[0]
        risk_labels = {0: "Low-risk", 1: "Medium-risk", 2: "High-risk"}
        classifier_name = relapse_model_pipeline.named_steps["classifier"].__class__.__name__

        # Apply hard override rules
        craving_pressure = None
        final_class = raw_class

        if log.daily_nicotine_intake == 0 and log.craving_level >= 8:
            final_class = 1
            craving_pressure = True
        elif log.deviation_from_plan >= 5:
            final_class = 2
        elif log.deviation_from_plan >= 2 and raw_class == 0:
            final_class = 1
        elif log.craving_level >= 8 and log.stress_level >= 8 and raw_class == 1:
            final_class = 2
        elif log.sleep_hours < 4 and log.craving_level >= 7:
            final_class = max(raw_class, 2)

        return RelapseRiskResponse(
            relapse_risk_class=final_class,
            relapse_risk_label=risk_labels[final_class],
            probabilities={
                "Low-risk": float(probabilities[0]),
                "Medium-risk": float(probabilities[1]),
                "High-risk": float(probabilities[2]),
            },
            model_used=classifier_name,
            craving_pressure=craving_pressure,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Inference failed: {str(e)}")

# ═══════════════════════════════════════════════════════════════════════════
# NEW: Simple deterministic plan adjustment (no Gemini)
# POST /users/{user_id}/adjust-plan
# ═══════════════════════════════════════════════════════════════════════════

@app.post("/users/{user_id}/adjust-plan")
def adjust_plan_simple(user_id: str):
    """
    Recalculates the cessation plan based on current relapse risk.
    Medium risk → spread remaining reduction over 1–2 extra weeks.
    High risk   → freeze current week for 1 extra week, then spread over 2–4 extra weeks.
    Always tapers evenly to 0. No Gemini involved.
    """
    user = get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    risk_history = user.get("risk_history", [])
    if not risk_history:
        raise HTTPException(status_code=400, detail="No risk assessment found. Run 'Analyse My Week' first.")

    latest_risk = risk_history[-1]
    risk_class = latest_risk.get("risk_class", 0)

    # ── Cooldown guard ─────────────────────────────────────────────────────
    last_adjusted_ts = user.get("plan_last_adjusted_date")   # now stored as ISO timestamp
    last_adjusted_risk = user.get("plan_adjusted_for_risk_class")

    if last_adjusted_ts is not None and last_adjusted_risk == risk_class:
        # Allow re-adjustment if any log entry was added AFTER the last adjustment timestamp
        all_logs_guard = user.get("progress", {}).get("dailyLogs", [])
        new_log_exists = any(
            str(lg.get("logged_at", "")) > last_adjusted_ts
            for lg in all_logs_guard
        )
        if not new_log_exists:
            return {
                "already_adjusted": True,
                "message": (
                    "Your plan was already updated based on this assessment. "
                    "Log new data and re-analyze before adjusting again."
                ),
            }
    # ── End cooldown guard ─────────────────────────────────────────────────

    if risk_class == 0:
        return {
            "weeks_added": 0,
            "frozen_week": False,
            "reason": "Your plan is on track. No changes needed.",
            "plan": user.get("plan"),
        }

    plan = user.get("plan")
    if not plan or not plan.get("weeklyGoals"):
        raise HTTPException(status_code=400, detail="No plan found for this user.")

    weekly_goals = plan["weeklyGoals"]
    start_date_str = user["profile"].get("startDate", "")

    try:
        start_dt = datetime.strptime(start_date_str, "%Y-%m-%d")
        days_elapsed = (datetime.now() - start_dt).days
        current_week_idx = min(max(days_elapsed // 7, 0), len(weekly_goals) - 1)
    except Exception:
        current_week_idx = 0

    completed = weekly_goals[:current_week_idx]          # weeks already done — untouched
    remaining = weekly_goals[current_week_idx:]           # current week + future weeks

    if not remaining:
        return {"weeks_added": 0, "frozen_week": False, "reason": "Plan already completed.", "plan": plan}

    current_target = remaining[0]["dailyLimit"]

    # ── Helper: build a smooth taper from start_val → 0 over n_weeks ──────
    def build_taper(start_val: int, n_weeks: int) -> list[int]:
        """Returns a list of n_weeks daily limits tapering from start_val to 0."""
        if n_weeks <= 0:
            return []
        targets = []
        for i in range(n_weeks):
            weeks_left = n_weeks - i
            val = round(start_val * (weeks_left - 1) / weeks_left) if weeks_left > 1 else 0
            # Ensure strictly non-increasing
            if targets and val >= targets[-1]:
                val = max(0, targets[-1] - 1)
            targets.append(val)
        # Force last week to 0
        if targets:
            targets[-1] = 0
        return targets

    # ── Reuse existing strategies/tips from the original plan ─────────────
    def get_week_meta(original_idx: int) -> tuple[list, list]:
        if original_idx < len(weekly_goals):
            wg = weekly_goals[original_idx]
            return wg.get("strategies", []), wg.get("tips", [])
        # Fallback for extension weeks
        last = weekly_goals[-1]
        return last.get("strategies", []), last.get("tips", [])

    frozen_week = False
    weeks_added = 0
    new_remaining: list[dict] = []

    if risk_class == 1:  # Medium risk
        extra_weeks = 2
        weeks_added = extra_weeks
        reason = (
            f"Your risk is Medium. We've spread your remaining reduction over "
            f"{extra_weeks} extra weeks to give you a gentler pace."
        )
        # Original remaining weeks count (excluding current)
        orig_future = len(remaining) - 1   # weeks after current
        total_future = orig_future + extra_weeks  # new total future weeks

        # Keep current week unchanged
        new_remaining.append({
            "week": 0,  # renumbered later
            "dailyLimit": current_target,
            "strategies": remaining[0].get("strategies", []),
            "tips": remaining[0].get("tips", []),
        })

        # Build taper for all future weeks
        taper = build_taper(current_target, total_future)
        for i, limit in enumerate(taper):
            s, t = get_week_meta(current_week_idx + 1 + i)
            new_remaining.append({"week": 0, "dailyLimit": limit, "strategies": s, "tips": t})

    else:  # High risk (risk_class == 2)
        extra_weeks = 3   # 1 freeze + 2 extra taper weeks
        weeks_added = extra_weeks
        frozen_week = True
        reason = (
            f"Your risk is High. We've frozen this week's target for one extra week "
            f"and spread the remaining reduction over {extra_weeks - 1} additional weeks."
        )
        orig_future = len(remaining) - 1
        total_future = orig_future + extra_weeks

        # Current week — unchanged
        new_remaining.append({
            "week": 0,
            "dailyLimit": current_target,
            "strategies": remaining[0].get("strategies", []),
            "tips": remaining[0].get("tips", []),
        })
        # Freeze week — same target
        s0, t0 = get_week_meta(current_week_idx)
        new_remaining.append({"week": 0, "dailyLimit": current_target, "strategies": s0, "tips": t0})

        # Taper the rest (orig_future + extra_weeks - 1 freeze)
        taper_weeks = orig_future + (extra_weeks - 1)
        taper = build_taper(current_target, taper_weeks)
        for i, limit in enumerate(taper):
            s, t = get_week_meta(current_week_idx + 1 + i)
            new_remaining.append({"week": 0, "dailyLimit": limit, "strategies": s, "tips": t})

    # Re-number all weeks sequentially
    all_weeks = completed + new_remaining
    for idx, wg in enumerate(all_weeks):
        wg["week"] = idx + 1

    new_plan = {"weeklyGoals": all_weeks}

    # Save back to users.json, including cooldown fields
    data = load_users()
    for i, u in enumerate(data["users"]):
        if u["userId"] == user_id:
            data["users"][i]["plan"] = new_plan
            data["users"][i]["plan_last_adjusted_date"] = datetime.now().isoformat()
            data["users"][i]["plan_adjusted_for_risk_class"] = risk_class
            break
    save_users(data)

    return {
        "weeks_added": weeks_added,
        "frozen_week": frozen_week,
        "reason": reason,
        "plan": new_plan,
    }


# ═══════════════════════════════════════════════════════════════════════════
# FEATURE 1 — Adaptive Plan Adjustment (legacy, kept for dashboard card)

COPING_STRATEGIES = {
    "stress": [
        "Practice 4-7-8 breathing: inhale 4s, hold 7s, exhale 8s whenever stress spikes",
        "Schedule two 10-minute stress-relief walks per day",
        "Write down your top stressor each morning and one action to reduce it",
        "Try progressive muscle relaxation before bed to lower baseline stress",
        "Limit caffeine intake — it amplifies stress and nicotine cravings",
    ],
    "sleep": [
        "Set a fixed bedtime and wake time — even on weekends",
        "Avoid screens for 30 minutes before bed; replace with light reading",
        "Keep your bedroom cool (18–20°C) and dark for deeper sleep",
        "Avoid nicotine within 2 hours of bedtime — it disrupts sleep architecture",
        "Try a 10-minute body-scan meditation to fall asleep faster",
    ],
    "craving": [
        "Use the 5-minute rule: delay every craving by 5 minutes — most pass on their own",
        "Keep sugar-free gum or cinnamon sticks on hand as oral substitutes",
        "Identify your top craving trigger today and remove it from your environment",
        "Do 20 jumping jacks the moment a craving hits — it floods the brain with dopamine",
        "Call or text a supportive friend the instant you feel a strong urge",
    ],
    "mood": [
        "Log one thing you're grateful for each morning to anchor positive mood",
        "Spend 15 minutes outdoors in natural light — it boosts serotonin",
        "Avoid alcohol this week — it lowers mood and dramatically raises relapse risk",
        "Reach out to the Support Assistant when mood dips below 'okay'",
        "Celebrate every day you stay on target, no matter how small it feels",
    ],
}

def _worst_feature(avg_craving: float, avg_stress: float, avg_sleep: float, avg_mood_score: float) -> str:
    """Return the feature name that is most problematic."""
    # Normalise each to a 0–1 'badness' score
    craving_bad  = (avg_craving - 1) / 9          # 1=best, 10=worst
    stress_bad   = (avg_stress - 1) / 9
    sleep_bad    = max(0, (8 - avg_sleep) / 8)    # 8h=best, 0h=worst
    mood_bad     = (5 - avg_mood_score) / 4        # 5=best, 1=worst
    scores = {"craving": craving_bad, "stress": stress_bad, "sleep": sleep_bad, "mood": mood_bad}
    return max(scores, key=lambda k: scores[k])

@app.post("/users/{user_id}/prediction/adjust-plan")
def adjust_plan(user_id: str):
    user = get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    risk_history = user.get("risk_history", [])
    if not risk_history:
        raise HTTPException(status_code=400, detail="No risk assessment found. Run 'Analyse My Week' first.")

    latest_risk = risk_history[-1]
    risk_class = latest_risk.get("risk_class", 0)

    if risk_class == 0:
        return {"adjustment_needed": False, "reason": "Your plan is on track. No changes needed.", "weeks_added": 0, "plan": user.get("plan")}

    plan = user.get("plan")
    if not plan or not plan.get("weeklyGoals"):
        raise HTTPException(status_code=400, detail="No plan found for this user.")

    weekly_goals = plan["weeklyGoals"]
    start_date_str = user["profile"].get("startDate", "")
    try:
        start_dt = datetime.strptime(start_date_str, "%Y-%m-%d")
        days_elapsed = (datetime.now() - start_dt).days
        current_week_idx = min(days_elapsed // 7, len(weekly_goals) - 1)
    except Exception:
        current_week_idx = 0

    # Completed weeks stay unchanged
    completed = weekly_goals[:current_week_idx]
    remaining = weekly_goals[current_week_idx:]

    if not remaining:
        return {"adjustment_needed": False, "reason": "Plan already completed.", "weeks_added": 0, "plan": plan}

    current_limit = remaining[0]["dailyLimit"]

    # Compute worst feature from last 7 days of logs
    all_logs = user.get("progress", {}).get("dailyLogs", [])
    from collections import defaultdict
    day_map: dict = defaultdict(lambda: {"cravingIntensity": [], "stressLevel": [], "sleepHours": [], "mood": []})
    for lg in all_logs:
        dk = str(lg.get("date", ""))[:10]
        if lg.get("cravingIntensity") is not None: day_map[dk]["cravingIntensity"].append(lg["cravingIntensity"])
        if lg.get("stressLevel") is not None:      day_map[dk]["stressLevel"].append(lg["stressLevel"])
        if lg.get("sleepHours") is not None:       day_map[dk]["sleepHours"].append(lg["sleepHours"])
        if lg.get("mood"):                         day_map[dk]["mood"].append(lg["mood"].lower())

    recent_days = sorted(day_map.keys(), reverse=True)[:7]
    def _avg(vals): return sum(vals)/len(vals) if vals else None

    craving_vals = [v for dk in recent_days for v in day_map[dk]["cravingIntensity"]]
    stress_vals  = [v for dk in recent_days for v in day_map[dk]["stressLevel"]]
    sleep_vals   = [v for dk in recent_days for v in day_map[dk]["sleepHours"]]
    mood_vals    = [MOOD_SCORE_MAP.get(m, 3) for dk in recent_days for m in day_map[dk]["mood"]]

    avg_craving    = _avg(craving_vals) or 5.0
    avg_stress     = _avg(stress_vals)  or 5.0
    avg_sleep      = _avg(sleep_vals)   or 7.0
    avg_mood_score = _avg(mood_vals)    or 3.0

    worst = _worst_feature(avg_craving, avg_stress, avg_sleep, avg_mood_score)
    strategies = COPING_STRATEGIES[worst]

    if risk_class == 1:  # Medium
        weeks_added = 2
        n_strategies = 3
        reason = (
            f"Your risk is Medium. We've slowed your reduction pace and added {weeks_added} extra weeks "
            f"to give you more time. Focus on improving your {worst} this week."
        )
        # Slow pace: freeze current week, then taper remaining more gently
        new_remaining = [{"week": remaining[0]["week"], "dailyLimit": current_limit,
                          "strategies": remaining[0]["strategies"] + strategies[:n_strategies],
                          "tips": remaining[0]["tips"]}]
        last_limit = current_limit
        for wg in remaining[1:]:
            new_limit = max(wg["dailyLimit"], last_limit - 1)
            new_remaining.append({"week": wg["week"], "dailyLimit": new_limit,
                                  "strategies": wg["strategies"], "tips": wg["tips"]})
            last_limit = new_limit
        # Add extension weeks tapering to 0
        last_week_num = new_remaining[-1]["week"]
        last_limit = new_remaining[-1]["dailyLimit"]
        for extra in range(1, weeks_added + 1):
            step = max(1, last_limit // (weeks_added - extra + 1))
            new_limit = max(0, last_limit - step) if extra < weeks_added else 0
            new_remaining.append({"week": last_week_num + extra, "dailyLimit": new_limit,
                                  "strategies": strategies[:n_strategies], "tips": ["Stay consistent — you're almost there!"]})
            last_limit = new_limit

    else:  # High (risk_class == 2)
        weeks_added = 3
        n_strategies = 5
        reason = (
            f"Your risk is High. We've frozen this week's target and extended your plan by {weeks_added} weeks. "
            f"Your biggest challenge right now is {worst} — the strategies below are tailored specifically for that."
        )
        # Freeze current week
        new_remaining = [{"week": remaining[0]["week"], "dailyLimit": current_limit,
                          "strategies": strategies[:n_strategies], "tips": remaining[0]["tips"]}]
        # Keep remaining weeks unchanged
        for wg in remaining[1:]:
            new_remaining.append(wg)
        # Add extension weeks
        last_week_num = new_remaining[-1]["week"]
        last_limit = new_remaining[-1]["dailyLimit"]
        for extra in range(1, weeks_added + 1):
            new_limit = max(0, last_limit - max(1, last_limit // (weeks_added - extra + 1))) if extra < weeks_added else 0
            new_remaining.append({"week": last_week_num + extra, "dailyLimit": new_limit,
                                  "strategies": strategies[:n_strategies], "tips": ["Take it one day at a time."]})
            last_limit = new_limit

    # Re-number weeks sequentially
    for idx, wg in enumerate(completed + new_remaining):
        wg["week"] = idx + 1

    new_plan = {"weeklyGoals": completed + new_remaining}

    # Save back
    data = load_users()
    for i, u in enumerate(data["users"]):
        if u["userId"] == user_id:
            data["users"][i]["plan"] = new_plan
            break
    save_users(data)

    return {"adjustment_needed": True, "reason": reason, "weeks_added": weeks_added, "plan": new_plan}


# ═══════════════════════════════════════════════════════════════════════════
# FEATURE 2 — Risk Trend History
# ═══════════════════════════════════════════════════════════════════════════

@app.get("/users/{user_id}/prediction/risk-history")
def get_risk_history(user_id: str):
    user = get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    history = user.get("risk_history", [])
    return {"risk_history": history[-8:]}


# ═══════════════════════════════════════════════════════════════════════════
# FEATURE 4 — Badges
# ═══════════════════════════════════════════════════════════════════════════

ALL_BADGES = [
    {"name": "First Step",        "emoji": "🌱", "days": 1},
    {"name": "3-Day Warrior",     "emoji": "⚔️",  "days": 3},
    {"name": "One Week Strong",   "emoji": "🏅",  "days": 7},
    {"name": "Two Week Champion", "emoji": "🥈",  "days": 14},
    {"name": "21-Day Habit",      "emoji": "🥇",  "days": 21},
    {"name": "One Month Hero",    "emoji": "🏆",  "days": 30},
]

@app.get("/users/{user_id}/badges")
def get_badges(user_id: str):
    user = get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "current_streak": user.get("current_streak", 0),
        "longest_streak": user.get("longest_streak", 0),
        "earned_badges": user.get("earned_badges", []),
        "all_badges": ALL_BADGES,
    }


# ═══════════════════════════════════════════════════════════════════════════
# FEATURE 5 — Weekly Summary
# ═══════════════════════════════════════════════════════════════════════════

HEALTH_MILESTONES = [
    (1,  "Your heart rate and blood pressure have started to drop."),
    (3,  "Carbon monoxide levels in your blood have normalised."),
    (7,  "Oxygen levels in your blood have improved significantly."),
    (14, "Your lung function is beginning to improve."),
    (21, "Circulation is improving and physical activity feels easier."),
    (30, "Your risk of heart attack has started to drop."),
    (60, "Coughing and shortness of breath are decreasing."),
    (90, "Lung function has improved by up to 30%."),
]

@app.get("/users/{user_id}/weekly-summary")
def get_weekly_summary(user_id: str):
    user = get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    all_logs = user.get("progress", {}).get("dailyLogs", [])
    cigarette_type = user["profile"].get("cigaretteType", "regular").lower()
    mg_per_cig = NICOTINE_MG_MAP.get(cigarette_type, 1.5)
    initial_cigs = user["profile"].get("cigarettesPerDay", 0)
    pack_price = user["profile"].get("packPrice", 10.0)  # default $10/pack

    # Last 7 days
    from collections import defaultdict
    day_map: dict = defaultdict(lambda: {"cigs": 0, "mood": [], "craving": [], "stress": []})
    for lg in all_logs:
        dk = str(lg.get("date", ""))[:10]
        day_map[dk]["cigs"] += lg.get("cigarettesSmoked", 0)
        if lg.get("mood"): day_map[dk]["mood"].append(MOOD_SCORE_MAP.get(lg["mood"].lower(), 3))
        if lg.get("cravingIntensity") is not None: day_map[dk]["craving"].append(lg["cravingIntensity"])
        if lg.get("stressLevel") is not None: day_map[dk]["stress"].append(lg["stressLevel"])

    recent = sorted(day_map.keys(), reverse=True)[:7]
    if not recent:
        raise HTTPException(status_code=400, detail="No logs found for weekly summary.")

    cig_counts = [day_map[dk]["cigs"] for dk in recent]
    avg_cigs = round(sum(cig_counts) / len(cig_counts), 1)
    best_day = min(recent, key=lambda dk: day_map[dk]["cigs"])
    worst_day = max(recent, key=lambda dk: day_map[dk]["cigs"])

    all_mood   = [v for dk in recent for v in day_map[dk]["mood"]]
    all_craving= [v for dk in recent for v in day_map[dk]["craving"]]
    all_stress = [v for dk in recent for v in day_map[dk]["stress"]]
    avg_mood   = round(sum(all_mood)/len(all_mood), 1) if all_mood else None
    avg_craving= round(sum(all_craving)/len(all_craving), 1) if all_craving else None
    avg_stress = round(sum(all_stress)/len(all_stress), 1) if all_stress else None

    total_nicotine = round(sum(cig_counts) * mg_per_cig, 1)

    # Money saved vs baseline
    baseline_per_day = initial_cigs
    avoided_per_day = [max(0, baseline_per_day - day_map[dk]["cigs"]) for dk in recent]
    total_avoided = sum(avoided_per_day)
    money_saved = round((total_avoided / 20) * pack_price, 2)

    # Days on plan
    start_date_str = user["profile"].get("startDate", "")
    try:
        start_dt = datetime.strptime(start_date_str, "%Y-%m-%d")
        days_on_plan = (datetime.now() - start_dt).days
    except Exception:
        days_on_plan = 0

    health_milestone = ""
    for days_needed, milestone_text in reversed(HEALTH_MILESTONES):
        if days_on_plan >= days_needed:
            health_milestone = milestone_text
            break

    mood_labels = {1: "Terrible", 2: "Bad", 3: "Okay", 4: "Good", 5: "Great"}
    avg_mood_label = mood_labels.get(round(avg_mood), "Okay") if avg_mood else None

    return {
        "avg_cigarettes_per_day": avg_cigs,
        "best_day": {"date": best_day, "cigarettes": day_map[best_day]["cigs"]},
        "worst_day": {"date": worst_day, "cigarettes": day_map[worst_day]["cigs"]},
        "avg_mood": avg_mood,
        "avg_mood_label": avg_mood_label,
        "avg_craving": avg_craving,
        "avg_stress": avg_stress,
        "total_nicotine_mg": total_nicotine,
        "money_saved": money_saved,
        "days_on_plan": days_on_plan,
        "health_milestone": health_milestone,
        "days_logged": len(recent),
    }


# ═══════════════════════════════════════════════════════════════════════════
# FEATURE 6 — Trigger Analysis
# ═══════════════════════════════════════════════════════════════════════════

@app.get("/users/{user_id}/trigger-analysis")
def get_trigger_analysis(user_id: str):
    user = get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    all_logs = user.get("progress", {}).get("dailyLogs", [])
    logs_with_triggers = [lg for lg in all_logs if lg.get("triggers")]

    if len(logs_with_triggers) < 5:
        return {
            "enough_data": False,
            "logs_with_triggers": len(logs_with_triggers),
            "trigger_counts": [],
            "top_triggers": [],
        }

    from collections import Counter
    counter: Counter = Counter()
    for lg in logs_with_triggers:
        for t in lg["triggers"]:
            counter[t] += 1

    total = sum(counter.values())
    trigger_counts = [
        {"trigger": t, "count": c, "percentage": round(c / total * 100, 1)}
        for t, c in counter.most_common()
    ]
    top_triggers = [t["trigger"] for t in trigger_counts[:3]]

    return {
        "enough_data": True,
        "logs_with_triggers": len(logs_with_triggers),
        "trigger_counts": trigger_counts,
        "top_triggers": top_triggers,
    }


# ═══════════════════════════════════════════════════════════════════════════
# NOTIFICATION STATUS
# ═══════════════════════════════════════════════════════════════════════════

@app.get("/users/{user_id}/notification-status")
def get_notification_status(user_id: str):
    """
    Returns two notification flags:
    - needs_log_reminder: user hasn't logged today
    - proactive_risk_alert: user exceeded target 3+ consecutive days
    """
    user = get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    today_str = datetime.now().strftime("%Y-%m-%d")
    all_logs = user.get("progress", {}).get("dailyLogs", [])

    # 1. Daily log reminder
    logged_today = any(str(lg.get("date", ""))[:10] == today_str for lg in all_logs)
    needs_log_reminder = not logged_today

    # 2. Proactive risk alert: 3 consecutive days over target
    plan = user.get("plan") or {}
    weekly_goals = plan.get("weeklyGoals", [])
    start_date_str = user["profile"].get("startDate", "")

    proactive_risk_alert = False
    consecutive_over = 0

    if weekly_goals and all_logs and start_date_str:
        try:
            from collections import defaultdict
            start_dt = datetime.strptime(start_date_str, "%Y-%m-%d")

            day_cigs: dict = defaultdict(int)
            for lg in all_logs:
                dk = str(lg.get("date", ""))[:10]
                day_cigs[dk] += lg.get("cigarettesSmoked", 0)

            # Check last 3 logged days (most recent first)
            check_days = sorted(day_cigs.keys(), reverse=True)[:3]
            for dk in check_days:
                day_dt = datetime.strptime(dk, "%Y-%m-%d")
                days_from_start = (day_dt - start_dt).days
                week_idx = max(0, days_from_start // 7)
                limit = weekly_goals[week_idx].get("dailyLimit", 999) if week_idx < len(weekly_goals) else 0
                if day_cigs[dk] > limit:
                    consecutive_over += 1
                else:
                    break

            proactive_risk_alert = consecutive_over >= 3
        except Exception as ex:
            logger.warning(f"notification-status risk check failed: {ex}")

    return {
        "needs_log_reminder": needs_log_reminder,
        "proactive_risk_alert": proactive_risk_alert,
        "consecutive_days_over_target": consecutive_over,
        "logged_today": logged_today,
    }


# ═══════════════════════════════════════════════════════════════════════════
# DEMO DATA SEEDER
# ═══════════════════════════════════════════════════════════════════════════

class SeedDemoRequest(BaseModel):
    scenario: str  # "on_track" | "struggling" | "relapsing"

@app.post("/users/{user_id}/seed-demo-data")
def seed_demo_data(user_id: str, body: SeedDemoRequest):
    """Inject 7 days of realistic backdated demo logs for presentation purposes."""
    import random as _rnd

    user = get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    scenario = body.scenario
    if scenario not in ("on_track", "struggling", "relapsing"):
        raise HTTPException(status_code=400, detail="scenario must be on_track, struggling, or relapsing")

    # Get current week's plan target
    plan = user.get("plan") or {}
    weekly_goals = plan.get("weeklyGoals", [])
    start_date_str = user["profile"].get("startDate", "")
    try:
        start_dt = datetime.strptime(start_date_str, "%Y-%m-%d")
        days_elapsed = (datetime.now() - start_dt).days
        week_idx = min(max(days_elapsed // 7, 0), len(weekly_goals) - 1)
        plan_limit = weekly_goals[week_idx]["dailyLimit"] if weekly_goals else 10
    except Exception:
        plan_limit = 10

    # Per-scenario data ranges
    PROFILES = {
        "on_track": {
            "cig_delta": (-plan_limit, 0),        # at or below limit
            "craving":   (2, 4),
            "stress":    (2, 4),
            "moods":     ["Happy", "Calm", "great", "good"],
            "sleep":     (7.0, 8.0),
            "steps":     (6000, 9000),
            "hrv":       (55, 75),
            "rhr":       (55, 65),
            "hr_avg":    (65, 75),
            "active":    (30, 60),
        },
        "struggling": {
            "cig_delta": (1, 3),
            "craving":   (5, 7),
            "stress":    (5, 7),
            "moods":     ["Stable", "Restless", "okay", "bad"],
            "sleep":     (5.5, 6.5),
            "steps":     (3000, 5000),
            "hrv":       (35, 50),
            "rhr":       (70, 85),
            "hr_avg":    (78, 90),
            "active":    (10, 25),
        },
        "relapsing": {
            "cig_delta": (5, 10),
            "craving":   (8, 10),
            "stress":    (8, 10),
            "moods":     ["Stressed", "Anxious", "terrible", "bad"],
            "sleep":     (3.5, 5.0),
            "steps":     (500, 2000),
            "hrv":       (15, 30),
            "rhr":       (88, 105),
            "hr_avg":    (90, 110),
            "active":    (0, 10),
        },
    }

    p = PROFILES[scenario]

    def rnd_float(lo, hi, decimals=1):
        return round(_rnd.uniform(lo, hi), decimals)

    def rnd_int(lo, hi):
        return _rnd.randint(lo, hi)

    new_logs = []
    today = datetime.now().date()
    from datetime import timedelta, time as dtime
    for day_offset in range(6, -1, -1):   # 6 days ago → today
        log_date = today - timedelta(days=day_offset)
        date_str = log_date.strftime("%Y-%m-%d")

        delta_lo, delta_hi = p["cig_delta"]
        cigs = max(0, plan_limit + rnd_int(delta_lo, delta_hi))

        new_logs.append({
            "date": date_str,
            "cigarettesSmoked": cigs,
            "mood": _rnd.choice(p["moods"]),
            "cravingIntensity": rnd_int(*p["craving"]),
            "sleepHours": rnd_float(*p["sleep"]),
            "stressLevel": rnd_int(*p["stress"]),
            "notes": None,
            "triggers": [],
            "logged_at": datetime.combine(log_date, dtime(20, 0, 0)).isoformat(),
            "heart_rate_avg": rnd_float(*p["hr_avg"]),
            "resting_heart_rate": rnd_float(*p["rhr"]),
            "heart_rate_variability": rnd_float(*p["hrv"]),
            "step_count": rnd_int(*p["steps"]),
            "active_minutes": rnd_int(*p["active"]),
        })

    # Clear existing logs and replace with demo data
    data = load_users()
    for i, u in enumerate(data["users"]):
        if u["userId"] == user_id:
            if "progress" not in data["users"][i]:
                data["users"][i]["progress"] = {}
            data["users"][i]["progress"]["dailyLogs"] = new_logs
            # Reset risk history so fresh analysis reflects new data
            data["users"][i]["risk_history"] = []
            data["users"][i]["plan_last_adjusted_date"] = None
            data["users"][i]["plan_adjusted_for_risk_class"] = None
            break
    save_users(data)

    return {"seeded": True, "days": 7, "scenario": scenario}


@app.delete("/users/{user_id}/clear-logs")
def clear_logs(user_id: str):
    """Wipe all daily logs for a user — for demo reset purposes."""
    user = get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    data = load_users()
    for i, u in enumerate(data["users"]):
        if u["userId"] == user_id:
            data["users"][i]["progress"] = {"dailyLogs": []}
            data["users"][i]["risk_history"] = []
            data["users"][i]["plan_last_adjusted_date"] = None
            data["users"][i]["plan_adjusted_for_risk_class"] = None
            break
    save_users(data)

    return {"cleared": True, "userId": user_id}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)