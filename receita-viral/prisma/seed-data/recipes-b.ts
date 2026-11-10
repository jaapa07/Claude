import type { SeedRecipe } from "./types";

export const recipesB: SeedRecipe[] = [
  // 1
  {
    slug: "hossomaki-de-salmao",
    title: "Hossomaki de Salmão",
    description:
      "Rolinhos finos de alga recheados com arroz japonês temperado e salmão fresco. Clássico do rodízio, fácil de fazer em casa com uma esteira de bambu.",
    emoji: "🍣",
    cuisine: "japonesa",
    categories: ["peixes-e-frutos-do-mar"],
    prepMinutes: 40,
    cookMinutes: 20,
    servings: 4,
    difficulty: "MEDIUM",
    caloriesPerServing: 290,
    costLevel: "HIGH",
    tags: ["sushi", "salmão", "arroz", "rolinho"],
    ingredients: [
      { name: "arroz japonês", quantity: 2, unit: "xícara", group: "MERCEARIA" },
      { name: "água", quantity: 500, unit: "ml", group: "OUTROS" },
      { name: "vinagre de arroz", quantity: 4, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "açúcar", quantity: 2, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "sal", quantity: 1, unit: "colher de chá", group: "TEMPEROS" },
      { name: "alga nori", quantity: 4, unit: "unidade", group: "MERCEARIA", note: "folhas cortadas ao meio" },
      { name: "salmão", quantity: 250, unit: "g", group: "PEIXES", note: "fresco, próprio para consumo cru, em tiras" },
      { name: "molho de soja", quantity: null, unit: "a gosto", group: "MERCEARIA", note: "para servir" },
      { name: "wasabi", quantity: null, unit: "a gosto", group: "MERCEARIA", optional: true },
      { name: "gengibre em conserva", quantity: null, unit: "a gosto", group: "MERCEARIA", optional: true },
    ],
    steps: [
      {
        text: "Lave o arroz japonês em água corrente, esfregando delicadamente com as mãos, até a água sair quase transparente. Escorra e deixe descansar na peneira por 15 minutos.",
        timerMinutes: 15,
      },
      {
        text: "Leve o arroz com os 500 ml de água a fogo alto em panela tampada. Quando ferver, abaixe para o fogo mínimo e cozinhe por 12 minutos sem abrir a tampa; desligue e deixe abafado por mais 10 minutos.",
        timerMinutes: 22,
      },
      {
        text: "Enquanto isso, aqueça o vinagre de arroz com o açúcar e o sal apenas até dissolver, sem ferver. Transfira o arroz para uma tigela larga e regue com o tempero, misturando com movimentos de corte e abanando para esfriar e ganhar brilho.",
      },
      {
        text: "Corte o salmão em tiras de cerca de 1 cm de espessura e do comprimento da alga. Mantenha o peixe na geladeira até a hora de montar.",
      },
      {
        text: "Coloque meia folha de nori sobre a esteira de bambu, com o lado brilhante para baixo. Com as mãos umedecidas em água com um pouco de vinagre, espalhe uma camada fina de arroz, deixando 1 cm livre na borda superior.",
      },
      {
        text: "Disponha uma tira de salmão no centro do arroz e enrole com a esteira, apertando firme e de forma uniforme para o rolo ficar bem fechado. Umedeça a borda livre para selar.",
      },
      {
        text: "Com uma faca bem afiada e umedecida, corte cada rolo ao meio e depois cada metade em 3 partes, totalizando 6 peças. Sirva com molho de soja, wasabi e gengibre em conserva.",
      },
    ],
    tips: [
      "Compre o salmão em peixaria de confiança e informe que será consumido cru; mantenha-o sempre bem refrigerado.",
      "Não aperte o arroz ao espalhar na alga: ele deve ficar soltinho, senão o rolinho fica pesado.",
      "Limpe e umedeça a faca entre um corte e outro para as peças saírem perfeitas.",
    ],
    substitutions: [
      { ingredient: "salmão", substitute: "pepino em tiras finas para uma versão vegetariana (kappamaki)" },
      { ingredient: "vinagre de arroz", substitute: "vinagre de maçã, usando um pouco menos" },
    ],
    nutrition: { protein: 16, carbs: 46, fat: 5, fiber: 1, sodium: 620 },
  },
  // 2
  {
    slug: "lamen-shoyu-caseiro",
    title: "Lámen Shoyu Caseiro",
    description:
      "Caldo de frango aromático com shoyu, gengibre e alho, servido com macarrão, ovo marinado e cebolinha. Conforto em forma de tigela.",
    emoji: "🍜",
    cuisine: "japonesa",
    categories: ["sopas-e-caldos"],
    prepMinutes: 25,
    cookMinutes: 75,
    servings: 4,
    difficulty: "MEDIUM",
    caloriesPerServing: 520,
    costLevel: "MEDIUM",
    tags: ["lámen", "caldo", "macarrão", "ovo"],
    ingredients: [
      { name: "coxa de frango", quantity: 800, unit: "g", group: "CARNES", note: "com osso e pele" },
      { name: "água", quantity: 2.5, unit: "l", group: "OUTROS" },
      { name: "cebola", quantity: 1, unit: "unidade", group: "HORTIFRUTI", note: "cortada ao meio" },
      { name: "alho", quantity: 5, unit: "dente", group: "HORTIFRUTI" },
      { name: "gengibre", quantity: 30, unit: "g", group: "HORTIFRUTI", note: "em rodelas" },
      { name: "molho de soja", quantity: 8, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "saquê mirin", quantity: 2, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "óleo de gergelim", quantity: 1, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "macarrão para lámen", quantity: 400, unit: "g", group: "MERCEARIA" },
      { name: "ovo", quantity: 4, unit: "unidade", group: "LATICINIOS" },
      { name: "cebolinha", quantity: 1, unit: "maço", group: "HORTIFRUTI" },
      { name: "alga nori", quantity: 2, unit: "unidade", group: "MERCEARIA", optional: true },
    ],
    steps: [
      {
        text: "Coloque as coxas de frango, a água, a cebola, o alho e o gengibre em uma panela grande. Leve ao fogo alto até ferver e retire a espuma que se forma na superfície com uma escumadeira.",
        timerMinutes: 10,
      },
      {
        text: "Abaixe o fogo para baixo e cozinhe com a panela semitampada por cerca de 1 hora, até o caldo ficar dourado e saboroso e a carne se soltar dos ossos.",
        timerMinutes: 60,
      },
      {
        text: "Enquanto o caldo cozinha, coloque os ovos em água fervente por exatos 6 minutos e meio, passe para água com gelo e descasque. Deixe-os marinando em 3 colheres de sopa do molho de soja com o mirin e um pouco de água.",
        timerMinutes: 7,
      },
      {
        text: "Coe o caldo, desfie a carne do frango e descarte peles e ossos. Volte o caldo ao fogo e tempere com o restante do molho de soja e o óleo de gergelim, provando o sal.",
      },
      {
        text: "Cozinhe o macarrão em água fervente pelo tempo indicado na embalagem, geralmente 3 a 4 minutos, e escorra bem para não diluir o caldo.",
        timerMinutes: 4,
      },
      {
        text: "Monte as tigelas: macarrão no fundo, caldo bem quente por cima, frango desfiado, o ovo cortado ao meio, cebolinha picada e um pedaço de alga nori na lateral. Sirva imediatamente.",
      },
    ],
    tips: [
      "Para um caldo mais encorpado, toste a cebola cortada em uma frigideira seca antes de colocá-la na panela.",
      "Os ovos marinados ficam ainda melhores se preparados na véspera e guardados na geladeira.",
      "Aqueça as tigelas com água quente antes de servir para o lámen não esfriar rápido.",
    ],
    substitutions: [
      { ingredient: "macarrão para lámen", substitute: "miojo sem o tempero ou espaguete fino cozido com 1 colher de chá de bicarbonato" },
      { ingredient: "saquê mirin", substitute: "1 colher de sopa de açúcar dissolvida em 2 colheres de sopa de vinho branco" },
    ],
    nutrition: { protein: 34, carbs: 62, fat: 14, fiber: 3, sodium: 1850 },
  },
  // 3
  {
    slug: "yakisoba-de-carne-e-legumes",
    title: "Yakisoba de Carne e Legumes",
    description:
      "Macarrão salteado com tiras de carne, brócolis, repolho e cenoura em um molho brilhante de shoyu. Prato completo e colorido em uma panela só.",
    emoji: "🥢",
    cuisine: "japonesa",
    categories: ["massas-e-pizzas", "carnes-e-churrasco"],
    prepMinutes: 25,
    cookMinutes: 20,
    servings: 4,
    difficulty: "MEDIUM",
    caloriesPerServing: 560,
    costLevel: "MEDIUM",
    tags: ["yakisoba", "macarrão", "legumes", "wok"],
    ingredients: [
      { name: "macarrão para yakisoba", quantity: 400, unit: "g", group: "MERCEARIA" },
      { name: "alcatra", quantity: 400, unit: "g", group: "CARNES", note: "em tiras finas" },
      { name: "brócolis", quantity: 300, unit: "g", group: "HORTIFRUTI", note: "em floretes" },
      { name: "repolho", quantity: 200, unit: "g", group: "HORTIFRUTI", note: "em tiras" },
      { name: "cenoura", quantity: 1, unit: "unidade", group: "HORTIFRUTI", note: "em palitos" },
      { name: "cebola", quantity: 1, unit: "unidade", group: "HORTIFRUTI", note: "em pétalas" },
      { name: "alho", quantity: 3, unit: "dente", group: "HORTIFRUTI" },
      { name: "gengibre", quantity: 1, unit: "colher de sopa", group: "HORTIFRUTI", note: "ralado" },
      { name: "molho de soja", quantity: 6, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "amido de milho", quantity: 1, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "açúcar", quantity: 1, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "óleo", quantity: 3, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "óleo de gergelim", quantity: 1, unit: "colher de chá", group: "MERCEARIA" },
      { name: "água", quantity: 300, unit: "ml", group: "OUTROS" },
    ],
    steps: [
      {
        text: "Cozinhe o macarrão em água fervente por 1 minuto a menos que o indicado na embalagem, escorra e misture com um fio de óleo para não grudar.",
        timerMinutes: 4,
      },
      {
        text: "Prepare o molho misturando a água, o molho de soja, o açúcar e o amido de milho até dissolver completamente. Reserve.",
      },
      {
        text: "Aqueça uma wok ou frigideira grande em fogo alto com 1 colher de sopa de óleo. Sele a carne em duas levas, sem mexer nos primeiros 30 segundos, até dourar por fora; retire e reserve.",
        timerMinutes: 4,
      },
      {
        text: "Na mesma panela, adicione o restante do óleo, a cebola, o alho e o gengibre e salteie por 1 minuto. Junte a cenoura e o brócolis e salteie por 3 minutos, mantendo os legumes crocantes e verdes vivos.",
        timerMinutes: 4,
      },
      {
        text: "Acrescente o repolho e salteie por mais 1 minuto. Mexa o molho reservado (o amido assenta no fundo) e despeje na panela, cozinhando até engrossar e ficar brilhante.",
        timerMinutes: 2,
      },
      {
        text: "Volte a carne e o macarrão à panela e misture bem com uma pinça até tudo ficar envolvido no molho. Finalize com o óleo de gergelim e sirva quente.",
        timerMinutes: 2,
      },
    ],
    tips: [
      "Corte a carne contra as fibras e bem fininha para que fique macia em pouco tempo de fogo.",
      "Não lote a panela: o segredo do yakisoba é o fogo alto, que sela em vez de cozinhar no vapor.",
      "Deixe todos os ingredientes cortados antes de começar, pois o salteado é muito rápido.",
    ],
    substitutions: [
      { ingredient: "alcatra", substitute: "peito de frango em tiras ou camarão" },
      { ingredient: "macarrão para yakisoba", substitute: "espaguete ou macarrão de arroz" },
    ],
    nutrition: { protein: 32, carbs: 72, fat: 15, fiber: 5, sodium: 1450 },
  },
  // 4
  {
    slug: "frango-teriyaki",
    title: "Frango Teriyaki",
    description:
      "Coxas de frango douradas na frigideira e envolvidas em um molho teriyaki caseiro, brilhante e levemente adocicado. Perfeito com arroz branco.",
    emoji: "🍗",
    cuisine: "japonesa",
    categories: ["frangos"],
    prepMinutes: 10,
    cookMinutes: 20,
    servings: 4,
    difficulty: "EASY",
    caloriesPerServing: 390,
    costLevel: "LOW",
    tags: ["teriyaki", "frango", "molho", "rápido"],
    ingredients: [
      { name: "coxa de frango", quantity: 800, unit: "g", group: "CARNES", note: "desossada, com pele" },
      { name: "molho de soja", quantity: 5, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "saquê mirin", quantity: 3, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "açúcar mascavo", quantity: 2, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "gengibre", quantity: 1, unit: "colher de chá", group: "HORTIFRUTI", note: "ralado" },
      { name: "alho", quantity: 2, unit: "dente", group: "HORTIFRUTI", note: "ralado" },
      { name: "amido de milho", quantity: 1, unit: "colher de chá", group: "MERCEARIA" },
      { name: "água", quantity: 60, unit: "ml", group: "OUTROS" },
      { name: "óleo", quantity: 1, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "gergelim", quantity: 1, unit: "colher de sopa", group: "MERCEARIA", note: "para finalizar" },
      { name: "cebolinha", quantity: 2, unit: "colher de sopa", group: "HORTIFRUTI", note: "picada" },
    ],
    steps: [
      {
        text: "Misture o molho de soja, o mirin, o açúcar mascavo, o gengibre, o alho, a água e o amido de milho em uma tigela até dissolver. Reserve o molho.",
      },
      {
        text: "Seque bem as coxas com papel-toalha. Aqueça o óleo em uma frigideira grande em fogo médio e coloque o frango com a pele para baixo.",
      },
      {
        text: "Deixe dourar sem mexer por 7 a 8 minutos, até a pele ficar bem crocante e dourada. Vire e cozinhe por mais 5 minutos, até o frango estar cozido por dentro.",
        timerMinutes: 13,
      },
      {
        text: "Retire o excesso de gordura da frigideira com papel-toalha. Mexa o molho e despeje sobre o frango.",
      },
      {
        text: "Cozinhe em fogo médio por 2 a 3 minutos, virando os pedaços e regando com o molho, até ele engrossar e cobrir o frango com uma camada brilhante.",
        timerMinutes: 3,
      },
      {
        text: "Fatie o frango, regue com o molho que restou na panela e finalize com gergelim e cebolinha. Sirva com arroz branco.",
      },
    ],
    tips: [
      "Coxas desossadas ficam mais suculentas que o peito e aguentam bem o molho reduzido.",
      "Fique de olho no final: o açúcar do teriyaki pode queimar se o fogo estiver alto demais.",
    ],
    substitutions: [
      { ingredient: "coxa de frango", substitute: "peito de frango em bifes finos, reduzindo o tempo de cozimento" },
      { ingredient: "saquê mirin", substitute: "mel diluído em um pouco de água" },
    ],
    nutrition: { protein: 36, carbs: 12, fat: 21, fiber: 0, sodium: 1150 },
  },
  // 5
  {
    slug: "guioza-de-porco",
    title: "Guioza de Porco",
    description:
      "Pasteizinhos japoneses recheados com carne de porco, repolho e cebolinha, dourados por baixo e macios por cima. Petisco irresistível com molho de shoyu e vinagre.",
    emoji: "🥟",
    cuisine: "japonesa",
    categories: ["comidas-de-boteco"],
    prepMinutes: 45,
    cookMinutes: 20,
    servings: 6,
    difficulty: "MEDIUM",
    caloriesPerServing: 280,
    costLevel: "MEDIUM",
    tags: ["guioza", "petisco", "porco", "pastel"],
    ingredients: [
      { name: "carne de porco moída", quantity: 400, unit: "g", group: "CARNES" },
      { name: "repolho", quantity: 200, unit: "g", group: "HORTIFRUTI", note: "picado bem fino" },
      { name: "cebolinha", quantity: 4, unit: "colher de sopa", group: "HORTIFRUTI", note: "picada" },
      { name: "alho", quantity: 2, unit: "dente", group: "HORTIFRUTI", note: "ralado" },
      { name: "gengibre", quantity: 1, unit: "colher de sopa", group: "HORTIFRUTI", note: "ralado" },
      { name: "molho de soja", quantity: 3, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "óleo de gergelim", quantity: 1, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "sal", quantity: 1, unit: "colher de chá", group: "TEMPEROS" },
      { name: "massa para guioza", quantity: 36, unit: "unidade", group: "CONGELADOS" },
      { name: "óleo", quantity: 2, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "água", quantity: 120, unit: "ml", group: "OUTROS" },
      { name: "vinagre de arroz", quantity: 2, unit: "colher de sopa", group: "MERCEARIA", note: "para o molho" },
    ],
    steps: [
      {
        text: "Misture o repolho picado com o sal e deixe descansar por 10 minutos. Esprema bem com as mãos para retirar o excesso de água, o que evita um recheio encharcado.",
        timerMinutes: 10,
      },
      {
        text: "Em uma tigela, junte a carne de porco, o repolho espremido, a cebolinha, o alho, o gengibre, 1 colher de sopa de molho de soja e o óleo de gergelim. Sove com a mão por 1 a 2 minutos, até a mistura ficar pegajosa e bem ligada.",
      },
      {
        text: "Coloque cerca de 1 colher de chá cheia de recheio no centro de cada disco de massa. Umedeça a borda com água, dobre ao meio e faça pequenas pregas de um lado, pressionando para selar bem.",
      },
      {
        text: "Aqueça o óleo em uma frigideira antiaderente com tampa em fogo médio. Arrume os guiozas com a base plana para baixo, lado a lado, e doure por 2 a 3 minutos, até o fundo ficar bem dourado.",
        timerMinutes: 3,
      },
      {
        text: "Despeje a água de uma vez na frigideira (cuidado com os respingos) e tampe imediatamente. Cozinhe no vapor por 5 a 6 minutos, até a massa ficar translúcida e a água secar.",
        timerMinutes: 6,
      },
      {
        text: "Retire a tampa e deixe mais 1 minuto para o fundo voltar a ficar crocante. Sirva com um molho feito com o restante do molho de soja e o vinagre de arroz.",
        timerMinutes: 1,
      },
    ],
    tips: [
      "Guiozas crus podem ser congelados em uma assadeira enfarinhada e depois guardados em saco; cozinhe direto do congelador, aumentando 2 minutos no vapor.",
      "Acrescente algumas gotas de óleo de pimenta ao molho para uma versão picante.",
      "Mantenha os discos de massa cobertos com um pano úmido para não ressecarem enquanto monta.",
    ],
    substitutions: [
      { ingredient: "carne de porco moída", substitute: "frango moído ou carne moída" },
      { ingredient: "massa para guioza", substitute: "massa de pastel cortada em discos de 8 cm" },
    ],
    nutrition: { protein: 15, carbs: 24, fat: 13, fiber: 1, sodium: 720 },
  },
  // 6
  {
    slug: "sushi-bake",
    title: "Sushi Bake",
    description:
      "Todo o sabor do sushi em uma travessa: arroz temperado, salmão cremoso com maionese e sriracha, gratinado no forno. Para comer com folhas de alga como tacos.",
    emoji: "🍱",
    cuisine: "japonesa",
    categories: ["peixes-e-frutos-do-mar"],
    prepMinutes: 30,
    cookMinutes: 40,
    servings: 6,
    difficulty: "EASY",
    caloriesPerServing: 480,
    costLevel: "HIGH",
    tags: ["sushi", "forno", "salmão", "travessa"],
    ingredients: [
      { name: "arroz japonês", quantity: 3, unit: "xícara", group: "MERCEARIA" },
      { name: "vinagre de arroz", quantity: 5, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "açúcar", quantity: 2, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "sal", quantity: 1, unit: "colher de chá", group: "TEMPEROS" },
      { name: "salmão", quantity: 500, unit: "g", group: "PEIXES", note: "sem pele" },
      { name: "kani", quantity: 150, unit: "g", group: "CONGELADOS", note: "desfiado" },
      { name: "cream cheese", quantity: 150, unit: "g", group: "LATICINIOS" },
      { name: "maionese", quantity: 5, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "molho sriracha", quantity: 2, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "molho de soja", quantity: 1, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "furikake", quantity: 3, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "cebolinha", quantity: 2, unit: "colher de sopa", group: "HORTIFRUTI", note: "picada" },
      { name: "alga nori", quantity: 6, unit: "unidade", group: "MERCEARIA", note: "cortadas em quadrados, para servir" },
    ],
    steps: [
      {
        text: "Lave o arroz japonês até a água sair clara e cozinhe com 3 e 3/4 xícaras de água: fogo alto até ferver, depois fogo mínimo tampado por 12 minutos e mais 10 minutos abafado. Tempere com o vinagre, o açúcar e o sal dissolvidos, misturando com movimentos de corte.",
        timerMinutes: 22,
      },
      {
        text: "Preaqueça o forno a 200 °C. Tempere o salmão com o molho de soja, coloque em uma assadeira e asse por 12 a 15 minutos, até lascar facilmente com um garfo.",
        timerMinutes: 15,
      },
      {
        text: "Desfie o salmão em lascas e misture com o kani, o cream cheese, 3 colheres de sopa de maionese e 1 colher de sopa de sriracha até formar uma pasta cremosa e rosada.",
      },
      {
        text: "Espalhe o arroz temperado em uma travessa refratária média (cerca de 20 x 30 cm), pressionando levemente para nivelar. Polvilhe metade do furikake por cima.",
      },
      {
        text: "Cubra o arroz com a mistura de salmão de forma uniforme. Faça zigue-zagues com o restante da maionese e da sriracha.",
      },
      {
        text: "Leve ao forno a 200 °C por 12 a 15 minutos, até a superfície ficar quente e levemente dourada nas bordas. Se quiser mais cor, ligue o grill nos últimos 2 minutos, vigiando.",
        timerMinutes: 15,
      },
      {
        text: "Finalize com o restante do furikake e a cebolinha. Sirva quente, colocando porções sobre quadrados de alga nori e comendo como um taquinho.",
      },
    ],
    tips: [
      "Use salmão assado: como a receita vai ao forno, não é preciso peixe de qualidade para sashimi.",
      "Abacate em cubos por cima, na hora de servir, dá frescor e contraste ao prato.",
      "Corte a alga só na hora de servir para ela não amolecer com a umidade.",
    ],
    substitutions: [
      { ingredient: "kani", substitute: "mais 150 g de salmão ou camarão cozido picado" },
      { ingredient: "furikake", substitute: "gergelim torrado misturado com alga nori picadinha" },
    ],
    nutrition: { protein: 24, carbs: 58, fat: 17, fiber: 2, sodium: 980 },
    viral: {
      platform: "TIKTOK",
      trendYear: 2020,
      note: "Versão assada do sushi em travessa que ganhou enorme popularidade em vídeos curtos no TikTok a partir de 2020, segundo ampla cobertura da imprensa gastronômica.",
    },
  },
  // 7
  {
    slug: "salmon-rice-bowl",
    title: "Salmon Rice Bowl",
    description:
      "Tigela rápida com arroz, salmão assado amassado, maionese, sriracha e molho de soja, para comer enrolado em alga. Abacate e pepino deixam tudo mais fresco.",
    emoji: "🍚",
    cuisine: "japonesa",
    categories: ["peixes-e-frutos-do-mar", "fitness"],
    prepMinutes: 10,
    cookMinutes: 15,
    servings: 2,
    difficulty: "EASY",
    caloriesPerServing: 540,
    costLevel: "MEDIUM",
    tags: ["salmão", "bowl", "arroz", "rápido"],
    ingredients: [
      { name: "salmão", quantity: 250, unit: "g", group: "PEIXES", note: "em filé" },
      { name: "arroz japonês", quantity: 2, unit: "xícara", group: "MERCEARIA", note: "cozido" },
      { name: "molho de soja", quantity: 2, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "maionese", quantity: 2, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "molho sriracha", quantity: 1, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "óleo de gergelim", quantity: 1, unit: "colher de chá", group: "MERCEARIA" },
      { name: "abacate", quantity: 0.5, unit: "unidade", group: "HORTIFRUTI", note: "fatiado" },
      { name: "pepino", quantity: 1, unit: "unidade", group: "HORTIFRUTI", note: "japonês, em rodelas finas" },
      { name: "alga nori", quantity: 2, unit: "unidade", group: "MERCEARIA", note: "em quadrados" },
      { name: "gergelim", quantity: 1, unit: "colher de chá", group: "MERCEARIA" },
    ],
    steps: [
      {
        text: "Preaqueça o forno ou a air fryer a 200 °C. Tempere o salmão com 1 colher de sopa de molho de soja e asse por 10 a 12 minutos, até ficar opaco e lascar com facilidade.",
        timerMinutes: 12,
      },
      {
        text: "Coloque o arroz cozido em uma tigela e aqueça. Uma dica popular é colocar uma pedra de gelo por cima e levar ao micro-ondas por 1 minuto para o arroz recuperar a umidade (retire o que sobrar do gelo depois).",
        timerMinutes: 1,
      },
      {
        text: "Amasse o salmão com um garfo diretamente sobre o arroz, em lascas grandes.",
      },
      {
        text: "Regue com o restante do molho de soja, o óleo de gergelim, a maionese e a sriracha, e misture tudo com o garfo até o arroz ficar cremoso e rosado.",
      },
      {
        text: "Arrume por cima o abacate fatiado e o pepino, polvilhe o gergelim e sirva com os quadrados de alga para pegar porções com as mãos.",
      },
    ],
    tips: [
      "É uma ótima forma de aproveitar sobras de salmão assado e arroz do dia anterior.",
      "Para uma versão mais leve, troque a maionese por iogurte natural com um pouco de limão.",
    ],
    substitutions: [
      { ingredient: "salmão", substitute: "atum em lata escorrido" },
      { ingredient: "arroz japonês", substitute: "arroz branco ou arroz integral cozido" },
    ],
    nutrition: { protein: 30, carbs: 50, fat: 24, fiber: 5, sodium: 1150 },
    viral: {
      platform: "TIKTOK",
      trendYear: 2021,
      note: "Tigela de arroz com salmão amassado, maionese, sriracha e alga que viralizou no TikTok em 2021, popularizada por vídeos de criadores de conteúdo de culinária.",
    },
  },
  // 8
  {
    slug: "missoshiru",
    title: "Missoshiru",
    description:
      "Sopa japonesa leve de missô com tofu macio, alga wakame e cebolinha. Reconfortante, pronta em poucos minutos.",
    emoji: "🥣",
    cuisine: "japonesa",
    categories: ["sopas-e-caldos", "vegetarianas-e-veganas"],
    prepMinutes: 10,
    cookMinutes: 10,
    servings: 4,
    difficulty: "EASY",
    caloriesPerServing: 90,
    costLevel: "LOW",
    tags: ["sopa", "missô", "tofu", "leve"],
    ingredients: [
      { name: "água", quantity: 1, unit: "l", group: "OUTROS" },
      { name: "alga kombu", quantity: 10, unit: "g", group: "MERCEARIA", note: "um pedaço de cerca de 10 cm" },
      { name: "cogumelo shiitake seco", quantity: 3, unit: "unidade", group: "MERCEARIA" },
      { name: "missô", quantity: 4, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "tofu", quantity: 200, unit: "g", group: "LATICINIOS", note: "macio, em cubos" },
      { name: "alga wakame", quantity: 1, unit: "colher de sopa", group: "MERCEARIA", note: "desidratada" },
      { name: "cebolinha", quantity: 3, unit: "colher de sopa", group: "HORTIFRUTI", note: "picada" },
    ],
    steps: [
      {
        text: "Coloque a água, a alga kombu e os cogumelos secos em uma panela e deixe hidratar por 20 minutos fora do fogo.",
        timerMinutes: 20,
      },
      {
        text: "Leve ao fogo médio e retire a kombu pouco antes de a água ferver, para o caldo não ficar amargo. Deixe os cogumelos cozinharem por mais 5 minutos em fogo baixo; retire-os, fatie e volte para a panela.",
        timerMinutes: 5,
      },
      {
        text: "Hidrate a wakame em água fria por 5 minutos e escorra; ela vai aumentar bastante de volume.",
        timerMinutes: 5,
      },
      {
        text: "Adicione o tofu em cubos ao caldo e aqueça por 2 minutos em fogo baixo, sem deixar ferver forte para não desmanchar.",
        timerMinutes: 2,
      },
      {
        text: "Desligue o fogo. Dissolva o missô em uma concha com um pouco do caldo quente, usando uma colher ou fouet, e devolva à panela mexendo delicadamente.",
      },
      {
        text: "Junte a wakame, distribua nas tigelas e finalize com cebolinha. Sirva imediatamente.",
      },
    ],
    tips: [
      "Nunca ferva a sopa depois de adicionar o missô: o calor excessivo altera o sabor e o aroma.",
      "Missô claro deixa a sopa mais suave; o escuro dá um sabor mais intenso e salgado.",
    ],
    substitutions: [
      { ingredient: "alga kombu", substitute: "caldo de legumes caseiro sem sal" },
      { ingredient: "tofu", substitute: "cogumelos frescos fatiados" },
    ],
    nutrition: { protein: 7, carbs: 6, fat: 4, fiber: 2, sodium: 880 },
  },
  // 9
  {
    slug: "dorayaki",
    title: "Dorayaki",
    description:
      "Duas panquecas fofinhas e douradas com toque de mel, recheadas com doce de feijão azuki. O doce japonês mais famoso dos desenhos animados.",
    emoji: "🥞",
    cuisine: "japonesa",
    categories: ["sobremesas-e-doces"],
    prepMinutes: 20,
    cookMinutes: 25,
    servings: 6,
    difficulty: "MEDIUM",
    caloriesPerServing: 310,
    costLevel: "LOW",
    tags: ["doce", "panqueca", "azuki", "lanche"],
    ingredients: [
      { name: "ovo", quantity: 3, unit: "unidade", group: "LATICINIOS" },
      { name: "açúcar", quantity: 100, unit: "g", group: "MERCEARIA" },
      { name: "mel", quantity: 2, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "farinha de trigo", quantity: 160, unit: "g", group: "MERCEARIA" },
      { name: "bicarbonato de sódio", quantity: 0.5, unit: "colher de chá", group: "MERCEARIA" },
      { name: "água", quantity: 60, unit: "ml", group: "OUTROS" },
      { name: "óleo", quantity: 1, unit: "colher de chá", group: "MERCEARIA", note: "para untar" },
      { name: "doce de feijão azuki", quantity: 300, unit: "g", group: "MERCEARIA", note: "anko pronto" },
    ],
    steps: [
      {
        text: "Bata os ovos, o açúcar e o mel com um fouet por 2 a 3 minutos, até a mistura ficar clara e espumosa.",
      },
      {
        text: "Peneire a farinha e misture delicadamente. Dissolva o bicarbonato em metade da água, incorpore e vá adicionando o restante da água até obter uma massa lisa que escorre em fita grossa, como massa de panqueca americana.",
      },
      {
        text: "Cubra e deixe a massa descansar na geladeira por 15 minutos para ficar mais macia.",
        timerMinutes: 15,
      },
      {
        text: "Aqueça uma frigideira antiaderente em fogo baixo e passe uma camada finíssima de óleo com papel-toalha, retirando o excesso para a cor ficar uniforme.",
      },
      {
        text: "Despeje cerca de 2 colheres de sopa de massa a uma altura de uns 10 cm para formar discos de 8 a 9 cm. Cozinhe por 1 minuto e meio a 2 minutos, até surgirem bolhas na superfície e a base ficar marrom-dourada.",
        timerMinutes: 2,
      },
      {
        text: "Vire e cozinhe por mais 30 segundos. Transfira para um prato e cubra com um pano úmido para que as panquecas fiquem macias enquanto você faz as demais.",
      },
      {
        text: "Espalhe cerca de 2 colheres de sopa de doce de azuki sobre uma panqueca, deixando o centro mais alto, e cubra com outra, pressionando as bordas levemente.",
      },
    ],
    tips: [
      "O fogo baixo é essencial para a cor dourada e uniforme característica do dorayaki.",
      "Embrulhados em filme plástico, ficam ainda mais macios no dia seguinte.",
      "Use a primeira panqueca como teste para acertar a temperatura da frigideira.",
    ],
    substitutions: [
      { ingredient: "doce de feijão azuki", substitute: "doce de leite cremoso ou creme de avelã" },
      { ingredient: "mel", substitute: "melado de cana" },
    ],
    nutrition: { protein: 7, carbs: 62, fat: 3, fiber: 3, sodium: 140 },
  },
  // 10
  {
    slug: "bibimbap",
    title: "Bibimbap",
    description:
      "Tigela coreana de arroz com carne marinada, legumes temperados, ovo de gema mole e pasta de pimenta gochujang. Mistura tudo e come!",
    emoji: "🍲",
    cuisine: "coreana",
    categories: ["carnes-e-churrasco"],
    prepMinutes: 40,
    cookMinutes: 30,
    servings: 4,
    difficulty: "MEDIUM",
    caloriesPerServing: 610,
    costLevel: "MEDIUM",
    tags: ["bibimbap", "arroz", "tigela", "ovo"],
    ingredients: [
      { name: "arroz branco", quantity: 2, unit: "xícara", group: "MERCEARIA", note: "cru, de grão curto de preferência" },
      { name: "contrafilé", quantity: 400, unit: "g", group: "CARNES", note: "em tiras finas" },
      { name: "molho de soja", quantity: 4, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "açúcar", quantity: 1, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "alho", quantity: 3, unit: "dente", group: "HORTIFRUTI", note: "ralados" },
      { name: "óleo de gergelim", quantity: 3, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "espinafre", quantity: 1, unit: "maço", group: "HORTIFRUTI" },
      { name: "cenoura", quantity: 2, unit: "unidade", group: "HORTIFRUTI", note: "em palitos finos" },
      { name: "abobrinha", quantity: 1, unit: "unidade", group: "HORTIFRUTI", note: "em meias-luas finas" },
      { name: "broto de feijão", quantity: 200, unit: "g", group: "HORTIFRUTI" },
      { name: "ovo", quantity: 4, unit: "unidade", group: "LATICINIOS" },
      { name: "gochujang", quantity: 4, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "gergelim", quantity: 1, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "óleo", quantity: 2, unit: "colher de sopa", group: "MERCEARIA" },
    ],
    steps: [
      {
        text: "Marine a carne com 3 colheres de sopa de molho de soja, o açúcar, metade do alho e 1 colher de sopa de óleo de gergelim por pelo menos 20 minutos. Enquanto isso, cozinhe o arroz.",
        timerMinutes: 20,
      },
      {
        text: "Branqueie o broto de feijão em água fervente com sal por 1 minuto e retire. Na mesma água, mergulhe o espinafre por 30 segundos, passe para água fria e esprema bem. Tempere cada um com um pouco de óleo de gergelim, alho e sal.",
        timerMinutes: 2,
      },
      {
        text: "Em uma frigideira com um fio de óleo em fogo médio-alto, salteie a cenoura por 2 minutos e reserve; repita com a abobrinha, até ficar macia mas ainda firme. Tempere com sal.",
        timerMinutes: 4,
      },
      {
        text: "Na mesma frigideira, em fogo alto, salteie a carne marinada por 3 a 4 minutos, até dourar e o líquido reduzir.",
        timerMinutes: 4,
      },
      {
        text: "Frite os ovos em fogo médio com um fio de óleo, mantendo a gema mole e as bordas levemente crocantes, por cerca de 3 minutos.",
        timerMinutes: 3,
      },
      {
        text: "Prepare o molho misturando o gochujang com o restante do molho de soja, 1 colher de sopa de óleo de gergelim e 1 colher de sopa de água.",
      },
      {
        text: "Monte as tigelas com arroz no fundo, os legumes e a carne arrumados em setores ao redor e o ovo no centro. Polvilhe gergelim e sirva com o molho, para cada um misturar tudo na hora de comer.",
      },
    ],
    tips: [
      "Para a versão dolsot, aqueça tigelas de pedra ou ferro com óleo de gergelim e coloque o arroz para formar uma crosta crocante no fundo.",
      "Prepare os legumes separadamente: cada um mantém seu sabor e cor, que é o charme do prato.",
    ],
    substitutions: [
      { ingredient: "gochujang", substitute: "pimenta calabresa em flocos misturada com missô e um pouco de mel" },
      { ingredient: "contrafilé", substitute: "tofu firme em cubos para uma versão vegetariana" },
    ],
    nutrition: { protein: 33, carbs: 72, fat: 21, fiber: 5, sodium: 1350 },
  },
  // 11
  {
    slug: "frango-frito-coreano",
    title: "Frango Frito Coreano",
    description:
      "Frango frito duas vezes, extremamente crocante, envolvido em um molho picante e adocicado de gochujang. Petisco perfeito para dividir.",
    emoji: "🍗",
    cuisine: "coreana",
    categories: ["frangos", "comidas-de-boteco"],
    prepMinutes: 30,
    cookMinutes: 35,
    servings: 4,
    difficulty: "MEDIUM",
    caloriesPerServing: 620,
    costLevel: "MEDIUM",
    tags: ["frango frito", "crocante", "picante", "petisco"],
    ingredients: [
      { name: "coxa de frango", quantity: 1, unit: "kg", group: "CARNES", note: "desossada, em pedaços" },
      { name: "sal", quantity: 1, unit: "colher de chá", group: "TEMPEROS" },
      { name: "pimenta-do-reino", quantity: 0.5, unit: "colher de chá", group: "TEMPEROS" },
      { name: "gengibre", quantity: 1, unit: "colher de chá", group: "HORTIFRUTI", note: "ralado" },
      { name: "amido de milho", quantity: 100, unit: "g", group: "MERCEARIA" },
      { name: "farinha de trigo", quantity: 50, unit: "g", group: "MERCEARIA" },
      { name: "água", quantity: 180, unit: "ml", group: "OUTROS", note: "gelada" },
      { name: "óleo", quantity: 1.5, unit: "l", group: "MERCEARIA", note: "para fritar" },
      { name: "gochujang", quantity: 3, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "molho de soja", quantity: 2, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "mel", quantity: 3, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "alho", quantity: 4, unit: "dente", group: "HORTIFRUTI", note: "picados" },
      { name: "gergelim", quantity: 1, unit: "colher de sopa", group: "MERCEARIA" },
    ],
    steps: [
      {
        text: "Tempere o frango com o sal, a pimenta-do-reino e o gengibre e deixe descansar por 15 minutos.",
        timerMinutes: 15,
      },
      {
        text: "Misture o amido de milho e a farinha de trigo e adicione a água gelada aos poucos, até formar uma massa fina, parecida com creme de leite. Passe os pedaços de frango na massa, escorrendo o excesso.",
      },
      {
        text: "Aqueça o óleo em uma panela funda a 170 °C. Frite o frango em levas, sem lotar a panela, por 6 a 7 minutos, até ficar levemente dourado e cozido por dentro. Escorra em uma grade.",
        timerMinutes: 7,
      },
      {
        text: "Deixe o frango descansar por 5 minutos enquanto o óleo sobe para 185 °C. Frite novamente por 2 a 3 minutos, até a casquinha ficar bem dourada e crocante.",
        timerMinutes: 8,
      },
      {
        text: "Em uma frigideira grande, aqueça um fio de óleo em fogo médio e refogue o alho por 30 segundos. Junte o gochujang, o molho de soja e o mel e cozinhe por 1 a 2 minutos, até borbulhar e ficar brilhante.",
        timerMinutes: 2,
      },
      {
        text: "Desligue o fogo, adicione o frango e misture rapidamente para envolver todos os pedaços no molho. Finalize com gergelim e sirva na hora, enquanto está crocante.",
      },
    ],
    tips: [
      "A dupla fritura é o segredo: a primeira cozinha, a segunda desidrata a casquinha e garante a crocância.",
      "Use um termômetro culinário; óleo frio demais deixa o frango encharcado.",
      "Se preferir, sirva o molho à parte para quem não gosta de picante.",
    ],
    substitutions: [
      { ingredient: "gochujang", substitute: "ketchup com pimenta calabresa e um pouco de páprica picante" },
      { ingredient: "coxa de frango", substitute: "asinhas de frango (tulipas)" },
    ],
    nutrition: { protein: 38, carbs: 48, fat: 30, fiber: 1, sodium: 1250 },
  },
  // 12
  {
    slug: "kimchi-jjigae",
    title: "Kimchi Jjigae",
    description:
      "Ensopado coreano picante e ácido de kimchi bem fermentado, barriga de porco e tofu. Aquece o corpo e vai muito bem com arroz branco.",
    emoji: "🍲",
    cuisine: "coreana",
    categories: ["sopas-e-caldos"],
    prepMinutes: 15,
    cookMinutes: 30,
    servings: 4,
    difficulty: "EASY",
    caloriesPerServing: 380,
    costLevel: "MEDIUM",
    tags: ["ensopado", "kimchi", "picante", "tofu"],
    ingredients: [
      { name: "kimchi", quantity: 400, unit: "g", group: "MERCEARIA", note: "bem fermentado, picado, com o líquido" },
      { name: "barriga de porco", quantity: 300, unit: "g", group: "CARNES", note: "em fatias finas" },
      { name: "tofu", quantity: 300, unit: "g", group: "LATICINIOS", note: "firme, em fatias" },
      { name: "cebola", quantity: 1, unit: "unidade", group: "HORTIFRUTI", note: "fatiada" },
      { name: "alho", quantity: 3, unit: "dente", group: "HORTIFRUTI", note: "picados" },
      { name: "gochujang", quantity: 1, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "pimenta coreana em flocos", quantity: 1, unit: "colher de chá", group: "TEMPEROS", optional: true },
      { name: "molho de soja", quantity: 1, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "óleo de gergelim", quantity: 1, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "água", quantity: 700, unit: "ml", group: "OUTROS" },
      { name: "cebolinha", quantity: 2, unit: "unidade", group: "HORTIFRUTI", note: "em pedaços" },
    ],
    steps: [
      {
        text: "Aqueça o óleo de gergelim em uma panela média em fogo médio e doure a barriga de porco por 4 a 5 minutos, até soltar gordura e ficar levemente dourada.",
        timerMinutes: 5,
      },
      {
        text: "Junte o kimchi picado, a cebola e o alho e refogue por 5 minutos, mexendo, até o kimchi ficar macio e perfumado.",
        timerMinutes: 5,
      },
      {
        text: "Adicione o gochujang, a pimenta em flocos e o molho de soja e misture. Despeje a água e o líquido do kimchi e deixe ferver.",
      },
      {
        text: "Abaixe o fogo, tampe e cozinhe por 15 minutos, até o caldo ficar vermelho intenso e saboroso. Prove e ajuste o sal.",
        timerMinutes: 15,
      },
      {
        text: "Acomode as fatias de tofu por cima e cozinhe por mais 5 minutos, sem mexer muito para o tofu não quebrar. Finalize com a cebolinha e sirva borbulhando, acompanhado de arroz branco.",
        timerMinutes: 5,
      },
    ],
    tips: [
      "Quanto mais azedo e fermentado o kimchi, mais saboroso fica o ensopado; é o destino ideal para aquele pote antigo da geladeira.",
      "Uma pitada de açúcar equilibra a acidez se o kimchi estiver muito ácido.",
    ],
    substitutions: [
      { ingredient: "barriga de porco", substitute: "atum em lata ou cogumelos para uma versão sem carne" },
      { ingredient: "pimenta coreana em flocos", substitute: "páprica picante" },
    ],
    nutrition: { protein: 20, carbs: 12, fat: 28, fiber: 4, sodium: 1600 },
  },
  // 13
  {
    slug: "cafe-dalgona",
    title: "Café Dalgona",
    description:
      "Creme de café batido, aerado e caramelizado, sobre leite gelado. Só três ingredientes e um bom braço (ou batedeira).",
    emoji: "☕",
    cuisine: "coreana",
    categories: ["cafes-e-bebidas", "economicas"],
    prepMinutes: 10,
    cookMinutes: 0,
    servings: 2,
    difficulty: "EASY",
    caloriesPerServing: 170,
    costLevel: "LOW",
    tags: ["café", "gelado", "bebida", "cremoso"],
    ingredients: [
      { name: "café solúvel", quantity: 2, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "açúcar", quantity: 2, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "água", quantity: 2, unit: "colher de sopa", group: "OUTROS", note: "quente" },
      { name: "leite", quantity: 400, unit: "ml", group: "LATICINIOS", note: "gelado" },
      { name: "gelo", quantity: null, unit: "a gosto", group: "OUTROS" },
    ],
    steps: [
      {
        text: "Em uma tigela, coloque o café solúvel, o açúcar e a água quente em partes iguais.",
      },
      {
        text: "Bata com batedeira ou mixer com acessório de fouet por 3 a 5 minutos (à mão, cerca de 10 minutos), até a mistura ficar clara, cor de caramelo, e formar picos firmes que se sustentam.",
      },
      {
        text: "Encha dois copos com gelo e leite gelado até cerca de dois terços.",
      },
      {
        text: "Distribua o creme de café por cima com uma colher, formando uma camada alta. Sirva e misture na hora de beber.",
      },
    ],
    tips: [
      "Só funciona com café solúvel; café coado ou espresso não formam espuma estável.",
      "A proporção 1:1:1 é fundamental; reduzir muito o açúcar deixa o creme menos firme.",
      "Para uma versão quente, sirva o creme sobre leite vaporizado.",
    ],
    substitutions: [
      { ingredient: "leite", substitute: "bebida vegetal de aveia ou amêndoas" },
      { ingredient: "açúcar", substitute: "açúcar demerara, que deixa o creme mais escuro" },
    ],
    nutrition: { protein: 7, carbs: 24, fat: 6, fiber: 0, sodium: 105 },
    viral: {
      platform: "TIKTOK",
      trendYear: 2020,
      note: "Café batido de origem associada à Coreia do Sul que se tornou uma das tendências mais comentadas do TikTok durante 2020.",
    },
  },
  // 14
  {
    slug: "tteokbokki",
    title: "Tteokbokki",
    description:
      "Bolinhos de arroz macios e elásticos cozidos em molho vermelho picante e adocicado de gochujang. Comida de rua coreana em versão vegetariana.",
    emoji: "🌶️",
    cuisine: "coreana",
    categories: ["vegetarianas-e-veganas"],
    prepMinutes: 10,
    cookMinutes: 20,
    servings: 3,
    difficulty: "EASY",
    caloriesPerServing: 420,
    costLevel: "MEDIUM",
    tags: ["tteokbokki", "picante", "comida de rua", "arroz"],
    ingredients: [
      { name: "tteok", quantity: 500, unit: "g", group: "CONGELADOS", note: "bolinhos de arroz em cilindro" },
      { name: "caldo de legumes", quantity: 500, unit: "ml", group: "MERCEARIA" },
      { name: "gochujang", quantity: 3, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "pimenta coreana em flocos", quantity: 1, unit: "colher de sopa", group: "TEMPEROS" },
      { name: "molho de soja", quantity: 1, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "açúcar", quantity: 2, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "alho", quantity: 2, unit: "dente", group: "HORTIFRUTI", note: "picados" },
      { name: "repolho", quantity: 150, unit: "g", group: "HORTIFRUTI", note: "em pedaços" },
      { name: "cebolinha", quantity: 3, unit: "unidade", group: "HORTIFRUTI", note: "em pedaços de 5 cm" },
      { name: "gergelim", quantity: 1, unit: "colher de chá", group: "MERCEARIA" },
    ],
    steps: [
      {
        text: "Se o tteok estiver congelado ou endurecido, deixe de molho em água morna por 10 minutos para amolecer e separar os cilindros.",
        timerMinutes: 10,
      },
      {
        text: "Em uma frigideira larga ou panela rasa, misture o caldo de legumes, o gochujang, a pimenta em flocos, o molho de soja, o açúcar e o alho. Leve ao fogo médio até ferver, mexendo para dissolver a pasta.",
        timerMinutes: 3,
      },
      {
        text: "Adicione o tteok escorrido e o repolho e cozinhe em fogo médio por 10 a 12 minutos, mexendo com frequência para não grudar no fundo, até os bolinhos ficarem macios e o molho engrossar e ficar brilhante.",
        timerMinutes: 12,
      },
      {
        text: "Junte a cebolinha nos últimos 2 minutos, só para murchar levemente.",
        timerMinutes: 2,
      },
      {
        text: "Sirva bem quente, polvilhado com gergelim. Se o molho ficar grosso demais, acrescente um pouco de água.",
      },
    ],
    tips: [
      "Encontre o tteok em mercados asiáticos, geralmente na seção de refrigerados ou congelados.",
      "O molho engrossa rápido com o amido do arroz; mexa sempre e ajuste com água se necessário.",
      "Um ovo cozido cortado ao meio é um acompanhamento clássico para quem não segue dieta vegana.",
    ],
    substitutions: [
      { ingredient: "pimenta coreana em flocos", substitute: "páprica picante com uma pitada de pimenta calabresa" },
      { ingredient: "caldo de legumes", substitute: "água com 1 colher de sopa de missô" },
    ],
    nutrition: { protein: 8, carbs: 90, fat: 2, fiber: 3, sodium: 1300 },
  },
  // 15
  {
    slug: "salada-de-pepino-oriental",
    title: "Salada de Pepino Oriental",
    description:
      "Pepino fatiado finíssimo, temperado com molho de soja, óleo de gergelim, vinagre de arroz e pimenta. Crocante, refrescante e pronta em minutos.",
    emoji: "🥒",
    cuisine: "coreana",
    categories: ["saladas", "vegetarianas-e-veganas", "fitness", "economicas"],
    prepMinutes: 10,
    cookMinutes: 0,
    servings: 2,
    difficulty: "EASY",
    caloriesPerServing: 90,
    costLevel: "LOW",
    tags: ["pepino", "salada", "rápida", "refrescante"],
    ingredients: [
      { name: "pepino", quantity: 2, unit: "unidade", group: "HORTIFRUTI", note: "japonês" },
      { name: "sal", quantity: 0.5, unit: "colher de chá", group: "TEMPEROS" },
      { name: "molho de soja", quantity: 1, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "vinagre de arroz", quantity: 1, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "óleo de gergelim", quantity: 1, unit: "colher de chá", group: "MERCEARIA" },
      { name: "açúcar", quantity: 0.5, unit: "colher de chá", group: "MERCEARIA" },
      { name: "alho", quantity: 1, unit: "dente", group: "HORTIFRUTI", note: "ralado" },
      { name: "pimenta calabresa", quantity: 0.5, unit: "colher de chá", group: "TEMPEROS" },
      { name: "gergelim", quantity: 1, unit: "colher de chá", group: "MERCEARIA" },
      { name: "cebolinha", quantity: 1, unit: "colher de sopa", group: "HORTIFRUTI", note: "picada", optional: true },
    ],
    steps: [
      {
        text: "Lave os pepinos e fatie em rodelas bem finas, com faca afiada ou mandolim. Uma forma prática é fatiar dentro de um pote com tampa.",
      },
      {
        text: "Polvilhe o sal, misture e deixe descansar por 10 minutos. Descarte o líquido que se formar no fundo, o que deixa o pepino mais crocante e evita uma salada aguada.",
        timerMinutes: 10,
      },
      {
        text: "Adicione o molho de soja, o vinagre de arroz, o óleo de gergelim, o açúcar, o alho e a pimenta calabresa.",
      },
      {
        text: "Tampe o pote e chacoalhe vigorosamente por alguns segundos para distribuir o tempero. Finalize com gergelim e cebolinha e sirva gelada.",
      },
    ],
    tips: [
      "O pepino japonês tem menos sementes e casca fina, ideal para essa salada.",
      "Consuma no mesmo dia: com o tempo, o pepino perde a crocância.",
    ],
    substitutions: [
      { ingredient: "vinagre de arroz", substitute: "suco de limão" },
      { ingredient: "pimenta calabresa", substitute: "óleo de pimenta" },
    ],
    nutrition: { protein: 3, carbs: 9, fat: 5, fiber: 2, sodium: 860 },
    viral: {
      platform: "TIKTOK",
      trendYear: 2023,
      note: "Salada de pepino fatiado temperada com molho de soja, óleo de gergelim e pimenta, popularizada por uma série de vídeos no TikTok em 2023.",
    },
  },
  // 16
  {
    slug: "frango-xadrez",
    title: "Frango Xadrez",
    description:
      "Cubos de frango salteados com pimentões coloridos, cebola e amendoim em molho de shoyu encorpado. Clássico dos restaurantes chineses no Brasil.",
    emoji: "🥡",
    cuisine: "chinesa",
    categories: ["frangos"],
    prepMinutes: 20,
    cookMinutes: 20,
    servings: 4,
    difficulty: "EASY",
    caloriesPerServing: 380,
    costLevel: "LOW",
    tags: ["frango", "pimentão", "amendoim", "salteado"],
    ingredients: [
      { name: "peito de frango", quantity: 700, unit: "g", group: "CARNES", note: "em cubos de 2 cm" },
      { name: "pimentão verde", quantity: 1, unit: "unidade", group: "HORTIFRUTI", note: "em quadrados" },
      { name: "pimentão vermelho", quantity: 1, unit: "unidade", group: "HORTIFRUTI", note: "em quadrados" },
      { name: "pimentão amarelo", quantity: 1, unit: "unidade", group: "HORTIFRUTI", note: "em quadrados" },
      { name: "cebola", quantity: 2, unit: "unidade", group: "HORTIFRUTI", note: "em quadrados" },
      { name: "alho", quantity: 3, unit: "dente", group: "HORTIFRUTI", note: "picados" },
      { name: "molho de soja", quantity: 6, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "amido de milho", quantity: 2, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "água", quantity: 200, unit: "ml", group: "OUTROS" },
      { name: "amendoim torrado", quantity: 80, unit: "g", group: "MERCEARIA", note: "sem pele e sem sal" },
      { name: "óleo", quantity: 3, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "pimenta-do-reino", quantity: null, unit: "a gosto", group: "TEMPEROS" },
    ],
    steps: [
      {
        text: "Tempere o frango com 2 colheres de sopa de molho de soja, 1 colher de sopa de amido de milho e pimenta-do-reino, misturando bem. Deixe marinar por 15 minutos.",
        timerMinutes: 15,
      },
      {
        text: "Prepare o molho dissolvendo o restante do amido na água com o restante do molho de soja. Reserve.",
      },
      {
        text: "Aqueça 2 colheres de sopa de óleo em uma wok ou frigideira grande em fogo alto. Doure o frango em duas levas, por 4 a 5 minutos cada, até ficar dourado por fora e cozido por dentro. Reserve.",
        timerMinutes: 10,
      },
      {
        text: "Na mesma panela, aqueça o restante do óleo, refogue o alho por 30 segundos e junte a cebola e os pimentões. Salteie em fogo alto por 3 minutos, até ficarem levemente macios mas ainda crocantes.",
        timerMinutes: 3,
      },
      {
        text: "Volte o frango à panela, mexa o molho reservado e despeje. Cozinhe por 1 a 2 minutos, mexendo, até o molho engrossar e ficar brilhante.",
        timerMinutes: 2,
      },
      {
        text: "Desligue o fogo, misture o amendoim e sirva imediatamente com arroz branco.",
      },
    ],
    tips: [
      "Corte frango, pimentões e cebola em tamanhos parecidos: é isso que dá o visual de 'xadrez' ao prato.",
      "Adicione o amendoim só no final para ele continuar crocante.",
    ],
    substitutions: [
      { ingredient: "amendoim torrado", substitute: "castanha de caju" },
      { ingredient: "peito de frango", substitute: "coxa de frango desossada, mais suculenta" },
    ],
    nutrition: { protein: 44, carbs: 18, fat: 15, fiber: 4, sodium: 1300 },
  },
  // 17
  {
    slug: "arroz-frito-chines",
    title: "Arroz Frito Chinês",
    description:
      "Arroz do dia anterior salteado em fogo alto com ovo, cenoura, ervilha, presunto e cebolinha. Rápido, barato e perfeito para aproveitar sobras.",
    emoji: "🍳",
    cuisine: "chinesa",
    categories: ["economicas"],
    prepMinutes: 10,
    cookMinutes: 15,
    servings: 4,
    difficulty: "EASY",
    caloriesPerServing: 360,
    costLevel: "LOW",
    tags: ["arroz", "sobras", "ovo", "rápido"],
    ingredients: [
      { name: "arroz branco", quantity: 4, unit: "xícara", group: "MERCEARIA", note: "cozido e frio, de preferência do dia anterior" },
      { name: "ovo", quantity: 3, unit: "unidade", group: "LATICINIOS" },
      { name: "cenoura", quantity: 1, unit: "unidade", group: "HORTIFRUTI", note: "em cubinhos" },
      { name: "ervilha", quantity: 100, unit: "g", group: "CONGELADOS", note: "congelada" },
      { name: "presunto", quantity: 100, unit: "g", group: "LATICINIOS", note: "em cubinhos" },
      { name: "alho", quantity: 2, unit: "dente", group: "HORTIFRUTI", note: "picados" },
      { name: "cebolinha", quantity: 4, unit: "colher de sopa", group: "HORTIFRUTI", note: "picada" },
      { name: "molho de soja", quantity: 3, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "óleo de gergelim", quantity: 1, unit: "colher de chá", group: "MERCEARIA" },
      { name: "óleo", quantity: 3, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "sal", quantity: null, unit: "a gosto", group: "TEMPEROS" },
    ],
    steps: [
      {
        text: "Solte bem os grãos do arroz frio com as mãos ou um garfo, desfazendo os torrões.",
      },
      {
        text: "Aqueça 1 colher de sopa de óleo em uma wok ou frigideira grande em fogo médio-alto. Despeje os ovos batidos e mexa por cerca de 1 minuto, até ficarem cozidos mas ainda macios. Retire e reserve.",
        timerMinutes: 1,
      },
      {
        text: "Adicione o restante do óleo, o alho e a cenoura e salteie por 2 minutos. Junte a ervilha e o presunto e salteie por mais 2 minutos.",
        timerMinutes: 4,
      },
      {
        text: "Aumente para fogo alto, acrescente o arroz e espalhe pela panela. Deixe tostar levemente sem mexer por 1 minuto e depois salteie por 3 a 4 minutos, até os grãos ficarem soltos e quentes.",
        timerMinutes: 5,
      },
      {
        text: "Regue com o molho de soja pelas bordas da panela, para caramelizar, e misture bem. Volte os ovos, junte a cebolinha e o óleo de gergelim, ajuste o sal e sirva.",
      },
    ],
    tips: [
      "Arroz recém-cozido fica empapado; use arroz frio de geladeira, que tem os grãos mais secos e soltinhos.",
      "Trabalhe em fogo alto e sem encher demais a panela; se necessário, faça em duas levas.",
      "Sobras de frango, carne ou legumes podem entrar no lugar do presunto.",
    ],
    substitutions: [
      { ingredient: "presunto", substitute: "frango desfiado, camarão ou tofu" },
      { ingredient: "ervilha", substitute: "milho verde" },
    ],
    nutrition: { protein: 14, carbs: 50, fat: 12, fiber: 3, sodium: 1050 },
  },
  // 18
  {
    slug: "rolinho-primavera-na-air-fryer",
    title: "Rolinho Primavera na Air Fryer",
    description:
      "Rolinhos crocantes recheados com repolho, cenoura, broto de feijão e cogumelos, dourados na air fryer com pouquíssimo óleo.",
    emoji: "🌯",
    cuisine: "chinesa",
    categories: ["air-fryer", "vegetarianas-e-veganas"],
    prepMinutes: 35,
    cookMinutes: 25,
    servings: 6,
    difficulty: "MEDIUM",
    caloriesPerServing: 190,
    costLevel: "LOW",
    tags: ["rolinho", "air fryer", "legumes", "crocante"],
    ingredients: [
      { name: "massa para rolinho primavera", quantity: 12, unit: "unidade", group: "CONGELADOS" },
      { name: "repolho", quantity: 250, unit: "g", group: "HORTIFRUTI", note: "em tiras finas" },
      { name: "cenoura", quantity: 2, unit: "unidade", group: "HORTIFRUTI", note: "raladas grosso" },
      { name: "broto de feijão", quantity: 150, unit: "g", group: "HORTIFRUTI" },
      { name: "cogumelo shiitake", quantity: 150, unit: "g", group: "HORTIFRUTI", note: "fatiado" },
      { name: "cebolinha", quantity: 4, unit: "colher de sopa", group: "HORTIFRUTI", note: "picada" },
      { name: "alho", quantity: 2, unit: "dente", group: "HORTIFRUTI", note: "picados" },
      { name: "gengibre", quantity: 1, unit: "colher de chá", group: "HORTIFRUTI", note: "ralado" },
      { name: "molho de soja", quantity: 2, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "óleo de gergelim", quantity: 1, unit: "colher de chá", group: "MERCEARIA" },
      { name: "amido de milho", quantity: 1, unit: "colher de sopa", group: "MERCEARIA", note: "para selar, misturado com 2 colheres de sopa de água" },
      { name: "óleo", quantity: 2, unit: "colher de sopa", group: "MERCEARIA" },
    ],
    steps: [
      {
        text: "Aqueça 1 colher de sopa de óleo em uma frigideira grande em fogo alto e refogue o alho e o gengibre por 30 segundos. Junte o shiitake e salteie por 3 minutos, até dourar.",
        timerMinutes: 3,
      },
      {
        text: "Adicione o repolho e a cenoura e salteie por 3 a 4 minutos, até murcharem levemente. Junte o broto de feijão, o molho de soja e o óleo de gergelim e cozinhe por mais 1 minuto.",
        timerMinutes: 5,
      },
      {
        text: "Transfira o recheio para uma peneira e deixe esfriar e escorrer completamente por 15 minutos. Misture a cebolinha. Um recheio úmido rasga a massa e impede a crocância.",
        timerMinutes: 15,
      },
      {
        text: "Coloque uma folha de massa em formato de losango e distribua cerca de 2 colheres de sopa de recheio na parte inferior. Dobre a ponta de baixo sobre o recheio, depois as laterais, e enrole bem firme. Sele a ponta com a mistura de amido e água.",
      },
      {
        text: "Preaqueça a air fryer a 200 °C por 3 minutos. Pincele levemente os rolinhos com o restante do óleo por todos os lados.",
        timerMinutes: 3,
      },
      {
        text: "Arrume os rolinhos no cesto sem encostar uns nos outros, com a emenda para baixo. Asse por 8 a 10 minutos, virando na metade do tempo, até ficarem dourados e crocantes. Repita com o restante.",
        timerMinutes: 10,
      },
      {
        text: "Sirva quente com molho agridoce ou molho de soja com um pouco de vinagre.",
      },
    ],
    tips: [
      "Mantenha as folhas de massa cobertas com um pano úmido enquanto monta para não ressecarem.",
      "Os rolinhos crus congelam bem: asse direto do congelador, acrescentando 3 a 4 minutos.",
    ],
    substitutions: [
      { ingredient: "cogumelo shiitake", substitute: "cogumelo champignon ou paris" },
      { ingredient: "broto de feijão", substitute: "acelga em tiras finas" },
    ],
    nutrition: { protein: 5, carbs: 28, fat: 7, fiber: 3, sodium: 480 },
  },
  // 19
  {
    slug: "carne-com-brocolis",
    title: "Carne com Brócolis",
    description:
      "Tiras macias de carne e brócolis verdinho salteados em molho de shoyu, alho e gengibre. Rico em proteína e pronto em menos de 30 minutos.",
    emoji: "🥦",
    cuisine: "chinesa",
    categories: ["carnes-e-churrasco", "fitness"],
    prepMinutes: 20,
    cookMinutes: 15,
    servings: 4,
    difficulty: "EASY",
    caloriesPerServing: 330,
    costLevel: "MEDIUM",
    tags: ["carne", "brócolis", "proteína", "salteado"],
    ingredients: [
      { name: "patinho", quantity: 600, unit: "g", group: "CARNES", note: "em tiras finas" },
      { name: "brócolis", quantity: 500, unit: "g", group: "HORTIFRUTI", note: "ramoso, em floretes" },
      { name: "alho", quantity: 3, unit: "dente", group: "HORTIFRUTI", note: "picados" },
      { name: "gengibre", quantity: 1, unit: "colher de sopa", group: "HORTIFRUTI", note: "ralado" },
      { name: "molho de soja", quantity: 5, unit: "colher de sopa", group: "MERCEARIA", note: "de preferência com menos sódio" },
      { name: "amido de milho", quantity: 2, unit: "colher de chá", group: "MERCEARIA" },
      { name: "mel", quantity: 1, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "água", quantity: 150, unit: "ml", group: "OUTROS" },
      { name: "óleo", quantity: 2, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "óleo de gergelim", quantity: 1, unit: "colher de chá", group: "MERCEARIA" },
      { name: "gergelim", quantity: 1, unit: "colher de chá", group: "MERCEARIA" },
    ],
    steps: [
      {
        text: "Misture a carne com 2 colheres de sopa de molho de soja e 1 colher de chá de amido de milho e deixe marinar por 15 minutos. O amido protege a carne e a deixa macia.",
        timerMinutes: 15,
      },
      {
        text: "Prepare o molho com a água, o restante do molho de soja, o mel e o restante do amido. Reserve.",
      },
      {
        text: "Cozinhe o brócolis no vapor ou em água fervente por 2 minutos, até ficar verde vivo e ainda firme. Escorra e reserve.",
        timerMinutes: 2,
      },
      {
        text: "Aqueça o óleo em uma wok ou frigideira grande em fogo alto até começar a soltar fumaça. Sele a carne em duas levas, por 2 a 3 minutos cada, até dourar. Reserve.",
        timerMinutes: 6,
      },
      {
        text: "Na mesma panela, refogue o alho e o gengibre por 30 segundos. Mexa o molho e despeje, cozinhando até engrossar, por cerca de 1 minuto.",
        timerMinutes: 1,
      },
      {
        text: "Volte a carne e o brócolis, misture para envolver tudo no molho e cozinhe por mais 1 minuto. Finalize com óleo de gergelim e gergelim e sirva com arroz branco ou integral.",
        timerMinutes: 1,
      },
    ],
    tips: [
      "Deixe a carne 20 minutos no congelador antes de cortar: fica muito mais fácil fatiar fininho.",
      "Não cozinhe demais o brócolis; ele termina de cozinhar no calor do molho.",
    ],
    substitutions: [
      { ingredient: "patinho", substitute: "alcatra ou fraldinha" },
      { ingredient: "mel", substitute: "açúcar mascavo" },
    ],
    nutrition: { protein: 40, carbs: 14, fat: 13, fiber: 4, sodium: 1150 },
  },
  // 20
  {
    slug: "porco-agridoce",
    title: "Porco Agridoce",
    description:
      "Cubos de lombo de porco empanados e crocantes envolvidos em molho agridoce com abacaxi e pimentões. O equilíbrio perfeito entre doce, ácido e salgado.",
    emoji: "🍍",
    cuisine: "chinesa",
    categories: ["carnes-e-churrasco"],
    prepMinutes: 25,
    cookMinutes: 25,
    servings: 4,
    difficulty: "MEDIUM",
    caloriesPerServing: 560,
    costLevel: "MEDIUM",
    tags: ["porco", "agridoce", "abacaxi", "crocante"],
    ingredients: [
      { name: "lombo de porco", quantity: 600, unit: "g", group: "CARNES", note: "em cubos de 2,5 cm" },
      { name: "ovo", quantity: 1, unit: "unidade", group: "LATICINIOS" },
      { name: "amido de milho", quantity: 100, unit: "g", group: "MERCEARIA" },
      { name: "sal", quantity: 1, unit: "colher de chá", group: "TEMPEROS" },
      { name: "óleo", quantity: 1, unit: "l", group: "MERCEARIA", note: "para fritar" },
      { name: "abacaxi", quantity: 200, unit: "g", group: "HORTIFRUTI", note: "em cubos" },
      { name: "pimentão vermelho", quantity: 1, unit: "unidade", group: "HORTIFRUTI", note: "em quadrados" },
      { name: "pimentão verde", quantity: 1, unit: "unidade", group: "HORTIFRUTI", note: "em quadrados" },
      { name: "cebola", quantity: 1, unit: "unidade", group: "HORTIFRUTI", note: "em pétalas" },
      { name: "ketchup", quantity: 4, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "vinagre de arroz", quantity: 4, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "açúcar", quantity: 4, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "molho de soja", quantity: 2, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "água", quantity: 120, unit: "ml", group: "OUTROS" },
    ],
    steps: [
      {
        text: "Tempere o porco com o sal e o ovo batido e misture bem. Passe os cubos em 80 g do amido de milho, apertando para aderir, e deixe descansar por 10 minutos para a crosta firmar.",
        timerMinutes: 10,
      },
      {
        text: "Aqueça o óleo em panela funda a 175 °C. Frite o porco em levas por 5 a 6 minutos, até dourar e cozinhar por dentro. Escorra em uma grade ou papel-toalha.",
        timerMinutes: 6,
      },
      {
        text: "Para ficar extra crocante, aumente o óleo para 190 °C e frite tudo de novo por 1 a 2 minutos, até ficar bem dourado.",
        timerMinutes: 2,
      },
      {
        text: "Prepare o molho misturando o ketchup, o vinagre, o açúcar, o molho de soja, a água e o restante do amido de milho.",
      },
      {
        text: "Em uma wok com 1 colher de sopa de óleo em fogo alto, salteie a cebola e os pimentões por 2 minutos, até ficarem brilhantes e ainda crocantes. Junte o abacaxi e salteie por mais 1 minuto.",
        timerMinutes: 3,
      },
      {
        text: "Despeje o molho e cozinhe, mexendo, por 1 a 2 minutos, até engrossar e ficar translúcido e brilhante.",
        timerMinutes: 2,
      },
      {
        text: "Desligue o fogo, adicione o porco frito e misture rapidamente para envolver no molho. Sirva imediatamente com arroz branco, antes que a crosta amoleça.",
      },
    ],
    tips: [
      "Prove o molho antes de juntar o porco e ajuste o equilíbrio com mais açúcar ou vinagre a seu gosto.",
      "Abacaxi fresco dá mais acidez e frescor; se usar em calda, reduza o açúcar do molho.",
      "Para uma versão mais leve, asse o porco empanado na air fryer a 200 °C por 12 a 15 minutos.",
    ],
    substitutions: [
      { ingredient: "lombo de porco", substitute: "peito de frango em cubos" },
      { ingredient: "vinagre de arroz", substitute: "vinagre de maçã" },
    ],
    nutrition: { protein: 34, carbs: 52, fat: 23, fiber: 2, sodium: 980 },
  },
];
