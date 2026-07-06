import express from 'express';
import { initiateUserControlledWalletsClient } from '@circle-fin/user-controlled-wallets';
import { config } from '../config.js';

const router = express.Router();

let circleClient: any = null;

function getClient() {
  if (!circleClient && config.circle.apiKey) {
    circleClient = initiateUserControlledWalletsClient({
      apiKey: config.circle.apiKey,
    });
  }
  return circleClient;
}

// Step 1: Request Email OTP
router.post('/request-otp', async (req, res) => {
  try {
    const { deviceId, email } = req.body;
    if (!deviceId || !email) {
      return res.status(400).json({ error: 'Missing deviceId or email' });
    }

    const client = getClient();
    if (!client) throw new Error('Circle API Key missing');

    const response = await client.createDeviceTokenForEmailLogin({
      deviceId,
      email,
    });

    res.json(response.data);
  } catch (error: any) {
    console.error('Failed to request OTP:', error?.response?.data || error);
    res.status(500).json({ error: error.message });
  }
});

// Step 3: Initialize user (get challengeId)
router.post('/initialize', async (req, res) => {
  try {
    const { userToken } = req.body;
    if (!userToken) {
      return res.status(400).json({ error: 'Missing userToken' });
    }

    const client = getClient();
    if (!client) throw new Error('Circle API Key missing');

    const response = await client.createUserPinWithWallets({
      userToken,
      blockchains: ['ARC-TESTNET'],
      accountType: 'SCA',
    });

    res.json({ challengeId: response.data?.challengeId });
  } catch (error: any) {
    console.error('Failed to initialize user:', error?.response?.data || error);
    
    // 155106 means the user already exists and has wallets
    if (error?.response?.data?.code === 155106) {
      return res.json({ code: 155106 });
    }
    
    res.status(500).json({ error: error.message });
  }
});

router.get('/list', async (req, res) => {
  try {
    const userToken = req.query.userToken as string;
    if (!userToken) {
      return res.status(400).json({ error: 'Missing userToken' });
    }

    const client = getClient();
    if (!client) throw new Error('Circle API Key missing');

    const response = await client.getUserWallets({ userToken });
    res.json(response.data);
  } catch (error: any) {
    console.error('Failed to list wallets:', error?.response?.data || error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
