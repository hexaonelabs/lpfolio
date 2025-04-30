import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { CalculatorFormComponent } from './components/calculator-form/calculator-form.component';
import { ResultsDisplayComponent } from './components/results-display/results-display.component';
import { IonButton, IonCol, IonContent, IonGrid, IonHeader, IonRouterLink, IonRow, IonText, IonToolbar } from '@ionic/angular/standalone';
import { HedgeResult, UniswapLPPosition } from '../../models/uniswap-lp.model';
import { HedgeCalculatorService } from '../../services/hedge-calculator.service';
import { RouterLink } from '@angular/router';

const UIElements = [
  IonContent,
  IonGrid,
  IonRow,
  IonCol,
  IonText,
  IonHeader,
  IonToolbar,
  IonButton,
];

@Component({
  selector: 'app-hedge-calculator',
  templateUrl: './hedge-calculator.component.html',
  styleUrls: ['./hedge-calculator.component.scss'],
  imports: [
    ...UIElements,
    CommonModule,
    ReactiveFormsModule,
    CalculatorFormComponent,
    ResultsDisplayComponent,
    RouterLink, 
    IonRouterLink
  ],
})
export class HedgeCalculatorComponent  implements OnInit {

  hedgeResult: HedgeResult | null = null;

  constructor(private hedgeCalculatorService: HedgeCalculatorService) {}

  onFormSubmitted(position: UniswapLPPosition): void {
    this.hedgeResult = this.hedgeCalculatorService.calculateHedge(position);
  }

  ngOnInit() {}

}
