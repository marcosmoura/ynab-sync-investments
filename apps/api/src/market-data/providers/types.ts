export interface AssetResult {
  symbol: string;
  price: number;
  currency: string;
}

export interface MarketDataProvider {
  fetchAssetPrices(symbols: string[], targetCurrency: string): Promise<AssetResult[]>;
  isAvailable(): boolean;
  getProviderName(): string;
}
