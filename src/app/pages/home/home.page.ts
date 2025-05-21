import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonInput,
  IonButton,
  IonList,
  IonItem,
  IonLabel,
  IonSearchbar,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonChip,
  IonBadge,
  IonIcon,
  IonSpinner,
  IonSegment,
  IonSegmentButton,
  IonRefresher,
  IonRefresherContent,
  IonFab,
  IonFabButton,
  IonToast,
  IonToggle,
  IonGrid,
  IonRow,
  IonCol,
  IonText,
  IonSkeletonText,
  IonModal,
  IonButtons,
  IonRouterLink,
} from '@ionic/angular/standalone';
import { StorageService } from '../../services/storage.service';
import { UniswapService } from '../../services/uniswap.service';
import { Position } from '../../models/position.model';
import { Network } from '../../models/network.model';
import { addIcons } from 'ionicons';
import {
  searchOutline,
  refreshOutline,
  walletOutline,
  arrowUpOutline,
  arrowDownOutline,
  linkOutline,
  swapHorizontalOutline,
  alertCircleOutline,
  openOutline,
  closeOutline,
  ellipse,
} from 'ionicons/icons';
import {
  calculateRelativeAPY,
  openPositionDetails,
  UNISWAP_MARKETS,
} from '../../utils/uniswap-onchain.utils';
import { map, Observable, tap } from 'rxjs';
import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';
import { TopPoolsComponent } from '../top-pools/top-pools.component';
import { RouterLink } from '@angular/router';

const UIElements = [
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonInput,
  IonButton,
  IonList,
  IonItem,
  IonLabel,
  IonSearchbar,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonChip,
  IonBadge,
  IonIcon,
  IonSpinner,
  IonSegment,
  IonSegmentButton,
  IonRefresher,
  IonRefresherContent,
  IonFab,
  IonFabButton,
  IonToast,
  IonToggle,
  IonGrid,
  IonRow,
  IonCol,
  IonText,
  IonSkeletonText,
  IonModal,
  IonButtons,
];

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, ...UIElements, TopPoolsComponent, RouterLink, IonRouterLink],
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage implements OnInit {
  availableMarkets = UNISWAP_MARKETS;
  address: string = '';
  positions$: Observable<Position[]>;
  activePositions$: Observable<Position[]>;
  isLoading: boolean = false;
  pendingMessage$: Observable<string | null>;
  selectedNetwork: string = 'all';
  errorMessage: string = '';
  showToast: boolean = false;
  priceToggles: { [key: string]: boolean } = {};
  totalLiquidity: number = 0;
  totalAPY: number = 0;
  totalFees: number = 0;
  totalUnclaimedFees: number = 0;
  isTopPoolsOpen: boolean = false;
  filterTerm: string | undefined;

  networks: Network[] = [
    { id: 'all', name: 'All Networks' },
    { id: 'arbitrum', name: 'Arbitrum' },
    { id: 'base', name: 'Base' },
    { id: 'mainnet', name: 'Ethereum' },
  ];

  constructor(
    private storageService: StorageService,
    private uniswapService: UniswapService
  ) {
    addIcons({
      searchOutline,
      refreshOutline,
      walletOutline,
      arrowUpOutline,
      arrowDownOutline,
      linkOutline,
      swapHorizontalOutline,
      alertCircleOutline,
      openOutline,
      closeOutline,
      ellipse,
    });
    this.positions$ = this.uniswapService.allPositions$.pipe(
      tap((positions) => {
        this.totalLiquidity = positions.reduce((acc, position) => {
          return acc + position.liquidity;
        }, 0);
        this.totalAPY = calculateRelativeAPY(positions);
        this.totalFees = positions.reduce((acc, position) => {
          const fees = position.fees?.totalAllFeesUSD || 0;
          return acc + fees;
        }, 0);
        this.totalUnclaimedFees = positions.reduce((acc, position) => {
          const fees = position.fees?.totalUnclaimedUSD || 0;
          return acc + fees;
        }, 0);
      })
    );
    this.activePositions$ = this.positions$.pipe(
      map((positions) =>
        positions.filter(
          (position) =>
            position.tickCurrent > position.tickLower &&
            position.tickCurrent < position.tickUpper
        )
      )
    );
    this.pendingMessage$ = this.uniswapService.pendingMessage$.asObservable();
  }

  async ngOnInit() {
    this.address = await this.storageService.getAddress();
    if (this.address) {
      await this.fetchPositions();
    }
  }

  async fetchPositions() {
    if (!this.address || this.address.trim() === '') {
      this.errorMessage = 'Please enter a valid Ethereum address';
      this.showToast = true;
      return;
    }
    const OxAddress =
      this.address.startsWith('0x') && !this.address.endsWith('.eth')
        ? this.address
        : await this._resolveEnsName(this.address);
    this.isLoading = true;
    const chainName =
      this.selectedNetwork === 'all'
        ? undefined
        : this.networks.find((network) => network.id === this.selectedNetwork)
            ?.id;
    try {
      await this.uniswapService.getPositions(
        OxAddress,
        chainName
      );
      await this.storageService.saveAddress(this.address);
      this.errorMessage = '';
    } catch (error) {
      console.error('Error fetching positions:', error);
      this.errorMessage = 'Error fetching positions. Please try again.';
      this.showToast = true;
    } finally {
      this.isLoading = false;
    }
  }

  async openPositionDetails(position: Position) {
    openPositionDetails(position);
  }

  private async _resolveEnsName(ensName: string): Promise<string> {
    // Créez un client public pour interagir avec le réseau Ethereum
    const client = createPublicClient({
      chain: mainnet,
      transport: http(),
    });

    try {
      // Résolvez le domaine ENS en une adresse EVM
      const address = await client.getEnsAddress({ name: ensName });
      return `${address}`;
    } catch (error) {
      throw error;
    }
  }

  async doRefresh(event: any) {
    await this.fetchPositions();
    event.target.complete();
  }

  getNetworkIcon(networkId: string): string {
    switch (networkId) {
      case 'arbitrum':
        return 'assets/networks/arbitrum.png';
      case 'base':
        return 'assets/networks/base.png';
      case 'mainnet':
        return 'assets/networks/ethereum.png';
      default:
        return 'assets/networks/ethereum.png';
    }
  }

  getApyColor(apy: number): string {
    if (apy > 20) return 'success';
    if (apy > 5) return 'warning';
    return 'medium';
  }

  getPriceRangePercentage(position: Position, value: number): number {
    const min = Math.min(position.lowerPrice, position.upperPrice);
    const max = Math.max(position.lowerPrice, position.upperPrice);
    const range = max - min;
    const result = ((value - min) / range) * 100;
    return Math.max(0, Math.min(100, result));
  }

  async filterTopPools($event: {
    detail: { value: string }}) {
    this.filterTerm = $event.detail.value;
  }

  async onAddressChange($event: {
    detail: { value?: any }
  }) {
    if ($event.detail.value?.trim() === '') {
      await this.storageService.clear();
      this.address = '';
      this.uniswapService.clearPositions();
    }
  }
}
