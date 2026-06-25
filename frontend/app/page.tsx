'use client';

import { useState, useEffect } from 'react';
import ChatBot from '@/components/ChatBot';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import api, { CessationPlan, UserInput } from '@/services/api';
import MainLayout from '@/components/layout/MainLayout';
import Link from 'next/link';
import { useUser } from '@/contexts/UserContext';
import { useRouter } from 'next/navigation';

export default function Home() {
  const { user, setUser, isLoading: userLoading } = useUser();
  const router = useRouter();
  const [step, setStep] = useState<'landing' | 'chatbot' | 'plan'>('landing');
  const [plan, setPlan] = useState<CessationPlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect to dashboard if user is already logged in
  useEffect(() => {
    if (user && step === 'landing') {
      router.push('/dashboard');
    }
  }, [user, step, router]);

  // Show loading state while checking user authentication
  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary"></div>
      </div>
    );
  }

  const handleStartClick = () => {
    setStep('chatbot');
  };

  const handleChatbotComplete = async (userData: UserInput) => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Starting plan generation process with user data:', userData);
      
      // Create a new user
      const { userId } = await api.createUser(userData);
      console.log('User created with ID:', userId);
      
      // Set user in context
      setUser({
        userId,
        profile: {
          age: userData.age,
          cigarettesPerDay: userData.cigarettesPerDay,
          cigaretteType: userData.cigaretteType,
          startDate: new Date().toISOString().split('T')[0]
        }
      });
      
      // Generate a plan for the user
      console.log('Requesting plan generation from API...');
      const generatedPlan = await api.generatePlan(userId, userData);
      console.log('Plan received from API:', generatedPlan);
      
      // Validate plan data before setting state
      if (!generatedPlan || !generatedPlan.weeklyGoals) {
        console.error('Invalid plan data received:', generatedPlan);
        setError('Received invalid plan data from the server. Using fallback plan.');
      }
      
      setPlan(generatedPlan);
      setStep('plan');
    } catch (err) {
      console.error('Plan generation failed:', err);
      setError('Failed to generate your plan. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const testimonials = [
    {
      name: "Sarah T.",
      age: 34,
      text: "After 15 years of smoking, Cleanslate helped me quit for good. The personalized plan was exactly what I needed.",
      image: "https://randomuser.me/api/portraits/women/12.jpg"
    },
    {
      name: "Michael R.",
      age: 42,
      text: "I tried to quit 7 times before using Cleanslate. The daily tracking kept me accountable and I'm now smoke-free for 6 months!",
      image: "https://randomuser.me/api/portraits/men/32.jpg"
    },
    {
      name: "Jessica K.",
      age: 29,
      text: "The AI-generated tips were surprisingly relevant to my specific triggers. This app really understands the quitting journey.",
      image: "https://randomuser.me/api/portraits/women/45.jpg"
    }
  ];

  const renderStep = () => {
    switch (step) {
      case 'landing':
        return (
          <div>
            {/* Hero Section */}
            <div className="relative bg-gradient-to-br from-primary/90 to-secondary/90 text-white rounded-3xl overflow-hidden mb-12">
              <div className="absolute inset-0 bg-[url('/pattern.svg')] opacity-10"></div>
              <div className="relative max-w-4xl mx-auto px-6 py-20 md:py-24 text-center">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-black">
                  Your Journey to a <span className="text-accent">Smoke-Free</span> Life Starts Here
                </h1>
                <p className="text-xl md:text-2xl mb-10 max-w-2xl mx-auto text-gray-700">
                  Cleanslate provides a personalized 8-week cessation plan tailored to your specific smoking habits, 
                  powered by advanced AI technology.
                </p>
                <Button size="lg" onClick={handleStartClick} className="text-lg py-4 px-10 shadow-lg hover:shadow-xl text-white border-black bg-pink-300">
                  Start Your Journey Now
                </Button>
              </div>
              
              <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-background-light to-transparent"></div>
            </div>

            {/* Features Section */}
            <div className="max-w-6xl mx-auto mb-16 px-4">
              <h2 className="text-3xl font-bold text-center mb-10">How Cleanslate Helps You Quit</h2>
              
              <div className="grid md:grid-cols-3 gap-8">
                <Card className="text-center p-8 hover:shadow-lg transition-shadow">
                  <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-primary">AI-Powered Personalization</h3>
                  <p className="text-gray-600">
                    Gemini 2.0 analyzes your smoking habits to create a truly personalized cessation plan designed specifically for you.
                  </p>
                </Card>
                
                <Card className="text-center p-8 hover:shadow-lg transition-shadow">
                  <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-primary">8-Week Gradual Reduction</h3>
                  <p className="text-gray-600">
                    Our evidence-based gradual reduction approach helps you decrease nicotine dependency at a sustainable pace.
                  </p>
                </Card>
                
                <Card className="text-center p-8 hover:shadow-lg transition-shadow">
                  <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-primary">Progress Tracking</h3>
                  <p className="text-gray-600">
                    Visualize your journey with detailed progress tracking, celebrate milestones, and identify patterns in your habits.
                  </p>
                </Card>
              </div>
            </div>
            
            {/* Testimonials Section */}
            <div className="bg-gradient-to-br from-background-light to-background-dark py-16 px-4 rounded-3xl mb-16">
              <h2 className="text-3xl font-bold text-center mb-12">Success Stories</h2>
              
              <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
                {testimonials.map((testimonial, index) => (
                  <Card key={index} className="hover:shadow-lg transition-shadow">
                    <div className="flex items-start mb-4">
                      <img 
                        src={testimonial.image} 
                        alt={testimonial.name} 
                        className="w-12 h-12 rounded-full mr-4"
                      />
                      <div>
                        <h3 className="font-bold text-primary">{testimonial.name}</h3>
                        <p className="text-sm text-gray-500">Age: {testimonial.age}</p>
                      </div>
                    </div>
                    <p className="text-gray-700 italic">"{testimonial.text}"</p>
                  </Card>
                ))}
              </div>
            </div>
            
            {/* CTA Section */}
            <div className="max-w-3xl mx-auto text-center mb-16 px-4">
              <h2 className="text-3xl font-bold mb-6">Ready to Break Free?</h2>
              <p className="text-xl mb-8">
                Join thousands who have successfully quit smoking with our personalized cessation plans. Your journey to a healthier life is just a click away.
              </p>
              <Button size="lg" onClick={handleStartClick} className="text-lg py-4 px-10 shadow-lg hover:shadow-xl text-white border-black bg-pink-300">
                Start Your Quit Journey
              </Button>
            </div>
          </div>
        );
        
      case 'chatbot':
        return (
          <div className="max-w-2xl mx-auto px-4">
            <h2 className="text-3xl font-bold mb-8 text-center text-primary">Let's Create Your Plan</h2>
            <p className="text-center text-lg mb-8 text-gray-600">
              Answer a few questions about your smoking habits and our AI assistant will create a personalized 8-week cessation plan just for you.
            </p>
            <ChatBot onComplete={handleChatbotComplete} />
          </div>
        );
        
      case 'plan':
        return (
          <div className="w-full max-w-4xl mx-auto px-4">
            <h2 className="text-3xl font-bold mb-6 text-center text-primary">Your 8-Week Cessation Plan</h2>
            
            {error && (
              <Card className="mb-6 bg-red-50 border-red-200 text-red-700">
                {error}
              </Card>
            )}
            
            {isLoading ? (
              <div className="flex flex-col justify-center items-center py-16">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary mb-4"></div>
                <p className="text-lg text-gray-600">Generating your personalized plan...</p>
              </div>
            ) : plan ? (
              <>
                <Card className="mb-8 bg-primary/5 border-primary p-8">
                  <h3 className="text-xl font-bold mb-4">Your Plan Summary</h3>
                  <p className="mb-6">
                    Based on your input, we've created a personalized 8-week cessation plan to help you gradually reduce and eventually quit smoking. Your plan includes weekly targets, strategies tailored to your habits, and motivational tips.
                  </p>
                  {plan.weeklyGoals && plan.weeklyGoals.length > 0 ? (
                    <>
                      <div className="flex justify-between mb-4">
                        <span className="font-medium">Starting amount:</span>
                        <span className="font-bold">{plan.weeklyGoals[0]?.dailyLimit} cigarettes/day</span>
                      </div>
                      <div className="flex justify-between mb-4">
                        <span className="font-medium">Final target:</span>
                        <span className="font-bold">{plan.weeklyGoals[plan.weeklyGoals.length - 1]?.dailyLimit} cigarettes/day</span>
                      </div>
                      <div className="flex justify-between mb-6">
                        <span className="font-medium">Duration:</span>
                        <span className="font-bold">8 weeks</span>
                      </div>
                    </>
                  ) : (
                    <div className="text-red-500 mb-6">
                      Plan data is not in the expected format. Please try again.
                    </div>
                  )}
                  <Link href="/dashboard">
                    <Button 
                      fullWidth
                      size="lg"
                      className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 shadow-md"
                    >
                      Go to Dashboard
                    </Button>
                  </Link>
                </Card>
                
                <h3 className="text-2xl font-bold mt-12 mb-6">Week by Week Breakdown</h3>
                <div className="space-y-6">
                  {plan.weeklyGoals.map((weekGoal) => (
                    <Card key={weekGoal.week} className="border-l-4 border-l-primary">
                      <h3 className="text-xl font-bold mb-2">Week {weekGoal.week}</h3>
                      <p className="text-lg mb-4 font-medium">
                        Daily Limit: {weekGoal.dailyLimit} cigarette{weekGoal.dailyLimit !== 1 ? 's' : ''}
                      </p>
                      
                      <div className="mb-4">
                        <h4 className="font-medium text-primary mb-2">Strategies:</h4>
                        <ul className="list-disc pl-5 space-y-1">
                          {weekGoal.strategies.map((strategy, idx) => (
                            <li key={idx}>{strategy}</li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-primary mb-2">Tips:</h4>
                        <ul className="list-disc pl-5 space-y-1">
                          {weekGoal.tips.map((tip, idx) => (
                            <li key={idx}>{tip}</li>
                          ))}
                        </ul>
                      </div>
                    </Card>
                  ))}
                </div>
                
                <div className="flex justify-center pt-8 pb-16">
                  <Link href="/dashboard">
                    <Button size="lg" className="px-10">
                      Track Your Progress
                    </Button>
                  </Link>
                </div>
              </>
            ) : null}
          </div>
        );
    }
  };

  const content = (
    <main className="min-h-screen">
      {renderStep()}
    </main>
  );

  // Only use the layout for dashboard steps
  return step === 'landing' ? content : <MainLayout>{content}</MainLayout>;
}
