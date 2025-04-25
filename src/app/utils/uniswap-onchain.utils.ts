import {
  createPublicClient,
  getContract,
  http,
  parseAbi,
  AbiEvent,
} from "viem";
import { arbitrum, base, mainnet, optimism, Chain } from "viem/chains";
import { getToken } from "@lifi/sdk";
import IUniswapV3PoolABI from "@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json";
import nonfungiblePositionManagerAbi from "@uniswap/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json";
import { Pool as V3Pool, Position as V3Position } from "@uniswap/v3-sdk";
import { Token as V3Token } from "@uniswap/sdk-core";
import { Position, PositionRaw } from "../models/position.model";
import { TokenRaw } from "../models/graphql-response.model";
import JSBI from "jsbi";
import { BigNumber } from "@ethersproject/bignumber";
import lscache from "./lscache.utils";

interface PoolDataRaw {
  slot0: readonly [bigint, number, number, number, number, number, boolean];
  poolLiquidity: bigint;
  poolAddress: `0x${string}`;
  feeGrowthGlobal0X128: bigint;
  feeGrowthGlobal1X128: bigint;
}

export type UNISWAP_MARKET = {
  chain: Chain;
  name: string;
  factory: `0x${string}`;
  nftManager: `0x${string}`;
}

// See https://docs.uniswap.org/contracts/v3/reference/deployments/
export const UNISWAP_MARKETS: UNISWAP_MARKET[] = [
  {
    chain: mainnet,
    name: "mainnet",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    nftManager: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
  },
  {
    chain: arbitrum,
    name: "arbitrum",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    nftManager: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
  },
  {
    chain: optimism,
    name: "optimism",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    nftManager: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
  },
  {
    chain: base,
    name: "base",
    factory: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD",
    nftManager: "0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1",
  },
];
const nftPositionManagerAbi = parseAbi([
  "function balanceOf(address owner) view returns (uint256)",
  "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
  "function positions(uint256 tokenId) view returns (uint96 nonce, address operator, address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128, uint128 tokensOwed0, uint128 tokensOwed1)",
]);
const poolAbi = IUniswapV3PoolABI.abi;
const factoryAbi = parseAbi([
  "function getPool(address tokenA, address tokenB, uint24 fee) view returns (address pool)",
]);
const tokenAbi = parseAbi([
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address owner) view returns (uint256)",
]);

export const getUniswapPositions = async (walletAddress: `0x${string}`, market: UNISWAP_MARKET) => {
  const cacheKey = `uniswap_positions_${walletAddress}_${market.name}`;
  const cachedPositions = lscache.get(cacheKey);
  if (cachedPositions) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log("Using cached positions");
    return cachedPositions;
  }
  try {
    const client = createPublicClient({
      chain: market.chain,
      transport: http(),
    });
    const nftContract = getContract({
      address: market.nftManager as `0x${string}`,
      abi: nftPositionManagerAbi,
      client,
    });

    const balance = await nftContract.read.balanceOf([walletAddress]);
    const positions = await processAllPositions(
      walletAddress,
      nftContract,
      balance,
      market.chain.id
    );

    // Cache the positions for 10minutes
    lscache.set(cacheKey, positions, 10);
    
    // return result
    return positions;
  } catch (error) {
    console.error(
      "Error fetching positions form market " + market.name + ":",
      error
    );
    throw error;
  }
};

const getPoolTVL = async (poolAddress: `0x${string}`, chainId: number) => {
  const market = UNISWAP_MARKETS.find((market) => market.chain.id === chainId);
  if (!market) {
    throw new Error(`No market found for chain ID ${chainId}`);
  }
  const client = createPublicClient({
    chain: market.chain,
    transport: http(),
  });

  const poolContract = getContract({
    address: poolAddress,
    abi: poolAbi,
    client,
  });

  const [token0, token1] = await Promise.all([
    poolContract.read["token0"]() as unknown as `0x${string}`,
    poolContract.read["token1"]() as unknown as `0x${string}`,
  ]);

  const token0Contract = getContract({
    address: token0,
    abi: tokenAbi,
    client,
  });
  const token1Contract = getContract({
    address: token1,
    abi: tokenAbi,
    client,
  });
  const [balance0, balance1, decimals0, decimals1, price0, price1] =
    await Promise.all([
      token0Contract.read.balanceOf([poolAddress]),
      token1Contract.read.balanceOf([poolAddress]),
      token0Contract.read.decimals(),
      token1Contract.read.decimals(),
      (await getToken(chainId, token0)).priceUSD,
      (await getToken(chainId, token1)).priceUSD,
    ]);

  const tvlUSD =
    (Number(balance0) / 10 ** decimals0) * Number(price0) +
    (Number(balance1) / 10 ** decimals1) * Number(price1);

  return tvlUSD;
};

const getPoolAddress = async (
  token0: `0x${string}`,
  token1: `0x${string}`,
  fee: number,
  chainId: number
) => {
  const market = UNISWAP_MARKETS.find((market) => market.chain.id === chainId);
  if (!market) {
    throw new Error(`No market found for chain ID ${chainId}`);
  }
  const client = createPublicClient({
    chain: market.chain,
    transport: http(),
  });

  const factoryContract = getContract({
    address: market.factory as `0x${string}`,
    abi: factoryAbi,
    client,
  });

  return factoryContract.read.getPool([token0, token1, fee]);
};

const calculateUnclaimedFees = async (
  position: {
    tokensOwed0: bigint;
    tokensOwed1: bigint;
  },
  token0: TokenRaw,
  token1: TokenRaw
): Promise<string> => {
  const fees0 = position.tokensOwed0 / BigInt(10 ** Number(token0.decimals));
  const fees1 = position.tokensOwed1 / BigInt(10 ** Number(token1.decimals));

  return `${fees0.toString()} ${token0.symbol} + ${fees1.toString()} ${
    token1.symbol
  }`;
};

const getTokenData = async (
  address: `0x${string}`,
  chainId: number
): Promise<TokenRaw> => {
  const market = UNISWAP_MARKETS.find((market) => market.chain.id === chainId);
  if (!market) {
    throw new Error(`No market found for chain ID ${chainId}`);
  }
  const client = createPublicClient({
    chain: market.chain,
    transport: http(),
  });
  const tokenContract = getContract({
    address: address,
    abi: tokenAbi,
    client,
  });

  const [symbol, decimals] = await Promise.all([
    tokenContract.read.symbol(),
    tokenContract.read.decimals(),
  ]);

  return {
    id: address,
    symbol,
    decimals: String(decimals),
  };
};

const processAllPositions = async (
  walletAddress: `0x${string}`,
  nftContract: any,
  balance: bigint,
  chainId: number
) => {
  const positions: Position[] = [];

  for (let i = 0n; i < balance; i++) {
    const tokenId = await nftContract.read.tokenOfOwnerByIndex([
      walletAddress,
      i,
    ]);
    const position = await getPositionDetails(nftContract, tokenId);
    if (position.liquidity === 0n) continue;

    const poolData = await fetchPoolData(position, chainId);
    if (!poolData) continue;

    const positionData = await buildPositionData(position, poolData, chainId);
    positions.push(positionData);
  }

  return positions;
};

const getPositionDetails = async (
  nftContract: any,
  tokenId: bigint
): Promise<PositionRaw> => {
  const [
    ,
    ,
    // nonce et operator non utilisés
    token0Address,
    token1Address,
    fee,
    tickLower,
    tickUpper,
    liquidity,
    feeGrowthInside1LastX128,
    feeGrowthInside0LastX128,
    tokensOwed0,
    tokensOwed1,
  ] = await nftContract.read.positions([tokenId], { blockTag: "latest" });

  return {
    token0: token0Address,
    token1: token1Address,
    fee,
    feeGrowthInside1LastX128,
    feeGrowthInside0LastX128,
    tickLower,
    tickUpper,
    liquidity,
    tokensOwed0,
    tokensOwed1,
    tokenId,
  };
};

const fetchPoolData = async (
  position: PositionRaw,
  chainId: number
): Promise<PoolDataRaw | null> => {
  const market = UNISWAP_MARKETS.find((market) => market.chain.id === chainId);
  if (!market) {
    throw new Error(`No market found for chain ID ${chainId}`);
  }
  const client = createPublicClient({
    chain: market.chain,
    transport: http(),
  });

  const poolAddress = await getPoolAddress(
    position.token0,
    position.token1,
    position.fee,
    chainId
  );
  if (poolAddress === "0x0000000000000000000000000000000000000000") return null;
  const poolContract = getContract({
    address: poolAddress,
    abi: poolAbi,
    client,
  });
  const [slot0, poolLiquidity, feeGrowthGlobal0X128, feeGrowthGlobal1X128] =
    await Promise.all([
      poolContract.read["slot0"](),
      poolContract.read["liquidity"](),
      poolContract.read["feeGrowthGlobal0X128"](),
      poolContract.read["feeGrowthGlobal1X128"](),
    ]);

  return {
    slot0,
    poolLiquidity,
    poolAddress,
    feeGrowthGlobal0X128,
    feeGrowthGlobal1X128,
  } as PoolDataRaw;
};

const buildPositionData = async (
  position: PositionRaw,
  poolData: PoolDataRaw,
  chainId: number
) => {
  const [token0Data, token1Data] = await Promise.all([
    getTokenData(position.token0, chainId),
    getTokenData(position.token1, chainId),
  ]);
  const pool = createPoolInstance(
    token0Data,
    token1Data,
    position.fee,
    poolData
  );
  const v3Position = new V3Position({
    pool,
    liquidity: position.liquidity.toString(),
    tickLower: position.tickLower,
    tickUpper: position.tickUpper,
  });
  const market = UNISWAP_MARKETS.find((market) => market.chain.id === chainId);
  if (!market) {
    throw new Error(`No market found for chain ID ${chainId}`);
  }

  return formatPositionData(
    {
      ...position,
      poolAddress: poolData.poolAddress,
      feeGrowthGlobal0X128: poolData.feeGrowthGlobal0X128,
    },
    v3Position,
    token0Data,
    token1Data,
    chainId
  );
};

const createPoolInstance = (
  token0Data: TokenRaw,
  token1Data: TokenRaw,
  fee: number,
  poolData: { slot0: any; poolLiquidity: bigint }
) => {
  const token0 = new V3Token(
    base.id,
    token0Data.id,
    Number(token0Data.decimals),
    token0Data.symbol
  );
  const token1 = new V3Token(
    base.id,
    token1Data.id,
    Number(token1Data.decimals),
    token1Data.symbol
  );

  return new V3Pool(
    token0,
    token1,
    Number(fee),
    poolData.slot0[0].toString(), // sqrtPriceX96
    poolData.poolLiquidity.toString(),
    poolData.slot0[1] // tick
  );
};

const formatPositionData = async (
  position: PositionRaw & { poolAddress: string; feeGrowthGlobal0X128: bigint },
  v3Position: V3Position,
  token0Data: TokenRaw,
  token1Data: TokenRaw,
  chainId: number
): Promise<Position> => {
  const market = UNISWAP_MARKETS.find((market) => market.chain.id === chainId);
  if (!market) {
    throw new Error(`No market found for chain ID ${chainId}`);
  }
  const client = createPublicClient({
    chain: market.chain,
    transport: http(),
  });
  const poolContract = getContract({
    address: position.poolAddress as `0x${string}`,
    abi: poolAbi,
    client,
  });
  const lower = (await poolContract.read["ticks"]([position.tickLower])) as any;
  const upper = (await poolContract.read["ticks"]([position.tickUpper])) as any;
  const tickCurrent = v3Position.pool.tickCurrent;
  const feeGrowthGlobalX128 = position.feeGrowthGlobal0X128;
  let feeGrowthBelowX128, feeGrowthAboveX128;

  if (tickCurrent >= position.tickLower) {
    feeGrowthBelowX128 = lower[2];
  } else {
    feeGrowthBelowX128 = feeGrowthGlobalX128 - lower[2];
  }

  if (tickCurrent < position.tickUpper) {
    feeGrowthAboveX128 = upper[2];
  } else {
    feeGrowthAboveX128 = feeGrowthGlobalX128 - upper[2];
  }
  const feeGrowthInsideX128 =
    feeGrowthGlobalX128 - feeGrowthBelowX128 - feeGrowthAboveX128;

  const token0 = await getToken(chainId, token0Data.id);
  const token1 = await getToken(chainId, token1Data.id);
  // const unclaimedFees = calculateFeesEarned(
  //   position.liquidity,
  //   feeGrowthInsideX128,
  //   position.feeGrowthInside0LastX128
  // );
  const fees = await getPositionFeesAmountFromNftId(
    position.tokenId,
    chainId
  );
  const timestamp = await getPositionCreationTimestamp(
    position.tokenId.toString(),
    chainId
  );
  console.log({ timestamp, fees, position });
  const unclaimedToken0USD = fees.token0.unclaimed * Number(token0.priceUSD);
  const unclaimedToken1USD = fees.token1.unclaimed * Number(token1.priceUSD);
  const claimedToken0USD = fees.token0.claimed * Number(token0.priceUSD);
  const claimedToken1USD = fees.token1.claimed * Number(token1.priceUSD);
  const totalUnclaimedUSD = unclaimedToken0USD + unclaimedToken1USD;
  const totalClaimedUSD = claimedToken0USD + claimedToken1USD;
  const totalAllFeesUSD = totalUnclaimedUSD + totalClaimedUSD;
  const totalLiquidityUSD = +v3Position.amount0.toSignificant(4) * Number(token0.priceUSD) + +v3Position.amount1.toSignificant(4) * Number(token1.priceUSD);
  const apy = calculateAPY(
    totalLiquidityUSD, totalAllFeesUSD, new Date(timestamp)
  );

  return {
    feeTier: Number(position.fee),
    liquidity: totalLiquidityUSD,
    tickLower: Number(position.tickLower),
    tickUpper: Number(position.tickUpper),
    tickCurrent: v3Position.pool.tickCurrent,
    token0Amount: v3Position.amount0.toSignificant(4),
    token1Amount: v3Position.amount1.toSignificant(4),
    lowerPrice: Number(v3Position.token0PriceLower.toFixed(2)),
    upperPrice: Number(v3Position.token0PriceUpper.toFixed(2)),
    // unclaimedFees,
    // liquidityUSD: formatLiquidity(position.liquidity, Number(token0Data.decimals)),
    // feeGrowthInside1LastX128: position.feeGrowthInside1LastX128,
    // feeGrowthInside0LastX128: position.feeGrowthInside0LastX128,
    token0: {
      id: token0Data.id,
      ...token0,
    },
    token1: {
      id: token1Data.id,
      ...token1,
    },
    chainId,
    poolAddress: position.poolAddress,
    id: position.tokenId.toString(),
    apy,
    fees: {
      token0: {
        ...fees.token0,
        unclaimedUSD: unclaimedToken0USD,
        claimedUSD: claimedToken0USD,
        totalAmountUSD: unclaimedToken0USD + claimedToken0USD,
      },
      token1: {
        ...fees.token1,
        unclaimedUSD: unclaimedToken1USD,
        claimedUSD: claimedToken1USD,
        totalAmountUSD: unclaimedToken1USD + claimedToken1USD,
      },
      totalUnclaimedUSD,
      totalClaimedUSD,
      totalAllFeesUSD
    },
    currentPrice: Number(v3Position.pool.token0Price.toFixed(2)),
    createdTimestamp: timestamp,
  };
};

const getPositionCreationTimestamp = async (
  tokenId: string,
  chainId: number
) => {
  const market = UNISWAP_MARKETS.find((market) => market.chain.id === chainId);
  if (!market) {
    throw new Error(`No market found for chain ID ${chainId}`);
  }
  const client = createPublicClient({
    chain: market.chain,
    transport: http(),
  });
  // 1. Filtrer l'événement Transfer pour le tokenId
  const logs = await client.getLogs({
    address: market.nftManager as `0x${string}`,
    event: nonfungiblePositionManagerAbi.abi.find(
      (e) => e.name === "Transfer" && e.type === "event"
    ) as AbiEvent,
    args: { tokenId: BigInt(tokenId) },
    fromBlock: 0n,
    toBlock: "latest",
  });
  // 2. Prendre le premier log (mint)
  const mintLog = logs[0];
  if (!mintLog) {
    throw new Error(`No mint log found for tokenId ${tokenId}`);
  }
  // 3. Récupérer le blockNumber
  const block = await client.getBlock({ blockNumber: mintLog.blockNumber });
  // 4. Le timestamp du bloc est la date de création
  const creationTimestamp = Number(block.timestamp.toString());
  const timestamp = creationTimestamp * 1000;
  return timestamp;
};

const Q96 = JSBI.exponentiate(JSBI.BigInt(2), JSBI.BigInt(96));
const MAX_UINT128 = BigNumber.from(2).pow(128).sub(1);

function getTickAtSqrtRatio(sqrtPriceX96: number): number {
  let tick = Math.floor(
    Math.log((sqrtPriceX96 / +Q96.toString()) ** 2) / Math.log(1.0001)
  );
  return tick;
}

const getPositionFeesAmountFromNftId = async (
  nftId: bigint,
  chainId: number,
  defaultBlock = "latest"
) => {
  const market = UNISWAP_MARKETS.find((market) => market.chain.id === chainId);
  if (!market) {
    throw new Error(`No market found for chain ID ${chainId}`);
  }
  try {
    const client = createPublicClient({
      chain: market.chain,
      transport: http(),
    });
    const positionManagerContract = getContract({
      address: market.nftManager as `0x${string}`,
      abi: nonfungiblePositionManagerAbi.abi,
      client,
    });
    // Get position token addresses and fees
    const [
      ,
      ,
      token0Address,
      token1Address,
      fee,
      tickLower,
      tickUpper,
      liquidity,
    ] = (await positionManagerContract.read["positions"]([nftId])) as [
      number,
      string,
      `0x${string}`,
      `0x${string}`,
      number,
      number,
      number,
      bigint
    ];
    // Get NFT owner
    const nftOwner = (await positionManagerContract.read["ownerOf"]([
      nftId,
    ])) as [`0x${string}`];
    // Get pool address from token addresses and fee
    const poolAddress = await getPoolAddress(
      token0Address,
      token1Address,
      fee,
      chainId
    );
    const poolContract = getContract({
      address: poolAddress,
      abi: poolAbi,
      client,
    });
    // Get sqrtPriceX96 from pool contract
    const [sqrtPriceX96] = (await Promise.all([
      poolContract.read["slot0"](),
    ])) as [number];

    // Get token decimals
    const decimals0 = await getToken(chainId, token0Address).then(
      (token) => token.decimals
    );
    const decimals1 = await getToken(chainId, token1Address).then(
      (token) => token.decimals
    );
    const liquidityNumber = Number(liquidity.toString());
    // Calculate amounts
    let sqrtRatioA = +Math.sqrt(1.0001 ** tickLower).toFixed(18);
    let sqrtRatioB = +Math.sqrt(1.0001 ** tickUpper).toFixed(18);
    let currentTick = getTickAtSqrtRatio(sqrtPriceX96);
    let currentRatio = +Math.sqrt(1.0001 ** currentTick).toFixed(18);
    let amount0wei = 0;
    let amount1wei = 0;
    if (currentTick <= tickLower) {
      amount0wei = Math.floor(
        liquidityNumber *
          ((sqrtRatioB - sqrtRatioA) / (sqrtRatioA * sqrtRatioB))
      );
    }
    if (currentTick > tickUpper) {
      amount1wei = Math.floor(liquidityNumber * (sqrtRatioB - sqrtRatioA));
    }
    if (currentTick >= tickLower && currentTick < tickUpper) {
      amount0wei = Math.floor(
        liquidityNumber *
          ((sqrtRatioB - currentRatio) / (currentRatio * sqrtRatioB))
      );
      amount1wei = Math.floor(liquidityNumber * (currentRatio - sqrtRatioA));
    }
    const amount0 = amount0wei / 10 ** decimals0;
    const amount1 = amount1wei / 10 ** decimals1;
    const args = {
      tokenId: nftId,
      recipient: nftOwner,
      amount0Max: MAX_UINT128,
      amount1Max: MAX_UINT128,
    };

    // Get unclaimed fees
    const { result } = (await positionManagerContract.simulate["collect"](
      [args]
      // { account: nftOwner, blockTag: defaultBlock }
    )) as {
      result: [bigint, bigint];
    };
    // console.log({ result });
    const unclaimedFee0Wei = +result[0].toString();
    const unclaimedFee1Wei = +result[1].toString();
    const unclaimedFee0 = +unclaimedFee0Wei / 10 ** decimals0;
    const unclaimedFee1 = +unclaimedFee1Wei / 10 ** decimals1;
    console.log({ unclaimedFee0, unclaimedFee1 });
    return {
      token0: {
        claimed: amount0,
        unclaimed: unclaimedFee0,
        totalAmount: amount0 + unclaimedFee0,
      },
      token1: {
        claimed: amount1,
        unclaimed: unclaimedFee1,
        totalAmount: amount1 + unclaimedFee1,
      },
    };
  } catch (e) {
    throw e;
  }
};

const calculateAPY = (liquidity: number, totalFees: number, creationDate: Date): number => {
  const currentDate = new Date();
  const daysActive = (currentDate.getTime() - new Date(creationDate).getTime()) / (1000 * 60 * 60 * 24);

  if (daysActive <= 0 || liquidity <= 0) {
    return 0; // Évite les divisions par zéro ou des résultats invalides
  }

  const apy = (totalFees / liquidity) * (365 / daysActive) * 100;
  return parseFloat(apy.toFixed(2)); // Retourne l'APY avec deux décimales
}

/**
 * Calculate relative APY based on the positions Liquidity and fees ratio and created date
 * @param positions 
 */
export const calculateRelativeAPY = (
  positions: Position[],
): number => {
  const totalLiquidity = positions.reduce((acc, position) => {
    return acc + position.liquidity;
  }, 0);

  const totalFees = positions.reduce((acc, position) => {
    return acc + position.fees?.totalAllFeesUSD!;
  }, 0);

  const creationDate = Math.min(
    ...positions.map((position) => position.createdTimestamp)
  );

  return +calculateAPY(totalLiquidity, totalFees, new Date(creationDate)).toFixed(0);
};

export const openPositionDetails = (position: Position) => {
    const chainId = position.chainId;
    const chainName = UNISWAP_MARKETS.find((market) => market.chain.id === chainId)?.name;
    if (!chainName) {
      console.error(`No market found for chain ID ${chainId}`);
      return;
    }
    const network = chainName === "mainnet" ? "ethereum" : chainName;
    window.open(`https://app.uniswap.org/positions/v3/${network}/${position.id}`, "_blank");
  }