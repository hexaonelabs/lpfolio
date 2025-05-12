import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardSubtitle,
  IonCardTitle,
  IonCol,
  IonContent,
  IonGrid,
  IonHeader,
  IonIcon,
  IonLabel,
  IonRow,
  IonSkeletonText,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import {
  buildPositionData,
  fetchPoolData,
  getPositionDetails,
  UNISWAP_MARKETS,
} from '../../utils/uniswap-onchain.utils';
import { createPublicClient, getContract, http, parseAbi } from 'viem';
import { Position } from '../../models/position.model';

const UIElements = [
  IonContent,
  IonGrid,
  IonRow,
  IonCol,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonLabel,
  IonText,
  IonCard,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonSpinner,
  IonSkeletonText,
];

@Component({
  selector: 'app-badge-page',
  templateUrl: './badge-page.component.html',
  styleUrls: ['./badge-page.component.scss'],
  imports: [CommonModule, ...UIElements],
})
export class BadgePageComponent implements OnInit {
  public isLoading = false;
  public position?: Position;

  constructor(private readonly _route: ActivatedRoute) {}

  async ngOnInit() {
    const query = this._route.snapshot.queryParamMap;
    const tokenId = query.get('tokenId');
    const chainId = query.get('chainId');
    if (!tokenId || !chainId) {
      console.error('Missing tokenId or chainId in query params');
      return;
    }
    this.isLoading = true;
    const nftPositionManagerAbi = parseAbi([
      'function balanceOf(address owner) view returns (uint256)',
      'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
      'function positions(uint256 tokenId) view returns (uint96 nonce, address operator, address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128, uint128 tokensOwed0, uint128 tokensOwed1)',
    ]);
    const market = UNISWAP_MARKETS.find(
      (market) => market.chain.id === Number(chainId)
    )!;
    const client = createPublicClient({
      chain: market.chain,
      transport: http(),
    });
    const nftContract = getContract({
      address: market.nftManager as `0x${string}`,
      abi: nftPositionManagerAbi,
      client,
    });
    const position = await getPositionDetails(nftContract, BigInt(tokenId));
    const poolData = await fetchPoolData(position, Number(chainId));
    if (!poolData) {
      console.error('Pool data not found');
      return;
    }
    const positionData = await buildPositionData(
      position,
      poolData,
      Number(chainId)
    );
    this.position = positionData;
    this.isLoading = false;
    console.log('position:', positionData);
  }

  getPriceRangePercentage(position: Position, value: number): number {
    const min = Math.min(position.lowerPrice, position.upperPrice);
    const max = Math.max(position.lowerPrice, position.upperPrice);
    const range = max - min;
    const result = ((value - min) / range) * 100;
    return Math.max(0, Math.min(100, result));
  }
}
