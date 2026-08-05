-- Allow US 2-letter state codes alongside MX 3-letter ISO codes.
ALTER TABLE mrpaps_orders
  ALTER COLUMN ship_state_code TYPE VARCHAR(3);

ALTER TABLE mrpaps_addresses
  ALTER COLUMN state_code TYPE VARCHAR(3);
