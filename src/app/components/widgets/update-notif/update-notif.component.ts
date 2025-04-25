import { AsyncPipe, NgIf } from '@angular/common';
import { Component, isDevMode, OnInit } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { ToastController } from '@ionic/angular/standalone';
import { Observable, switchMap } from 'rxjs';

@Component({
  standalone: true,
  selector: 'app-update-notif',
  template: `<ng-container *ngIf="updateAvailable$ | async"></ng-container>`,
  imports: [AsyncPipe, NgIf],
})
export class UpdateNotifComponent  implements OnInit {
  public readonly updateAvailable$: Observable<void>;
  constructor(
    private updates: SwUpdate,
  ) {
    this.updateAvailable$ = this.updates.versionUpdates.pipe(
      switchMap(async (event) => {
        console.log('event', event);
        if (event.type === 'VERSION_READY') {
          await this._displayNotif();
        }
      }),
    );
  }

  ngOnInit() {}

  async activateUpdate() {
    if (isDevMode()) {
      return;
    }
    await this.updates.activateUpdate()
    location.reload();
  }

  private async _displayNotif() {
    const toast = await new ToastController().create({
      message: 'New version available!',
      position: 'bottom',
      swipeGesture: 'vertical',
      buttons: [
        {
          text: 'Update',
          role: 'ok',
        },
      ],
      color: 'primary',
      duration: 1000 * 60,
    });
    await toast.present();
    await toast.onDidDismiss()
    await this.activateUpdate()
  }

}