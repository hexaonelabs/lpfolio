// import { getToken } from "@lifi/sdk";
import bn from "bignumber.js";
import { Token } from "../models/token.model";

export interface Point {
  x: number;
  y: number;
}

export interface Price {
  timestamp: number;
  value: number;
}

export interface PriceChart {
  tokenId: string;
  tokenName: string;
  currentPriceUSD: number;
  prices: Price[];
}

export const getFeeTierPercentage = (tier: string): number => {
  if (tier === "100") return 0.01 / 100;
  if (tier === "500") return 0.05 / 100;
  if (tier === "3000") return 0.3 / 100;
  if (tier === "10000") return 1 / 100;
  return 0;
};

export const getTokenLogoURL = async (chainId: number, address: string): Promise<string> => {
  // const result = await getToken(chainId, address);
  // if (!result) {
  //   throw new Error("Token not found");
  // }
  // return result.logoURI ?? `https://friconix.com/png/fi-cnsuxl-question-mark.png`;
  return `https://friconix.com/png/fi-cnsuxl-question-mark.png`;
};

export const sortTokens = (token0: Token, token1: Token): Token[] => {
  if (token0.id < token1.id) {
    return [token0, token1];
  }
  return [token1, token0];
};

// return unique string in string[]
export const getUniqueItems = (arr: string[]): string[] => {
  return arr.filter((v, i, a) => a.indexOf(v) === i);
};

export const estimateFee = (
  liquidityDelta: bn,
  liquidity: bn,
  volume24H: number,
  feeTier: string
): number => {
  const feeTierPercentage = getFeeTierPercentage(feeTier);
  const liquidityPercentage = liquidityDelta
    .div(liquidity.plus(liquidityDelta))
    .toNumber();

  return feeTierPercentage * volume24H * liquidityPercentage;
};

export const getPriceFromTick = (
  tick: number,
  token0Decimal: string,
  token1Decimal: string
): number => {
  const sqrtPrice = new bn(Math.pow(Math.sqrt(1.0001), tick)).multipliedBy(
    new bn(2).pow(96)
  );
  const token0 = expandDecimals(1, Number(token0Decimal));
  const token1 = expandDecimals(1, Number(token1Decimal));
  const L2 = mulDiv(
    encodeSqrtPriceX96(token0),
    encodeSqrtPriceX96(token1),
    Q96
  );
  const price = mulDiv(L2, Q96, sqrtPrice)
    .div(new bn(2).pow(96))
    .div(new bn(10).pow(token0Decimal))
    .pow(2);

  return price.toNumber();
};

interface TokensAmount {
  amount0: number;
  amount1: number;
  liquidityDelta: number;
}
export const getTokensAmountFromDepositAmountUSD = (
  P: number,
  Pl: number,
  Pu: number,
  priceUSDX: number,
  priceUSDY: number,
  depositAmountUSD: number
): TokensAmount => {
  const deltaL =
    depositAmountUSD /
    ((Math.sqrt(P) - Math.sqrt(Pl)) * priceUSDY +
      (1 / Math.sqrt(P) - 1 / Math.sqrt(Pu)) * priceUSDX);

  let deltaY = deltaL * (Math.sqrt(P) - Math.sqrt(Pl));
  if (deltaY * priceUSDY < 0) deltaY = 0;
  if (deltaY * priceUSDY > depositAmountUSD)
    deltaY = depositAmountUSD / priceUSDY;

  let deltaX = deltaL * (1 / Math.sqrt(P) - 1 / Math.sqrt(Pu));
  if (deltaX * priceUSDX < 0) deltaX = 0;
  if (deltaX * priceUSDX > depositAmountUSD)
    deltaX = depositAmountUSD / priceUSDX;

  return { amount0: deltaX, amount1: deltaY, liquidityDelta: deltaL };
};
export const getLiquidityDelta = (
  P: number,
  lowerP: number,
  upperP: number,
  amount0: number,
  amount1: number,
  token0Decimal: number,
  token1Decimal: number
): bn => {
  const amt0 = expandDecimals(amount0, token1Decimal);
  const amt1 = expandDecimals(amount1, token0Decimal);

  const sqrtRatioX96 = getSqrtPriceX96(P, token0Decimal, token1Decimal);
  const sqrtRatioAX96 = getSqrtPriceX96(lowerP, token0Decimal, token1Decimal);
  const sqrtRatioBX96 = getSqrtPriceX96(upperP, token0Decimal, token1Decimal);

  let liquidity: bn;
  if (sqrtRatioX96.lte(sqrtRatioAX96)) {
    liquidity = getLiquidityForAmount0(sqrtRatioAX96, sqrtRatioBX96, amt0);
  } else if (sqrtRatioX96.lt(sqrtRatioBX96)) {
    const liquidity0 = getLiquidityForAmount0(
      sqrtRatioX96,
      sqrtRatioBX96,
      amt0
    );
    const liquidity1 = getLiquidityForAmount1(
      sqrtRatioAX96,
      sqrtRatioX96,
      amt1
    );

    liquidity = bn.min(liquidity0, liquidity1);
  } else {
    liquidity = getLiquidityForAmount1(sqrtRatioAX96, sqrtRatioBX96, amt1);
  }

  return liquidity;
};

export const processPriceChartData = (
  token0PriceChart: PriceChart | null,
  token1PriceChart: PriceChart | null
): Point[] => {
  if (token0PriceChart === null || token1PriceChart === null) {
    return [];
  }

  const points: Point[] = [];
  const length = Math.min(
    token0PriceChart.prices.length,
    token1PriceChart.prices.length
  );
  for (let i = 0; i < length; ++i) {
    points.push({
      x: token0PriceChart.prices[i].timestamp,
      y: token1PriceChart.prices[i].value / token0PriceChart.prices[i].value,
    });
  }

  return points;
};

export const groupPricePointsMinMaxByDay = (
  points: Point[]
): { timestamp: number; min: number; max: number }[] => {
  const result: { timestamp: number; min: number; max: number }[] = [];
  let day = 0;
  let min = 0;
  let max = 0;
  points.forEach((p, i) => {
    const date = new Date(p.x);
    const currentDay = date.getUTCDate();
    if (currentDay !== day) {
      if (i !== 0) {
        result.push({ timestamp: day, min, max });
      }
      day = currentDay;
      min = p.y;
      max = p.y;
    } else {
      min = Math.min(min, p.y);
      max = Math.max(max, p.y);
    }
  });
  return result;
};

export const groupPricePointsMinMaxByWeek = (
  points: Point[]
): { timestamp: number; min: number; max: number }[] => {
  const getWeekFromDate = (date: Date): number => {
    const onejan = new Date(date.getFullYear(), 0, 1);
    return Math.ceil(
      ((date.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7
    );
  };

  const result: { timestamp: number; min: number; max: number }[] = [];
  let week = 0;
  let min = 0;
  let max = 0;
  points.forEach((p, i) => {
    const date = new Date(p.x);
    const currentWeek = getWeekFromDate(date);
    if (currentWeek !== week) {
      if (i !== 0) {
        result.push({ timestamp: week, min, max });
      }
      week = currentWeek;
      min = p.y;
      max = p.y;
    } else {
      min = Math.min(min, p.y);
      max = Math.max(max, p.y);
    }
  });
  return result;
};

const getLiquidityForAmount0 = (
  sqrtRatioAX96: bn,
  sqrtRatioBX96: bn,
  amount0: bn
): bn => {
  // amount0 * (sqrt(upper) * sqrt(lower)) / (sqrt(upper) - sqrt(lower))
  const intermediate = mulDiv(sqrtRatioBX96, sqrtRatioAX96, Q96);
  return mulDiv(amount0, intermediate, sqrtRatioBX96.minus(sqrtRatioAX96));
};

const getLiquidityForAmount1 = (
  sqrtRatioAX96: bn,
  sqrtRatioBX96: bn,
  amount1: bn
): bn => {
  // amount1 / (sqrt(upper) - sqrt(lower))
  return mulDiv(amount1, Q96, sqrtRatioBX96.minus(sqrtRatioAX96));
};

const Q96 = new bn(2).pow(96);
const Q128 = new bn(2).pow(128);
const ZERO = new bn(0);

const getSqrtPriceX96 = (
  price: number,
  token0Decimal: number,
  token1Decimal: number
): bn => {
  const token0 = expandDecimals(price, token0Decimal);
  const token1 = expandDecimals(1, token1Decimal);

  return token0.div(token1).sqrt().multipliedBy(Q96);
};
const expandDecimals = (n: number | string | bn, exp: number): bn => {
  return new bn(n).multipliedBy(new bn(10).pow(exp));
};
const mulDiv = (a: bn, b: bn, multiplier: bn) => {
  return a.multipliedBy(b).div(multiplier);
};
const encodeSqrtPriceX96 = (price: number | string | bn): bn => {
  return new bn(price).sqrt().multipliedBy(Q96).integerValue(3);
};