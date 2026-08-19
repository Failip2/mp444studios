/**
 * The gear list, ported from the old Hugo `equipment` page.
 *
 * Rendered as a spec sheet rather than a bulleted list: every line is a real
 * object with a maker, a model and a link, which is exactly the register the
 * rest of the site is written in.
 */

export type GearItem = {
  /** Maker, set in the small caps column. */
  brand: string;
  /** Model designation, set as the line itself. */
  model: string;
  /** Product page. Null when we have no trustworthy link for it. */
  href: string | null;
  /** Optional qualifier — mount adapters, what it is bundled with, etc. */
  note?: string;
};

export type GearSection = {
  id: string;
  title: string;
  /** Slug in the `equipment` media group, used as the section hero. */
  heroSlug?: string;
  blurb?: string;
  groups: { heading?: string; items: GearItem[] }[];
};

export const gear: GearSection[] = [
  {
    id: "kameraer",
    title: "Kameraer & optik",
    heroSlug: "main",
    blurb:
      "En Canon R7 som arbejdshest med et komplet RF-sæt, og en 600D der stadig går med som backup.",
    groups: [
      {
        heading: "Primært hus",
        items: [
          {
            brand: "Canon",
            model: "EOS R7",
            href: "https://www.kamerahuset.dk/canon-eos-r7-hus",
          },
        ],
      },
      {
        heading: "Objektiver",
        items: [
          {
            brand: "Canon",
            model: "RF 28-70mm F2,8 IS STM",
            href: "https://www.cotswoldcameras.com/Canon-RF-28-70mm-f-28-IS-STM-Lens",
          },
          {
            brand: "Canon",
            model: "EF 70-200mm F4L USM",
            href: "https://www.canon.dk/store/canon-ef-70-200mm-f-4l-usm-lens/2578A009/",
            note: "EF til RF adapter",
          },
          {
            brand: "Canon",
            model: "EF-S 10-18mm F4-5,6 IS STM",
            href: "https://web-tronic.dk/da/item/categoryitem/WEB21449-001",
            note: "EF til RF adapter",
          },
          {
            brand: "Canon",
            model: "RF-S 18-150mm F3,5-6,3 IS STM",
            href: "https://www.kamerahuset.dk/canon-rf-s-18-150mm-f3-5-6-3-is-stm",
            note: "Kit",
          },
          {
            brand: "Canon",
            model: "RF 35mm F1.8 Macro IS STM",
            href: "https://www.kamerahuset.dk/canon-rf-35mm-f-1-8-is-stm-macro",
          },
          {
            brand: "Canon",
            model: "RF 50mm F1.8 STM",
            href: "https://www.kamerahuset.dk/canon-rf-50mm-f-1-8-stm-inkl-carl-zeiss-lens-cleaner",
          },
        ],
      },
      {
        heading: "Backup hus",
        items: [
          {
            brand: "Canon",
            model: "EOS 600D",
            href: "https://www.canon.dk/for_home/product_finder/cameras/digital_slr/eos_600d/",
          },
          {
            brand: "Canon",
            model: "EF-S 18-55mm F3,5-5,6 IS II",
            href: "https://www.dustinhome.dk/product/5010598679/ef-s-18-5535-56-is-ii",
          },
        ],
      },
    ],
  },
  {
    id: "videorig",
    title: "Video rig",
    heroSlug: "videorig",
    blurb:
      "R7'eren bygget op som en rigtig videokrop — cage, tophåndtag, ekstern monitor og V-mount strøm til begge dele.",
    groups: [
      {
        heading: "Cage, montering & håndtag",
        items: [
          {
            brand: "SmallRig",
            model: "Black Mamba Cage for Canon EOS R7",
            href: "https://www.kamerahuset.dk/smallrig-4003-black-mamba-cage-for-canon-eos-r7",
            note: "4003",
          },
          {
            brand: "SmallRig",
            model: "ARRI Locating Top Handle",
            href: "https://www.kamerahuset.dk/smallrig-3765-arri-locating-top-handle",
            note: "3765",
          },
          {
            brand: "SmallRig",
            model: "Swivel and Tilt Adjustable Monitor Mount",
            href: "https://www.kamerahuset.dk/smallrig-2903b-swivel-and-tilt-monitor-mount-w-arri-pins",
            note: "2903",
          },
          {
            brand: "SmallRig",
            model: "Side Handle Wooden Nato",
            href: "https://www.kamerahuset.dk/smallrig-2187-side-handle-wooden-nato",
            note: "2187",
          },
          {
            brand: "SmallRig",
            model: "HDMI & USB-C Cable Clamp",
            href: "https://www.kamerahuset.dk/smallrig-4272-cable-clamp-hdmi-usb-c-black-mamba-for-canon-eos-r5-r5c-r6-r7-r10",
            note: "4272",
          },
          {
            brand: "SmallRig",
            model: "V-Mount Battery Plate",
            href: "https://www.kamerahuset.dk/smallrig-2988-battery-plate-v-mount",
            note: "2988",
          },
          {
            brand: "SmallRig",
            model: "15cm Carbon Fiber Rod Set 15mm",
            href: "https://www.kamerahuset.dk/smallrig-1872-15mm-carbon-fiber-rod-15cm",
            note: "1872",
          },
          {
            brand: "SmallRig",
            model: "Baseplate 15mm Rod Clamp",
            href: "https://www.kamerahuset.dk/smallrig-1674-baseplate-with-15mm-rod-clamp",
            note: "1674",
          },
        ],
      },
      {
        heading: "Strøm & monitor",
        items: [
          {
            brand: "SmallRig",
            model: "VB99 V-mount batteri",
            href: "https://www.kamerahuset.dk/smallrig-3580-v-mount-batteri-vb99",
            note: "3580 — dummy battery til monitor & kamera",
          },
          {
            brand: "Feelworld",
            model: 'F5 PROX 5,5"',
            href: "https://www.flashfotovideo.dk/varemaerker/feelworld/35528-55-f5-prox-hdmi-touchscreen-monitor",
            note: "Med sun box",
          },
        ],
      },
      {
        heading: "Stabilisering",
        items: [
          {
            brand: "DJI",
            model: "Ronin-S",
            // The old site linked this to a Canon kit lens by mistake; left
            // unlinked until we have the right product page.
            href: null,
          },
        ],
      },
    ],
  },
  {
    id: "filtre",
    title: "Filtre",
    heroSlug: "videoeqp",
    blurb:
      "Magnetisk filtersystem i 82mm med step-down ringe, så det samme sæt passer på hele optikken.",
    groups: [
      {
        items: [
          {
            brand: "K&F Concept",
            model: "ND2-ND400 VND & Black Diffusion 1/4, 82mm",
            href: "https://dk.kentfaith.com/KF01.2024_82-mm-black-mist-1-4-nd2-400-variabelt-nd-filter-med-dobbeltsidet-28-lags-antirefleks-gr%C3%B8n-film-og-h%C3%A5ndtag-nano-x-serien",
            note: "Med step-down ringe til alle objektiver",
          },
          {
            brand: "K&F Concept",
            model: "CPL magnetisk cirkulær polarisator, 82mm",
            href: "https://dk.kentfaith.com/SKU.1708_82-mm-cpl-magnetisk-linsefilter-hd-vandt%C3%A6t-ridsefast-antirefleks-nano-x-serien",
            note: "Nano X, 28 lags coating",
          },
          {
            brand: "K&F Concept",
            model: "Variabel ND2-ND32 magnetisk, 82mm",
            href: "https://dk.kentfaith.com/KF01.1854_82-mm-magnetisk-variabel-nd2-32-linsefiltre",
            note: "5 stop, Nano X",
          },
          {
            brand: "K&F Concept",
            model: "Magnetisk adapterring 67mm til 82mm",
            href: "https://dk.kentfaith.com/KF05.304_67-mm-82-mm-magnetisk-linsefilteradapterring",
            note: "2 stk.",
          },
          {
            brand: "K&F Concept",
            model: "Magnetisk adapterring 55mm til 82mm",
            href: "https://dk.kentfaith.com/KF05.301_55-mm-82-mm-magnetisk-linsefilteradapterring",
          },
        ],
      },
    ],
  },
  {
    id: "lys",
    title: "Lys",
    heroSlug: "lights",
    blurb: "Flash med trådløs styring, LED til video, og et par hårde kilder når der skal skæres.",
    groups: [
      {
        items: [
          {
            brand: "CULight",
            model: "FR 60C 2.4 GHz flash",
            href: "https://www.galaxiastore.it/borse-treppiedi-flash/2043-cullmann-culight-fr-60c-flash-e-ttl-ii-con-controllo-remoto-integrato-ng-60-canon-61310.html",
            note: "Med softbox",
          },
          {
            brand: "CULight",
            model: "RT 500C flash sender",
            href: "https://hhcdistribution.dk/cullmann-rt500c-sender-canon/",
          },
          {
            brand: "Falcon Eyes",
            model: "RL-18V pocket light",
            href: "https://www.falconeyeshk.com/product-page/rl-18v",
            note: "Uden batteri",
          },
          {
            brand: "DÖRR",
            model: "SL-480 LED ringlys",
            href: "https://hhcdistribution.dk/dorr-373462-led-sl-480-ring-lys-65w/",
            note: "Uden batteri",
          },
          { brand: "—", model: "5-i-1 lysreflektor", href: null },
          { brand: "—", model: "Hårde arbejdslamper", href: null, note: "4 stk." },
        ],
      },
    ],
  },
  {
    id: "stativer",
    title: "Stativer & montering",
    heroSlug: "tripods",
    groups: [
      {
        items: [
          {
            brand: "Velbon",
            model: "EX-530",
            href: "https://www.proshop.dk/Stativ/Velbon-EX-Series-EX-530/2479968",
          },
          {
            brand: "SmallRig",
            model: "Heavy-Duty Fluid Head Video Tripod Kit AD-01S",
            href: "https://www.focusnordic.dk/produkter/video/stativer/stativkits/smallrig-4686-heavy-duty-fluid-head-video-tripod-kit-ad-01s",
            note: "4686",
          },
          {
            brand: "DÖRR",
            model: "LS-2000 lampestativ",
            href: "https://www.bechfoto.dk/d-rr-ls-2000-lampestativ-basis.html",
          },
          { brand: "—", model: "LS-2000 kopier", href: null, note: "2 stk." },
        ],
      },
    ],
  },
  {
    id: "lyd",
    title: "Lyd",
    heroSlug: "audio",
    blurb: "Trådløst til interview og reportage, shotgun på kameraet når rummet skal med.",
    groups: [
      {
        items: [
          {
            brand: "Røde",
            model: "Wireless Me",
            href: "https://rode.com/en/microphones/wireless/wireless-me",
            note: "Sender & modtager",
          },
          {
            brand: "Røde",
            model: "Lavalier GO",
            href: "https://rode.com/en/microphones/lavalier-wearable/lavalier-go?variant_sku=LAVGO",
          },
          {
            brand: "Røde",
            model: "VideoMic Pro+",
            href: "https://www.scandinavianphoto.dk/rode/videomic-pro-med-rycote-lyre-1035399",
            note: "Med Rycote Lyre",
          },
        ],
      },
    ],
  },
];

/** Total line count, shown as a stat on the page. */
export const gearCount = gear.reduce(
  (n, s) => n + s.groups.reduce((m, g) => m + g.items.length, 0),
  0,
);
