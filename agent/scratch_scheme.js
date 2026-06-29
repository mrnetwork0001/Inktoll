const { BatchSettlementEvmScheme } = require('@x402/evm');
const s = new BatchSettlementEvmScheme({ 
  chainId: 5042002, 
  verifyingContract: '0x0077777d7EBA4688BDeF3E311b846F25870A19B9',
  domainName: 'GatewayWalletBatched',
  domainVersion: '1'
});
console.log('Domain:', s.getDomain());
console.log('Types:', s.getTypes());
