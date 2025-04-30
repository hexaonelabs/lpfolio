import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { HedgeCalculatorComponent } from './hedge-calculator.component';

describe('HedgeCalculatorComponent', () => {
  let component: HedgeCalculatorComponent;
  let fixture: ComponentFixture<HedgeCalculatorComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ HedgeCalculatorComponent ],
      imports: []
    }).compileComponents();

    fixture = TestBed.createComponent(HedgeCalculatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
