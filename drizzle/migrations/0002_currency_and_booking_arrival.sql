ALTER TABLE public.trips ADD COLUMN currency text NOT NULL DEFAULT 'EUR';
ALTER TABLE public.expenses ADD COLUMN original_amount numeric, ADD COLUMN currency text NOT NULL DEFAULT 'EUR', ADD COLUMN rate numeric NOT NULL DEFAULT 1;
UPDATE public.expenses SET original_amount = amount WHERE original_amount IS NULL;
ALTER TABLE public.bookings ADD COLUMN ends_at timestamptz;