// Use environment variable for API URL, fallback to local IP
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://192.168.1.4:8000';

export interface UserProfile {
  age: number;
  cigarettesPerDay: number;
  cigaretteType: string;
  startDate: string;
}

export interface WeeklyGoal {
  week: number;
  dailyLimit: number;
  strategies: string[];
  tips: string[];
}

export interface CessationPlan {
  weeklyGoals: WeeklyGoal[];
}

export interface DailyLog {
  date: string;
  cigarettesSmoked: number;
  mood: string;
  cravingIntensity: number;
  sleepHours?: number;
  stressLevel?: number;
  notes?: string;
  triggers?: string[];
  heart_rate_avg?: number;
  resting_heart_rate?: number;
  heart_rate_variability?: number;
  step_count?: number;
  active_minutes?: number;
}

export interface User {
  userId: string;
  profile: UserProfile;
  plan?: {
    weeklyGoals: WeeklyGoal[];
  };
  progress?: {
    dailyLogs: DailyLog[];
  };
}

export interface UserInput {
  age: number;
  cigarettesPerDay: number;
  cigaretteType: string;
  years_smoking?: number;
  first_cigarette_time?: string;
  primary_trigger?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export interface VideoResource {
  title: string;
  thumbnail: string;
  url: string;
  channel: string;
}

export interface WebResource {
  title: string;
  url: string;
}

export interface ChatResponse {
  chatId: string;
  message: string;
  videos?: VideoResource[];
  resources?: WebResource[];
}

export interface RelapseRiskInput {
  daily_nicotine_intake: number;
  craving_level: number;
  stress_level: number;
  mood: string;
  sleep_hours: number;
  logging_consistency: number;
}

export interface RelapseRiskResult {
  relapse_risk_class: number;
  relapse_risk_label: string;
  probabilities: { 'Low-risk': number; 'Medium-risk': number; 'High-risk': number; };
  model_used: string;
  days_used?: number;
  data_warning?: string | null;
  craving_pressure?: boolean | null;
  biometric_signals?: {
    avg_heart_rate: number | null;
    avg_resting_heart_rate: number | null;
    avg_hrv: number | null;
    avg_steps: number | null;
    avg_active_minutes: number | null;
    days_with_data: number;
  } | null;
  biometric_risk_note?: string | null;
}

export interface AdjustPlanResult {
  adjustment_needed: boolean;
  reason: string;
  weeks_added: number;
  plan: { weeklyGoals: WeeklyGoal[] };
}

export interface AdjustPlanSimpleResult {
  weeks_added: number;
  frozen_week: boolean;
  reason: string;
  plan: { weeklyGoals: WeeklyGoal[] };
}

export interface BadgeEntry { name: string; emoji: string; date_earned: string; }
export interface BadgesResult {
  current_streak: number;
  longest_streak: number;
  earned_badges: BadgeEntry[];
  all_badges: { name: string; emoji: string; days: number }[];
}

export interface RiskHistoryEntry { date: string; risk_level: string; risk_class: number; confidence: number; }
export interface RiskHistoryResult { risk_history: RiskHistoryEntry[]; }

export interface WeeklySummaryResult {
  avg_cigarettes_per_day: number;
  best_day: { date: string; cigarettes: number };
  worst_day: { date: string; cigarettes: number };
  avg_mood: number | null;
  avg_mood_label: string | null;
  avg_craving: number | null;
  avg_stress: number | null;
  total_nicotine_mg: number;
  money_saved: number;
  days_on_plan: number;
  health_milestone: string;
  days_logged: number;
}

export interface TriggerCount { trigger: string; count: number; percentage: number; }
export interface TriggerAnalysisResult {
  enough_data: boolean;
  logs_with_triggers: number;
  trigger_counts: TriggerCount[];
  top_triggers: string[];
}

const api = {
  /**
   * Create a new user with the given profile data
   */
  createUser: async (userData: UserInput): Promise<{ userId: string }> => {
    const response = await fetch(`${API_URL}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      throw new Error('Failed to create user');
    }

    return response.json();
  },

  /**
   * Generate a cessation plan for the user
   */
  generatePlan: async (userId: string, userData: UserInput): Promise<CessationPlan> => {
    const response = await fetch(`${API_URL}/users/${userId}/plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      console.error('Failed to generate plan:', await response.text());
      throw new Error('Failed to generate plan');
    }

    const data = await response.json();
    console.log('Plan response from backend:', data); // For debugging
    
    // Return the plan directly if it already has the right structure
    // otherwise return the whole response (plan might be the entire response)
    return data.plan || data;
  },

  /**
   * Get a user's cessation plan
   */
  getPlan: async (userId: string): Promise<CessationPlan> => {
    const response = await fetch(`${API_URL}/users/${userId}/plan`);

    if (!response.ok) {
      throw new Error('Failed to get plan');
    }

    return response.json();
  },

  /**
   * Add a daily log for the user
   */
  addDailyLog: async (userId: string, logData: Omit<DailyLog, 'id'>): Promise<void> => {
    const response = await fetch(`${API_URL}/users/${userId}/logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(logData),
    });

    if (!response.ok) {
      throw new Error('Failed to add log');
    }
  },

  /**
   * Get all daily logs for a user
   */
  getDailyLogs: async (userId: string): Promise<DailyLog[]> => {
    const response = await fetch(`${API_URL}/users/${userId}/logs`);

    if (!response.ok) {
      throw new Error('Failed to get logs');
    }

    const data = await response.json();
    return data.dailyLogs;
  },

  /**
   * Get user information
   */
  getUser: async (userId: string): Promise<User> => {
    const response = await fetch(`${API_URL}/users/${userId}`);

    if (!response.ok) {
      throw new Error('Failed to get user information');
    }

    return response.json();
  },

  /**
   * Send a message to the chat assistant
   */
  sendChatMessage: async (userId: string, message: string, chatId?: string): Promise<ChatResponse> => {
    const response = await fetch(`${API_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        message,
        chatId
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send message');
    }

    return response.json();
  },

  /**
   * Get chat history for a specific chat
   */
  getChatHistory: async (chatId: string): Promise<{messages: ChatMessage[]}> => {
    const response = await fetch(`${API_URL}/chat/${chatId}`);

    if (!response.ok) {
      throw new Error('Failed to get chat history');
    }

    return response.json();
  },

  /**
   * Get all chats for a user
   */
  getUserChats: async (userId: string): Promise<{chats: Array<{chatId: string, userId: string, messages: ChatMessage[]}>}> => {
    const response = await fetch(`${API_URL}/users/${userId}/chats`);

    if (!response.ok) {
      throw new Error('Failed to get user chats');
    }

    return response.json();
  },

  /**
   * Predict relapse risk using the ML model
   */
  predictRelapseRisk: async (input: RelapseRiskInput): Promise<RelapseRiskResult> => {
    const response = await fetch(`${API_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!response.ok) throw new Error('Failed to get relapse risk prediction');
    return response.json();
  },

  /**
   * Get relapse risk prediction automatically from user's last 7 days of logs
   */
  getUserRelapseRisk: async (userId: string): Promise<RelapseRiskResult> => {
    const response = await fetch(`${API_URL}/users/${userId}/prediction/relapse-risk`);
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Failed to get relapse risk' }));
      throw new Error(err.detail || 'Failed to get relapse risk prediction');
    }
    return response.json();
  },

  /** Feature 1 — Adaptive Plan Adjustment */
  adjustPlan: async (userId: string): Promise<AdjustPlanResult> => {
    const response = await fetch(`${API_URL}/users/${userId}/prediction/adjust-plan`, { method: 'POST' });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Failed to adjust plan' }));
      throw new Error(err.detail || 'Failed to adjust plan');
    }
    return response.json();
  },

  /** Simple deterministic plan adjustment from relapse risk result screen */
  adjustPlanSimple: async (userId: string): Promise<AdjustPlanSimpleResult> => {
    const response = await fetch(`${API_URL}/users/${userId}/adjust-plan`, { method: 'POST' });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Failed to adjust plan' }));
      throw new Error(err.detail || 'Failed to adjust plan');
    }
    return response.json();
  },

  /** Feature 2 — Risk History */
  getRiskHistory: async (userId: string): Promise<RiskHistoryResult> => {
    const response = await fetch(`${API_URL}/users/${userId}/prediction/risk-history`);
    if (!response.ok) throw new Error('Failed to get risk history');
    return response.json();
  },

  /** Feature 4 — Badges */
  getBadges: async (userId: string): Promise<BadgesResult> => {
    const response = await fetch(`${API_URL}/users/${userId}/badges`);
    if (!response.ok) throw new Error('Failed to get badges');
    return response.json();
  },

  /** Feature 5 — Weekly Summary */
  getWeeklySummary: async (userId: string): Promise<WeeklySummaryResult> => {
    const response = await fetch(`${API_URL}/users/${userId}/weekly-summary`);
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Failed to get weekly summary' }));
      throw new Error(err.detail || 'Failed to get weekly summary');
    }
    return response.json();
  },

  /** Feature 6 — Trigger Analysis */
  getTriggerAnalysis: async (userId: string): Promise<TriggerAnalysisResult> => {
    const response = await fetch(`${API_URL}/users/${userId}/trigger-analysis`);
    if (!response.ok) throw new Error('Failed to get trigger analysis');
    return response.json();
  },

  /** Demo — Seed demo data */
  seedDemoData: async (userId: string, scenario: 'on_track' | 'struggling' | 'relapsing'): Promise<{ seeded: boolean; days: number; scenario: string }> => {
    const response = await fetch(`${API_URL}/users/${userId}/seed-demo-data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Failed to seed data' }));
      throw new Error(err.detail || 'Failed to seed demo data');
    }
    return response.json();
  },

  /** Demo — Clear all logs */
  clearLogs: async (userId: string): Promise<{ cleared: boolean }> => {
    const response = await fetch(`${API_URL}/users/${userId}/clear-logs`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Failed to clear logs');
    return response.json();
  },

  /** Notification status — log reminder + proactive risk alert */
  getNotificationStatus: async (userId: string): Promise<{
    needs_log_reminder: boolean;
    proactive_risk_alert: boolean;
    consecutive_days_over_target: number;
    logged_today: boolean;
  }> => {
    const response = await fetch(`${API_URL}/users/${userId}/notification-status`);
    if (!response.ok) throw new Error('Failed to get notification status');
    return response.json();
  },
};

export default api;