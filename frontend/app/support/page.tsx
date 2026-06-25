'use client';

import React, { useEffect, useState } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import SupportChat from '../../components/SupportChat/SupportChat';
import Card from '@/components/ui/Card';

const SupportPage: React.FC = () => {
  const [userId, setUserId] = useState<string>('');
  const [proactiveMessage, setProactiveMessage] = useState<string | undefined>(undefined);

  useEffect(() => {
    const storedUserId = localStorage.getItem('cleanslate_user_id');
    if (!storedUserId) return;
    setUserId(storedUserId);

    // Check if a proactive risk alert should trigger an opening message
    (async () => {
      try {
        const api = (await import('../../services/api')).default;
        const status = await api.getNotificationStatus(storedUserId);
        if (status.proactive_risk_alert) {
          setProactiveMessage(
            "I noticed you've been above your target for the last few days. That can happen during difficult phases — it doesn't mean you've failed. Would you like to talk about cravings, stress, or look at adjusting your quit plan?"
          );
        }
      } catch { /* silent */ }
    })();
  }, []);

  return (
    <MainLayout>
      <div className="p-6">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold mb-2 ">Support Assistant</h1>
          <p className="text-gray-600">
            Talk with our AI assistant about any concerns, cravings, or relapses. 
            Get personalized support and resources to help you continue your quit journey.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <SupportChat userId={userId} proactiveMessage={proactiveMessage} />
          
          <Card variant="gradient" className="mt-6 p-5 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-3">About This Feature</h2>
            <p className="mb-3">
              The Support Assistant is here to help you through difficult moments in your quit journey.
              Whether you&apos;re experiencing intense cravings, had a relapse, or just need advice, you
              can freely discuss anything related to your smoking cessation journey.
            </p>
            <h3 className="font-medium mt-4 mb-2">This assistant can help with:</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Coping strategies during strong cravings</li>
              <li>Support after a relapse</li>
              <li>Information about withdrawal symptoms</li>
              <li>Motivational support when you feel like giving up</li>
              <li>Recommendations for helpful resources and videos</li>
              <li>Answers to questions about smoking and quitting</li>
            </ul>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default SupportPage;