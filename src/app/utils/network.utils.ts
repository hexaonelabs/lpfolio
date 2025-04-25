interface Network {
  id: string;
  chainId: number;
  name: string;
  desc: string;
  logoURI: string;
  error?: string;
  subgraphEndpoint: string;

  // for pool overview
  totalValueLockedUSD_gte: number;
  volumeUSD_gte: number;
}

// https://github.com/Uniswap/interface/blob/main/src/constants/chains.ts
enum SupportedChainId {
  MAINNET = 1,
  GOERLI = 5,

  ARBITRUM_ONE = 42161,
  ARBITRUM_GOERLI = 421613,

  OPTIMISM = 10,
  OPTIMISM_GOERLI = 420,

  POLYGON = 137,
  POLYGON_MUMBAI = 80001,

  CELO = 42220,
  CELO_ALFAJORES = 44787,

  BNB = 56,
}

const NETWORKS: Network[] = [
  {
    id: "arbitrum",
    chainId: SupportedChainId.ARBITRUM_ONE,
    name: "Arbitrum",
    desc: "Arbitrum Mainnet (L2)",
    logoURI: "https://assets.website-files.com/5f973c970bea5548ad4287ef/60a320b472858ace6700df76_arb-icon.svg",
    subgraphEndpoint: "https://gateway.thegraph.com/api/subgraphs/id/89nD6JoQmeFcYLoimEDuNatWmQHAJsh9mm887XJXxWto",
    totalValueLockedUSD_gte: 1000000,
    volumeUSD_gte: 500000,
  },
  {
    id: "optimism",
    chainId: SupportedChainId.OPTIMISM,
    name: "Optimism",
    desc: "Optimism Mainnet (L2)",
    logoURI: "https://optimistic.etherscan.io/images/brandassets/optimism.svg",
    subgraphEndpoint: "https://gateway.thegraph.com/api/subgraphs/id/Cghf4LfVqPiFw6fp6Y5X5Ubc8UpmUhSfJL82zwiBFLaj",
    totalValueLockedUSD_gte: 1000000,
    volumeUSD_gte: 500000,
  },
];

export const getNetworkConfigByChainId = (chainId: number): Network => {
  const network = NETWORKS.find((network) => network.chainId === chainId);
  if (!network) {
    throw new Error(`Network ${chainId} not found`);
  }
  return network;
}