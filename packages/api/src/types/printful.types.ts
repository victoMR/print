/** Printful API envelope */
export interface PrintfulResponse<T> {
  code: number;
  result: T;
  extra?: unknown;
}

export interface PrintfulStore {
  id: number;
  name: string;
  type: string;
}

export interface PrintfulSyncProduct {
  id: number;
  external_id: string;
  name: string;
  variants: number;
  synced: number;
  thumbnail_url: string;
}

export interface PrintfulOrder {
  id: number;
  external_id: string;
  status: string;
  shipping: string;
  created: number;
  updated: number;
  recipient: Record<string, unknown>;
  items: unknown[];
  costs?: Record<string, string>;
  retail_costs?: Record<string, string>;
}

export interface PrintfulShippingRate {
  id: string;
  name: string;
  rate: string;
  currency: string;
  minDeliveryDays?: number;
  maxDeliveryDays?: number;
}

export interface PrintfulWebhookPayload {
  type: string;
  created: number;
  retries: number;
  store: number;
  data: Record<string, unknown>;
}
