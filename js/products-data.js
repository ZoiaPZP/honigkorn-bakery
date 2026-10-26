// Product catalogue, EU allergens and cake builder options.
// Product texts are registered in window.I18N under "<id>.<field>" (e.g. "p1.long"),
// so they switch language together with the rest of the page.
// All ingredient and allergen information is fictional (demo).
window.BakeryData = (function () {
  'use strict';

  const products = [
    {
      id: 'p1', category: 'brot', price: 5.20, image: 'images/products/honigkorn-laib',
      allergens: ['gluten'], traces: ['nuts', 'sesame', 'soy'],
      de: {
        long: 'Unser Hausbrot: ein milder Dinkel-Sauerteig, der 24 Stunden reift und mit Waldhonig vom Imker aus Fischbach abgerundet wird. Haferflocken und Sonnenblumenkerne sorgen für eine saftige Krume – das Brot bleibt drei bis vier Tage frisch.',
        weight: '750 g',
        ingredients: 'Dinkelmehl Type 630, Wasser, Dinkelvollkornmehl, Haferflocken, Sonnenblumenkerne, Waldhonig (4 %), Sauerteig (Roggenmehl, Wasser), Meersalz, Hefe.'
      },
      en: {
        long: 'Our signature loaf: a mild spelt sourdough that matures for 24 hours and is rounded off with forest honey from a beekeeper in Fischbach. Oat flakes and sunflower seeds keep the crumb moist – it stays fresh for three to four days.',
        weight: '750 g',
        ingredients: 'Spelt flour type 630, water, wholegrain spelt flour, oat flakes, sunflower seeds, forest honey (4%), sourdough (rye flour, water), sea salt, yeast.'
      }
    },
    {
      id: 'p2', category: 'brot', price: 4.80, image: 'images/products/bauernbrot',
      allergens: ['gluten'], traces: ['sesame', 'soy'],
      de: {
        long: 'Ein kräftiges Roggenmischbrot nach Taunus-Art: Der Roggensauerteig reift 48 Stunden, gebacken wird auf Stein bei hoher Hitze. Das Ergebnis ist eine dunkle, aromatische Kruste und eine feste, würzige Krume.',
        weight: '1000 g',
        ingredients: 'Roggenmehl Type 1150, Wasser, Weizenmehl Type 1050, Roggensauerteig, Meersalz, Brotgewürz (Kümmel, Koriander, Fenchel).'
      },
      en: {
        long: 'A hearty Taunus-style rye-wheat bread: the rye sourdough matures for 48 hours and the loaf is baked on stone at high heat. The result is a dark, aromatic crust and a firm, well-spiced crumb.',
        weight: '1000 g',
        ingredients: 'Rye flour type 1150, water, wheat flour type 1050, rye sourdough, sea salt, bread spices (caraway, coriander, fennel).'
      }
    },
    {
      id: 'p3', category: 'broetchen', price: 0.55, image: 'images/products/kaiserbroetchen',
      allergens: ['gluten'], traces: ['sesame', 'milk'],
      de: {
        long: 'Das klassische Frühstücksbrötchen mit dem typischen Sternmuster. Der Teig ruht über Nacht, deshalb ist die Kruste besonders knusprig und das Innere luftig-weich.',
        weight: '1 Stück, ca. 60 g',
        ingredients: 'Weizenmehl Type 550, Wasser, Hefe, Meersalz, Rapsöl, Gerstenmalzmehl.'
      },
      en: {
        long: 'The classic breakfast roll with its typical star pattern. The dough rests overnight, which makes the crust extra crisp and the inside light and soft.',
        weight: '1 roll, approx. 60 g',
        ingredients: 'Wheat flour type 550, water, yeast, sea salt, rapeseed oil, barley malt flour.'
      }
    },
    {
      id: 'p4', category: 'broetchen', price: 0.95, image: 'images/products/laugenbrezel',
      allergens: ['gluten', 'milk'], traces: ['sesame'],
      de: {
        long: 'Von Hand geschlungen, kurz in Lauge getaucht und mit grobem Salz bestreut: außen glänzend und kräftig, innen weich – mit dem typisch dünnen, knusprigen Ärmchen.',
        weight: '1 Stück, ca. 90 g',
        ingredients: 'Weizenmehl Type 550, Wasser, Butter, Hefe, Meersalz, Brezelsalz, Gerstenmalz, Natronlauge (Lebensmittelqualität).'
      },
      en: {
        long: 'Twisted by hand, briefly dipped in lye and sprinkled with coarse salt: glossy and hearty outside, soft inside – with the typical thin, crunchy arms.',
        weight: '1 pretzel, approx. 90 g',
        ingredients: 'Wheat flour type 550, water, butter, yeast, sea salt, pretzel salt, barley malt, food-grade lye.'
      }
    },
    {
      id: 'p5', category: 'suesses', price: 1.80, image: 'images/products/croissant',
      allergens: ['gluten', 'milk', 'eggs'], traces: ['nuts', 'soy'],
      de: {
        long: 'Drei Tage Arbeit für 27 hauchdünne Schichten: Der Teig wird mit französischer Butter tourniert, kalt geführt und morgens frisch gebacken. Außen splitterzart, innen wabig und buttrig.',
        weight: '1 Stück, ca. 70 g',
        ingredients: 'Weizenmehl Type 550, Butter (28 %), Wasser, Vollmilch, Zucker, Hefe, Eigelb, Meersalz.'
      },
      en: {
        long: 'Three days of work for 27 paper-thin layers: the dough is laminated with French butter, rested cold and baked fresh every morning. Shatteringly crisp outside, open and buttery inside.',
        weight: '1 piece, approx. 70 g',
        ingredients: 'Wheat flour type 550, butter (28%), water, whole milk, sugar, yeast, egg yolk, sea salt.'
      }
    },
    {
      id: 'p6', category: 'suesses', price: 2.40, image: 'images/products/zimtschnecke',
      allergens: ['gluten', 'milk', 'eggs'], traces: ['nuts'],
      de: {
        long: 'Weicher Hefeteig, großzügig mit Zimt und braunem Zucker gerollt und noch warm mit einer Frischkäse-Vanille-Glasur überzogen. Am besten am selben Tag genießen.',
        weight: '1 Stück, ca. 110 g',
        ingredients: 'Weizenmehl, Vollmilch, Butter, brauner Zucker, Zucker, Eier, Hefe, Zimt (1,5 %), Puderzucker, Frischkäse, Vanille, Salz.'
      },
      en: {
        long: 'Soft yeast dough, generously rolled with cinnamon and brown sugar and topped while still warm with a cream cheese and vanilla glaze. Best enjoyed the same day.',
        weight: '1 piece, approx. 110 g',
        ingredients: 'Wheat flour, whole milk, butter, brown sugar, sugar, eggs, yeast, cinnamon (1.5%), icing sugar, cream cheese, vanilla, salt.'
      }
    },
    {
      id: 'p7', category: 'torten', price: 3.90, image: 'images/products/frankfurter-kranz',
      allergens: ['gluten', 'milk', 'eggs', 'nuts'], traces: ['soy', 'peanuts'],
      de: {
        long: 'Der hessische Klassiker: ein Kranz aus Buttersandmasse, dreimal geschnitten und mit Vanille-Buttercreme und Johannisbeergelee gefüllt, rundum mit hausgemachtem Haselnusskrokant und Belegkirschen.',
        weight: '1 Stück, ca. 140 g',
        ingredients: 'Butter, Zucker, Weizenmehl, Eier, Haselnusskrokant (Haselnüsse, Zucker), Johannisbeergelee, Vollmilch, Speisestärke, Belegkirschen (Kirschen, Zucker, Farbstoff Anthocyane), Vanille, Backpulver.'
      },
      en: {
        long: 'The Hessian classic: a ring of butter sponge, cut into three layers and filled with vanilla buttercream and redcurrant jelly, coated all over with homemade hazelnut brittle and glacé cherries.',
        weight: '1 slice, approx. 140 g',
        ingredients: 'Butter, sugar, wheat flour, eggs, hazelnut brittle (hazelnuts, sugar), redcurrant jelly, whole milk, corn starch, glacé cherries (cherries, sugar, colour: anthocyanins), vanilla, baking powder.'
      }
    },
    {
      id: 'p8', category: 'torten', price: 3.80, image: 'images/products/schwarzwaelder',
      allergens: ['gluten', 'milk', 'eggs', 'soy'], traces: ['nuts'],
      de: {
        long: 'Lockerer Schokoladenbiskuit, mit Kirschwasser beträufelt, Sauerkirschen und viel Sahne, verziert mit Zartbitter-Raspeln und einer Kirsche. Enthält Alkohol.',
        weight: '1 Stück, ca. 150 g',
        ingredients: 'Sahne, Sauerkirschen, Zucker, Weizenmehl, Eier, Kakao, Zartbitterschokolade (Kakaomasse, Zucker, Kakaobutter, Emulgator: Sojalecithin), Kirschwasser (2 %), Speisestärke, Gelatine, Vanille.'
      },
      en: {
        long: 'Light chocolate sponge drizzled with kirsch, sour cherries and plenty of cream, decorated with dark chocolate shavings and a cherry. Contains alcohol.',
        weight: '1 slice, approx. 150 g',
        ingredients: 'Cream, sour cherries, sugar, wheat flour, eggs, cocoa, dark chocolate (cocoa mass, sugar, cocoa butter, emulsifier: soy lecithin), kirsch (2%), corn starch, gelatine, vanilla.'
      }
    }
  ];

  // The 14 main allergens under EU Regulation 1169/2011 (Annex II), with simple line icons (24×24).
  const allergens = [
    { id: 'gluten', icon: '<path d="M12 21V8"/><path d="M12 12c-3 0-4.5-2-4.5-4.5C10.5 7.5 12 9.5 12 12zM12 12c3 0 4.5-2 4.5-4.5-3 0-4.5 2-4.5 4.5zM12 16.5c-3 0-4.5-2-4.5-4.5 3 0 4.5 2 4.5 4.5zM12 16.5c3 0 4.5-2 4.5-4.5-3 0-4.5 2-4.5 4.5zM12 7.5c-1.4-1-1.4-3.5 0-4.5 1.4 1 1.4 3.5 0 4.5z"/>' },
    { id: 'crustaceans', icon: '<path d="M19 9a7 7 0 1 0-5 9.5"/><path d="M14 18.5l1.5 2.5M14 18.5l3 .5"/><path d="M8 7.5l-2-3M11 6l-.5-3"/><path d="M9 11.5l2.5 2M7.5 14l3 1"/>' },
    { id: 'eggs', icon: '<path d="M12 3c3.5 0 6 5.5 6 10a6 6 0 0 1-12 0c0-4.5 2.5-10 6-10z"/>' },
    { id: 'fish', icon: '<path d="M3 12c3-4.5 9-6 14-2l4-3v10l-4-3c-5 4-11 2.5-14-2z"/><circle cx="8" cy="11" r=".6" fill="currentColor"/>' },
    { id: 'peanuts', icon: '<path d="M9 4.5a4 4 0 0 1 4.5 5.5 4 4 0 1 1-5.5 5.5A4 4 0 0 1 9 4.5z"/><path d="M8.5 9.5h.01M11 7.5h.01M13.5 15h.01M15.5 13h.01"/>' },
    { id: 'soy', icon: '<path d="M5 19c-1-6 3-13 12-15 1.5 6-4 13-12 15z"/><circle cx="10" cy="14" r="1.6"/><circle cx="13" cy="10.5" r="1.6"/>' },
    { id: 'milk', icon: '<path d="M9 3h6M9.5 3v3L7 9.5V20a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V9.5L14.5 6V3"/><path d="M7 13h10"/>' },
    { id: 'nuts', icon: '<path d="M5 10.5h14"/><path d="M6 10.5c0 6 3 10 6 10s6-4 6-10"/><path d="M6 10.5C6 7 8.5 5 12 5s6 2 6 5.5"/><path d="M12 5V3"/>' },
    { id: 'celery', icon: '<path d="M9 21c0-6 .5-10 1-13M15 21c0-6-.5-10-1-13M12 21V8"/><path d="M10 8c-3 0-4-2.5-3-5 2 .5 3 2 3 5zM14 8c3 0 4-2.5 3-5-2 .5-3 2-3 5zM12 8c-1.5-1.5-1.5-3.5 0-5 1.5 1.5 1.5 3.5 0 5z"/>' },
    { id: 'mustard', icon: '<path d="M8 8h8l1 12a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1z"/><path d="M9 8V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V8"/><path d="M8 13h8"/>' },
    { id: 'sesame', icon: '<ellipse cx="8" cy="8" rx="2" ry="3" transform="rotate(-30 8 8)"/><ellipse cx="16" cy="9" rx="2" ry="3" transform="rotate(25 16 9)"/><ellipse cx="11" cy="16" rx="2" ry="3" transform="rotate(10 11 16)"/>' },
    { id: 'sulphites', icon: '<path d="M8 3h8l-.5 6a3.5 3.5 0 0 1-7 0z"/><path d="M12 12.5V20M8.5 21h7"/><path d="M8.3 6.5h7.4"/>' },
    { id: 'lupin', icon: '<path d="M12 21V11"/><path d="M12 11c-2.5 0-3.5-1.5-3.5-3S10 5 12 3c2 2 3.5 3.5 3.5 5S14.5 11 12 11z"/><path d="M12 15c-2-1-4.5-1-6 1M12 15c2-1 4.5-1 6 1"/>' },
    { id: 'molluscs', icon: '<path d="M12 20c-5 0-8-3.5-8-7.5S7 4 12 4s8 4.5 8 8.5-3 7.5-8 7.5z"/><path d="M12 20V7M12 20l-5-11M12 20l5-11"/>' }
  ];

  const cake = {
    sizes: [
      { id: '18', price: 34, servings: '8–10', scale: 0.84 },
      { id: '22', price: 46, servings: '12–14', scale: 0.92 },
      { id: '26', price: 58, servings: '16–20', scale: 1 }
    ],
    sponges: [
      { id: 'vanilla', price: 0, color: '#F0CF8E' },
      { id: 'chocolate', price: 3, color: '#6B3F24' },
      { id: 'nut', price: 4, color: '#B98654' }
    ],
    creams: [
      { id: 'whipped', price: 0, color: '#FFFBF3' },
      { id: 'butter', price: 2, color: '#F6DFA4' },
      { id: 'cheese', price: 4, color: '#F7E4DC' }
    ],
    fillings: [
      { id: 'strawberry', price: 4, color: '#D9434B' },
      { id: 'raspberry', price: 5, color: '#C2386A' },
      { id: 'cherry', price: 4, color: '#8C1D2C' },
      { id: 'none', price: 0, color: null }
    ],
    inscriptionPrice: 3,
    textMax: 30,
    minDays: 3,
    maxDays: 30
  };

  function findById(list, id) {
    for (let i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function getProduct(id) { return findById(products, id); }

  // Returns null for anything that is not a complete, known cake configuration.
  function normalizeCake(cfg) {
    if (!cfg || typeof cfg !== 'object') return null;
    const size = findById(cake.sizes, cfg.size);
    const sponge = findById(cake.sponges, cfg.sponge);
    const cream = findById(cake.creams, cfg.cream);
    const filling = findById(cake.fillings, cfg.filling);
    if (!size || !sponge || !cream || !filling) return null;
    if (typeof cfg.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(cfg.date)) return null;
    const text = typeof cfg.text === 'string' ? cfg.text.trim().slice(0, cake.textMax) : '';
    return { size: size.id, sponge: sponge.id, cream: cream.id, filling: filling.id, text: text, date: cfg.date };
  }

  // Price only depends on the chosen options, so it also works before a date is picked.
  function cakePrice(cfg) {
    if (!cfg) return 0;
    const parts = [
      findById(cake.sizes, cfg.size),
      findById(cake.sponges, cfg.sponge),
      findById(cake.creams, cfg.cream),
      findById(cake.fillings, cfg.filling)
    ];
    if (parts.some(function (part) { return !part; })) return 0;
    const text = typeof cfg.text === 'string' ? cfg.text.trim() : '';
    return parts.reduce(function (sum, part) { return sum + part.price; }, 0) +
      (text ? cake.inscriptionPrice : 0);
  }

  // Register product texts with the translation dictionary.
  products.forEach(function (p) {
    ['de', 'en'].forEach(function (lang) {
      Object.keys(p[lang]).forEach(function (field) {
        window.I18N[lang][p.id + '.' + field] = p[lang][field];
      });
    });
  });

  return {
    products: products,
    allergens: allergens,
    cake: cake,
    getProduct: getProduct,
    findById: findById,
    normalizeCake: normalizeCake,
    cakePrice: cakePrice
  };
})();
