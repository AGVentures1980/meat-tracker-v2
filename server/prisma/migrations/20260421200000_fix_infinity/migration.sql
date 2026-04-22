-- Clean up any Infinity values already stored
UPDATE "OutletForecastLog"
SET lbs_per_guest = NULL, variance_pct = NULL
WHERE lbs_per_guest = 'Infinity'::float
   OR lbs_per_guest = '-Infinity'::float
   OR lbs_per_guest = 'NaN'::float;
