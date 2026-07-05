'use client';

import React from 'react';
import { Joyride, Step, CallBackProps, STATUS } from 'react-joyride';

interface CreatorTourProps {
  run: boolean;
  onFinish: () => void;
}

export default function CreatorTour({ run, onFinish }: CreatorTourProps) {
  const steps: Step[] = [
    {
      target: '.tour-total-earnings',
      content: 'This is the lifetime sum of all payments autonomous AI agents have made for your content. It never resets!',
      skipBeacon: true,
      placement: 'bottom',
    },
    {
      target: '.tour-claimable-balance',
      content: 'This is the actual USDC sitting directly in your on-chain custodial wallet. This is real money ready to be withdrawn.',
      skipBeacon: true,
      placement: 'bottom',
    },
    {
      target: '.tour-sync-gateway',
      content: 'Sometimes blockchain networks have lag. Clicking Sync Gateway forces the backend to pull any pending agent payments directly into your Claimable Balance.',
      skipBeacon: true,
      placement: 'bottom',
    },
    {
      target: '.tour-monetized-hub',
      content: 'This hub breaks down exactly which of your articles are being read by agents, how many citations they have, and how much each has earned.',
      skipBeacon: true,
      placement: 'left',
    },
    {
      target: '.tour-agent-fans',
      content: 'This leaderboard displays the top AI agents that purchase your articles, showing their name and how much USDC they spent.',
      skipBeacon: true,
      placement: 'left',
    },
    {
      target: '.tour-settlement-hub',
      content: 'Ready to cash out? Use the Settlement Hub to withdraw your Claimable Balance directly to your MetaMask or any other personal Web3 wallet.',
      skipBeacon: true,
      placement: 'right',
    }
  ];

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];
    
    if (finishedStatuses.includes(status)) {
      onFinish();
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous={true}
      showSkipButton={true}
      showProgress={true}
      callback={handleJoyrideCallback}
      options={{
        skipScroll: true,
        buttons: ['back', 'skip', 'primary']
      }}
      locale={{
        skip: 'Skip',
        next: 'Next',
        back: 'Back',
        last: 'Finish'
      }}
      styles={{
        options: {
          arrowColor: '#1a1a1a',
          backgroundColor: '#1a1a1a',
          overlayColor: 'rgba(0, 0, 0, 0.7)',
          primaryColor: '#ff6b00',
          textColor: '#ffffff',
          width: 400,
          zIndex: 1000,
        },
        tooltipContainer: {
          textAlign: 'left',
          border: '1px solid #333',
          borderRadius: '8px',
        },
        buttonNext: {
          backgroundColor: '#ff6b00',
          borderRadius: '4px',
          padding: '8px 16px',
        },
        buttonBack: {
          color: '#aaa',
        },
        buttonSkip: {
          color: '#aaa',
          padding: '8px 16px',
          marginRight: 'auto'
        }
      }}
    />
  );
}
