import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import '@khmyznikov/pwa-install';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, IonApp, IonRouterOutlet],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <ion-app>
      <ion-router-outlet />
      <pwa-install manifest-url="./manifest.webmanifest" />
    </ion-app>
  `
})
export class AppComponent {
  constructor() {}
}