export type ShippingQuoteRate = {
  id: string;
  name: string;
  priceMxn: string;
  minDays: number;
  maxDays: number;
  carrier?: string;
  serviceCode?: string;
  source: 'envia' | 'local';
  /** true = tarifa local o sandbox; verificar en producción. */
  estimated: boolean;
};

export type ShippingQuoteResult = {
  rates: ShippingQuoteRate[];
  provider: 'envia' | 'local';
  meta: {
    itemCount: number;
    weightKg: number;
    originZip: string;
    destinationZip: string;
    carriersQueried?: string[];
  };
};
