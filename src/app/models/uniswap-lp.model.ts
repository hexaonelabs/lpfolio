export interface UniswapLPPosition {
  token0: string;
  token1: string;
  token0Price: number;
  token1Price: number;
  token0Amount: number;
  token1Amount: number;
  minPrice: number;
  maxPrice: number;
  entryPrice: number;
  fundingRateAnnual: number;
  openFee: number;
  closeFee: number; 
  holdingDays: number
}

export interface HedgeResult {
  marginRequired: number;
  positionSize: number;
  leverage: number;
  stopLoss: number;
  takeProfit: number;
  fundingCost: number;
  transactionFees: number;
}