import { TokenRaw } from "./graphql-response.model";

export interface Token extends TokenRaw {
  name: string;
  volumeUSD: string;
  logoURI: string;

  // For pool overview
  tokenDayData: TokenDayData[];
  totalValueLockedUSD: string;
  poolCount: number;
}

interface TokenDayData {
  priceUSD: string;
}