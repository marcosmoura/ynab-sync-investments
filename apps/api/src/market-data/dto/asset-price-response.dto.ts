export class AssetPriceResponseDto {
  symbol: string;
  price: number;
  currency: string;
  timestamp?: Date;

  constructor(symbol: string, price: number, currency: string, timestamp?: Date) {
    this.symbol = symbol;
    this.price = price;
    this.currency = currency;
    this.timestamp = timestamp || new Date();
  }
}
