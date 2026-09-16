import { Router } from 'express';
import { requestFaucetFunds } from '../services/wallet.js';
import { config } from '../config.js';

const router = Router();

router.post('/', async (req, res) => {
  const { walletAddress, type } = req.body;

  if (!walletAddress || !type || !['creator', 'agent'].includes(type)) {
    return res.status(400).json({ error: 'Missing or invalid walletAddress or type' });
  }

  if (config.arc.isMainnet) {
    return res.status(400).json({
      error: 'There is no faucet on Arc mainnet.',
      fundingInstructions: `Send USDC on Arc to ${walletAddress} to fund this wallet.`,
      network: config.arc.networkLabel,
    });
  }

  try {
    const result = await requestFaucetFunds(walletAddress, type as 'creator' | 'agent');
    return res.json({
      success: true,
      txHash: result.txHash,
      balanceUsdc: result.balanceUsdc,
    });
  } catch (error: any) {
    console.error(`[Faucet Router] Error: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
