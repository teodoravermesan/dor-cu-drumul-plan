CREATE TABLE public.trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  destination text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  budget numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trips TO authenticated;
GRANT ALL ON public.trips TO service_role;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own trips" ON public.trips FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  day date NOT NULL,
  position int NOT NULL DEFAULT 0,
  time time,
  title text NOT NULL,
  location text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activities TO authenticated;
GRANT ALL ON public.activities TO service_role;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own activities" ON public.activities FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  kind text NOT NULL DEFAULT 'zbor',
  provider text,
  code text,
  starts_at timestamptz,
  price numeric(12,2),
  link text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own bookings" ON public.bookings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  category text NOT NULL DEFAULT 'altele',
  description text,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  spent_on date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own expenses" ON public.expenses FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Demo trip seeded for every new account
CREATE OR REPLACE FUNCTION public.seed_demo_trip()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t uuid;
BEGIN
  INSERT INTO public.trips (user_id, name, destination, start_date, end_date, budget)
  VALUES (NEW.id, 'Insulele Canare', 'Malaga → Lanzarote → Tenerife → Cluj', '2026-12-10', '2026-12-18', 2500)
  RETURNING id INTO t;

  INSERT INTO public.activities (trip_id, user_id, day, position, time, title, location, notes) VALUES
  (t, NEW.id, '2026-12-10', 0, '10:00', 'Plimbare în centrul vechi', 'Calle Larios, Malaga', 'Cafea la Café Central'),
  (t, NEW.id, '2026-12-10', 1, '16:00', 'Alcazaba', 'Alcazaba de Málaga', NULL),
  (t, NEW.id, '2026-12-11', 0, '09:30', 'Zbor spre Lanzarote', 'Aeroport AGP', 'Check-in online'),
  (t, NEW.id, '2026-12-12', 0, '10:00', 'Parcul Național Timanfaya', 'Timanfaya', 'Bilete la intrare'),
  (t, NEW.id, '2026-12-13', 0, '11:00', 'Jameos del Agua', 'Haría', NULL),
  (t, NEW.id, '2026-12-14', 0, '08:15', 'Zbor spre Tenerife', 'Aeroport ACE', NULL),
  (t, NEW.id, '2026-12-15', 0, '09:00', 'Teide cu telecabina', 'Parque Nacional del Teide', 'Haine groase!'),
  (t, NEW.id, '2026-12-17', 0, '15:00', 'Plaja Las Teresitas', 'San Andrés', NULL),
  (t, NEW.id, '2026-12-18', 0, '12:30', 'Zbor spre Cluj', 'Aeroport TFS', 'Escală în Madrid');

  INSERT INTO public.bookings (trip_id, user_id, kind, provider, code, starts_at, price, link) VALUES
  (t, NEW.id, 'zbor', 'Wizz Air (Cluj → Malaga)', 'W6K2LM', '2026-12-09 18:40+00', 129, 'https://wizzair.com'),
  (t, NEW.id, 'cazare', 'Hotel Molina Lario, Malaga', 'BK-88213', '2026-12-09 15:00+00', 180, 'https://booking.com'),
  (t, NEW.id, 'zbor', 'Binter (Malaga → Lanzarote)', 'NT7Q4P', '2026-12-11 09:30+00', 95, NULL),
  (t, NEW.id, 'masina', 'Cicar, Lanzarote', 'CIC-55120', '2026-12-11 12:00+00', 85, 'https://cicar.com'),
  (t, NEW.id, 'cazare', 'Apartament Puerto del Carmen', 'AB-4471', '2026-12-11 15:00+00', 270, 'https://airbnb.com'),
  (t, NEW.id, 'zbor', 'Binter (Lanzarote → Tenerife)', 'NT9X1A', '2026-12-14 08:15+00', 70, NULL),
  (t, NEW.id, 'cazare', 'Hotel Adrián, Tenerife', 'BK-90342', '2026-12-14 14:00+00', 420, 'https://booking.com'),
  (t, NEW.id, 'zbor', 'Iberia (Tenerife → Cluj)', 'IB3ZT8', '2026-12-18 12:30+00', 210, 'https://iberia.com');

  INSERT INTO public.expenses (trip_id, user_id, category, description, amount, spent_on) VALUES
  (t, NEW.id, 'transport', 'Bilete avion', 504, '2026-10-02'),
  (t, NEW.id, 'cazare', 'Cazări rezervate', 870, '2026-10-05'),
  (t, NEW.id, 'transport', 'Mașină Lanzarote', 85, '2026-10-06'),
  (t, NEW.id, 'activitati', 'Telecabina Teide', 76, '2026-11-01');
  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created_seed_trip
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.seed_demo_trip();