export interface PositionRaw  {
  token0: any;
  token1: any;
  fee: any;
  feeGrowthInside1LastX128: bigint;
  feeGrowthInside0LastX128: bigint;
  tickLower: number;
  tickUpper: number;
  liquidity: bigint;
  tokensOwed0: any;
  tokensOwed1: any;
  tokenId: bigint;
}

export interface Position {
  id: string;
  token0: {
    id: string;
    symbol: string;
    logoURI?: string;
  };
  token1: {
    id: string;
    symbol: string;
    logoURI?: string;
  };
  tickLower: number;
  tickUpper: number;
  lowerPrice: number;
  upperPrice: number;
  tickCurrent: number;
  currentPrice: number;
  token0Amount: string;
  token1Amount: string;
  liquidity: number;
  feeTier: number;
  apy: number;
  fees?: {
    token0?: {
      claimed: number;
      unclaimed: number;
      totalAmount: number;
      unclaimedUSD: number;
      claimedUSD: number;
      totalAmountUSD: number;
    };
    token1?: {
      claimed: number;
      unclaimed: number;
      totalAmount: number;
      unclaimedUSD: number;
      claimedUSD: number;
      totalAmountUSD: number;
    };
    totalUnclaimedUSD: number;
    totalClaimedUSD: number;
    totalAllFeesUSD: number;
  };
  chainId: number;
  poolAddress: string;
  createdTimestamp: number
}

enum PositionStrategy {
  LONG = "LONG",
  MIDDLE = "MIDDLE",
  SHORT = "SHORT",
}

export interface PositionColumnDataType {
  key: string;
  positionId: string;
  isActive: boolean;
  strategy: PositionStrategy;
  roi: number;
  apr: number;
  liquidity: number;
  priceRange: {
    lower: number;
    upper: number;
    current: number;
  };
  createdAt: number;

  // Additional data
  maxDailyPriceFluctuation: number;
  maxWeeklyPriceFluctuation: number;
  token0Amount: number;
  token1Amount: number;
  token0Price: number;
  token1Price: number;
  totalFeeUSD: number;
  claimedFee0: number;
  claimedFee1: number;
  unclaimedFee0: number;
  unclaimedFee1: number;
  hourlyFeeUSD: number;

  // Filtering data
  unclaimedROI: number;
}