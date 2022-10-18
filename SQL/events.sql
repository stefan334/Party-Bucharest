
CREATE TYPE public.roluri AS ENUM (
    'admin',
    'moderator',
    'comun'
);


ALTER TYPE public.roluri OWNER TO ivan334;

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

CREATE TABLE public.utilizatori (
    id integer NOT NULL,
    username character varying(50) NOT NULL,
    nume character varying(100) NOT NULL,
    prenume character varying(100) NOT NULL,
    parola character varying(500) NOT NULL,
    rol public.roluri DEFAULT 'comun'::public.roluri NOT NULL,
    email character varying(100) NOT NULL,
    data_adaugare timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    cod character varying(200),
    confirmat_mail boolean DEFAULT false,
    tema_site character varying(50),
    imagine character varying(50)
);

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.events
    OWNER to ivan334;

GRANT ALL ON TABLE public.events TO ivan334;

GRANT ALL ON TABLE public.events TO ivan;


CREATE TABLE public.accesari (
    id integer NOT NULL,
    ip character varying(100) NOT NULL,
    user_id integer,
    pagina character varying(500) NOT NULL,
    data_accesare timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.accesari OWNER TO ivan334;

--
-- TOC entry 213 (class 1259 OID 24657)
-- Name: accesari_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.accesari_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.accesari_id_seq OWNER TO ivan334;

--
-- TOC entry 3345 (class 0 OID 0)
-- Dependencies: 213
-- Name: accesari_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.accesari_id_seq OWNED BY public.accesari.id;


--

ALTER TABLE ONLY public.accesari ALTER COLUMN id SET DEFAULT nextval('public.accesari_id_seq'::regclass);


GRANT ALL ON TABLE public.accesari TO ivan334;
GRANT ALL ON TABLE public.accesari_id_seq TO ivan334;
GRANT ALL ON TABLE public.utilizatori TO ivan334


CREATE SEQUENCE public.utilizatori_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.utilizatori OWNER TO ivan334;
ALTER TABLE public.utilizatori_id_seq OWNER TO ivan334;


--
-- TOC entry 3350 (class 0 OID 0)
-- Dependencies: 211
-- Name: utilizatori_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.utilizatori_id_seq OWNED BY public.utilizatori.id;


--
-- TOC entry 3183 (class 2604 OID 24661)
-- Name: accesari id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accesari ALTER COLUMN id SET DEFAULT nextval('public.accesari_id_seq'::regclass);


--
-- TOC entry 3178 (class 2604 OID 24646)
-- Name: utilizatori id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.utilizatori ALTER COLUMN id SET DEFAULT nextval('public.utilizatori_id_seq'::regclass);


INSERT INTO public.events(
	category, indoor, cost, description, image, name, starting)
	VALUES ('club', 'true', 30, 'Dai 30 bei cat vrei', './Resources/blabla.jpg', 'Miercurea Berii', '10/26/2022');


    ALTER TABLE IF EXISTS public.utilizatori
    ADD CONSTRAINT id PRIMARY KEY (id);