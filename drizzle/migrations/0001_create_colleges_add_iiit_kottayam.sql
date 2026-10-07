CREATE TABLE public.colleges (
  domain text PRIMARY KEY,
  name text NOT NULL,
  short_name text NOT NULL
);

GRANT SELECT ON public.colleges TO authenticated;
GRANT ALL ON public.colleges TO service_role;

ALTER TABLE public.colleges ENABLE ROW LEVEL SECURITY;

CREATE POLICY colleges_select_authenticated
  ON public.colleges FOR SELECT TO authenticated
  USING (true);

-- Reference data for the approved-college directory (additive with table creation)
INSERT INTO public.colleges (domain, name, short_name) VALUES
  ('iiitk.ac.in', 'Indian Institute of Information Technology Kottayam', 'IIIT Kottayam');