import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HedgeResult } from '../../../../models/uniswap-lp.model';

import {
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonCol,
  IonGrid,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonRow,
  IonText,
} from '@ionic/angular/standalone';

const UIElements = [
  IonGrid,
  IonRow,
  IonCol,
  IonCard,
  IonCardHeader,
  IonCardContent,
  IonCardTitle,
  IonItem,
  IonLabel,
  IonText,
  IonInput,
  IonNote,
  IonButton,
  IonIcon,
  IonBadge,
  IonList,
];

@Component({
  selector: 'app-results-display',
  standalone: true,
  imports: [...UIElements, CommonModule],
  template: `
    <ion-card class="results-card">
      <ion-card-header>
        <ion-card-title>
          <ion-icon name="checkmark-circle" color="success"></ion-icon>
          Hedge Calculation Results
        </ion-card-title>
      </ion-card-header>
      <ion-card-content>
        <ion-list lines="none">

          <ion-item>
            <ion-icon name="cash-outline" slot="start" color="primary"></ion-icon>
            <ion-label>
              <h2>Margin Required</h2>
              <p>Amount needed to open the hedge position</p>
            </ion-label>
            <ion-badge slot="end" color="primary" class="value-badge">{{ hedgeResult.marginRequired | currency: 'USD':
                    'symbol': '1.2-2' }}</ion-badge>
          </ion-item>

          <ion-item>
            <ion-icon name="cash-outline" slot="start" color="primary"></ion-icon>
            <ion-label>
              <h2>Hedge Position Size</h2>
              <p>Amount needed to hedge your LP position</p>
            </ion-label>
            <ion-badge slot="end" color="primary" class="value-badge">{{ hedgeResult.positionSize | currency: 'USD':
                    'symbol': '1.2-2' }}</ion-badge>
          </ion-item>

          <ion-item>
            <ion-icon name="settings-outline" slot="start" color="primary"></ion-icon>
            <ion-label>
              <h2>Funding Cost</h2>
              <p>Estimated funding cost for the hedge position</p>
            </ion-label>
            <ion-badge slot="end" color="primary" class="value-badge">{{ hedgeResult.fundingCost | currency: 'USD':
                    'symbol': '1.2-2' }}</ion-badge>
          </ion-item>

          <ion-item>
            <ion-icon name="settings-outline" slot="start" color="primary"></ion-icon>
            <ion-label>
              <h2>Transaction Fees</h2>
              <p>Estimated transaction fees for the hedge position</p>
            </ion-label>
            <ion-badge slot="end" color="primary" class="value-badge">{{ hedgeResult.transactionFees | currency: 'USD':
                    'symbol': '1.2-2' }}</ion-badge>
          </ion-item>
          
          <ion-item>
            <ion-icon name="trending-up-outline" slot="start" color="tertiary"></ion-icon>
            <ion-label>
              <h2>Recommended Leverage</h2>
              <p>Optimal leverage for your hedge position</p>
            </ion-label>
            <ion-badge slot="end" color="tertiary" class="value-badge">{{hedgeResult.leverage}}x</ion-badge>
          </ion-item>
          
          <ion-item>
            <ion-icon name="arrow-down-outline" slot="start" color="danger"></ion-icon>
            <ion-label>
              <h2>Stop Loss</h2>
              <p>Recommended stop loss price level</p>
            </ion-label>
            <ion-badge slot="end" color="danger" class="value-badge">{{ hedgeResult.stopLoss }}</ion-badge>
          </ion-item>
          
          <ion-item>
            <ion-icon name="arrow-up-outline" slot="start" color="success"></ion-icon>
            <ion-label>
              <h2>Take Profit</h2>
              <p>Recommended take profit price level</p>
            </ion-label>
            <ion-badge slot="end" color="success" class="value-badge">{{ hedgeResult.takeProfit }}</ion-badge>
          </ion-item>
        </ion-list>
        
        <div class="disclaimer">
          <ion-note>
            <ion-icon name="information-circle-outline"></ion-icon>
            These calculations are recommendations only. Always consider market conditions and your risk tolerance before trading.
          </ion-note>
        </div>
      </ion-card-content>
    </ion-card>
  `,
  styles: [`
    .results-card {
      --background: #f8fcff;
      margin-top: 24px;
    }
    
    ion-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 1.3rem;
    }
    
    .value-badge {
      font-size: 1.1rem;
      padding: 8px 12px;
      border-radius: 16px;
    }
    
    ion-item {
      --padding-start: 0;
      margin-bottom: 8px;
    }
    
    ion-item h2 {
      font-weight: 500;
      margin-bottom: 4px;
    }
    
    ion-item p {
      color: var(--ion-color-medium);
    }
    
    .disclaimer {
      margin-top: 16px;
      padding: 12px;
      border-radius: 8px;
      background-color: rgba(var(--ion-color-warning-rgb), 0.1);
    }
    
    .disclaimer ion-note {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--ion-color-medium);
    }

    ion-list {
        padding: 0.5rem;
        border-radius: 12px;
      }
  `]
})
export class ResultsDisplayComponent {
  @Input() hedgeResult!: HedgeResult;
}