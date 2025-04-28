import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonCol,
  IonContent,
  IonGrid,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonLabel,
  IonRow,
  IonSearchbar,
  IonSpinner,
  IonText,
} from '@ionic/angular/standalone';

const UIElements = [
  IonContent,
  IonGrid,
  IonRow,
  IonCol,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonText,
  IonLabel,
  IonSpinner,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
];

export interface APIResponse {
  data: DefiLamaPool[];
  status: string;
}

export interface DefiLamaPool {
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number;
  apyBase: number;
  apyReward: number;
  apy: number;
  rewardTokens: string[];
  pool: string;
  apyPct1D: number;
  apyPct7D: number;
  apyPct30D: number;
  stablecoin: boolean;
  ilRisk: string;
  exposure: string;
  predictions: Predictions;
  poolMeta: null;
  mu: number;
  sigma: number;
  count: number;
  outlier: boolean;
  underlyingTokens: string[];
  il7d: null;
  apyBase7d: number;
  apyMean30d: number;
  volumeUsd1d: null;
  volumeUsd7d: null;
  apyBaseInception: null;
}

export interface Predictions {
  predictedClass: string;
  predictedProbability: number;
  binnedConfidence: number;
}

@Component({
  selector: 'app-top-pools',
  templateUrl: './top-pools.component.html',
  styleUrls: ['./top-pools.component.scss'],
  imports: [...UIElements, CommonModule],
  standalone: true,
})
export class TopPoolsComponent implements OnInit {
  private _poolData: DefiLamaPool[] | undefined;
  private _filterTerm: string | undefined;
  public topPools: DefiLamaPool[] | undefined;
  public min = 0;
  public max = 5;
  @Input() set filterTerm(value: string | undefined) {
    this._filterTerm = value;
    if (this._filterTerm && this._filterTerm.length > 1) {
      this.search(this._filterTerm);
    } else {
      this.topPools = this._poolData;
    }
  } 

  constructor() {}

  async ngOnInit() {
    this.topPools = await this.getUniswapV3TopPools();
  }

  async getUniswapV3TopPools() {
    if (this._poolData) {
      return this._poolData;
    }
    const url = 'https://yields.llama.fi/pools';
    const data = await fetch(url);
    const response: APIResponse = await data.json();

    const MIN_TVL = 100_000;
    const MIN_APY = 2;
    const MIN_VOLUME_1D = 1_000;
    const MIN_MU = 2;
    const MAX_SIGMA = 1;
    const MIN_APY_PCT_7D = -1; // Exclude pool with high drowdown in 7d
    const MIN_APY_PCT_30D = -2; // Exclude pool with high drowdown in 30d

    const uniswapV3Pools = response.data
      .filter((pool) => pool.project?.toLowerCase() === 'uniswap-v3')
      .filter((pool) => pool.tvlUsd > MIN_TVL)
      .filter((pool) => pool.apy > MIN_APY)
      .filter((pool) => (pool.volumeUsd7d || 0) * 4 > (pool.volumeUsd1d || 0))
      .filter((pool) => pool.volumeUsd1d && pool.volumeUsd1d > MIN_VOLUME_1D)
      .filter((pool) => pool.mu !== undefined && pool.mu > MIN_MU)
      .filter((pool) => pool.outlier === false)
      // .filter((pool) => pool.sigma !== undefined && pool.sigma < MAX_SIGMA)
      .filter(
        (pool) => pool.apyPct7D !== undefined && pool.apyPct7D > MIN_APY_PCT_7D
      )
      // .filter(
      //   (pool) =>
      //     pool.apyPct30D !== undefined && pool.apyPct30D > MIN_APY_PCT_30D
      // )
      .sort((a, b) => b.apy - a.apy);
    console.log({ uniswapV3Pools });
    this._poolData = uniswapV3Pools;
    return uniswapV3Pools;
  }

  search(value: string) {
    if (value.length > 1) {
      this.topPools = this._poolData?.filter((pool) =>
        pool.symbol.toLowerCase().includes(value.toLowerCase())
      );
    } else {
      this.topPools = this._poolData;
    }
  }

  async openPool(pool: DefiLamaPool) {
    console.log({ pool });
    
    const chain = pool.chain.toLowerCase() === 'ethereum' ? 'mainnet' : pool.chain.toLowerCase();
    const url = `https://app.uniswap.org/positions/create/v3?currencyA=${pool.underlyingTokens[0]}&currencyB=${pool.underlyingTokens[1]}&chain=${chain}`;
    window.open(url, '_blank');
  }

  onInfiniscroll(event: any) {
    setTimeout(() => {
      if (this.max < (this._poolData?.length || 0)) {
        this.max += 10;
      }
      event.target.complete();
    }, 580);
  }
}
