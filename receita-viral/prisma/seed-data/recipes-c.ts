import type { SeedRecipe } from "./types";

export const recipesC: SeedRecipe[] = [
  // 1
  {
    slug: "pizza-margherita",
    title: "Pizza Margherita",
    description:
      "A clássica napolitana com molho de tomate simples, muçarela derretida e manjericão fresco. Massa de fermentação lenta, borda aerada e fundo crocante feitos no forno de casa.",
    emoji: "🍕",
    cuisine: "italiana",
    categories: ["massas-e-pizzas", "vegetarianas-e-veganas"],
    prepMinutes: 120,
    cookMinutes: 20,
    servings: 4,
    difficulty: "MEDIUM",
    caloriesPerServing: 670,
    costLevel: "MEDIUM",
    tags: ["pizza", "massa caseira", "manjericão", "forno", "clássico"],
    ingredients: [
      { name: "farinha de trigo", quantity: 500, unit: "g", group: "MERCEARIA", note: "de preferência tipo 1 ou 00" },
      { name: "água", quantity: 325, unit: "ml", group: "BEBIDAS", note: "em temperatura ambiente" },
      { name: "fermento biológico seco", quantity: 5, unit: "g", group: "MERCEARIA" },
      { name: "açúcar", quantity: 1, unit: "colher de chá", group: "MERCEARIA" },
      { name: "sal", quantity: 10, unit: "g", group: "TEMPEROS", note: "para a massa, mais um pouco para o molho" },
      { name: "azeite", quantity: 3, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "tomate pelado", quantity: 1, unit: "lata", group: "MERCEARIA", note: "cerca de 400 g" },
      { name: "alho", quantity: 1, unit: "dente", group: "HORTIFRUTI", note: "amassado" },
      { name: "queijo muçarela", quantity: 300, unit: "g", group: "LATICINIOS", note: "em fatias ou rasgada (pode ser de búfala)" },
      { name: "manjericão", quantity: 1, unit: "maço", group: "HORTIFRUTI", note: "só as folhas" },
    ],
    steps: [
      {
        text: "Em uma tigela, misture a farinha, o fermento e o açúcar. Adicione a água aos poucos e, por último, o sal e 1 colher de sopa de azeite. Sove por 10 minutos, até a massa ficar lisa, elástica e parar de grudar nas mãos.",
        timerMinutes: 10,
      },
      {
        text: "Divida a massa em duas bolas, coloque em recipientes untados com um fio de azeite, cubra e deixe crescer em local abrigado até dobrar de volume.",
        timerMinutes: 90,
      },
      {
        text: "Enquanto isso, prepare o molho: amasse os tomates pelados com as mãos ou um garfo, tempere com o alho amassado, 1 colher de sopa de azeite e uma pitada de sal. Não cozinhe — o molho cru assa junto com a pizza e fica mais fresco.",
      },
      {
        text: "Preaqueça o forno na temperatura máxima (250 °C ou mais) com a assadeira ou pedra dentro, para que ela fique bem quente.",
        timerMinutes: 30,
      },
      {
        text: "Em uma superfície enfarinhada, abra cada bola com as pontas dos dedos, do centro para fora, preservando uma borda de 2 cm mais alta. Evite o rolo para não tirar o ar da massa.",
      },
      {
        text: "Espalhe uma camada fina de molho, deixando a borda livre, e distribua a muçarela bem escorrida. Transfira a pizza com cuidado para a assadeira quente.",
      },
      {
        text: "Asse por 8 a 10 minutos, até a borda ficar dourada com pontos tostados e o queijo borbulhar. Repita com a segunda pizza.",
        timerMinutes: 10,
      },
      {
        text: "Retire do forno, finalize com as folhas de manjericão e um fio de azeite cru. Corte e sirva imediatamente.",
      },
    ],
    tips: [
      "Para uma massa mais saborosa e leve, faça a fermentação na geladeira por 24 horas e tire 2 horas antes de abrir.",
      "Seque bem a muçarela com papel-toalha: queijo com muito soro deixa o centro da pizza encharcado.",
      "Coloque o manjericão só depois de assar para que ele não escureça nem amargue.",
    ],
    substitutions: [
      { ingredient: "tomate pelado", substitute: "tomates italianos maduros, sem pele e sem sementes, bem amassados" },
      { ingredient: "fermento biológico seco", substitute: "15 g de fermento biológico fresco" },
    ],
    nutrition: { protein: 28, carbs: 95, fat: 20, fiber: 5, sodium: 1200 },
  },

  // 2
  {
    slug: "lasanha-a-bolonhesa",
    title: "Lasanha à Bolonhesa",
    description:
      "Camadas de massa, ragu de carne cozido sem pressa, molho branco cremoso e queijo gratinado. O prato de domingo que agrada a família inteira.",
    emoji: "🍝",
    cuisine: "italiana",
    categories: ["massas-e-pizzas", "carnes-e-churrasco"],
    prepMinutes: 40,
    cookMinutes: 90,
    servings: 8,
    difficulty: "MEDIUM",
    caloriesPerServing: 690,
    costLevel: "MEDIUM",
    tags: ["lasanha", "bolonhesa", "molho branco", "forno", "almoço de domingo"],
    ingredients: [
      { name: "massa para lasanha", quantity: 500, unit: "g", group: "MERCEARIA", note: "pré-cozida" },
      { name: "carne moída", quantity: 800, unit: "g", group: "CARNES", note: "patinho ou acém" },
      { name: "cebola", quantity: 1, unit: "unidade", group: "HORTIFRUTI", note: "picada fino" },
      { name: "cenoura", quantity: 1, unit: "unidade", group: "HORTIFRUTI", note: "ralada fino" },
      { name: "alho", quantity: 3, unit: "dente", group: "HORTIFRUTI", note: "picado" },
      { name: "tomate pelado", quantity: 2, unit: "lata", group: "MERCEARIA", note: "cerca de 800 g no total" },
      { name: "manteiga", quantity: 50, unit: "g", group: "LATICINIOS" },
      { name: "farinha de trigo", quantity: 50, unit: "g", group: "MERCEARIA" },
      { name: "leite", quantity: 1, unit: "l", group: "LATICINIOS" },
      { name: "noz-moscada", quantity: 1, unit: "pitada", group: "TEMPEROS" },
      { name: "queijo muçarela", quantity: 400, unit: "g", group: "LATICINIOS", note: "fatiada" },
      { name: "queijo parmesão", quantity: 100, unit: "g", group: "LATICINIOS", note: "ralado" },
      { name: "sal", quantity: null, unit: "a gosto", group: "TEMPEROS" },
      { name: "pimenta-do-reino", quantity: null, unit: "a gosto", group: "TEMPEROS" },
    ],
    steps: [
      {
        text: "Aqueça uma panela grande em fogo alto e doure a carne moída em duas levas, sem mexer demais, até formar uma crosta marrom. Retire e reserve.",
        timerMinutes: 10,
      },
      {
        text: "Na mesma panela, em fogo médio, refogue a cebola e a cenoura na gordura que ficou por 5 minutos, até amolecerem. Junte o alho e refogue por mais 1 minuto, sem deixar queimar.",
        timerMinutes: 6,
      },
      {
        text: "Volte a carne à panela, acrescente os tomates pelados amassados e 1 xícara de água. Tempere com sal e pimenta, tampe parcialmente e cozinhe em fogo baixo, mexendo de vez em quando, até o molho engrossar e ficar bem encorpado.",
        timerMinutes: 40,
      },
      {
        text: "Para o molho branco, derreta a manteiga em fogo médio, junte a farinha e mexa por 2 minutos. Adicione o leite frio aos poucos, batendo com um fouet para não empelotar, e cozinhe até engrossar e cobrir as costas da colher. Tempere com sal e noz-moscada.",
        timerMinutes: 10,
      },
      {
        text: "Preaqueça o forno a 200 °C. Em um refratário de cerca de 30 x 20 cm, espalhe uma concha de bolonhesa no fundo e monte camadas: massa, bolonhesa, molho branco e muçarela. Repita até acabarem os ingredientes, terminando com bolonhesa, molho branco e parmesão.",
      },
      {
        text: "Cubra com papel-alumínio e asse por 25 minutos. Retire o papel e deixe gratinar por mais 15 minutos, até a superfície ficar dourada e borbulhante.",
        timerMinutes: 40,
      },
      {
        text: "Deixe a lasanha descansar fora do forno antes de cortar, para as camadas firmarem e os pedaços saírem inteiros.",
        timerMinutes: 15,
      },
    ],
    tips: [
      "A massa pré-cozida absorve líquido no forno, então deixe a bolonhesa um pouco mais rala do que o normal.",
      "A bolonhesa fica ainda mais saborosa se feita na véspera e guardada na geladeira.",
      "A lasanha montada pode ser congelada crua por até 3 meses; asse direto do congelador, coberta, por cerca de 1 hora.",
    ],
    substitutions: [
      { ingredient: "tomate pelado", substitute: "molho de tomate pronto (cerca de 700 g)" },
      { ingredient: "queijo muçarela", substitute: "queijo prato" },
    ],
    nutrition: { protein: 40, carbs: 55, fat: 34, fiber: 4, sodium: 950 },
  },

  // 3
  {
    slug: "espaguete-a-carbonara",
    title: "Espaguete à Carbonara",
    description:
      "A carbonara de verdade, sem creme de leite: gemas, queijo e pimenta formam um molho sedoso que envolve cada fio de espaguete. Pronta em 20 minutos.",
    emoji: "🍝",
    cuisine: "italiana",
    categories: ["massas-e-pizzas"],
    prepMinutes: 10,
    cookMinutes: 15,
    servings: 4,
    difficulty: "MEDIUM",
    caloriesPerServing: 720,
    costLevel: "MEDIUM",
    tags: ["carbonara", "espaguete", "bacon", "rápida", "massa"],
    ingredients: [
      { name: "macarrão", quantity: 400, unit: "g", group: "MERCEARIA", note: "tipo espaguete" },
      { name: "bacon", quantity: 200, unit: "g", group: "CARNES", note: "em cubos ou tiras grossas" },
      { name: "ovo", quantity: 5, unit: "unidade", group: "LATICINIOS", note: "4 gemas e 1 ovo inteiro, em temperatura ambiente" },
      { name: "queijo parmesão", quantity: 80, unit: "g", group: "LATICINIOS", note: "ralado fino" },
      { name: "pimenta-do-reino", quantity: 1, unit: "colher de chá", group: "TEMPEROS", note: "moída na hora" },
      { name: "sal", quantity: null, unit: "a gosto", group: "TEMPEROS", note: "para a água do macarrão" },
    ],
    steps: [
      {
        text: "Leve uma panela grande com água ao fogo alto. Quando ferver, salgue com moderação (o bacon e o queijo já são salgados).",
        timerMinutes: 10,
      },
      {
        text: "Em uma tigela, bata as gemas, o ovo inteiro, o parmesão e a pimenta-do-reino com um garfo até formar um creme espesso. Reserve.",
      },
      {
        text: "Coloque o bacon em uma frigideira grande ainda fria e leve ao fogo médio. Deixe a gordura derreter e o bacon dourar, mexendo às vezes, até ficar crocante por fora. Desligue o fogo e mantenha o bacon com a gordura na frigideira.",
        timerMinutes: 8,
      },
      {
        text: "Cozinhe o espaguete até ficar al dente, 1 minuto a menos que o indicado na embalagem. Antes de escorrer, reserve 1 xícara da água do cozimento.",
        timerMinutes: 9,
      },
      {
        text: "Transfira o espaguete para a frigideira com o bacon, com o fogo desligado, e mexa para envolver na gordura. Espere cerca de 1 minuto para a temperatura baixar um pouco.",
        timerMinutes: 1,
      },
      {
        text: "Despeje a mistura de ovos e mexa vigorosamente com um pegador, adicionando a água do cozimento aos poucos, até formar um molho cremoso e brilhante que envolva os fios. Se o molho ficar ralo, leve ao fogo mínimo por alguns segundos sem parar de mexer.",
      },
      {
        text: "Sirva imediatamente, finalizando com mais parmesão e pimenta-do-reino moída na hora.",
      },
    ],
    tips: [
      "Nunca adicione os ovos com a frigideira no fogo alto: eles talham e viram ovo mexido.",
      "A água do cozimento, rica em amido, é o que deixa o molho liso e cremoso — não pule essa etapa.",
      "Na receita tradicional usa-se guanciale (bochecha de porco curada) e pecorino romano; se encontrar, experimente.",
    ],
    substitutions: [
      { ingredient: "bacon", substitute: "pancetta ou guanciale" },
      { ingredient: "queijo parmesão", substitute: "queijo pecorino romano ou meio a meio com parmesão" },
    ],
    nutrition: { protein: 32, carbs: 75, fat: 32, fiber: 3, sodium: 1100 },
  },

  // 4
  {
    slug: "tiramisu",
    title: "Tiramisù",
    description:
      "Biscoitos embebidos em café, creme aveludado de mascarpone e uma camada generosa de cacau. Uma sobremesa italiana que melhora depois de uma noite na geladeira.",
    emoji: "☕",
    cuisine: "italiana",
    categories: ["sobremesas-e-doces"],
    prepMinutes: 40,
    cookMinutes: 10,
    servings: 8,
    difficulty: "MEDIUM",
    caloriesPerServing: 430,
    costLevel: "HIGH",
    tags: ["tiramisu", "café", "mascarpone", "sobremesa gelada", "sem forno"],
    ingredients: [
      { name: "queijo mascarpone", quantity: 500, unit: "g", group: "LATICINIOS", note: "gelado" },
      { name: "ovo", quantity: 4, unit: "unidade", group: "LATICINIOS", note: "gemas e claras separadas" },
      { name: "açúcar", quantity: 100, unit: "g", group: "MERCEARIA" },
      { name: "biscoito champanhe", quantity: 200, unit: "g", group: "MERCEARIA" },
      { name: "café", quantity: 300, unit: "ml", group: "BEBIDAS", note: "forte, coado ou espresso, em temperatura ambiente" },
      { name: "conhaque", quantity: 3, unit: "colher de sopa", group: "BEBIDAS", optional: true, note: "ou licor de café ou marsala" },
      { name: "cacau em pó", quantity: 2, unit: "colher de sopa", group: "MERCEARIA", note: "100% para polvilhar" },
    ],
    steps: [
      {
        text: "Em uma tigela refratária, misture as gemas com metade do açúcar. Leve ao banho-maria em fogo baixo, batendo sem parar com um fouet, até a mistura ficar clara, espessa e bem quente ao toque (cerca de 70 °C). Retire e deixe esfriar.",
        timerMinutes: 8,
      },
      {
        text: "Junte o mascarpone gelado às gemas frias e misture delicadamente com uma espátula até ficar homogêneo. Não bata demais, para o creme não talhar.",
      },
      {
        text: "Bata as claras em neve e, quando começarem a firmar, adicione o restante do açúcar aos poucos, batendo até formar picos firmes e brilhantes.",
      },
      {
        text: "Incorpore as claras ao creme de mascarpone em três etapas, com movimentos de baixo para cima, para preservar o ar e deixar o creme leve.",
      },
      {
        text: "Misture o café com o conhaque, se usar. Passe cada biscoito rapidamente no café, cerca de 1 segundo de cada lado — eles devem umedecer sem desmanchar — e forre o fundo de um refratário de cerca de 20 x 30 cm.",
      },
      {
        text: "Cubra com metade do creme, faça outra camada de biscoitos umedecidos e finalize com o restante do creme, alisando a superfície.",
      },
      {
        text: "Cubra com filme plástico e leve à geladeira por pelo menos 6 horas, de preferência de um dia para o outro, até ficar firme para cortar.",
        timerMinutes: 360,
      },
      {
        text: "Na hora de servir, polvilhe o cacau em pó com uma peneira fina sobre toda a superfície.",
      },
    ],
    tips: [
      "Polvilhe o cacau só na hora de servir; antes disso ele absorve umidade e fica empapado.",
      "Cozinhar as gemas em banho-maria deixa o creme mais seguro e estável do que a versão com ovos crus.",
      "Use café em temperatura ambiente: café quente amolece demais o biscoito.",
    ],
    substitutions: [
      { ingredient: "queijo mascarpone", substitute: "cream cheese misturado com creme de leite fresco batido (3:1)" },
      { ingredient: "biscoito champanhe", substitute: "biscoito savoiardi" },
    ],
    nutrition: { protein: 8, carbs: 35, fat: 28, fiber: 1, sodium: 90 },
  },

  // 5
  {
    slug: "risoto-de-cogumelos",
    title: "Risoto de Cogumelos",
    description:
      "Arroz arbóreo cremoso cozido no caldo, com cogumelos dourados na manteiga e parmesão. Aconchegante, perfumado e sem nenhum creme de leite.",
    emoji: "🍄",
    cuisine: "italiana",
    categories: ["vegetarianas-e-veganas"],
    prepMinutes: 15,
    cookMinutes: 35,
    servings: 4,
    difficulty: "MEDIUM",
    caloriesPerServing: 510,
    costLevel: "MEDIUM",
    tags: ["risoto", "cogumelos", "vegetariano", "cremoso", "jantar"],
    ingredients: [
      { name: "arroz arbóreo", quantity: 320, unit: "g", group: "MERCEARIA" },
      { name: "cogumelo paris", quantity: 300, unit: "g", group: "HORTIFRUTI", note: "fatiado" },
      { name: "cogumelo shiitake", quantity: 150, unit: "g", group: "HORTIFRUTI", note: "fatiado, sem os talos" },
      { name: "caldo de legumes", quantity: 1.2, unit: "l", group: "MERCEARIA", note: "quente" },
      { name: "cebola", quantity: 1, unit: "unidade", group: "HORTIFRUTI", note: "picada fino" },
      { name: "alho", quantity: 2, unit: "dente", group: "HORTIFRUTI", note: "picado" },
      { name: "vinho branco seco", quantity: 120, unit: "ml", group: "BEBIDAS" },
      { name: "manteiga", quantity: 40, unit: "g", group: "LATICINIOS", note: "gelada, em cubos" },
      { name: "azeite", quantity: 2, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "queijo parmesão", quantity: 60, unit: "g", group: "LATICINIOS", note: "ralado" },
      { name: "salsinha", quantity: 2, unit: "colher de sopa", group: "HORTIFRUTI", note: "picada" },
      { name: "sal", quantity: null, unit: "a gosto", group: "TEMPEROS" },
      { name: "pimenta-do-reino", quantity: null, unit: "a gosto", group: "TEMPEROS" },
    ],
    steps: [
      {
        text: "Mantenha o caldo de legumes aquecido em fogo mínimo durante todo o preparo — caldo frio interrompe o cozimento do arroz.",
      },
      {
        text: "Em uma frigideira grande, aqueça 1 colher de sopa de azeite e metade da manteiga em fogo alto. Doure os cogumelos sem amontoar, mexendo pouco, até ficarem dourados e o líquido evaporar. Tempere com sal e pimenta e reserve.",
        timerMinutes: 8,
      },
      {
        text: "Em uma panela de fundo grosso, aqueça o restante do azeite em fogo médio e refogue a cebola até ficar transparente. Junte o alho e mexa por mais 30 segundos.",
        timerMinutes: 4,
      },
      {
        text: "Adicione o arroz e mexa por 2 minutos, até os grãos ficarem levemente translúcidos nas bordas. Despeje o vinho e mexa até evaporar quase totalmente.",
        timerMinutes: 3,
      },
      {
        text: "Acrescente o caldo quente uma concha por vez, mexendo com frequência e só adicionando mais quando o anterior for quase todo absorvido. Na metade do tempo, junte metade dos cogumelos.",
        timerMinutes: 18,
      },
      {
        text: "Quando o arroz estiver al dente e o risoto com consistência de onda (escorre devagar ao inclinar a panela), desligue o fogo.",
      },
      {
        text: "Faça a mantecatura: junte a manteiga gelada restante e o parmesão e mexa vigorosamente por 1 minuto, até ficar bem cremoso e brilhante. Acerte o sal.",
      },
      {
        text: "Sirva imediatamente, coberto com o restante dos cogumelos, a salsinha e pimenta-do-reino moída na hora.",
      },
    ],
    tips: [
      "Não lave o arroz arbóreo: o amido da superfície é o que dá cremosidade ao risoto.",
      "Doure os cogumelos em levas se a frigideira for pequena; amontoados, eles soltam água e cozinham em vez de dourar.",
      "Para mais sabor, hidrate 20 g de funghi secos em água quente e use essa água coada junto com o caldo.",
    ],
    substitutions: [
      { ingredient: "vinho branco seco", substitute: "mais caldo com 1 colher de sopa de suco de limão" },
      { ingredient: "arroz arbóreo", substitute: "arroz carnaroli" },
    ],
    nutrition: { protein: 15, carbs: 72, fat: 18, fiber: 4, sodium: 850 },
  },

  // 6
  {
    slug: "macarrao-com-feta-assado",
    title: "Macarrão com Feta Assado",
    description:
      "Um bloco de feta assado entre tomates-cereja que estouram no forno e viram um molho cremoso e levemente ácido. Poucos ingredientes, quase nenhuma louça.",
    emoji: "🧀",
    cuisine: "italiana",
    categories: ["massas-e-pizzas", "vegetarianas-e-veganas"],
    prepMinutes: 10,
    cookMinutes: 35,
    servings: 4,
    difficulty: "EASY",
    caloriesPerServing: 610,
    costLevel: "MEDIUM",
    tags: ["feta", "tomate-cereja", "forno", "vegetariano", "prático"],
    ingredients: [
      { name: "queijo feta", quantity: 200, unit: "g", group: "LATICINIOS", note: "em bloco" },
      { name: "tomate-cereja", quantity: 500, unit: "g", group: "HORTIFRUTI" },
      { name: "azeite", quantity: 80, unit: "ml", group: "MERCEARIA" },
      { name: "alho", quantity: 4, unit: "dente", group: "HORTIFRUTI", note: "inteiros e descascados" },
      { name: "macarrão", quantity: 300, unit: "g", group: "MERCEARIA", note: "curto, tipo penne ou fusilli" },
      { name: "manjericão", quantity: 1, unit: "maço", group: "HORTIFRUTI", note: "só as folhas" },
      { name: "pimenta calabresa", quantity: 1, unit: "pitada", group: "TEMPEROS", optional: true },
      { name: "sal", quantity: null, unit: "a gosto", group: "TEMPEROS" },
      { name: "pimenta-do-reino", quantity: null, unit: "a gosto", group: "TEMPEROS" },
    ],
    steps: [
      {
        text: "Preaqueça o forno a 200 °C. Em um refratário médio, espalhe os tomates-cereja e os dentes de alho, regue com metade do azeite e tempere com uma pitada de sal, pimenta-do-reino e a pimenta calabresa.",
      },
      {
        text: "Coloque o bloco de feta no centro, regue com o restante do azeite e leve ao forno até os tomates estourarem e murcharem e o queijo ficar macio e dourado nas bordas.",
        timerMinutes: 35,
      },
      {
        text: "Enquanto isso, cozinhe o macarrão em água fervente com sal até ficar al dente. Reserve meia xícara da água do cozimento antes de escorrer.",
        timerMinutes: 11,
      },
      {
        text: "Retire o refratário do forno e amasse o feta, os tomates e o alho com um garfo, misturando até formar um molho cremoso e rosado.",
      },
      {
        text: "Junte o macarrão escorrido e as folhas de manjericão rasgadas e misture bem. Se o molho estiver espesso, adicione um pouco da água do cozimento até ficar sedoso. Sirva quente.",
      },
    ],
    tips: [
      "Prove antes de salgar: o feta já é bastante salgado, por isso use pouco sal nos tomates.",
      "Use um refratário em que os tomates fiquem em camada única; empilhados, eles cozinham no vapor e não caramelizam.",
    ],
    substitutions: [
      { ingredient: "queijo feta", substitute: "queijo de cabra ou ricota temperada com sal e azeite" },
      { ingredient: "tomate-cereja", substitute: "tomate sweet grape" },
    ],
    nutrition: { protein: 20, carbs: 66, fat: 30, fiber: 5, sodium: 900 },
    viral: {
      platform: "TIKTOK",
      trendYear: 2021,
      note: "Receita de origem finlandesa (uunifetapasta) que se espalhou pelo TikTok em 2021 e chegou a ser associada a picos de procura por queijo feta em supermercados, segundo a imprensa.",
    },
  },

  // 7
  {
    slug: "chips-de-macarrao-na-air-fryer",
    title: "Chips de Macarrão na Air Fryer",
    description:
      "Macarrão cozido, temperado com parmesão e páprica e transformado em petisco crocante na air fryer. Barato, rápido e perfeito para beliscar com um molhinho.",
    emoji: "🥨",
    cuisine: "italiana",
    categories: ["air-fryer", "comidas-de-boteco", "economicas"],
    prepMinutes: 10,
    cookMinutes: 25,
    servings: 4,
    difficulty: "EASY",
    caloriesPerServing: 320,
    costLevel: "LOW",
    tags: ["petisco", "air fryer", "crocante", "macarrão", "barato"],
    ingredients: [
      { name: "macarrão", quantity: 250, unit: "g", group: "MERCEARIA", note: "curto, tipo penne, farfalle ou rigatoni" },
      { name: "azeite", quantity: 2, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "queijo parmesão", quantity: 40, unit: "g", group: "LATICINIOS", note: "ralado fino" },
      { name: "páprica", quantity: 1, unit: "colher de chá", group: "TEMPEROS", note: "doce ou defumada" },
      { name: "alho em pó", quantity: 1, unit: "colher de chá", group: "TEMPEROS" },
      { name: "orégano", quantity: 1, unit: "colher de chá", group: "TEMPEROS" },
      { name: "sal", quantity: null, unit: "a gosto", group: "TEMPEROS" },
    ],
    steps: [
      {
        text: "Cozinhe o macarrão em água fervente com sal por cerca de 2 minutos a menos que o indicado na embalagem, até ficar al dente.",
        timerMinutes: 9,
      },
      {
        text: "Escorra bem e espalhe sobre um pano limpo ou papel-toalha por alguns minutos, até a superfície secar. Quanto mais seco, mais crocante fica.",
        timerMinutes: 5,
      },
      {
        text: "Em uma tigela, misture o macarrão com o azeite, o parmesão, a páprica, o alho em pó, o orégano e uma pitada de sal, até todos os pedaços ficarem bem cobertos.",
      },
      {
        text: "Distribua o macarrão no cesto da air fryer em camada única, sem amontoar. Asse a 200 °C, sacudindo o cesto na metade do tempo, até ficar dourado e estalando de crocante.",
        timerMinutes: 12,
      },
      {
        text: "Deixe esfriar por 2 minutos no cesto — ele termina de firmar ao amornar. Sirva com molho de tomate, maionese temperada ou o molho que preferir.",
        timerMinutes: 2,
      },
    ],
    tips: [
      "Se a sua air fryer for pequena, asse em duas levas: macarrão amontoado fica borrachudo.",
      "Guarde as sobras em pote bem fechado por até 2 dias; se amolecerem, volte à air fryer por 2 minutos.",
      "Formatos com dobras e cavidades, como farfalle e rigatoni, seguram mais tempero e ficam mais crocantes.",
    ],
    substitutions: [
      { ingredient: "queijo parmesão", substitute: "levedura nutricional, para uma versão sem lactose" },
      { ingredient: "páprica", substitute: "lemon pepper ou chimichurri seco" },
    ],
    nutrition: { protein: 11, carbs: 47, fat: 10, fiber: 2, sodium: 420 },
    viral: {
      platform: "TIKTOK",
      trendYear: 2021,
      note: "Petisco de macarrão cozido e depois crocante na air fryer que se popularizou no TikTok em 2021.",
    },
  },

  // 8
  {
    slug: "tacos-de-birria",
    title: "Tacos de Birria",
    description:
      "Carne desfiada cozida em caldo de pimentas secas, tacos recheados com queijo, mergulhados no consomê e tostados na chapa. Crocantes por fora, suculentos por dentro e servidos com o caldo para molhar.",
    emoji: "🌮",
    cuisine: "mexicana",
    categories: ["carnes-e-churrasco"],
    prepMinutes: 30,
    cookMinutes: 120,
    servings: 6,
    difficulty: "HARD",
    caloriesPerServing: 640,
    costLevel: "MEDIUM",
    tags: ["tacos", "birria", "consomê", "carne desfiada", "mexicano"],
    ingredients: [
      { name: "acém", quantity: 1.2, unit: "kg", group: "CARNES", note: "em pedaços grandes" },
      { name: "pimenta guajillo seca", quantity: 6, unit: "unidade", group: "TEMPEROS", note: "ou ancho; encontrada em empórios" },
      { name: "tomate", quantity: 2, unit: "unidade", group: "HORTIFRUTI" },
      { name: "cebola", quantity: 2, unit: "unidade", group: "HORTIFRUTI", note: "1 para o cozido e 1 picada fino para servir" },
      { name: "alho", quantity: 6, unit: "dente", group: "HORTIFRUTI" },
      { name: "cominho", quantity: 1, unit: "colher de chá", group: "TEMPEROS" },
      { name: "orégano", quantity: 1, unit: "colher de chá", group: "TEMPEROS" },
      { name: "vinagre de maçã", quantity: 2, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "água", quantity: 1.5, unit: "l", group: "BEBIDAS" },
      { name: "tortilha de milho", quantity: 18, unit: "unidade", group: "PADARIA", note: "pequenas" },
      { name: "queijo muçarela", quantity: 300, unit: "g", group: "LATICINIOS", note: "ralada" },
      { name: "coentro", quantity: 1, unit: "maço", group: "HORTIFRUTI", note: "picado" },
      { name: "limão", quantity: 2, unit: "unidade", group: "HORTIFRUTI", note: "em gomos" },
      { name: "sal", quantity: null, unit: "a gosto", group: "TEMPEROS" },
    ],
    steps: [
      {
        text: "Retire os talos e as sementes das pimentas secas e toste-as em uma frigideira seca em fogo médio por cerca de 30 segundos de cada lado, só até soltarem aroma, sem queimar. Cubra com água quente e deixe hidratar.",
        timerMinutes: 15,
      },
      {
        text: "Tempere o acém com sal e doure os pedaços em uma panela de pressão com um fio de óleo em fogo alto, até formar uma crosta escura de todos os lados.",
        timerMinutes: 10,
      },
      {
        text: "Bata no liquidificador as pimentas hidratadas, os tomates, 1 cebola, o alho, o cominho, o orégano, o vinagre e 2 xícaras de água até obter um molho liso. Passe pela peneira sobre a carne na panela.",
      },
      {
        text: "Junte o restante da água, acerte o sal, feche a panela e cozinhe por 1 hora após pegar pressão, em fogo médio-baixo, até a carne desmanchar com o garfo.",
        timerMinutes: 60,
      },
      {
        text: "Retire a carne e desfie. Deixe o caldo descansar alguns minutos, retire com uma concha a gordura vermelha que subir e reserve-a em uma tigela. O caldo restante é o consomê: acerte o sal e mantenha quente.",
        timerMinutes: 5,
      },
      {
        text: "Aqueça uma frigideira ou chapa em fogo médio-alto. Mergulhe cada tortilha na gordura reservada, coloque na chapa, cubra metade com queijo e carne desfiada e dobre ao meio.",
      },
      {
        text: "Toste os tacos por 2 a 3 minutos de cada lado, pressionando levemente, até ficarem crocantes e o queijo derreter.",
        timerMinutes: 5,
      },
      {
        text: "Sirva os tacos com cebola picada, coentro e gomos de limão, acompanhados de uma tigelinha de consomê quente temperado com cebola e coentro, para mergulhar.",
      },
    ],
    tips: [
      "A birria fica ainda melhor no dia seguinte: a gordura endurece na geladeira e fica fácil de separar do consomê.",
      "Se não encontrar pimentas secas mexicanas, use 2 colheres de sopa de páprica defumada com 1 colher de chá de pimenta calabresa no molho.",
      "Sem panela de pressão, cozinhe tampado em fogo baixo por cerca de 3 horas.",
    ],
    substitutions: [
      { ingredient: "acém", substitute: "músculo ou costela bovina" },
      { ingredient: "tortilha de milho", substitute: "tortilha de trigo pequena" },
      { ingredient: "queijo muçarela", substitute: "queijo meia cura" },
    ],
    nutrition: { protein: 48, carbs: 40, fat: 32, fiber: 6, sodium: 900 },
    viral: {
      platform: "INSTAGRAM",
      trendYear: 2020,
      note: "Tacos mergulhados no consomê e grelhados que se tornaram febre em redes sociais como Instagram e TikTok por volta de 2020–2021.",
    },
  },

  // 9
  {
    slug: "guacamole",
    title: "Guacamole",
    description:
      "Abacate amassado na hora com limão, tomate, cebola roxa e coentro. Fresco, cremoso e pronto em 10 minutos para acompanhar nachos, tacos ou torradas.",
    emoji: "🥑",
    cuisine: "mexicana",
    categories: ["vegetarianas-e-veganas", "saladas", "fitness"],
    prepMinutes: 10,
    cookMinutes: 0,
    servings: 4,
    difficulty: "EASY",
    caloriesPerServing: 170,
    costLevel: "LOW",
    tags: ["abacate", "vegano", "sem cozimento", "petisco", "mexicano"],
    ingredients: [
      { name: "abacate", quantity: 1, unit: "unidade", group: "HORTIFRUTI", note: "grande e maduro (ou 3 avocados)" },
      { name: "limão", quantity: 1, unit: "unidade", group: "HORTIFRUTI", note: "suco" },
      { name: "tomate", quantity: 1, unit: "unidade", group: "HORTIFRUTI", note: "sem sementes, em cubinhos" },
      { name: "cebola roxa", quantity: 0.5, unit: "unidade", group: "HORTIFRUTI", note: "picada fino" },
      { name: "coentro", quantity: 2, unit: "colher de sopa", group: "HORTIFRUTI", note: "picado" },
      { name: "pimenta vermelha", quantity: 0.5, unit: "unidade", group: "HORTIFRUTI", note: "sem sementes, picada", optional: true },
      { name: "sal", quantity: null, unit: "a gosto", group: "TEMPEROS" },
    ],
    steps: [
      {
        text: "Deixe a cebola picada de molho no suco de limão com uma pitada de sal por alguns minutos, para suavizar o ardor.",
      },
      {
        text: "Corte o abacate ao meio, retire o caroço e raspe a polpa para uma tigela. Amasse com um garfo, deixando alguns pedacinhos para dar textura.",
      },
      {
        text: "Junte a cebola com o limão, o tomate, o coentro e a pimenta, se usar. Misture delicadamente.",
      },
      {
        text: "Prove e acerte o sal e o limão: o guacamole deve ficar bem temperado e levemente ácido. Sirva em seguida.",
      },
    ],
    tips: [
      "Para guardar, cubra com filme plástico encostado na superfície: o contato com o ar é o que escurece o abacate.",
      "Escolha um abacate que ceda levemente à pressão do dedo, sem estar mole demais.",
    ],
    substitutions: [
      { ingredient: "cebola roxa", substitute: "cebola branca deixada de molho em água gelada" },
      { ingredient: "coentro", substitute: "salsinha, para quem não gosta de coentro" },
    ],
    nutrition: { protein: 2, carbs: 10, fat: 14, fiber: 7, sodium: 200 },
  },

  // 10
  {
    slug: "burrito-de-frango",
    title: "Burrito de Frango",
    description:
      "Tortilha recheada com frango temperado com cominho e páprica, arroz, feijão preto e queijo derretido. Uma refeição completa que cabe na mão.",
    emoji: "🌯",
    cuisine: "mexicana",
    categories: ["hamburgueres-e-lanches", "frangos"],
    prepMinutes: 20,
    cookMinutes: 20,
    servings: 4,
    difficulty: "EASY",
    caloriesPerServing: 660,
    costLevel: "MEDIUM",
    tags: ["burrito", "frango", "lanche", "feijão", "mexicano"],
    ingredients: [
      { name: "peito de frango", quantity: 500, unit: "g", group: "CARNES", note: "em tiras finas" },
      { name: "tortilha de trigo", quantity: 4, unit: "unidade", group: "PADARIA", note: "grandes (cerca de 30 cm)" },
      { name: "arroz branco", quantity: 2, unit: "xícara", group: "MERCEARIA", note: "cozido" },
      { name: "feijão preto", quantity: 1.5, unit: "xícara", group: "MERCEARIA", note: "cozido e escorrido" },
      { name: "queijo cheddar", quantity: 120, unit: "g", group: "LATICINIOS", note: "ralado" },
      { name: "cebola", quantity: 1, unit: "unidade", group: "HORTIFRUTI", note: "em tiras" },
      { name: "pimentão vermelho", quantity: 1, unit: "unidade", group: "HORTIFRUTI", note: "em tiras" },
      { name: "alho", quantity: 2, unit: "dente", group: "HORTIFRUTI", note: "picado" },
      { name: "cominho", quantity: 1, unit: "colher de chá", group: "TEMPEROS" },
      { name: "páprica", quantity: 2, unit: "colher de chá", group: "TEMPEROS", note: "defumada" },
      { name: "limão", quantity: 1, unit: "unidade", group: "HORTIFRUTI", note: "suco" },
      { name: "azeite", quantity: 2, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "sal", quantity: null, unit: "a gosto", group: "TEMPEROS" },
    ],
    steps: [
      {
        text: "Tempere as tiras de frango com o alho, o cominho, a páprica, o suco de limão e sal. Deixe marinar enquanto prepara o restante.",
        timerMinutes: 15,
      },
      {
        text: "Em uma frigideira grande, aqueça 1 colher de sopa de azeite em fogo alto e salteie a cebola e o pimentão até ficarem macios e levemente tostados nas bordas. Reserve.",
        timerMinutes: 5,
      },
      {
        text: "Na mesma frigideira, aqueça o restante do azeite e doure o frango em fogo alto, sem amontoar, até ficar cozido por dentro e dourado por fora. Volte os legumes à frigideira e misture.",
        timerMinutes: 8,
      },
      {
        text: "Aqueça o feijão com uma pitada de sal e amasse levemente com um garfo, para ajudar a firmar o recheio.",
        timerMinutes: 3,
      },
      {
        text: "Aqueça as tortilhas rapidamente em uma frigideira seca, cerca de 20 segundos de cada lado, para ficarem flexíveis e não rasgarem ao enrolar.",
      },
      {
        text: "No terço inferior de cada tortilha, distribua arroz, feijão, frango com legumes e queijo. Dobre as laterais para dentro e enrole firme a partir da base, formando um cilindro fechado.",
      },
      {
        text: "Leve os burritos à frigideira com a emenda para baixo, em fogo médio, e toste por 2 minutos de cada lado, até ficarem dourados e o queijo derreter. Corte ao meio e sirva.",
        timerMinutes: 4,
      },
    ],
    tips: [
      "Não exagere no recheio: tortilha cheia demais rasga na hora de enrolar.",
      "Burritos embrulhados em papel-alumínio podem ser congelados e reaquecidos no forno ou na air fryer.",
      "Sirva com guacamole e creme azedo (creme de leite com gotas de limão) para uma refeição completa.",
    ],
    substitutions: [
      { ingredient: "queijo cheddar", substitute: "queijo muçarela" },
      { ingredient: "feijão preto", substitute: "feijão carioca" },
    ],
    nutrition: { protein: 45, carbs: 70, fat: 22, fiber: 9, sodium: 1100 },
  },

  // 11
  {
    slug: "smash-burger",
    title: "Smash Burger",
    description:
      "Bolinhas de carne prensadas na chapa bem quente até formar uma crosta caramelizada, cobertas com cheddar derretido em pão macio e tostado. Simples, rápido e cheio de sabor.",
    emoji: "🍔",
    cuisine: "americana",
    categories: ["hamburgueres-e-lanches"],
    prepMinutes: 15,
    cookMinutes: 15,
    servings: 4,
    difficulty: "EASY",
    caloriesPerServing: 750,
    costLevel: "MEDIUM",
    tags: ["hambúrguer", "smash", "cheddar", "chapa", "lanche"],
    ingredients: [
      { name: "carne moída", quantity: 640, unit: "g", group: "CARNES", note: "acém com cerca de 20% de gordura, bem gelada" },
      { name: "pão de hambúrguer", quantity: 4, unit: "unidade", group: "PADARIA", note: "tipo brioche ou batata" },
      { name: "queijo cheddar", quantity: 8, unit: "fatia", group: "LATICINIOS" },
      { name: "cebola", quantity: 1, unit: "unidade", group: "HORTIFRUTI", note: "em fatias bem finas" },
      { name: "manteiga", quantity: 2, unit: "colher de sopa", group: "LATICINIOS" },
      { name: "maionese", quantity: 3, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "ketchup", quantity: 1, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "mostarda", quantity: 1, unit: "colher de chá", group: "MERCEARIA" },
      { name: "picles de pepino", quantity: 8, unit: "fatia", group: "MERCEARIA", optional: true },
      { name: "sal", quantity: null, unit: "a gosto", group: "TEMPEROS" },
      { name: "pimenta-do-reino", quantity: null, unit: "a gosto", group: "TEMPEROS" },
    ],
    steps: [
      {
        text: "Divida a carne em 8 bolinhas de 80 g, sem amassar nem temperar, e mantenha na geladeira até a hora de grelhar. Misture a maionese, o ketchup e a mostarda para fazer o molho.",
      },
      {
        text: "Abra os pães, passe manteiga no miolo e toste em uma chapa ou frigideira de ferro em fogo médio até dourarem. Reserve.",
        timerMinutes: 2,
      },
      {
        text: "Aqueça a chapa ou frigideira de ferro em fogo alto, sem óleo, por vários minutos, até começar a soltar fumaça.",
        timerMinutes: 5,
      },
      {
        text: "Coloque 2 bolinhas por vez e, imediatamente, prense cada uma com uma espátula firme até ficarem com menos de 1 cm de espessura. Use um pedaço de papel-manteiga entre a carne e a espátula para não grudar. Tempere com sal e pimenta.",
      },
      {
        text: "Deixe sem mexer por cerca de 2 minutos, até as bordas ficarem rendadas e a parte de baixo bem marrom e crocante. Raspe com a espátula para soltar a crosta inteira e vire.",
        timerMinutes: 2,
      },
      {
        text: "Coloque uma fatia de cheddar sobre cada carne e cozinhe por mais 30 a 60 segundos, até o queijo derreter. Empilhe duas carnes por hambúrguer.",
        timerMinutes: 1,
      },
      {
        text: "Monte: passe o molho no pão, coloque as carnes com queijo, a cebola em fatias finas e o picles, se usar. Feche e sirva na hora.",
      },
    ],
    tips: [
      "Prense só uma vez, nos primeiros segundos; depois disso, apertar a carne apenas espreme o suco.",
      "A carne precisa ter gordura: carne magra demais fica seca e não forma a crosta característica.",
      "Para uma versão estilo cebola caramelizada, prense a carne já sobre a cebola fatiada na chapa.",
    ],
    substitutions: [
      { ingredient: "queijo cheddar", substitute: "queijo prato" },
      { ingredient: "pão de hambúrguer", substitute: "pão de leite ou pão australiano" },
    ],
    nutrition: { protein: 42, carbs: 32, fat: 50, fiber: 2, sodium: 1300 },
    viral: {
      platform: "YOUTUBE",
      trendYear: 2020,
      note: "Técnica de prensar a carne na chapa bem quente, muito difundida em vídeos de culinária no YouTube e em outras redes nos últimos anos.",
    },
  },

  // 12
  {
    slug: "panquecas-americanas",
    title: "Panquecas Americanas",
    description:
      "Panquecas fofinhas e altas, douradas por fora e macias por dentro, para servir em pilha com manteiga, mel e frutas. O café da manhã de fim de semana mais clássico.",
    emoji: "🥞",
    cuisine: "americana",
    categories: ["sobremesas-e-doces", "cafes-e-bebidas"],
    prepMinutes: 10,
    cookMinutes: 20,
    servings: 4,
    difficulty: "EASY",
    caloriesPerServing: 380,
    costLevel: "LOW",
    tags: ["panqueca", "café da manhã", "fofinha", "doce", "brunch"],
    ingredients: [
      { name: "farinha de trigo", quantity: 240, unit: "g", group: "MERCEARIA" },
      { name: "açúcar", quantity: 2, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "fermento químico", quantity: 1, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "sal", quantity: 1, unit: "pitada", group: "TEMPEROS" },
      { name: "leite", quantity: 400, unit: "ml", group: "LATICINIOS" },
      { name: "ovo", quantity: 2, unit: "unidade", group: "LATICINIOS" },
      { name: "manteiga", quantity: 40, unit: "g", group: "LATICINIOS", note: "derretida, mais um pouco para untar" },
      { name: "essência de baunilha", quantity: 1, unit: "colher de chá", group: "MERCEARIA" },
      { name: "mel", quantity: null, unit: "a gosto", group: "MERCEARIA", note: "para servir", optional: true },
      { name: "morango", quantity: null, unit: "a gosto", group: "HORTIFRUTI", note: "ou outras frutas, para servir", optional: true },
    ],
    steps: [
      {
        text: "Em uma tigela, misture a farinha, o açúcar, o fermento e o sal. Em outra, bata o leite, os ovos, a manteiga derretida e a baunilha.",
      },
      {
        text: "Despeje os líquidos sobre os secos e misture com um fouet só até incorporar. Alguns grumos pequenos são normais — misturar demais deixa as panquecas duras.",
      },
      {
        text: "Deixe a massa descansar enquanto a frigideira aquece; ela vai ficar mais espessa e aerada.",
        timerMinutes: 5,
      },
      {
        text: "Aqueça uma frigideira antiaderente em fogo médio-baixo e unte levemente com manteiga, retirando o excesso com papel-toalha.",
      },
      {
        text: "Despeje cerca de 1/4 de xícara de massa por panqueca. Cozinhe até surgirem bolhas na superfície e as bordas parecerem secas, cerca de 2 minutos.",
        timerMinutes: 2,
      },
      {
        text: "Vire com uma espátula e cozinhe por mais 1 minuto, até dourar do outro lado. Repita com o restante da massa, mantendo as prontas cobertas para não esfriarem.",
        timerMinutes: 1,
      },
      {
        text: "Sirva em pilha com um pedaço de manteiga, mel e frutas frescas.",
      },
    ],
    tips: [
      "Fogo alto doura por fora e deixa cru por dentro; paciência com o fogo médio-baixo é o segredo.",
      "A primeira panqueca serve de teste para ajustar a temperatura da frigideira.",
    ],
    substitutions: [
      { ingredient: "mel", substitute: "xarope de bordo (maple) ou melado de cana" },
      { ingredient: "leite", substitute: "bebida vegetal de aveia ou amêndoa" },
    ],
    nutrition: { protein: 12, carbs: 52, fat: 13, fiber: 2, sodium: 520 },
  },

  // 13
  {
    slug: "mac-and-cheese",
    title: "Mac and Cheese",
    description:
      "Macarrão envolvido em um molho cremoso de cheddar, gratinado no forno até formar uma casquinha dourada. Puro conforto americano em forma de massa.",
    emoji: "🧀",
    cuisine: "americana",
    categories: ["massas-e-pizzas"],
    prepMinutes: 15,
    cookMinutes: 30,
    servings: 6,
    difficulty: "EASY",
    caloriesPerServing: 640,
    costLevel: "MEDIUM",
    tags: ["macarrão", "queijo", "cheddar", "gratinado", "comfort food"],
    ingredients: [
      { name: "macarrão", quantity: 500, unit: "g", group: "MERCEARIA", note: "tipo cotovelo ou caracol" },
      { name: "manteiga", quantity: 50, unit: "g", group: "LATICINIOS" },
      { name: "farinha de trigo", quantity: 40, unit: "g", group: "MERCEARIA" },
      { name: "leite", quantity: 800, unit: "ml", group: "LATICINIOS" },
      { name: "queijo cheddar", quantity: 250, unit: "g", group: "LATICINIOS", note: "ralado (de preferência em peça)" },
      { name: "queijo muçarela", quantity: 100, unit: "g", group: "LATICINIOS", note: "ralada" },
      { name: "queijo parmesão", quantity: 50, unit: "g", group: "LATICINIOS", note: "ralado" },
      { name: "mostarda", quantity: 1, unit: "colher de chá", group: "MERCEARIA" },
      { name: "noz-moscada", quantity: 1, unit: "pitada", group: "TEMPEROS" },
      { name: "farinha panko", quantity: 0.5, unit: "xícara", group: "MERCEARIA", optional: true },
      { name: "sal", quantity: null, unit: "a gosto", group: "TEMPEROS" },
      { name: "pimenta-do-reino", quantity: null, unit: "a gosto", group: "TEMPEROS" },
    ],
    steps: [
      {
        text: "Preaqueça o forno a 200 °C. Cozinhe o macarrão em água fervente com sal por 2 minutos a menos que o indicado na embalagem, escorra e reserve.",
        timerMinutes: 7,
      },
      {
        text: "Na mesma panela, derreta a manteiga em fogo médio, junte a farinha e mexa por 1 a 2 minutos, até formar uma pasta levemente dourada.",
        timerMinutes: 2,
      },
      {
        text: "Adicione o leite aos poucos, batendo com um fouet para não empelotar, e cozinhe mexendo até o molho engrossar e cobrir as costas da colher.",
        timerMinutes: 6,
      },
      {
        text: "Desligue o fogo e junte o cheddar e a muçarela aos poucos, mexendo até derreterem e o molho ficar liso. Tempere com a mostarda, a noz-moscada, sal e pimenta.",
      },
      {
        text: "Volte o macarrão à panela e misture bem. O molho deve parecer abundante, pois a massa ainda absorve parte dele no forno.",
      },
      {
        text: "Transfira para um refratário untado, cubra com o parmesão misturado à farinha panko, se usar, e asse até a superfície ficar dourada e borbulhante nas bordas.",
        timerMinutes: 20,
      },
      {
        text: "Deixe descansar por 5 minutos antes de servir, para o molho assentar.",
        timerMinutes: 5,
      },
    ],
    tips: [
      "Rale o cheddar em casa: o queijo já ralado vem com antiaglomerante e pode deixar o molho granuloso.",
      "Nunca ferva o molho depois de adicionar o queijo, ou ele pode separar e ficar oleoso.",
    ],
    substitutions: [
      { ingredient: "queijo cheddar", substitute: "queijo prato ou gouda" },
      { ingredient: "farinha panko", substitute: "farinha de rosca" },
    ],
    nutrition: { protein: 26, carbs: 72, fat: 27, fiber: 3, sodium: 780 },
  },

  // 14
  {
    slug: "cookies-de-chocolate",
    title: "Cookies de Chocolate",
    description:
      "Cookies com bordas crocantes, centro macio e pedaços generosos de chocolate meio amargo derretendo por dentro. O sabor caramelado vem do açúcar mascavo.",
    emoji: "🍪",
    cuisine: "americana",
    categories: ["sobremesas-e-doces"],
    prepMinutes: 50,
    cookMinutes: 12,
    servings: 20,
    difficulty: "EASY",
    caloriesPerServing: 190,
    costLevel: "MEDIUM",
    tags: ["cookie", "chocolate", "biscoito", "lanche", "forno"],
    ingredients: [
      { name: "manteiga", quantity: 115, unit: "g", group: "LATICINIOS", note: "em temperatura ambiente" },
      { name: "açúcar mascavo", quantity: 150, unit: "g", group: "MERCEARIA" },
      { name: "açúcar", quantity: 50, unit: "g", group: "MERCEARIA" },
      { name: "ovo", quantity: 1, unit: "unidade", group: "LATICINIOS" },
      { name: "essência de baunilha", quantity: 1, unit: "colher de chá", group: "MERCEARIA" },
      { name: "farinha de trigo", quantity: 220, unit: "g", group: "MERCEARIA" },
      { name: "bicarbonato de sódio", quantity: 0.5, unit: "colher de chá", group: "MERCEARIA" },
      { name: "sal", quantity: 0.5, unit: "colher de chá", group: "TEMPEROS" },
      { name: "chocolate meio amargo", quantity: 200, unit: "g", group: "MERCEARIA", note: "picado grosseiramente" },
    ],
    steps: [
      {
        text: "Bata a manteiga com o açúcar mascavo e o açúcar refinado por cerca de 2 minutos, até formar um creme claro e fofo.",
      },
      {
        text: "Junte o ovo e a baunilha e bata só até incorporar.",
      },
      {
        text: "Adicione a farinha, o bicarbonato e o sal, misturando com uma espátula apenas até não haver farinha aparente. Incorpore o chocolate picado.",
      },
      {
        text: "Cubra a massa e leve à geladeira. O descanso firma a manteiga, evita que os cookies espalhem demais e intensifica o sabor.",
        timerMinutes: 30,
      },
      {
        text: "Preaqueça o forno a 180 °C. Faça bolinhas de cerca de 40 g e distribua em assadeiras forradas com papel-manteiga, deixando 5 cm de distância entre elas.",
      },
      {
        text: "Asse por 10 a 12 minutos, até as bordas ficarem douradas e o centro ainda parecer levemente cru e brilhante.",
        timerMinutes: 11,
      },
      {
        text: "Deixe esfriar na assadeira por 10 minutos — eles terminam de firmar fora do forno — e depois transfira para uma grade.",
        timerMinutes: 10,
      },
    ],
    tips: [
      "Tire os cookies do forno ainda com aparência de mal assados no centro; é isso que garante o miolo macio.",
      "A massa crua pode ser congelada em bolinhas por até 3 meses; asse direto do congelador com 2 minutos a mais.",
      "Uma pitada de flor de sal por cima, logo ao sair do forno, realça o chocolate.",
    ],
    substitutions: [
      { ingredient: "chocolate meio amargo", substitute: "gotas de chocolate próprias para forno" },
      { ingredient: "açúcar mascavo", substitute: "açúcar demerara (o cookie fica menos úmido)" },
    ],
    nutrition: { protein: 2, carbs: 25, fat: 9, fiber: 1, sodium: 110 },
  },

  // 15
  {
    slug: "asinhas-de-frango-na-air-fryer",
    title: "Asinhas de Frango na Air Fryer",
    description:
      "Asinhas com pele crocante sem fritura, envolvidas em um molho picante de manteiga no estilo buffalo. Petisco de boteco feito em casa, sem óleo espirrando.",
    emoji: "🍗",
    cuisine: "americana",
    categories: ["frangos", "air-fryer", "comidas-de-boteco"],
    prepMinutes: 10,
    cookMinutes: 30,
    servings: 4,
    difficulty: "EASY",
    caloriesPerServing: 480,
    costLevel: "MEDIUM",
    tags: ["asinha", "buffalo", "air fryer", "petisco", "picante"],
    ingredients: [
      { name: "asa de frango", quantity: 1, unit: "kg", group: "CARNES", note: "separada em tulipa e meio da asa" },
      { name: "fermento químico", quantity: 1, unit: "colher de chá", group: "MERCEARIA" },
      { name: "sal", quantity: 1, unit: "colher de chá", group: "TEMPEROS" },
      { name: "pimenta-do-reino", quantity: 0.5, unit: "colher de chá", group: "TEMPEROS" },
      { name: "páprica", quantity: 1, unit: "colher de chá", group: "TEMPEROS", note: "defumada" },
      { name: "alho em pó", quantity: 1, unit: "colher de chá", group: "TEMPEROS" },
      { name: "manteiga", quantity: 40, unit: "g", group: "LATICINIOS" },
      { name: "molho de pimenta", quantity: 80, unit: "ml", group: "MERCEARIA", note: "tipo Louisiana, mais avinagrado" },
      { name: "mel", quantity: 1, unit: "colher de sopa", group: "MERCEARIA" },
    ],
    steps: [
      {
        text: "Seque muito bem as asinhas com papel-toalha. Pele úmida não fica crocante.",
      },
      {
        text: "Em uma tigela, misture o fermento químico, o sal, a pimenta-do-reino, a páprica e o alho em pó. Junte as asinhas e mexa até ficarem cobertas por uma camada fina e uniforme.",
      },
      {
        text: "Distribua as asinhas no cesto da air fryer em camada única, com a pele para cima. Asse a 180 °C, virando na metade do tempo, até estarem cozidas por dentro.",
        timerMinutes: 20,
      },
      {
        text: "Aumente a temperatura para 200 °C e asse por mais alguns minutos, até a pele ficar dourada, estufada e crocante.",
        timerMinutes: 8,
      },
      {
        text: "Enquanto isso, derreta a manteiga em uma panelinha em fogo baixo, junte o molho de pimenta e o mel e misture até ficar homogêneo.",
        timerMinutes: 2,
      },
      {
        text: "Coloque as asinhas quentes em uma tigela, regue com o molho e mexa até ficarem bem envolvidas. Sirva imediatamente.",
      },
    ],
    tips: [
      "O fermento químico eleva o pH da pele e ajuda a deixá-la mais seca e crocante; use pouco para não deixar gosto.",
      "Se der tempo, deixe as asinhas temperadas descobertas na geladeira por algumas horas: a pele seca e fica ainda mais crocante.",
      "Sirva com palitos de cenoura e salsão e um molho de iogurte ou queijo azul para equilibrar o picante.",
    ],
    substitutions: [
      { ingredient: "molho de pimenta", substitute: "molho barbecue, para uma versão sem picância" },
      { ingredient: "asa de frango", substitute: "coxinha da asa" },
    ],
    nutrition: { protein: 38, carbs: 5, fat: 34, fiber: 0, sodium: 1150 },
  },

  // 16
  {
    slug: "aveia-assada-de-banana",
    title: "Aveia Assada de Banana",
    description:
      "Aveia, banana e ovo batidos e assados em porção individual, com textura de bolinho úmido. Um café da manhã nutritivo, barato e sem açúcar refinado.",
    emoji: "🍌",
    cuisine: "americana",
    categories: ["fitness", "cafes-e-bebidas", "economicas"],
    prepMinutes: 5,
    cookMinutes: 20,
    servings: 1,
    difficulty: "EASY",
    caloriesPerServing: 370,
    costLevel: "LOW",
    tags: ["aveia", "banana", "café da manhã", "fitness", "baked oats"],
    ingredients: [
      { name: "aveia em flocos", quantity: 40, unit: "g", group: "MERCEARIA" },
      { name: "banana", quantity: 1, unit: "unidade", group: "HORTIFRUTI", note: "bem madura" },
      { name: "ovo", quantity: 1, unit: "unidade", group: "LATICINIOS" },
      { name: "leite", quantity: 60, unit: "ml", group: "LATICINIOS" },
      { name: "fermento químico", quantity: 0.5, unit: "colher de chá", group: "MERCEARIA" },
      { name: "canela em pó", quantity: 1, unit: "pitada", group: "TEMPEROS" },
      { name: "mel", quantity: 1, unit: "colher de chá", group: "MERCEARIA", optional: true },
      { name: "chocolate meio amargo", quantity: 10, unit: "g", group: "MERCEARIA", note: "picado", optional: true },
    ],
    steps: [
      {
        text: "Preaqueça o forno ou a air fryer a 180 °C e unte um ramequim ou potinho refratário individual.",
      },
      {
        text: "No liquidificador ou com um mixer, bata a aveia, a banana (reserve 2 rodelas para decorar), o ovo, o leite, a canela e o mel, se usar, até obter uma massa lisa.",
      },
      {
        text: "Misture o fermento com uma colher, sem bater, e despeje a massa no ramequim. Por cima, distribua o chocolate picado e as rodelas de banana.",
      },
      {
        text: "Asse até a superfície ficar dourada e firme e um palito inserido no centro sair úmido, mas sem massa crua.",
        timerMinutes: 20,
      },
      {
        text: "Deixe amornar por alguns minutos antes de comer, direto no potinho.",
        timerMinutes: 3,
      },
    ],
    tips: [
      "Quanto mais madura a banana, mais doce fica a aveia — dá para dispensar o mel.",
      "Monte o potinho na noite anterior e deixe na geladeira; de manhã é só assar com 3 a 5 minutos a mais.",
    ],
    substitutions: [
      { ingredient: "leite", substitute: "bebida vegetal ou iogurte natural" },
      { ingredient: "chocolate meio amargo", substitute: "frutas vermelhas ou pasta de amendoim" },
    ],
    nutrition: { protein: 15, carbs: 55, fat: 10, fiber: 7, sodium: 280 },
    viral: {
      platform: "TIKTOK",
      trendYear: 2021,
      note: "Conhecida como baked oats, a aveia batida e assada em porção individual virou tendência de café da manhã no TikTok em 2021.",
    },
  },

  // 17
  {
    slug: "costelinha-de-milho-na-air-fryer",
    title: "Costelinha de Milho na Air Fryer",
    description:
      "Espigas cortadas em tiras que se curvam ao assar como costelinhas, temperadas com páprica defumada e finalizadas com limão. Divertido de comer com as mãos.",
    emoji: "🌽",
    cuisine: "americana",
    categories: ["air-fryer", "vegetarianas-e-veganas", "comidas-de-boteco"],
    prepMinutes: 15,
    cookMinutes: 25,
    servings: 4,
    difficulty: "MEDIUM",
    caloriesPerServing: 200,
    costLevel: "LOW",
    tags: ["milho", "air fryer", "vegano", "petisco", "corn ribs"],
    ingredients: [
      { name: "milho verde", quantity: 4, unit: "unidade", group: "HORTIFRUTI", note: "espigas" },
      { name: "azeite", quantity: 3, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "páprica", quantity: 2, unit: "colher de chá", group: "TEMPEROS", note: "defumada" },
      { name: "alho em pó", quantity: 1, unit: "colher de chá", group: "TEMPEROS" },
      { name: "sal", quantity: 1, unit: "colher de chá", group: "TEMPEROS" },
      { name: "pimenta-do-reino", quantity: null, unit: "a gosto", group: "TEMPEROS" },
      { name: "limão", quantity: 1, unit: "unidade", group: "HORTIFRUTI", note: "em gomos" },
      { name: "coentro", quantity: 2, unit: "colher de sopa", group: "HORTIFRUTI", note: "picado" },
      { name: "queijo parmesão", quantity: 30, unit: "g", group: "LATICINIOS", note: "ralado; omita na versão vegana", optional: true },
    ],
    steps: [
      {
        text: "Cozinhe as espigas inteiras em água fervente por alguns minutos. Isso amolece levemente o sabugo e torna o corte bem mais fácil e seguro. Escorra e deixe amornar.",
        timerMinutes: 6,
      },
      {
        text: "Corte cada espiga ao meio na horizontal. Apoie cada metade em pé sobre a tábua e, com uma faca grande e pesada, corte ao meio no sentido do comprimento, passando pelo centro do sabugo. Corte cada metade novamente, obtendo 4 tiras por pedaço.",
      },
      {
        text: "Em uma tigela, misture o azeite, a páprica, o alho em pó, o sal e a pimenta. Pincele as tiras de milho por todos os lados.",
      },
      {
        text: "Distribua no cesto da air fryer em camada única, com os grãos para cima, e asse a 200 °C até as tiras se curvarem e os grãos ficarem dourados e tostados nas pontas. Vire na metade do tempo.",
        timerMinutes: 15,
      },
      {
        text: "Finalize com o coentro, o parmesão, se usar, e sirva com gomos de limão para espremer na hora.",
      },
    ],
    tips: [
      "Use uma faca grande e firme e mantenha os dedos longe da lâmina: o sabugo é duro e o corte exige força.",
      "Espigas mais grossas e frescas rendem tiras que se curvam melhor.",
    ],
    substitutions: [
      { ingredient: "azeite", substitute: "manteiga derretida (a receita deixa de ser vegana)" },
      { ingredient: "coentro", substitute: "salsinha ou cebolinha" },
    ],
    nutrition: { protein: 4, carbs: 28, fat: 9, fiber: 3, sodium: 300 },
    viral: {
      platform: "TIKTOK",
      trendYear: 2021,
      note: "Espigas de milho cortadas em tiras que se curvam ao assar, apelidadas de corn ribs, popularizadas no TikTok em 2021.",
    },
  },

  // 18
  {
    slug: "salada-caesar-com-frango",
    title: "Salada Caesar com Frango",
    description:
      "Alface crocante, frango grelhado suculento, croutons dourados e um molho Caesar cremoso com parmesão. Uma salada que vale como refeição completa.",
    emoji: "🥗",
    cuisine: "americana",
    categories: ["saladas", "frangos", "fitness"],
    prepMinutes: 20,
    cookMinutes: 20,
    servings: 4,
    difficulty: "EASY",
    caloriesPerServing: 430,
    costLevel: "MEDIUM",
    tags: ["salada", "caesar", "frango grelhado", "croutons", "almoço leve"],
    ingredients: [
      { name: "peito de frango", quantity: 500, unit: "g", group: "CARNES", note: "em filés" },
      { name: "alface", quantity: 1, unit: "unidade", group: "HORTIFRUTI", note: "pé grande, romana ou americana" },
      { name: "pão", quantity: 2, unit: "fatia", group: "PADARIA", note: "pão italiano amanhecido, em cubos" },
      { name: "queijo parmesão", quantity: 50, unit: "g", group: "LATICINIOS", note: "metade ralado e metade em lascas" },
      { name: "azeite", quantity: 4, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "alho", quantity: 1, unit: "dente", group: "HORTIFRUTI", note: "ralado" },
      { name: "limão", quantity: 1, unit: "unidade", group: "HORTIFRUTI", note: "suco" },
      { name: "maionese", quantity: 3, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "mostarda", quantity: 1, unit: "colher de chá", group: "MERCEARIA", note: "tipo dijon" },
      { name: "molho inglês", quantity: 1, unit: "colher de chá", group: "MERCEARIA" },
      { name: "filé de anchova", quantity: 2, unit: "unidade", group: "PEIXES", note: "amassados", optional: true },
      { name: "sal", quantity: null, unit: "a gosto", group: "TEMPEROS" },
      { name: "pimenta-do-reino", quantity: null, unit: "a gosto", group: "TEMPEROS" },
    ],
    steps: [
      {
        text: "Tempere os filés de frango com sal, pimenta e metade do suco de limão. Deixe pegar gosto enquanto prepara o restante.",
        timerMinutes: 10,
      },
      {
        text: "Para os croutons, misture os cubos de pão com 1 colher de sopa de azeite e uma pitada de sal e toste em uma frigideira em fogo médio, ou na air fryer a 180 °C, mexendo de vez em quando, até ficarem dourados e crocantes.",
        timerMinutes: 6,
      },
      {
        text: "Aqueça uma frigideira ou grelha com 1 colher de sopa de azeite em fogo médio-alto e grelhe o frango por 5 a 6 minutos de cada lado, até dourar e não haver mais parte rosada no centro.",
        timerMinutes: 12,
      },
      {
        text: "Deixe o frango descansar antes de fatiar, para manter os sucos dentro da carne.",
        timerMinutes: 5,
      },
      {
        text: "Prepare o molho: misture a maionese, o alho, o restante do suco de limão, a mostarda, o molho inglês, a anchova (se usar), o parmesão ralado e 2 colheres de sopa de azeite. Ajuste com 1 a 2 colheres de água até ficar cremoso e fluido, e acerte o sal e a pimenta.",
      },
      {
        text: "Lave, seque bem e rasgue as folhas de alface. Em uma tigela grande, misture as folhas com o molho até ficarem envolvidas.",
      },
      {
        text: "Distribua nos pratos, cubra com o frango fatiado, os croutons e as lascas de parmesão. Sirva logo para a alface e os croutons continuarem crocantes.",
      },
    ],
    tips: [
      "Seque muito bem a alface na centrífuga ou com um pano: folhas molhadas diluem o molho.",
      "A anchova é o sabor clássico do molho Caesar; mesmo quem não gosta de peixe costuma não perceber, só sente mais profundidade.",
    ],
    substitutions: [
      { ingredient: "maionese", substitute: "iogurte natural integral, para um molho mais leve" },
      { ingredient: "pão", substitute: "torradas integrais quebradas" },
    ],
    nutrition: { protein: 40, carbs: 15, fat: 23, fiber: 3, sodium: 820 },
  },
];
