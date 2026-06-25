import React, { useState, useRef, useEffect } from 'react';
import Button from './ui/Button';
import Card from './ui/Card';

type ResponseType = 'age' | 'number' | 'select';

type Question = {
  id: string;
  text: string;
  responseType: ResponseType;
  options?: { label: string; value: string }[];
  placeholder?: string;
  min?: number;
  max?: number;
};

type UserAnswers = {
  age: number;
  cigarettesPerDay: number;
  cigaretteType: string;
  years_smoking: number;
  first_cigarette_time: string;
  primary_trigger: string;
};

const QUESTIONS: Question[] = [
  {
    id: 'age',
    text: 'How old are you?',
    responseType: 'age',
    placeholder: 'Enter your age',
    min: 18,
    max: 120,
  },
  {
    id: 'cigarettesPerDay',
    text: 'How many cigarettes do you smoke per day?',
    responseType: 'number',
    placeholder: 'Number of cigarettes',
    min: 1,
  },
  {
    id: 'cigaretteType',
    text: 'What type of cigarettes do you prefer?',
    responseType: 'select',
    options: [
      { label: 'Light',   value: 'Light' },
      { label: 'Regular', value: 'Regular' },
      { label: 'Menthol', value: 'Menthol' },
      { label: 'Strong',  value: 'Strong' },
    ],
  },
  {
    id: 'years_smoking',
    text: 'How many years have you been smoking?',
    responseType: 'number',
    placeholder: 'e.g. 5',
    min: 0,
    max: 80,
  },
  {
    id: 'first_cigarette_time',
    text: 'How soon after waking do you smoke your first cigarette?',
    responseType: 'select',
    options: [
      { label: 'Within 5 minutes',  value: 'within_5_min' },
      { label: '6–30 minutes',      value: '6_to_30_min' },
      { label: '31–60 minutes',     value: '31_to_60_min' },
      { label: 'After 60 minutes',  value: 'after_60_min' },
    ],
  },
  {
    id: 'primary_trigger',
    text: 'What most commonly triggers your urge to smoke?',
    responseType: 'select',
    options: [
      { label: 'Stress',            value: 'stress' },
      { label: 'Boredom',           value: 'boredom' },
      { label: 'Social Situations', value: 'social' },
      { label: 'After Meals',       value: 'after_meals' },
      { label: 'Alcohol',           value: 'alcohol' },
      { label: 'Work Pressure',     value: 'work_pressure' },
    ],
  },
];

interface ChatBotProps {
  onComplete: (userData: UserAnswers) => void;
  className?: string;
}

const ChatBot: React.FC<ChatBotProps> = ({ onComplete, className = '' }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<UserAnswers>({
    age: 0,
    cigarettesPerDay: 0,
    cigaretteType: '',
    years_smoking: 0,
    first_cigarette_time: '',
    primary_trigger: '',
  });
  const [isTyping, setIsTyping] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{ type: 'bot' | 'user'; text: string }>>([
    { type: 'bot', text: "Hi there! 👋 I'm your personal quit smoking assistant. Let me help you create a personalized cessation plan tailored specifically to you." },
    { type: 'bot', text: "I'll ask you 6 quick questions about your smoking habits. The more accurate your answers, the better your plan will be." },
    { type: 'bot', text: QUESTIONS[0].text },
  ]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const currentQuestion = QUESTIONS[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === QUESTIONS.length - 1;
  const allAnswered =
    answers.age > 0 &&
    answers.cigarettesPerDay > 0 &&
    answers.cigaretteType !== '' &&
    answers.years_smoking >= 0 &&
    answers.first_cigarette_time !== '' &&
    answers.primary_trigger !== '';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  useEffect(() => {
    if (inputRef.current && currentQuestion.responseType !== 'select') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [currentQuestionIndex, currentQuestion.responseType]);

  const simulateTyping = (callback: () => void) => {
    setIsTyping(true);
    setTimeout(() => { setIsTyping(false); callback(); }, 900);
  };

  const handleAnswer = (displayText: string, value: string | number) => {
    setChatHistory(prev => [...prev, { type: 'user', text: displayText }]);
    setInputValue('');

    setAnswers(prev => {
      const next = { ...prev };
      const id = currentQuestion.id as keyof UserAnswers;
      if (id === 'age' || id === 'cigarettesPerDay' || id === 'years_smoking') {
        (next as any)[id] = Number(value);
      } else {
        (next as any)[id] = String(value);
      }
      return next;
    });

    if (!isLastQuestion) {
      simulateTyping(() => {
        setChatHistory(prev => [...prev, { type: 'bot', text: QUESTIONS[currentQuestionIndex + 1].text }]);
        setCurrentQuestionIndex(i => i + 1);
      });
    } else {
      simulateTyping(() => {
        setChatHistory(prev => [...prev, {
          type: 'bot',
          text: "Perfect! I have everything I need. I'll now generate a personalized plan using your dependency profile and primary trigger. Click below when you're ready!",
        }]);
      });
    }
  };

  const handleNumberSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const val = Number(inputValue);
    if (!isNaN(val) && val >= 0) handleAnswer(String(val), val);
  };

  const generatePlan = () => {
    setIsSubmitting(true);
    setChatHistory(prev => [...prev, {
      type: 'bot',
      text: "I'm using Gemini AI to craft your personalized cessation plan based on your dependency score, primary trigger, and smoking history. This may take a moment...",
    }]);
    setTimeout(() => onComplete(answers), 1000);
  };

  const renderInput = () => {
    if (isLastQuestion && allAnswered) return null;

    if (currentQuestion.responseType === 'select') {
      const cols = (currentQuestion.options?.length ?? 0) <= 4 ? 2 : 3;
      return (
        <div className={`grid grid-cols-${cols} gap-2 w-full`}>
          {currentQuestion.options?.map(opt => (
            <Button
              key={opt.value}
              variant="primary"
              onClick={() => handleAnswer(opt.label, opt.value)}
              className="py-2.5 text-sm hover:bg-primary/20 transition-colors"
            >
              {opt.label}
            </Button>
          ))}
        </div>
      );
    }

    return (
      <form onSubmit={handleNumberSubmit} className="flex gap-2 items-center w-full">
        <input
          type="number"
          min={currentQuestion.min ?? 0}
          max={currentQuestion.max}
          placeholder={currentQuestion.placeholder}
          className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white"
          required
          ref={inputRef}
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
        />
        <Button type="submit" variant="primary" className="px-5">
          <span className="mr-1">Send</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </Button>
      </form>
    );
  };

  return (
    <Card className={`flex flex-col h-[600px] bg-white shadow-xl border-0 rounded-xl overflow-hidden ${className}`}>
      <div className="bg-gradient-to-r from-primary to-secondary p-4 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-white">Cleanslate Assistant</h3>
          <p className="text-xs text-white/80">Online | Powered by AI</p>
        </div>
        <div className="text-xs text-white/70 bg-white/10 px-2 py-1 rounded-full">
          {currentQuestionIndex + 1} / {QUESTIONS.length}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {chatHistory.map((msg, idx) => (
          <div key={idx} className={`mb-4 flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.type === 'bot' && (
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mr-2 mt-1 flex-shrink-0">
                <span className="text-sm">🚭</span>
              </div>
            )}
            <div className={`rounded-2xl px-4 py-3 max-w-[80%] ${
              msg.type === 'user'
                ? 'bg-primary text-gray-800 rounded-tr-none shadow-md'
                : 'bg-white text-gray-800 border border-gray-200 rounded-tl-none shadow-sm'
            }`}>
              {msg.text}
            </div>
            {msg.type === 'user' && (
              <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center ml-2 mt-1 flex-shrink-0">
                <span className="text-sm">👤</span>
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="flex mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mr-2 mt-1 flex-shrink-0">
              <span className="text-sm">🚭</span>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm">
              <span className="flex gap-2">
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce delay-150" />
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce delay-300" />
              </span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t p-4 bg-white">
        {allAnswered && isLastQuestion ? (
          <Button
            fullWidth
            onClick={generatePlan}
            size="lg"
            isLoading={isSubmitting}
            className="py-4 shadow-md hover:shadow-lg transition-all bg-gradient-to-r from-primary to-secondary"
          >
            <span className="mr-2">Generate My Personalised Plan</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </Button>
        ) : (
          renderInput()
        )}
      </div>
    </Card>
  );
};

export default ChatBot;
