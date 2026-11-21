/**
 * Banque de questions du test d'aptitude - Admissions Lap Nomba Foundation.
 *
 * Objectif : évaluer le sérieux et la capacité de raisonnement des candidats
 * (16-25 ans, de la 3e à l'université), sans exiger de connaissances
 * informatiques préalables. 15 questions tirées au hasard, 20 minutes.
 *
 * Répartition : 14 logique, 12 calcul, 12 comprehension, 10 numerique.
 * Le champ `explanation` est réservé à l'équipe et n'est jamais montré aux candidats.
 */

export type AptitudeCategory = "logique" | "calcul" | "comprehension" | "numerique";

export interface AptitudeQuestionSeed {
  code: string; // stable unique id, e.g. "LOG-01"
  category: AptitudeCategory;
  difficulty: 1 | 2 | 3; // 1 easy, 3 hard
  prompt: string; // the question in French (may include a short text/sequence)
  choices: string[]; // exactly 4 choices
  answerIndex: number; // 0-3, index of the single correct choice
  explanation: string; // one sentence why (for staff, never shown to candidates)
}

export const APTITUDE_QUESTION_BANK: AptitudeQuestionSeed[] = [
  // ---------------------------------------------------------------------------
  // LOGIQUE (14)
  // ---------------------------------------------------------------------------
  {
    code: "LOG-01",
    category: "logique",
    difficulty: 1,
    prompt: "Quel nombre complète la suite : 2, 4, 6, 8, ... ?",
    choices: ["9", "10", "12", "16"],
    answerIndex: 1,
    explanation: "On ajoute 2 à chaque fois : 8 + 2 = 10.",
  },
  {
    code: "LOG-02",
    category: "logique",
    difficulty: 1,
    prompt: "Quel nombre complète la suite : 3, 6, 12, 24, ... ?",
    choices: ["36", "42", "48", "30"],
    answerIndex: 2,
    explanation: "Chaque nombre est multiplié par 2 : 24 x 2 = 48.",
  },
  {
    code: "LOG-03",
    category: "logique",
    difficulty: 1,
    prompt: "Quelle lettre complète la suite : A, C, E, G, ... ?",
    choices: ["I", "H", "J", "K"],
    answerIndex: 0,
    explanation: "On saute une lettre à chaque fois : après G vient H (sautée), puis I.",
  },
  {
    code: "LOG-04",
    category: "logique",
    difficulty: 1,
    prompt: "Stylo est à écrivain ce que marteau est à :",
    choices: ["clou", "bois", "atelier", "menuisier"],
    answerIndex: 3,
    explanation: "Le stylo est l'outil de l'écrivain, le marteau est l'outil du menuisier (seule personne parmi les choix).",
  },
  {
    code: "LOG-05",
    category: "logique",
    difficulty: 1,
    prompt:
      "Tous les élèves de la classe ont un cahier. Awa est une élève de cette classe. Que peut-on affirmer avec certitude ?",
    choices: [
      "On ne peut rien dire sur Awa",
      "Awa n'a pas de cahier",
      "Awa a plusieurs cahiers",
      "Awa a un cahier",
    ],
    answerIndex: 3,
    explanation: "Awa fait partie de la classe, et tous les élèves de la classe ont un cahier.",
  },
  {
    code: "LOG-06",
    category: "logique",
    difficulty: 2,
    prompt: "Quel nombre complète la suite : 1, 4, 9, 16, 25, ... ?",
    choices: ["35", "36", "30", "49"],
    answerIndex: 1,
    explanation: "Ce sont les carrés 1x1, 2x2, 3x3, 4x4, 5x5 ; le suivant est 6x6 = 36.",
  },
  {
    code: "LOG-07",
    category: "logique",
    difficulty: 2,
    prompt: "Quel nombre complète la suite : 5, 8, 12, 17, 23, ... ?",
    choices: ["30", "29", "31", "28"],
    answerIndex: 0,
    explanation: "Les écarts augmentent de 1 (+3, +4, +5, +6) ; le suivant est 23 + 7 = 30.",
  },
  {
    code: "LOG-08",
    category: "logique",
    difficulty: 2,
    prompt: "Quelle lettre complète la suite : B, E, H, K, ... ?",
    choices: ["L", "M", "O", "N"],
    answerIndex: 3,
    explanation: "On avance de 3 lettres à chaque fois : K + 3 = N (K, L, M, N).",
  },
  {
    code: "LOG-09",
    category: "logique",
    difficulty: 2,
    prompt:
      "Ibrahim est plus grand que Chantal. Chantal est plus grande que Boris. Qui est le plus petit des trois ?",
    choices: ["Ibrahim", "Boris", "Chantal", "On ne peut pas savoir"],
    answerIndex: 1,
    explanation: "L'ordre est Ibrahim > Chantal > Boris, donc Boris est le plus petit.",
  },
  {
    code: "LOG-10",
    category: "logique",
    difficulty: 2,
    prompt:
      "Tous les conducteurs de moto-taxi de ce quartier portent un casque. Samuel ne porte pas de casque. Que peut-on conclure avec certitude ?",
    choices: [
      "Samuel ne conduit pas de moto-taxi dans ce quartier",
      "Samuel conduit une moto-taxi dans ce quartier",
      "Samuel a perdu son casque dans ce quartier",
      "Samuel n'habite pas du tout dans ce quartier",
    ],
    answerIndex: 0,
    explanation: "S'il était conducteur de moto-taxi du quartier, il porterait un casque ; les autres affirmations ne sont pas prouvées.",
  },
  {
    code: "LOG-11",
    category: "logique",
    difficulty: 2,
    prompt: "Doigt est à main ce que orteil est à :",
    choices: ["jambe", "ongle", "pied", "genou"],
    answerIndex: 2,
    explanation: "Le doigt fait partie de la main comme l'orteil fait partie du pied.",
  },
  {
    code: "LOG-12",
    category: "logique",
    difficulty: 3,
    prompt: "Si avant-hier était lundi, quel jour serons-nous après-demain ?",
    choices: ["Jeudi", "Samedi", "Mercredi", "Vendredi"],
    answerIndex: 3,
    explanation: "Avant-hier lundi, donc aujourd'hui mercredi, et après-demain vendredi.",
  },
  {
    code: "LOG-13",
    category: "logique",
    difficulty: 3,
    prompt: "Quel nombre complète la suite : 2, 3, 5, 9, 17, ... ?",
    choices: ["25", "31", "33", "34"],
    answerIndex: 2,
    explanation: "Les écarts doublent (+1, +2, +4, +8) ; le suivant est 17 + 16 = 33.",
  },
  {
    code: "LOG-14",
    category: "logique",
    difficulty: 3,
    prompt:
      "Quatre amis font la queue devant un guichet. David est le premier de la file. Aïcha est devant Bertrand. Clarisse est derrière Bertrand. Qui est le dernier de la file ?",
    choices: ["Clarisse", "Aïcha", "Bertrand", "David"],
    answerIndex: 0,
    explanation: "David est 1er ; il reste Aïcha, puis Bertrand, puis Clarisse, qui est donc dernière.",
  },

  // ---------------------------------------------------------------------------
  // CALCUL (12)
  // ---------------------------------------------------------------------------
  {
    code: "CAL-01",
    category: "calcul",
    difficulty: 1,
    prompt: "Un cahier coûte 250 FCFA. Combien coûtent 4 cahiers ?",
    choices: ["1 000 FCFA", "750 FCFA", "1 250 FCFA", "900 FCFA"],
    answerIndex: 0,
    explanation: "4 x 250 = 1 000 FCFA.",
  },
  {
    code: "CAL-02",
    category: "calcul",
    difficulty: 1,
    prompt:
      "Marie a 5 000 FCFA. Au marché, elle achète du pain à 1 500 FCFA et du lait à 1 200 FCFA. Combien lui reste-t-il ?",
    choices: ["2 700 FCFA", "3 500 FCFA", "1 300 FCFA", "2 300 FCFA"],
    answerIndex: 3,
    explanation: "Elle dépense 1 500 + 1 200 = 2 700 FCFA, il reste 5 000 - 2 700 = 2 300 FCFA.",
  },
  {
    code: "CAL-03",
    category: "calcul",
    difficulty: 1,
    prompt: "Combien de pièces de 50 FCFA faut-il pour faire 1 000 FCFA ?",
    choices: ["10", "20", "50", "200"],
    answerIndex: 1,
    explanation: "1 000 / 50 = 20 pièces.",
  },
  {
    code: "CAL-04",
    category: "calcul",
    difficulty: 1,
    prompt: "Combien font 10 % de 8 000 FCFA ?",
    choices: ["80 FCFA", "400 FCFA", "800 FCFA", "1 000 FCFA"],
    answerIndex: 2,
    explanation: "10 % revient à diviser par 10 : 8 000 / 10 = 800 FCFA.",
  },
  {
    code: "CAL-05",
    category: "calcul",
    difficulty: 1,
    prompt:
      "Un car part de Yaoundé à 8 h 15 et arrive à Douala 3 h 45 plus tard. À quelle heure arrive-t-il ?",
    choices: ["11 h 30", "12 h 00", "12 h 15", "11 h 45"],
    answerIndex: 1,
    explanation: "8 h 15 + 3 h = 11 h 15, puis + 45 min = 12 h 00.",
  },
  {
    code: "CAL-06",
    category: "calcul",
    difficulty: 2,
    prompt:
      "Une chemise coûte 6 000 FCFA. Le commerçant accorde une réduction de 25 %. Quel est le nouveau prix ?",
    choices: ["4 500 FCFA", "5 750 FCFA", "1 500 FCFA", "4 000 FCFA"],
    answerIndex: 0,
    explanation: "25 % de 6 000 = 1 500 FCFA de réduction, donc 6 000 - 1 500 = 4 500 FCFA.",
  },
  {
    code: "CAL-07",
    category: "calcul",
    difficulty: 2,
    prompt: "3 kg de riz coûtent 1 800 FCFA. Combien coûtent 5 kg du même riz ?",
    choices: ["2 500 FCFA", "3 600 FCFA", "2 700 FCFA", "3 000 FCFA"],
    answerIndex: 3,
    explanation: "1 kg coûte 1 800 / 3 = 600 FCFA, donc 5 kg coûtent 5 x 600 = 3 000 FCFA.",
  },
  {
    code: "CAL-08",
    category: "calcul",
    difficulty: 2,
    prompt:
      "Dans une classe de 40 élèves, 3 élèves sur 5 sont des filles. Combien y a-t-il de garçons ?",
    choices: ["24", "15", "16", "20"],
    answerIndex: 2,
    explanation: "Filles : 40 x 3/5 = 24, donc garçons : 40 - 24 = 16.",
  },
  {
    code: "CAL-09",
    category: "calcul",
    difficulty: 2,
    prompt:
      "Une course en moto-taxi coûte 300 FCFA. Jean fait un aller et un retour chaque jour, du lundi au vendredi. Combien dépense-t-il en moto-taxi par semaine ?",
    choices: ["1 500 FCFA", "2 100 FCFA", "3 000 FCFA", "4 200 FCFA"],
    answerIndex: 2,
    explanation: "2 courses x 300 FCFA = 600 FCFA par jour, x 5 jours = 3 000 FCFA.",
  },
  {
    code: "CAL-10",
    category: "calcul",
    difficulty: 2,
    prompt:
      "Un car roule à la vitesse constante de 60 km par heure. Combien de temps met-il pour parcourir 150 km ?",
    choices: ["2 h 30", "2 h 50", "2 h 15", "3 h 00"],
    answerIndex: 0,
    explanation: "150 / 60 = 2,5 heures, soit 2 h 30.",
  },
  {
    code: "CAL-11",
    category: "calcul",
    difficulty: 3,
    prompt:
      "Un commerçant achète un article 4 000 FCFA et le revend 5 000 FCFA. Quel est son bénéfice en pourcentage du prix d'achat ?",
    choices: ["20 %", "25 %", "30 %", "10 %"],
    answerIndex: 1,
    explanation: "Bénéfice de 1 000 FCFA sur 4 000 FCFA d'achat : 1 000 / 4 000 = 25 %.",
  },
  {
    code: "CAL-12",
    category: "calcul",
    difficulty: 3,
    prompt:
      "Un maçon seul construit un mur en 6 jours. Combien de jours faut-il à 3 maçons travaillant au même rythme pour construire le même mur ?",
    choices: ["18", "3", "9", "2"],
    answerIndex: 3,
    explanation: "Le travail représente 6 jours pour un maçon ; à 3, il faut 6 / 3 = 2 jours.",
  },

  // ---------------------------------------------------------------------------
  // COMPREHENSION (12)
  // ---------------------------------------------------------------------------
  {
    code: "COM-01",
    category: "comprehension",
    difficulty: 1,
    prompt:
      "Lisez le texte : « Chaque samedi, Nadège aide sa mère à vendre des beignets au marché. Elles se lèvent à 5 heures pour préparer la pâte. À midi, tout est généralement vendu. »\nQue vendent Nadège et sa mère ?",
    choices: ["Du pain", "Des beignets", "Des fruits", "Du poisson"],
    answerIndex: 1,
    explanation: "Le texte dit qu'elles vendent des beignets au marché.",
  },
  {
    code: "COM-02",
    category: "comprehension",
    difficulty: 1,
    prompt:
      "Lisez le texte : « Le centre de santé du quartier est ouvert du lundi au vendredi, de 8 h à 17 h. Le samedi, il ouvre seulement le matin. Il est fermé le dimanche. »\nGaëlle veut y aller un samedi à 15 h. Que va-t-elle trouver ?",
    choices: [
      "Le centre sera ouvert",
      "Le centre ouvrira à 17 h",
      "Le centre sera ouvert jusqu'à 17 h",
      "Le centre sera fermé",
    ],
    answerIndex: 3,
    explanation: "Le samedi, le centre n'ouvre que le matin, donc il est fermé à 15 h.",
  },
  {
    code: "COM-03",
    category: "comprehension",
    difficulty: 1,
    prompt:
      "Lisez le texte : « Boire assez d'eau est important pour la santé. L'eau aide le corps à garder une bonne température et à éliminer les déchets. Quand il fait chaud, il faut boire encore plus. »\nQuelle est l'idée principale du texte ?",
    choices: [
      "L'eau est importante pour la santé du corps",
      "Il fait toujours très chaud en saison sèche",
      "Il faut boire seulement quand il fait chaud",
      "L'eau du robinet est toujours dangereuse",
    ],
    answerIndex: 0,
    explanation: "Tout le texte explique pourquoi l'eau est importante pour la santé.",
  },
  {
    code: "COM-04",
    category: "comprehension",
    difficulty: 1,
    prompt:
      "Lisez le texte : « Ce matin, le marché était bondé : on pouvait à peine avancer entre les étals tant il y avait de monde. Rosine a mis une heure pour acheter ses tomates. »\nDans ce texte, le mot « bondé » signifie :",
    choices: ["presque vide", "fermé pour la journée", "très rempli de monde", "très propre"],
    answerIndex: 2,
    explanation: "La suite de la phrase précise qu'il y avait tellement de monde qu'on pouvait à peine avancer.",
  },
  {
    code: "COM-05",
    category: "comprehension",
    difficulty: 1,
    prompt:
      "Lisez le texte : « Kevin voulait aller au cinéma avec ses amis. Mais il a d'abord terminé ses devoirs, comme sa mère le lui avait demandé. Quand il est arrivé, le film avait déjà commencé. »\nPourquoi Kevin a-t-il manqué le début du film ?",
    choices: [
      "Il n'avait pas assez d'argent",
      "Ses amis sont partis sans lui",
      "Il a d'abord terminé ses devoirs",
      "Le cinéma était fermé ce jour-là",
    ],
    answerIndex: 2,
    explanation: "Le texte indique qu'il a terminé ses devoirs avant de partir, ce qui l'a mis en retard.",
  },
  {
    code: "COM-06",
    category: "comprehension",
    difficulty: 2,
    prompt:
      "Lisez le texte : « Quand Brice est arrivé à l'arrêt, le bus s'éloignait déjà. Il a regardé sa montre, a soupiré, puis s'est assis sur le banc pour attendre le suivant. »\nQue peut-on déduire de ce texte ?",
    choices: [
      "Brice est arrivé en avance",
      "Brice a décidé de rentrer chez lui",
      "Brice n'aime pas prendre le bus",
      "Brice a raté son bus",
    ],
    answerIndex: 3,
    explanation: "Le bus partait à son arrivée et il attend le suivant : il a donc raté le sien.",
  },
  {
    code: "COM-07",
    category: "comprehension",
    difficulty: 2,
    prompt:
      "Lisez le texte : « Le cacao est l'une des principales cultures du Cameroun. Les fèves sont récoltées, fermentées, puis séchées au soleil avant d'être vendues. Une grande partie est exportée vers l'Europe, où elle sert à fabriquer du chocolat. »\nD'après le texte, quelle étape vient juste avant le séchage des fèves ?",
    choices: [
      "Elles sont vendues",
      "Elles sont fermentées",
      "Elles sont exportées",
      "Elles sont transformées",
    ],
    answerIndex: 1,
    explanation: "L'ordre donné est : récoltées, fermentées, puis séchées.",
  },
  {
    code: "COM-08",
    category: "comprehension",
    difficulty: 2,
    prompt:
      "Lisez le texte : « Après plusieurs échecs, Aurélie n'a pas abandonné. Elle a persévéré, a révisé chaque soir et a finalement réussi son examen. »\nDans ce texte, « persévéré » signifie :",
    choices: [
      "continué malgré les difficultés",
      "changé d'avis rapidement",
      "arrêté tous ses efforts",
      "demandé de l'aide à tous",
    ],
    answerIndex: 0,
    explanation: "Le texte oppose « persévéré » à « abandonner » : elle a continué malgré les échecs.",
  },
  {
    code: "COM-09",
    category: "comprehension",
    difficulty: 2,
    prompt:
      "Lisez le texte : « Ce téléphone a une très bonne batterie et un bel écran. Cependant, son appareil photo est décevant et il chauffe vite. Pour ce prix, il existe de meilleurs choix. »\nQuel est l'avis de l'auteur ?",
    choices: [
      "Il recommande vivement d'acheter ce téléphone",
      "Il trouve ce téléphone parfait",
      "Il pense qu'on trouve mieux au même prix",
      "Il n'a jamais utilisé ce téléphone",
    ],
    answerIndex: 2,
    explanation: "La dernière phrase dit clairement que pour ce prix il existe de meilleurs choix.",
  },
  {
    code: "COM-10",
    category: "comprehension",
    difficulty: 2,
    prompt:
      "Lisez le texte : « L'entreprise de construction avait annoncé que les travaux de la route seraient terminés en mars. Nous sommes en juin et les ouvriers travaillent toujours sur le chantier. »\nQue peut-on conclure ?",
    choices: [
      "Les ouvriers sont en avance",
      "Les travaux ont pris du retard",
      "Les travaux sont finis depuis mars",
      "Les travaux commenceront en juin",
    ],
    answerIndex: 1,
    explanation: "Les travaux devaient finir en mars mais continuent en juin : ils sont en retard.",
  },
  {
    code: "COM-11",
    category: "comprehension",
    difficulty: 3,
    prompt:
      "Lisez le texte : « Tous les candidats qui ont déposé leur dossier avant le 15 mai seront convoqués à l'entretien. Sandrine a déposé son dossier le 10 mai. Paul a déposé le sien le 20 mai. »\nQue peut-on affirmer avec certitude ?",
    choices: [
      "Paul sera convoqué à l'entretien",
      "Ni Sandrine ni Paul ne seront convoqués",
      "Paul a déposé son dossier avant Sandrine",
      "Sandrine sera convoquée à l'entretien",
    ],
    answerIndex: 3,
    explanation: "Sandrine a déposé avant le 15 mai, donc elle sera convoquée ; rien ne permet d'affirmer les autres choix.",
  },
  {
    code: "COM-12",
    category: "comprehension",
    difficulty: 3,
    prompt:
      "Lisez le texte : « Beaucoup pensent que pour réussir dans le numérique, il faut être un génie des mathématiques. En réalité, la plupart des métiers du numérique demandent surtout de la curiosité, de la patience et l'envie d'apprendre régulièrement. Les compétences techniques s'acquièrent ensuite avec la pratique. »\nQuelle phrase résume le mieux ce texte ?",
    choices: [
      "Dans le numérique, la curiosité et la régularité comptent plus qu'un don pour les maths",
      "Dans le numérique, seuls les génies des mathématiques peuvent vraiment réussir",
      "Dans le numérique, les métiers ne demandent ni effort ni apprentissage particulier",
      "Dans le numérique, il vaut mieux abandonner si l'on n'aime pas les mathématiques",
    ],
    answerIndex: 0,
    explanation: "Le texte corrige l'idée du génie des maths et insiste sur la curiosité, la patience et l'apprentissage régulier.",
  },

  // ---------------------------------------------------------------------------
  // NUMERIQUE (10)
  // ---------------------------------------------------------------------------
  {
    code: "NUM-01",
    category: "numerique",
    difficulty: 1,
    prompt:
      "Vous recevez ce SMS d'un numéro inconnu : « Félicitations ! Vous avez gagné 500 000 FCFA. Envoyez votre code secret Mobile Money pour recevoir votre gain. » Que faites-vous ?",
    choices: [
      "J'envoie mon code pour recevoir l'argent",
      "J'ignore et je supprime : c'est une arnaque",
      "Je transfère le message à tous mes amis",
      "Je rappelle le numéro pour avoir des détails",
    ],
    answerIndex: 1,
    explanation: "Un vrai gain ne demande jamais le code secret ; c'est une arnaque classique.",
  },
  {
    code: "NUM-02",
    category: "numerique",
    difficulty: 1,
    prompt: "Lequel de ces mots de passe est le plus difficile à deviner ?",
    choices: ["123456", "motdepasse", "Nadia2004", "T7!rk#9Lq2@w"],
    answerIndex: 3,
    explanation: "Il est long et mélange majuscules, minuscules, chiffres et symboles sans mot ni date reconnaissable.",
  },
  {
    code: "NUM-03",
    category: "numerique",
    difficulty: 2,
    prompt: "Qu'est-ce qu'un navigateur internet (par exemple Chrome ou Firefox) ?",
    choices: [
      "Un technicien qui répare les ordinateurs",
      "Un câble qui relie l'ordinateur au réseau",
      "Un logiciel qui affiche les sites web",
      "Un programme qui détruit les fichiers",
    ],
    answerIndex: 2,
    explanation: "Un navigateur est le logiciel utilisé pour ouvrir et consulter des sites web.",
  },
  {
    code: "NUM-04",
    category: "numerique",
    difficulty: 1,
    prompt: "Sur un ordinateur ou un téléphone, qu'est-ce qu'un « fichier » ?",
    choices: [
      "Le câble qui sert à charger la batterie",
      "Un document enregistré, comme une photo",
      "La liste des personnes qui vous ont appelé",
      "Le bouton qui sert à allumer l'écran",
    ],
    answerIndex: 1,
    explanation: "Un fichier est un élément enregistré dans l'appareil, comme une photo, un texte ou une musique.",
  },
  {
    code: "NUM-05",
    category: "numerique",
    difficulty: 1,
    prompt: "À qui pouvez-vous donner votre code secret Mobile Money ?",
    choices: [
      "À l'agent qui vous appelle au nom de l'opérateur",
      "Au vendeur du kiosque Mobile Money",
      "À personne, jamais",
      "À un proche qui vous le demande par SMS",
    ],
    answerIndex: 2,
    explanation: "Le code secret est personnel : aucun agent, vendeur ou proche ne doit le connaître.",
  },
  {
    code: "NUM-06",
    category: "numerique",
    difficulty: 2,
    prompt: "Qu'est-ce qu'une URL ?",
    choices: [
      "L'adresse d'une page web, comme www.exemple.cm",
      "Le nom de la marque d'un téléphone portable",
      "Le mot de passe secret d'un réseau Wi-Fi",
      "Une application qui sert à envoyer des messages",
    ],
    answerIndex: 0,
    explanation: "Une URL est l'adresse qu'on tape ou sur laquelle on clique pour ouvrir une page web.",
  },
  {
    code: "NUM-07",
    category: "numerique",
    difficulty: 2,
    prompt: "Quelle est la meilleure habitude pour vos mots de passe ?",
    choices: [
      "Utiliser le même mot de passe partout",
      "Utiliser sa date de naissance comme mot de passe",
      "Partager son mot de passe avec ses amis proches",
      "Utiliser un mot de passe différent par compte",
    ],
    answerIndex: 3,
    explanation: "Des mots de passe différents évitent qu'un seul mot de passe volé ouvre tous vos comptes.",
  },
  {
    code: "NUM-08",
    category: "numerique",
    difficulty: 2,
    prompt:
      "Un inconnu vous écrit : « Je me suis trompé de numéro et je vous ai envoyé 25 000 FCFA par Mobile Money, renvoyez-les-moi s'il vous plaît. » Vous vérifiez : votre solde n'a pas changé. Que faites-vous ?",
    choices: [
      "Je ne renvoie rien : je n'ai rien reçu",
      "Je renvoie 25 000 FCFA pour être honnête",
      "J'envoie la moitié par simple précaution",
      "Je lui donne mon code pour qu'il se rembourse",
    ],
    answerIndex: 0,
    explanation: "Le solde prouve qu'aucun argent n'est arrivé : c'est une tentative d'arnaque.",
  },
  {
    code: "NUM-09",
    category: "numerique",
    difficulty: 3,
    prompt:
      "Le site officiel de la banque (imaginaire) « BanqueSoleil » est banquesoleil.cm. Laquelle de ces adresses est très probablement un faux site qui l'imite ?",
    choices: [
      "https://www.banquesoleil.cm",
      "https://banquesoleil.cm/agences",
      "https://banquesoleil-cm.securite-login.com",
      "https://www.banquesoleil.cm/contact",
    ],
    answerIndex: 2,
    explanation: "C'est la seule adresse dont le site n'est pas banquesoleil.cm (elle se termine par securite-login.com).",
  },
  {
    code: "NUM-10",
    category: "numerique",
    difficulty: 3,
    prompt:
      "Vous recevez un message qui semble venir de votre opérateur : « Votre compte sera bloqué dans 2 heures. Cliquez vite sur ce lien et entrez votre code secret. » Quel indice montre le plus clairement qu'il s'agit d'une arnaque ?",
    choices: [
      "Le message est rédigé entièrement en français",
      "Il vous presse et demande votre code secret",
      "Il cite le nom de votre opérateur habituel",
      "Il est arrivé sur votre téléphone portable",
    ],
    answerIndex: 1,
    explanation: "Un opérateur ne demande jamais le code secret, et l'urgence est une technique typique des arnaqueurs.",
  },
];
