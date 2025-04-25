export interface GraphQlResponse {
  data: Data;
}

export interface Data {
  positions: PositionRaw[];
}

export interface PositionRaw {
  collectedFeesToken0: string;
  collectedFeesToken1: string;
  depositedToken0:     string;
  depositedToken1:     string;
  id:                  string;
  liquidity:           string;
  pool:                PoolRaw;
  tickLower:           string;
  tickUpper:           string;
  token0:              TokenRaw;
  token1:              TokenRaw;
  withdrawnToken0:     string;
  withdrawnToken1:     string;
}

export interface PoolRaw {
  feeTier:     string;
  id:          string;
  token0Price: string;
  token1Price: string;
}

export interface TokenRaw {
  decimals: string;
  id:       string;
  symbol:   string;
}
