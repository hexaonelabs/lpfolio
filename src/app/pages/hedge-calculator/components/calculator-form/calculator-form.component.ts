import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormGroup,
  FormBuilder,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { UniswapLPPosition } from '../../../../models/uniswap-lp.model';
import {
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
import { addIcons } from 'ionicons';
import {
  calculatorOutline,
  arrowDownOutline,
  arrowUpOutline,
  cashOutline,
  checkmarkCircle,
  trendingUpOutline,
  informationCircleOutline,
  settingsOutline,
} from 'ionicons/icons';

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
  IonList,
  IonIcon,
];

@Component({
  selector: 'app-calculator-form',
  standalone: true,
  imports: [...UIElements, CommonModule, ReactiveFormsModule],
  templateUrl: './calculator-form.component.html',
  styles: [
    `
    :host {
      .submit-container {
        margin-top: 16px;
      }
  
      ion-note {
        font-size: 0.8rem;
      }
      ion-list {
        padding: 0.5rem;
        border-radius: 12px;
      }
    
    }
    `,
  ],
})
export class CalculatorFormComponent {
  @Output() formSubmitted = new EventEmitter<UniswapLPPosition>();

  lpForm: FormGroup;

  constructor(private fb: FormBuilder) {
    addIcons({
      calculatorOutline,
      arrowDownOutline,
      arrowUpOutline,
      cashOutline,
      checkmarkCircle,
      trendingUpOutline,
      informationCircleOutline,
      settingsOutline,

    });
    this.lpForm = this.fb.group({
      token0: ['ETH', Validators.required],
      token1: ['USDC', Validators.required],
      token0Price: [1800, [Validators.required, Validators.min(0.000001)]],
      token1Price: [1, [Validators.required, Validators.min(0.000001)]],
      token0Amount: [1, [Validators.required, Validators.min(0.000001)]],
      token1Amount: [1800, [Validators.required, Validators.min(0.000001)]],
      minPrice: [1600, [Validators.required, Validators.min(0.000001)]],
      maxPrice: [2000, [Validators.required, Validators.min(0.000001)]],
      entryPrice: [1800, [Validators.required, Validators.min(0.000001)]],
      fundingRateAnnual: [
        -10,
        [Validators.required, Validators.min(-100), Validators.max(100)],
      ],
      openFee: [
        0.0035,
        [Validators.required, Validators.min(0), Validators.max(100)],
      ],
      closeFee: [
        0.0035,
        [Validators.required, Validators.min(0), Validators.max(100)],
      ],
    });
  }

  onSubmit(): void {
    if (this.lpForm.valid) {
      this.formSubmitted.emit(this.lpForm.value);
    }
  }
}
