import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private readonly ADDRESS_KEY = 'uniswap_address';

  constructor() {}

  async saveAddress(address: string): Promise<void> {
    if (!address) return;
    localStorage.setItem(this.ADDRESS_KEY, address);
  }

  async getAddress(): Promise<string> {
    return localStorage.getItem(this.ADDRESS_KEY) || '';
  }

  async clear(): Promise<void> {
    localStorage.removeItem(this.ADDRESS_KEY);
  }
}