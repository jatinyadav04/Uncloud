// Gemini API service for generating personalized plans
import api from './api';

type UserAnswers = {
  age: number;
  cigarettesPerDay: number;
  cigaretteType: string;
};

export async function generateSmokingCessationPlan(userData: UserAnswers) {
  try {
    console.log('Creating user with data:', userData);
    // First create a user
    const userResponse = await api.createUser(userData);
    const userId = userResponse.userId;
    console.log('User created with ID:', userId);
    
    // Then generate a plan for that user
    console.log('Generating plan for user:', userId);
    const planResponse = await api.generatePlan(userId, userData);
    console.log('Raw plan response:', planResponse);
    
    // Create a default plan if the response is empty or invalid
    if (!planResponse || typeof planResponse !== 'object') {
      console.error('Invalid plan response received:', planResponse);
      return createDefaultPlan(userData);
    }
    
    // If the response already has a weeklyGoals property, return it directly
    if (planResponse.weeklyGoals && Array.isArray(planResponse.weeklyGoals)) {
      console.log('Using raw weeklyGoals from backend');
      return planResponse;
    }
    
    // Otherwise transform the plan data
    return transformPlanToFrontendFormat(planResponse, userData);
  } catch (error) {
    console.error('Error generating plan:', error);
    // Return a default plan instead of throwing an error
    return createDefaultPlan(userData);
  }
}

// Create a default plan when the API fails
function createDefaultPlan(userData: UserAnswers) {
  console.log('Creating default plan for', userData);
  const weeklyGoals = [];
  const initialCigarettes = userData.cigarettesPerDay;
  
  for (let week = 1; week <= 8; week++) {
    // Calculate a reasonable reduction schedule (12.5% reduction per week)
    const reduction = initialCigarettes * (week * 0.125);
    const dailyLimit = Math.max(0, Math.round(initialCigarettes - reduction));
    
    // Create personalized strategies based on user info
    const strategies = [];
    if (week === 1) {
      strategies.push(`Start by delaying your first cigarette of the day by 30 minutes`);
    } else {
      strategies.push(`Delay your first cigarette by ${week * 30} minutes`);
    }
    
    if (userData.cigaretteType.toLowerCase().includes('menthol')) {
      strategies.push('Try switching to unflavored cigarettes this week to reduce appeal');
    }
    
    strategies.push(
      `Identify your top ${week} triggers and create an avoidance plan`,
      'Practice 5-minute deep breathing when cravings hit',
      `Find ${week} smoke-free activities to replace smoking moments`
    );
    
    // Age-appropriate tips
    const tips = [];
    if (userData.age < 30) {
      tips.push('Calculate how much money you\'ll save this month and plan a reward');
    } else if (userData.age < 50) {
      tips.push('Consider how quitting now can significantly improve your long-term health');
    } else {
      tips.push('Remember it\'s never too late to quit and see health improvements');
    }
    
    tips.push('Track your progress daily and celebrate small victories');
    
    weeklyGoals.push({
      week,
      dailyLimit,
      strategies,
      tips
    });
  }
  
  return transformPlanToFrontendFormat({ weeklyGoals }, userData);
}

// The transformation is only used if needed for specific UI components
// but we'll preserve all the rich personalized content from Gemini
export function transformPlanToFrontendFormat(planData: any, userData: UserAnswers) {
  const { weeklyGoals } = planData;
  
  if (!weeklyGoals || !Array.isArray(weeklyGoals)) {
    console.error('Invalid plan data structure:', planData);
    throw new Error('Invalid plan data received from backend');
  }
  
  const weeklyTargets = weeklyGoals.map((week: any) => week.dailyLimit);
  
  // Extract all strategies and tips, preserving their personalized context
  const allStrategies = weeklyGoals.flatMap((week: any) => week.strategies);
  // Get a reasonable number of top strategies for summaries
  const strategies = [...new Set(allStrategies)].slice(0, 6);
  
  const weeklyPlans = weeklyGoals.map((week: any) => ({
    week: week.week,
    goal: `Week ${week.week}: ${week.dailyLimit} cigarettes per day`,
    strategies: week.strategies,
    tips: week.tips,
    dailyTarget: week.dailyLimit
  }));
  
  // Generate health improvements timeline
  const healthImprovements = [
    { day: 1, improvement: "Carbon monoxide levels in blood return to normal" },
    { day: 2, improvement: "Nicotine is eliminated from the body" },
    { day: 3, improvement: "Sense of smell and taste begin to improve" },
    { day: 14, improvement: "Circulation improves and lung function increases" },
    { day: 30, improvement: "Lungs begin to cleanse themselves" },
    { day: 90, improvement: "Risk of heart attack begins to decrease" },
    { day: 270, improvement: "Lung function improves by up to 10%" },
    { day: 365, improvement: "Risk of coronary heart disease is half that of a smoker" }
  ];
  
  return {
    weeklyGoals, // Include the original weeklyGoals directly
    weeklyTargets,
    strategies,
    weeklyPlans,
    healthImprovements
  };
}