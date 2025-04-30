import { Injectable } from '@angular/core';
import { HedgeResult, UniswapLPPosition } from '../models/uniswap-lp.model';

@Injectable({
  providedIn: 'root',
})
export class HedgeCalculatorService {
  constructor() {}

  /**
   * Calculate the hedge position for a Uniswap LP position
   * This is a simplified calculation model and should be adjusted
   * based on specific market conditions and risk tolerance.
   */
  calculateHedge(position: UniswapLPPosition): HedgeResult {
    // 1. Prix courant (token0 en USD)
  const P = position.token0Price;

  // 2. Bornes de la range
  const Pa = position.minPrice;
  const Pb = position.maxPrice;

  // 3. Racines carrées des prix
  const sqrtPa = Math.sqrt(Pa);
  const sqrtPb = Math.sqrt(Pb);
  const sqrtP = Math.sqrt(P);

  // 4. Calcul de la liquidité effective (L)
  // Formules issues de la doc Uniswap v3
  // <https://nirvana-finance.gitbook.io/nirvana/paraspace/staking-and-derivative-token-yield-management/active-uniswap-v3-lp-strategies/delta-hedge-uniswap-v3-lp-positions-lp-with-less-price-risk>[1]
  const L0 = position.token0Amount * ((sqrtPb * sqrtP) / (sqrtPb - sqrtP));
  const L1 = position.token1Amount / (sqrtP - sqrtPa);
  const L = Math.min(L0, L1);

  // 5. Calcul de la delta LP (en token0)
  // Delta = L * (1/sqrtP - 1/sqrtPb)
  const deltaToken0 = L * (1 / sqrtP - 1 / sqrtPb);

  // 6. Taille du hedge short perp (en USD)
  // On short la delta token0, donc position short = -deltaToken0 * P
  const positionSize = Math.abs(deltaToken0 * P);

  // 7. Levier (simple)
  const priceRange = Pb - Pa;
  const leverage = Math.max(1, Math.min(10, 2 + 1000 / priceRange));

  // 8. Marge requise (en USD)
  const marginRequired = positionSize / leverage;

  // 9. Frais de funding (en USD)
  const holdingDays = position.holdingDays || 1;
  const fundingCost = position.fundingRateAnnual < 0 
    ? 0
    : positionSize * (position.fundingRateAnnual / 100) * (holdingDays / 365);

  // 10. Frais de transaction (en USD)
  const transactionFees = positionSize * (position.openFee + position.closeFee);

  // 11. Stop-loss et take-profit (autour de l'entryPrice)
  // On utilise la largeur relative de la range comme proxy de volatilité
  const volatilityFactor = (Pb - Pa) / (2 * position.entryPrice);
  const stopLoss = position.entryPrice * (1 + volatilityFactor * 0.5); // Short: stop plus haut
  const takeProfit = position.entryPrice * (1 - volatilityFactor * 0.5); // Short: take profit plus bas

  // 12. Marge totale à prévoir (marge + frais)
  const totalMargin = marginRequired + fundingCost + transactionFees;

  return {
    positionSize: Math.round(positionSize * 100) / 100,
    leverage: Math.round(leverage * 100) / 100,
    stopLoss: Math.round(stopLoss * 100) / 100,
    takeProfit: Math.round(takeProfit * 100) / 100,
    marginRequired: Math.round(totalMargin * 100) / 100,
    fundingCost: Math.round(fundingCost * 100) / 100,
    transactionFees: Math.round(transactionFees * 100) / 100,
  };
  }

  private _round(value: number, decimals: number = 2): number {
    return Number(value.toFixed(decimals));
  }
}
