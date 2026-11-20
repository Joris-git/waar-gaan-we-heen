/* Instellingen voor het codescherm. Pas hier gerust iets aan. */
window.KLUIS = {
  // Hash van de juiste code. Wordt gezet door tools/kluis-instellen.mjs.
  codeHash: '4e9829c474620f27affdf492dee5b315bc15eea17d1533ec54b3b417881ffcc6',

  // De film, versleuteld met de code. Zo staat de link nergens leesbaar.
  // Instellen of wijzigen: node tools/kluis-instellen.mjs "12.3456, -7.8901" "https://youtu.be/..."
  filmGeheim: '2UhhHo8wFiU2vfBp1dFJfEg39IDxU2PaZw==',

  // Reserve als filmGeheim leeg is: een bestand in de map film/ (alleen voor lokaal spelen).
  film: 'film/onthulling.mp4',

  // Tekst van het eindscherm, versleuteld met de code.
  // Instellen: node tools/eindscherm-instellen.mjs "12.3456, -7.8901" eindscherm.json
  eindGeheim: 'jttoBGkaBpxtFsJr1vk2Z1++7/vosjPd5OPhSZfM0IM3xZ7GAHqwsQwhtO/hPfWeAR2LmXCMoMLRxSfJ0KZ9qWzuJpwELpPm65bVMrm/8zG8a3i6E66VQa226fODc8o/j3aAsbvfuUc556z1aPLqK8MXfRtLs8PMW2BZ1toMk4opOgkcF5jflAeaWsWnfDZvK1unUOgfIjkSpElFW0ZutBkVewBPwy4lGipxtc23evSizCipiqKyi2S23Hp216dbMZt5xCGPT8CAMGRRomvkeBh7CVBZZu457VZKZWie7Ui/3MMP7VXOlOKnh5pwpcwogLD3zkD3yPLtqvfH7yr2q6omX+5AjJEoGnP5krd4bfljKhrOqRRtTLibVC2W/8AAiK+DHij7ilOw/NQ=',

  // Muziek op het eindscherm (YouTube). start = seconde waarop het nummer begint, volume 0 t/m 100.
  // Zet youtube op '' om geen muziek te spelen.
  // Muziek op het eindscherm (YouTube). Reclame vooraf kan YouTube zelf toevoegen; overslaan kan in de speler.
  // start = seconde waarop het nummer begint, volume 0 t/m 100. youtube: '' = geen muziek.
  eindMuziek: { youtube: 'dLhFDYQHDQY', titel: 'Hangover', start: 0, volume: 70 },

  // Rondvlucht over de kaart voordat de pin valt. De eerste plek is het vertrekpunt.
  route: [
    { naam: 'Amsterdam', lat: 52.3676, lon: 4.9041 },
    { naam: 'Bratislava', lat: 48.1486, lon: 17.1077 },
    { naam: 'Sofia', lat: 42.6977, lon: 23.3219 },
    { naam: 'Athene', lat: 37.9838, lon: 23.7275 },
    { naam: 'Palermo', lat: 38.1157, lon: 13.3615 },
    { naam: 'Rome', lat: 41.9028, lon: 12.4964 },
    { naam: 'Londen', lat: 51.5072, lon: -0.1276 }
  ],

  // Wachtscherm: typ dit wachtwoord om de kluiskraker te starten (alleen de hash staat hier).
  // Wijzigen: node tools/wachtwoord-instellen.mjs "nieuwwachtwoord". Leeg = geen wachtscherm.
  wachtwoordHash: '40ff1637c0153f7b167157509de4ab6bb905405d1d04d06823c0985c33a54990',

  // Briefing na het wachtscherm. Elke regel verschijnt los, alsof hij wordt ingetikt. Pas gerust aan.
  briefing: [
    'Heren. Luister goed.',
    'Achter deze kluis zit jullie bestemming. De hele wereld wacht. Nou ja, wij in ieder geval.',
    'Ieder van jullie krijgt één envelop. In elke envelop zit één stukje van de code.',
    'Alleen samen kraken jullie hem. Rekenen, overleggen, en niet stiekem afkijken.',
    'Het gaat jullie lukken. Zelfs met deze apen bij elkaar.',
    'Wij hebben vertrouwen in jullie. Het hangt wel helemaal van jullie af.',
    'Veel succes. De klok tikt.'
  ],
  briefingAfzender: 'Missiecontrole · Joris en Nando',

  // Hoe lang het aftellen duurt, in seconden.
  aftellen: 15,

  // Wie welke envelop heeft, in de volgorde van de vakjes 1 t/m 7.
  enveloppen: ['Bob', 'Martijn', 'Kevin', 'Tjeerd', 'Niels', 'Alexander', 'Marten'],

  // Teksten bij een foute code. Bij elke poging komt de volgende.
  foutTeksten: [
    'De kluis herkent deze code niet. Kijk nog eens goed naar de enveloppen.',
    'Weer mis. Iemand heeft verkeerd gerekend. Wie was dat?',
    'Nog steeds niet. Lees de opdrachten nog een keer hardop voor, één voor één.',
    'De kluis begint te twijfelen aan jullie. Rustig aan, controleer elk vakje.',
    'Het blijft fout. Joris en Nando kijken mee. Vraag ze om een hint.'
  ]
};
