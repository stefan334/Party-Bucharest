CREATE TABLE public.events
(
    id integer NOT NULL GENERATED ALWAYS AS IDENTITY ( INCREMENT 1 START 1 MINVALUE 0 CACHE 1 ),
    category character varying(250) NOT NULL,
    indoor boolean,
    cost integer,
    description character varying,
    image character varying,
    name character varying NOT NULL,
    starting date NOT NULL,
    PRIMARY KEY (id)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.events
    OWNER to postgres;

GRANT ALL ON TABLE public.events TO ivan334;

GRANT ALL ON TABLE public.events TO ivan;

INSERT INTO public.events(
	category, indoor, cost, description, image, name, starting)
	VALUES ('club', 'true', 30, 'Dai 30 bei cat vrei', './Resources/blabla.jpg', 'Miercurea Berii', '10/26/2022');