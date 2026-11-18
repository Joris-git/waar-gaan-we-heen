/* Instellingen voor het codescherm. Pas hier gerust iets aan. */
window.KLUIS = {
  // Hash van de juiste code. Wordt gezet door tools/kluis-instellen.mjs.
  codeHash: '4e9829c474620f27affdf492dee5b315bc15eea17d1533ec54b3b417881ffcc6',

  // De film, versleuteld met de code. Zo staat de link nergens leesbaar.
  // Instellen of wijzigen: node tools/kluis-instellen.mjs "12.3456, -7.8901" "https://youtu.be/..."
  filmGeheim: '2UhhHo8wFiU2vfBp1dFJfEg39IDxU2PaZw==',

  // Reserve als filmGeheim leeg is: een bestand in de map film/ (alleen voor lokaal spelen).
  film: 'film/onthulling.mp4',

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
