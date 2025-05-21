import { Injectable } from "@angular/core";
import { Position } from "../models/position.model";
import { isAddress } from "viem";
import { getUniswapPositions, UNISWAP_MARKETS } from "../utils/uniswap-onchain.utils";
import { BehaviorSubject, map } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class UniswapService {
  private readonly _positionsMap$ = new BehaviorSubject<Map<number, Position[]>>(new Map());
  public readonly positionsMap$ = this._positionsMap$.asObservable();
  public readonly allPositions$ = this._positionsMap$.asObservable().pipe(
    map((positionsMap) => {
      const allPositions: Position[] = [];
      positionsMap.forEach((positions) => {
        allPositions.push(...positions);
      });
      return allPositions;
    })
  );
  public readonly pendingMessage$ = new BehaviorSubject<string | null>(null);

  async getPositions(address: string, chainName?: string): Promise<Position[]> {
    // Check if the address is valid
    if (!isAddress(address)) {
      throw new Error("Invalid Ethereum address");
    }
    const MARKETS = UNISWAP_MARKETS.filter(market => {
      if (chainName) {
        return market.name === chainName;
      }
      return true; // Include all markets if no chainId is provided
    });
    try {
      this._positionsMap$.next(new Map()); // Reset the positions map
      // Fetch positions for the given address
      const positions = [];
      // Loop through all markets to fetch positions
      for (let index = 0; index < MARKETS.length; index++) {
        this.pendingMessage$.next(`Fetching Uniswap V3 positions on ${MARKETS[index].name.slice(0,1).toUpperCase() + MARKETS[index].name.slice(1)}...`);
        const market = MARKETS[index];
        const marketPositions = await getUniswapPositions(address as `0x${string}`, market);
        positions.push(...marketPositions);
        // Update the positions map
        const currentPositionsMap = this._positionsMap$.getValue();
        const existingPositions = currentPositionsMap.get(market.chain.id) || [];
        const updatedPositions = [...existingPositions, ...marketPositions];
        currentPositionsMap.set(market.chain.id, updatedPositions);
        this._positionsMap$.next(currentPositionsMap);
      }
      this.pendingMessage$.next(null); // Clear the pending message
      return positions;
    } catch (error) {
      console.error("Error getting positions:", error);
      this.pendingMessage$.next(null); // Clear the pending message
      throw error;
    }
  }

  async clearPositions() {
    this._positionsMap$.next(new Map());
    this.pendingMessage$.next(null);
  }
}
