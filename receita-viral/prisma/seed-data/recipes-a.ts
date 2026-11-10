import type { SeedRecipe } from "./types";

export const recipesA: SeedRecipe[] = [
  // 1
  {
    slug: "feijoada-completa",
    title: "Feijoada Completa",
    description:
      "O clássico do sábado brasileiro: feijão preto encorpado, cozido lentamente com carnes defumadas e salgadas até ficar cremoso e cheio de sabor.",
    emoji: "🍲",
    cuisine: "brasileira",
    categories: ["carnes-e-churrasco"],
    prepMinutes: 40,
    cookMinutes: 180,
    servings: 10,
    difficulty: "HARD",
    caloriesPerServing: 620,
    costLevel: "HIGH",
    tags: ["almoço", "fim de semana", "festa", "tradicional"],
    ingredients: [
      { name: "feijão preto", quantity: 1, unit: "kg", group: "MERCEARIA" },
      { name: "carne seca", quantity: 500, unit: "g", group: "CARNES", note: "dessalgada e cortada em cubos" },
      { name: "costelinha de porco defumada", quantity: 500, unit: "g", group: "CARNES" },
      { name: "linguiça calabresa", quantity: 400, unit: "g", group: "CARNES", note: "em rodelas grossas" },
      { name: "paio", quantity: 300, unit: "g", group: "CARNES", note: "em rodelas" },
      { name: "bacon", quantity: 200, unit: "g", group: "CARNES", note: "em cubos" },
      { name: "cebola", quantity: 2, unit: "unidade", group: "HORTIFRUTI", note: "picada" },
      { name: "alho", quantity: 6, unit: "dente", group: "HORTIFRUTI", note: "picado" },
      { name: "folha de louro", quantity: 4, unit: "unidade", group: "TEMPEROS" },
      { name: "laranja", quantity: 1, unit: "unidade", group: "HORTIFRUTI", note: "inteira, com casca", optional: true },
      { name: "óleo", quantity: 2, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "sal", quantity: null, unit: "a gosto", group: "TEMPEROS" },
      { name: "pimenta-do-reino", quantity: null, unit: "a gosto", group: "TEMPEROS" },
    ],
    steps: [
      {
        text: "Na véspera, deixe a carne seca e a costelinha de molho em água fria na geladeira, trocando a água pelo menos três vezes para retirar o excesso de sal. Deixe o feijão de molho em outra tigela com água.",
        timerMinutes: 720,
      },
      {
        text: "Escorra as carnes, coloque em uma panela com água limpa e ferva por 10 minutos para terminar de dessalgar. Descarte essa água.",
        timerMinutes: 10,
      },
      {
        text: "Em uma panela grande (de preferência de pressão ou de ferro), cozinhe o feijão escorrido com água suficiente para cobrir 4 dedos acima, as folhas de louro, a carne seca e a costelinha, em fogo médio-baixo e com a panela semitampada, até o feijão ficar macio.",
        timerMinutes: 90,
      },
      {
        text: "Enquanto isso, em uma frigideira, doure o bacon no óleo em fogo médio até soltar a gordura. Junte a calabresa e o paio e frite até dourarem as bordas, cerca de 8 minutos.",
        timerMinutes: 8,
      },
      {
        text: "Na mesma frigideira, refogue a cebola até ficar translúcida e acrescente o alho, mexendo por 1 minuto sem deixar queimar. Retire uma concha de feijão da panela, amasse com o refogado e devolva tudo à panela, junto com as linguiças e o bacon.",
      },
      {
        text: "Adicione a laranja inteira, ajuste o sal e a pimenta e cozinhe em fogo baixo, mexendo de vez em quando, até o caldo ficar grosso e escuro e as carnes estarem bem macias.",
        timerMinutes: 60,
      },
      {
        text: "Retire a laranja e as folhas de louro, prove e ajuste o tempero. Sirva com arroz branco, couve refogada, farofa, torresmo e gomos de laranja.",
      },
    ],
    tips: [
      "A laranja inteira cozida no caldo ajuda a equilibrar a gordura das carnes; retire antes que a casca amargue.",
      "Feijoada fica ainda melhor no dia seguinte: prepare na véspera e reaqueça em fogo baixo com um pouco de água.",
      "Para engrossar o caldo sem farinha, amasse algumas conchas de feijão e devolva à panela.",
    ],
    substitutions: [
      { ingredient: "costelinha de porco defumada", substitute: "lombo de porco defumado" },
      { ingredient: "paio", substitute: "linguiça portuguesa ou mais linguiça calabresa" },
    ],
    nutrition: { protein: 42, carbs: 45, fat: 30, fiber: 15, sodium: 1450 },
  },
  // 2
  {
    slug: "pao-de-queijo",
    title: "Pão de Queijo Mineiro",
    description:
      "Casquinha crocante por fora e miolo elástico e quentinho por dentro, feito com polvilho azedo e queijo meia cura como manda a tradição mineira.",
    emoji: "🧀",
    cuisine: "brasileira",
    categories: ["hamburgueres-e-lanches", "cafes-e-bebidas"],
    prepMinutes: 30,
    cookMinutes: 30,
    servings: 10,
    difficulty: "MEDIUM",
    caloriesPerServing: 350,
    costLevel: "MEDIUM",
    tags: ["café da manhã", "lanche", "sem glúten", "mineira"],
    ingredients: [
      { name: "polvilho azedo", quantity: 500, unit: "g", group: "MERCEARIA" },
      { name: "leite", quantity: 250, unit: "ml", group: "LATICINIOS" },
      { name: "água", quantity: 125, unit: "ml", group: "BEBIDAS" },
      { name: "óleo", quantity: 125, unit: "ml", group: "MERCEARIA" },
      { name: "sal", quantity: 1, unit: "colher de chá", group: "TEMPEROS" },
      { name: "ovo", quantity: 2, unit: "unidade", group: "LATICINIOS" },
      { name: "queijo minas meia cura", quantity: 200, unit: "g", group: "LATICINIOS", note: "ralado grosso" },
      { name: "queijo parmesão", quantity: 50, unit: "g", group: "LATICINIOS", note: "ralado fino" },
    ],
    steps: [
      {
        text: "Coloque o polvilho em uma tigela grande. Em uma panela, aqueça o leite, a água, o óleo e o sal em fogo médio até ferver e subir as primeiras bolhas.",
      },
      {
        text: "Despeje o líquido fervente sobre o polvilho de uma vez e misture com uma colher de pau até escaldar todo o polvilho; a massa ficará empelotada. Deixe amornar até conseguir tocar com as mãos.",
        timerMinutes: 10,
      },
      {
        text: "Adicione os ovos, um a um, sovando com as mãos até a massa ficar lisa e grudar levemente nos dedos. Junte os queijos e sove mais 2 a 3 minutos para distribuir bem.",
      },
      {
        text: "Preaqueça o forno a 200 °C. Com as mãos untadas com óleo, modele bolinhas de cerca de 3 cm e disponha em assadeira, deixando 3 cm de espaço entre elas.",
      },
      {
        text: "Asse até crescerem, ficarem firmes e levemente douradas na base e no topo, por cerca de 25 a 30 minutos. Não abra o forno nos primeiros 15 minutos para não murcharem.",
        timerMinutes: 28,
      },
      {
        text: "Retire do forno e sirva imediatamente, ainda quentinhos, acompanhados de um café coado.",
      },
    ],
    tips: [
      "Para congelar, disponha as bolinhas cruas em uma assadeira, leve ao freezer até endurecerem e depois guarde em saco; asse direto do congelado, acrescentando 10 minutos.",
      "Se a massa ficar mole demais, acrescente polvilho às colheradas; se ficar seca e esfarelando, um pouco de leite.",
      "Queijo meia cura bem curado dá mais sabor; misture com parmesão para reforçar o salgadinho.",
    ],
    substitutions: [
      { ingredient: "polvilho azedo", substitute: "metade polvilho azedo e metade polvilho doce, para um pão mais macio e menos crescido" },
      { ingredient: "queijo minas meia cura", substitute: "queijo canastra ou queijo prato" },
    ],
    nutrition: { protein: 9, carbs: 43, fat: 16, fiber: 0.5, sodium: 520 },
  },
  // 3
  {
    slug: "moqueca-de-peixe",
    title: "Moqueca de Peixe Baiana",
    description:
      "Postas de peixe cozidas em camadas de tomate, pimentões e cebola, banhadas em leite de coco e azeite de dendê. Perfumada, colorida e reconfortante.",
    emoji: "🐟",
    cuisine: "brasileira",
    categories: ["peixes-e-frutos-do-mar"],
    prepMinutes: 30,
    cookMinutes: 30,
    servings: 4,
    difficulty: "MEDIUM",
    caloriesPerServing: 480,
    costLevel: "HIGH",
    tags: ["almoço", "baiana", "sem glúten", "fim de semana"],
    ingredients: [
      { name: "peixe branco", quantity: 1, unit: "kg", group: "PEIXES", note: "em postas grossas, como robalo, badejo ou cação" },
      { name: "limão", quantity: 1, unit: "unidade", group: "HORTIFRUTI", note: "suco" },
      { name: "alho", quantity: 3, unit: "dente", group: "HORTIFRUTI", note: "amassado" },
      { name: "cebola", quantity: 2, unit: "unidade", group: "HORTIFRUTI", note: "em rodelas" },
      { name: "tomate", quantity: 4, unit: "unidade", group: "HORTIFRUTI", note: "em rodelas" },
      { name: "pimentão vermelho", quantity: 1, unit: "unidade", group: "HORTIFRUTI", note: "em rodelas" },
      { name: "pimentão amarelo", quantity: 1, unit: "unidade", group: "HORTIFRUTI", note: "em rodelas" },
      { name: "leite de coco", quantity: 400, unit: "ml", group: "MERCEARIA" },
      { name: "azeite de dendê", quantity: 3, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "coentro", quantity: 1, unit: "maço", group: "HORTIFRUTI", note: "picado" },
      { name: "cebolinha", quantity: null, unit: "a gosto", group: "HORTIFRUTI" },
      { name: "pimenta vermelha", quantity: 1, unit: "unidade", group: "HORTIFRUTI", note: "picada, sem sementes", optional: true },
      { name: "sal", quantity: null, unit: "a gosto", group: "TEMPEROS" },
    ],
    steps: [
      {
        text: "Tempere as postas de peixe com o suco de limão, o alho e sal. Cubra e deixe marinar na geladeira enquanto prepara os legumes.",
        timerMinutes: 30,
      },
      {
        text: "Em uma panela larga de barro ou de fundo grosso, faça uma camada com metade da cebola, do tomate e dos pimentões. Distribua as postas de peixe por cima, em uma só camada.",
      },
      {
        text: "Cubra o peixe com o restante dos legumes, metade do coentro e a pimenta, se usar. Regue com o leite de coco e o azeite de dendê.",
      },
      {
        text: "Tampe e leve ao fogo médio até começar a ferver; então abaixe o fogo e cozinhe sem mexer, apenas balançando a panela de vez em quando para não grudar, até o peixe ficar opaco e soltar em lascas.",
        timerMinutes: 20,
      },
      {
        text: "Prove o caldo, ajuste o sal e finalize com o restante do coentro e a cebolinha. Desligue e deixe descansar tampado por 5 minutos.",
        timerMinutes: 5,
      },
      {
        text: "Sirva na própria panela, acompanhada de arroz branco, farofa de dendê e pirão feito com o caldo da moqueca.",
      },
    ],
    tips: [
      "Não mexa a moqueca com colher: o peixe se desmancha. Balance a panela para movimentar o caldo.",
      "Escolha peixes de carne firme, que aguentam o cozimento sem esfarelar.",
      "O dendê tem sabor marcante; comece com menos e acrescente no final se quiser mais intensidade.",
    ],
    substitutions: [
      { ingredient: "azeite de dendê", substitute: "azeite de oliva com uma pitada de páprica doce (versão capixaba, sem dendê)" },
      { ingredient: "peixe branco", substitute: "camarão limpo, reduzindo o cozimento para 8 minutos" },
    ],
    nutrition: { protein: 45, carbs: 14, fat: 27, fiber: 4, sodium: 720 },
  },
  // 4
  {
    slug: "coxinha-de-frango",
    title: "Coxinha de Frango com Requeijão",
    description:
      "A rainha dos salgados: massa macia feita no caldo do frango, recheio suculento com requeijão e uma casquinha dourada e crocante.",
    emoji: "🍗",
    cuisine: "brasileira",
    categories: ["comidas-de-boteco", "frangos"],
    prepMinutes: 60,
    cookMinutes: 50,
    servings: 10,
    difficulty: "HARD",
    caloriesPerServing: 420,
    costLevel: "MEDIUM",
    tags: ["salgado", "festa", "petisco", "frito"],
    ingredients: [
      { name: "peito de frango", quantity: 600, unit: "g", group: "CARNES" },
      { name: "água", quantity: 1, unit: "l", group: "BEBIDAS" },
      { name: "caldo de galinha", quantity: 1, unit: "unidade", group: "TEMPEROS", note: "tablete" },
      { name: "cebola", quantity: 1, unit: "unidade", group: "HORTIFRUTI", note: "picada" },
      { name: "alho", quantity: 3, unit: "dente", group: "HORTIFRUTI", note: "picado" },
      { name: "tomate", quantity: 1, unit: "unidade", group: "HORTIFRUTI", note: "sem sementes, picado" },
      { name: "requeijão cremoso", quantity: 150, unit: "g", group: "LATICINIOS" },
      { name: "salsinha", quantity: 2, unit: "colher de sopa", group: "HORTIFRUTI", note: "picada" },
      { name: "manteiga", quantity: 2, unit: "colher de sopa", group: "LATICINIOS" },
      { name: "farinha de trigo", quantity: 360, unit: "g", group: "MERCEARIA", note: "cerca de 3 xícaras" },
      { name: "ovo", quantity: 2, unit: "unidade", group: "LATICINIOS", note: "batidos, para empanar" },
      { name: "farinha de rosca", quantity: 200, unit: "g", group: "PADARIA" },
      { name: "óleo", quantity: 1, unit: "l", group: "MERCEARIA", note: "para fritar" },
      { name: "sal", quantity: null, unit: "a gosto", group: "TEMPEROS" },
    ],
    steps: [
      {
        text: "Cozinhe o peito de frango na água com o tablete de caldo em fogo médio, com a panela tampada, até ficar macio. Retire o frango e reserve 750 ml (3 xícaras) do caldo para a massa.",
        timerMinutes: 25,
      },
      {
        text: "Desfie o frango. Em uma frigideira com 1 colher de sopa de manteiga, refogue a cebola até murchar, junte o alho e o tomate e cozinhe por 3 minutos. Adicione o frango, ajuste o sal, desligue, misture a salsinha e deixe esfriar.",
        timerMinutes: 5,
      },
      {
        text: "Para a massa, leve o caldo reservado e o restante da manteiga ao fogo médio. Quando ferver, despeje a farinha de uma só vez e mexa vigorosamente com colher de pau até a massa desgrudar do fundo da panela e formar uma bola, cerca de 3 minutos.",
        timerMinutes: 3,
      },
      {
        text: "Transfira a massa para uma superfície untada e, assim que der para manusear, sove por 3 a 4 minutos até ficar lisa e homogênea. Cubra com filme para não ressecar.",
      },
      {
        text: "Pegue porções de cerca de 40 g, abra na palma da mão em formato de concha, coloque uma colher de recheio e um pouco de requeijão, feche puxando a massa para cima e modele a ponta da coxinha.",
      },
      {
        text: "Passe cada coxinha no ovo batido e depois na farinha de rosca, pressionando levemente para aderir.",
      },
      {
        text: "Aqueça o óleo a 170–180 °C em uma panela funda e frite poucas unidades por vez, virando, até ficarem douradas por igual, cerca de 3 a 4 minutos. Escorra em papel-toalha e sirva quente.",
        timerMinutes: 4,
      },
    ],
    tips: [
      "Recheio frio é essencial: quente, ele amolece a massa e a coxinha abre na fritura.",
      "Se não tiver termômetro, teste com um palito de fósforo no óleo: quando acender sozinho, está na temperatura certa.",
      "Coxinhas empanadas podem ser congeladas cruas e fritas direto do congelador, em óleo um pouco mais baixo.",
    ],
    substitutions: [
      { ingredient: "requeijão cremoso", substitute: "cream cheese" },
      { ingredient: "farinha de rosca", substitute: "farinha panko, para uma casquinha mais crocante" },
    ],
    nutrition: { protein: 20, carbs: 42, fat: 19, fiber: 2, sodium: 680 },
  },
  // 5
  {
    slug: "brigadeiro",
    title: "Brigadeiro Tradicional",
    description:
      "O docinho mais amado do Brasil: cremoso, chocolatudo e enrolado no granulado, pronto para qualquer festa ou para comer de colher.",
    emoji: "🍫",
    cuisine: "brasileira",
    categories: ["sobremesas-e-doces", "economicas"],
    prepMinutes: 30,
    cookMinutes: 15,
    servings: 25,
    difficulty: "EASY",
    caloriesPerServing: 75,
    costLevel: "LOW",
    tags: ["festa", "aniversário", "doce", "chocolate"],
    ingredients: [
      { name: "leite condensado", quantity: 1, unit: "lata", group: "MERCEARIA", note: "395 g" },
      { name: "chocolate em pó", quantity: 3, unit: "colher de sopa", group: "MERCEARIA", note: "50% cacau" },
      { name: "manteiga", quantity: 1, unit: "colher de sopa", group: "LATICINIOS", note: "mais um pouco para untar as mãos" },
      { name: "chocolate granulado", quantity: 100, unit: "g", group: "MERCEARIA" },
      { name: "creme de leite", quantity: 2, unit: "colher de sopa", group: "LATICINIOS", optional: true },
      { name: "sal", quantity: 1, unit: "pitada", group: "TEMPEROS", optional: true },
    ],
    steps: [
      {
        text: "Em uma panela de fundo grosso, coloque o leite condensado, o chocolate em pó peneirado, a manteiga e a pitada de sal. Misture bem antes de ligar o fogo para não formar grumos.",
      },
      {
        text: "Leve ao fogo médio-baixo, mexendo sem parar com uma espátula, raspando bem o fundo e as laterais. Cozinhe até a massa engrossar e desgrudar do fundo da panela ao inclinar, formando uma massa única.",
        timerMinutes: 12,
      },
      {
        text: "Se quiser um brigadeiro mais macio, desligue o fogo e misture o creme de leite. Transfira para um prato untado com manteiga.",
      },
      {
        text: "Deixe esfriar completamente em temperatura ambiente e depois leve à geladeira para firmar.",
        timerMinutes: 60,
      },
      {
        text: "Com as mãos untadas com manteiga, enrole bolinhas de cerca de 15 g, passe no granulado e coloque em forminhas de papel.",
      },
    ],
    tips: [
      "Para brigadeiro de colher, desligue o fogo assim que a massa começar a desgrudar; para enrolar, cozinhe 2 minutos a mais.",
      "Use chocolate em pó de boa qualidade ou meio a meio com cacau em pó para um sabor mais intenso.",
      "Granulado de chocolate (e não o granulado comum colorido) faz toda a diferença no sabor.",
    ],
    substitutions: [
      { ingredient: "chocolate em pó", substitute: "cacau em pó 100%, usando 2 colheres de sopa para um brigadeiro mais amargo" },
      { ingredient: "chocolate granulado", substitute: "cacau em pó, castanha picada ou coco ralado" },
    ],
    nutrition: { protein: 1.3, carbs: 12, fat: 2.5, fiber: 0.4, sodium: 22 },
  },
  // 6
  {
    slug: "bolo-de-cenoura-com-chocolate",
    title: "Bolo de Cenoura com Cobertura de Chocolate",
    description:
      "Massa fofinha e alaranjada feita no liquidificador, coberta por uma calda de chocolate brilhante que escorre pelas laterais.",
    emoji: "🥕",
    cuisine: "brasileira",
    categories: ["bolos-e-tortas", "economicas"],
    prepMinutes: 20,
    cookMinutes: 45,
    servings: 12,
    difficulty: "EASY",
    caloriesPerServing: 390,
    costLevel: "LOW",
    tags: ["café da tarde", "bolo", "liquidificador", "família"],
    ingredients: [
      { name: "cenoura", quantity: 3, unit: "unidade", group: "HORTIFRUTI", note: "médias (cerca de 300 g), descascadas e picadas" },
      { name: "ovo", quantity: 4, unit: "unidade", group: "LATICINIOS" },
      { name: "óleo", quantity: 1, unit: "xícara", group: "MERCEARIA" },
      { name: "açúcar", quantity: 3, unit: "xícara", group: "MERCEARIA", note: "2 para a massa e 1 para a cobertura" },
      { name: "farinha de trigo", quantity: 2.5, unit: "xícara", group: "MERCEARIA" },
      { name: "fermento químico", quantity: 1, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "chocolate em pó", quantity: 6, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "manteiga", quantity: 2, unit: "colher de sopa", group: "LATICINIOS" },
      { name: "leite", quantity: 0.5, unit: "xícara", group: "LATICINIOS" },
    ],
    steps: [
      {
        text: "Preaqueça o forno a 180 °C e unte com manteiga e farinha uma forma retangular de cerca de 20 x 30 cm.",
      },
      {
        text: "No liquidificador, bata a cenoura, os ovos e o óleo por 2 a 3 minutos, até obter um creme liso e sem pedaços de cenoura.",
      },
      {
        text: "Transfira para uma tigela e misture 2 xícaras de açúcar. Acrescente a farinha peneirada aos poucos, mexendo com um batedor de arame até a massa ficar homogênea. Por último, incorpore o fermento delicadamente.",
      },
      {
        text: "Despeje na forma e asse até a superfície ficar dourada e um palito inserido no centro sair limpo, cerca de 40 minutos.",
        timerMinutes: 40,
      },
      {
        text: "Para a cobertura, leve ao fogo médio a manteiga, o chocolate em pó, 1 xícara de açúcar e o leite, mexendo sempre. Quando ferver, cozinhe mais 2 a 3 minutos até engrossar levemente e ficar brilhante.",
        timerMinutes: 5,
      },
      {
        text: "Fure o bolo ainda quente com um garfo e despeje a cobertura quente por cima, espalhando bem. Deixe amornar antes de cortar.",
        timerMinutes: 20,
      },
    ],
    tips: [
      "Não abra o forno nos primeiros 25 minutos para o bolo não solar.",
      "Cobertura e bolo quentes juntos criam uma casquinha fina e úmida, típica do bolo de cenoura brasileiro.",
      "Para uma cobertura mais firme, que endurece ao esfriar, cozinhe a calda por 5 minutos após levantar fervura.",
    ],
    substitutions: [
      { ingredient: "farinha de trigo", substitute: "metade farinha de trigo integral, para um bolo mais rústico" },
      { ingredient: "chocolate em pó", substitute: "brigadeiro mole como cobertura" },
    ],
    nutrition: { protein: 5, carbs: 52, fat: 18, fiber: 1.5, sodium: 150 },
  },
  // 7
  {
    slug: "escondidinho-de-carne-seca",
    title: "Escondidinho de Carne Seca",
    description:
      "Carne seca desfiada e acebolada escondida sob um purê cremoso de mandioca, gratinado com queijo até formar uma crosta dourada.",
    emoji: "🥘",
    cuisine: "brasileira",
    categories: ["carnes-e-churrasco"],
    prepMinutes: 40,
    cookMinutes: 60,
    servings: 6,
    difficulty: "MEDIUM",
    caloriesPerServing: 560,
    costLevel: "MEDIUM",
    tags: ["almoço", "jantar", "nordestina", "gratinado", "sem glúten"],
    ingredients: [
      { name: "carne seca", quantity: 500, unit: "g", group: "CARNES" },
      { name: "mandioca", quantity: 1, unit: "kg", group: "HORTIFRUTI", note: "descascada e em pedaços" },
      { name: "manteiga", quantity: 3, unit: "colher de sopa", group: "LATICINIOS" },
      { name: "leite", quantity: 1, unit: "xícara", group: "LATICINIOS", note: "quente" },
      { name: "requeijão cremoso", quantity: 200, unit: "g", group: "LATICINIOS" },
      { name: "cebola", quantity: 1, unit: "unidade", group: "HORTIFRUTI", note: "em meias-luas finas" },
      { name: "alho", quantity: 3, unit: "dente", group: "HORTIFRUTI", note: "picado" },
      { name: "tomate", quantity: 2, unit: "unidade", group: "HORTIFRUTI", note: "sem sementes, picado" },
      { name: "cebolinha", quantity: 3, unit: "colher de sopa", group: "HORTIFRUTI", note: "picada" },
      { name: "queijo muçarela", quantity: 200, unit: "g", group: "LATICINIOS", note: "ralado" },
      { name: "queijo parmesão", quantity: 50, unit: "g", group: "LATICINIOS", note: "ralado" },
      { name: "sal", quantity: null, unit: "a gosto", group: "TEMPEROS" },
      { name: "pimenta-do-reino", quantity: null, unit: "a gosto", group: "TEMPEROS" },
    ],
    steps: [
      {
        text: "Na véspera, corte a carne seca em cubos grandes e deixe de molho em água na geladeira, trocando a água 3 a 4 vezes para dessalgar.",
        timerMinutes: 720,
      },
      {
        text: "Escorra a carne, cubra com água limpa na panela de pressão e cozinhe por 30 minutos após pegar pressão, até ficar bem macia. Escorra, espere amornar e desfie com dois garfos.",
        timerMinutes: 30,
      },
      {
        text: "Cozinhe a mandioca em água com sal até ficar muito macia e começar a abrir, cerca de 25 minutos. Retire os fios centrais e amasse ainda quente com 2 colheres de manteiga, o leite quente e metade do requeijão, até virar um purê liso. Acerte o sal.",
        timerMinutes: 25,
      },
      {
        text: "Em uma frigideira, derreta o restante da manteiga e doure a cebola em fogo médio até ficar macia e levemente caramelizada. Junte o alho, refogue 1 minuto, acrescente a carne desfiada e o tomate e cozinhe por 5 minutos. Tempere com pimenta e finalize com cebolinha.",
        timerMinutes: 8,
      },
      {
        text: "Preaqueça o forno a 200 °C. Em um refratário, espalhe metade do purê, cubra com a carne, distribua colheradas do requeijão restante e cubra com o restante do purê, alisando a superfície.",
      },
      {
        text: "Polvilhe a muçarela e o parmesão e leve ao forno até o queijo derreter e formar uma crosta dourada, cerca de 20 minutos. Deixe descansar 5 minutos antes de servir.",
        timerMinutes: 20,
      },
    ],
    tips: [
      "Prove um pedacinho da carne depois de dessalgar: se ainda estiver muito salgada, ferva por 10 minutos em água nova.",
      "Para um purê mais aveludado, passe a mandioca pelo espremedor em vez de amassar com garfo.",
      "Dá para montar com antecedência e guardar na geladeira; asse por 10 minutos a mais na hora de servir.",
    ],
    substitutions: [
      { ingredient: "carne seca", substitute: "frango desfiado com requeijão ou carne moída refogada" },
      { ingredient: "mandioca", substitute: "batata ou abóbora cabotiá" },
    ],
    nutrition: { protein: 34, carbs: 50, fat: 25, fiber: 3, sodium: 1250 },
  },
  // 8
  {
    slug: "caldo-verde",
    title: "Caldo Verde",
    description:
      "Creme aveludado de batata com tirinhas de couve e rodelas de calabresa douradas: o caldo perfeito para noites frias.",
    emoji: "🥬",
    cuisine: "brasileira",
    categories: ["sopas-e-caldos", "economicas"],
    prepMinutes: 20,
    cookMinutes: 35,
    servings: 6,
    difficulty: "EASY",
    caloriesPerServing: 320,
    costLevel: "LOW",
    tags: ["jantar", "inverno", "sopa", "sem glúten"],
    ingredients: [
      { name: "batata", quantity: 1, unit: "kg", group: "HORTIFRUTI", note: "descascada e em cubos" },
      { name: "linguiça calabresa", quantity: 300, unit: "g", group: "CARNES", note: "em rodelas finas" },
      { name: "couve-manteiga", quantity: 1, unit: "maço", group: "HORTIFRUTI", note: "cortada em tiras bem finas" },
      { name: "cebola", quantity: 1, unit: "unidade", group: "HORTIFRUTI", note: "picada" },
      { name: "alho", quantity: 3, unit: "dente", group: "HORTIFRUTI", note: "picado" },
      { name: "azeite", quantity: 3, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "água", quantity: 2, unit: "l", group: "BEBIDAS" },
      { name: "sal", quantity: null, unit: "a gosto", group: "TEMPEROS" },
      { name: "pimenta-do-reino", quantity: null, unit: "a gosto", group: "TEMPEROS" },
    ],
    steps: [
      {
        text: "Em uma panela grande, aqueça 1 colher de sopa de azeite e doure a calabresa em fogo médio até as rodelas ficarem com as bordas crocantes. Retire e reserve, deixando a gordura na panela.",
        timerMinutes: 6,
      },
      {
        text: "Na mesma panela, junte o restante do azeite e refogue a cebola até ficar transparente. Acrescente o alho e mexa por 1 minuto, sem dourar demais.",
      },
      {
        text: "Adicione as batatas e a água, tempere com sal e cozinhe com a panela semitampada em fogo médio até as batatas se desmancharem ao toque do garfo.",
        timerMinutes: 25,
      },
      {
        text: "Bata tudo com um mixer de mão (ou no liquidificador, em partes e com cuidado por estar quente) até obter um creme liso. Se estiver grosso demais, acrescente um pouco de água quente.",
      },
      {
        text: "Volte o creme ao fogo, adicione a couve e metade da calabresa e cozinhe por apenas 3 a 4 minutos, até a couve ficar verde brilhante e macia.",
        timerMinutes: 4,
      },
      {
        text: "Ajuste o sal e a pimenta e sirva em cumbucas, finalizando com o restante da calabresa e um fio de azeite.",
      },
    ],
    tips: [
      "A couve deve ser cortada bem fininha, como cabelo de anjo; peça para cortarem na feira se preferir.",
      "Não cozinhe a couve demais para que ela não perca a cor nem fique amarga.",
      "Batatas mais farinhentas, como a asterix, deixam o caldo mais cremoso.",
    ],
    substitutions: [
      { ingredient: "linguiça calabresa", substitute: "paio ou bacon em cubos" },
      { ingredient: "batata", substitute: "metade batata e metade mandioquinha, para um caldo mais adocicado" },
    ],
    nutrition: { protein: 12, carbs: 30, fat: 17, fiber: 4, sodium: 780 },
  },
  // 9
  {
    slug: "pastel-de-feira",
    title: "Pastel de Feira de Carne e Queijo",
    description:
      "Pastel grande, sequinho e cheio de bolhas, recheado com carne moída temperada ou queijo derretido, igualzinho ao da barraca da feira.",
    emoji: "🥟",
    cuisine: "brasileira",
    categories: ["comidas-de-boteco", "hamburgueres-e-lanches"],
    prepMinutes: 30,
    cookMinutes: 30,
    servings: 5,
    difficulty: "MEDIUM",
    caloriesPerServing: 620,
    costLevel: "MEDIUM",
    tags: ["lanche", "frito", "feira", "petisco"],
    ingredients: [
      { name: "massa de pastel", quantity: 500, unit: "g", group: "CONGELADOS", note: "em rolo ou discos grandes" },
      { name: "carne moída", quantity: 400, unit: "g", group: "CARNES" },
      { name: "cebola", quantity: 1, unit: "unidade", group: "HORTIFRUTI", note: "picada" },
      { name: "alho", quantity: 2, unit: "dente", group: "HORTIFRUTI", note: "picado" },
      { name: "cominho", quantity: 0.5, unit: "colher de chá", group: "TEMPEROS" },
      { name: "azeitona verde", quantity: 50, unit: "g", group: "MERCEARIA", note: "picada" },
      { name: "ovo", quantity: 2, unit: "unidade", group: "LATICINIOS", note: "cozidos e picados" },
      { name: "cebolinha", quantity: 2, unit: "colher de sopa", group: "HORTIFRUTI", note: "picada" },
      { name: "queijo muçarela", quantity: 200, unit: "g", group: "LATICINIOS", note: "ralado" },
      { name: "orégano", quantity: null, unit: "a gosto", group: "TEMPEROS" },
      { name: "óleo", quantity: 1, unit: "l", group: "MERCEARIA", note: "para fritar" },
      { name: "sal", quantity: null, unit: "a gosto", group: "TEMPEROS" },
      { name: "pimenta-do-reino", quantity: null, unit: "a gosto", group: "TEMPEROS" },
    ],
    steps: [
      {
        text: "Em uma frigideira quente com um fio de óleo, doure a carne moída em fogo alto, mexendo pouco para que ela sele e solte o mínimo de água. Junte a cebola e o alho e refogue até a cebola murchar.",
        timerMinutes: 10,
      },
      {
        text: "Tempere com sal, pimenta e cominho e cozinhe até secar todo o líquido. Desligue, misture a azeitona, o ovo cozido e a cebolinha e deixe o recheio esfriar completamente.",
      },
      {
        text: "Abra a massa sobre a bancada levemente enfarinhada e corte retângulos de cerca de 12 x 24 cm. Coloque o recheio de carne em metade dos pastéis e muçarela com uma pitada de orégano na outra metade, deixando 2 cm de borda livre.",
      },
      {
        text: "Dobre a massa sobre o recheio, retire o ar com as mãos e feche as bordas apertando com um garfo. Se a massa estiver seca, pincele as bordas com um pouco de água antes de fechar.",
      },
      {
        text: "Aqueça o óleo a 180 °C em uma panela larga e funda. Frite 1 ou 2 pastéis por vez, regando a parte de cima com o óleo para formar as bolhas, e vire quando a base estiver dourada; cerca de 2 a 3 minutos no total.",
        timerMinutes: 3,
      },
      {
        text: "Escorra em pé sobre papel-toalha ou em uma grade para manter a crocância. Sirva imediatamente, de preferência com caldo de cana.",
      },
    ],
    tips: [
      "Óleo bem quente é o segredo do pastel sequinho; em temperatura baixa ele absorve gordura e fica murcho.",
      "Não exagere no recheio de queijo para o pastel não estourar durante a fritura.",
      "Recheio frio e seco evita que a massa encharque e rasgue.",
    ],
    substitutions: [
      { ingredient: "carne moída", substitute: "frango desfiado com requeijão ou palmito refogado" },
      { ingredient: "queijo muçarela", substitute: "queijo prato com tomate e orégano (pastel de pizza)" },
    ],
    nutrition: { protein: 28, carbs: 48, fat: 35, fiber: 2, sodium: 980 },
  },
  // 10
  {
    slug: "arroz-carreteiro",
    title: "Arroz Carreteiro",
    description:
      "Prato tropeiro do Sul feito em uma panela só: arroz soltinho cozido com carne seca, calabresa e bacon, cheio de sabor defumado.",
    emoji: "🍚",
    cuisine: "brasileira",
    categories: ["carnes-e-churrasco", "economicas"],
    prepMinutes: 20,
    cookMinutes: 40,
    servings: 6,
    difficulty: "EASY",
    caloriesPerServing: 520,
    costLevel: "LOW",
    tags: ["almoço", "gaúcha", "panela única", "aproveitamento"],
    ingredients: [
      { name: "arroz branco", quantity: 2, unit: "xícara", group: "MERCEARIA" },
      { name: "carne seca", quantity: 500, unit: "g", group: "CARNES", note: "dessalgada, cozida e desfiada" },
      { name: "linguiça calabresa", quantity: 200, unit: "g", group: "CARNES", note: "em cubos" },
      { name: "bacon", quantity: 100, unit: "g", group: "CARNES", note: "em cubos" },
      { name: "cebola", quantity: 1, unit: "unidade", group: "HORTIFRUTI", note: "picada" },
      { name: "alho", quantity: 4, unit: "dente", group: "HORTIFRUTI", note: "picado" },
      { name: "tomate", quantity: 2, unit: "unidade", group: "HORTIFRUTI", note: "sem sementes, picado" },
      { name: "água", quantity: 4, unit: "xícara", group: "BEBIDAS", note: "fervente" },
      { name: "óleo", quantity: 1, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "salsinha", quantity: 2, unit: "colher de sopa", group: "HORTIFRUTI", note: "picada" },
      { name: "cebolinha", quantity: 2, unit: "colher de sopa", group: "HORTIFRUTI", note: "picada" },
      { name: "sal", quantity: null, unit: "a gosto", group: "TEMPEROS" },
      { name: "pimenta-do-reino", quantity: null, unit: "a gosto", group: "TEMPEROS" },
    ],
    steps: [
      {
        text: "Em uma panela grande e de fundo grosso, aqueça o óleo e frite o bacon em fogo médio até dourar e soltar a gordura. Junte a calabresa e frite até as bordas ficarem tostadas.",
        timerMinutes: 8,
      },
      {
        text: "Acrescente a carne seca desfiada e deixe fritar por 5 minutos, mexendo de vez em quando, para que ela doure levemente e ganhe sabor.",
        timerMinutes: 5,
      },
      {
        text: "Adicione a cebola e refogue até ficar macia; junte o alho e o tomate e cozinhe até o tomate desmanchar, cerca de 3 minutos.",
        timerMinutes: 3,
      },
      {
        text: "Coloque o arroz cru e refogue por 2 minutos, mexendo para envolver os grãos na gordura. Prove o refogado antes de salgar, pois as carnes já são salgadas.",
      },
      {
        text: "Despeje a água fervente, tempere com pimenta e cozinhe em fogo baixo, com a panela semitampada, até a água secar e o arroz ficar macio e soltinho.",
        timerMinutes: 18,
      },
      {
        text: "Desligue, tampe e deixe descansar por 5 minutos. Solte com um garfo, finalize com salsinha e cebolinha e sirva.",
        timerMinutes: 5,
      },
    ],
    tips: [
      "É uma ótima forma de aproveitar sobras de churrasco: substitua parte da carne seca por picanha ou maminha picada.",
      "Use panela de ferro se tiver; o fundo levemente tostado (a raspa) é muito apreciado.",
      "Sirva com salada de tomate e cebola para equilibrar a gordura.",
    ],
    substitutions: [
      { ingredient: "carne seca", substitute: "sobras de carne assada ou churrasco picadas" },
      { ingredient: "bacon", substitute: "toucinho defumado" },
    ],
    nutrition: { protein: 30, carbs: 52, fat: 21, fiber: 2, sodium: 1300 },
  },
  // 11
  {
    slug: "picanha-na-grelha",
    title: "Picanha na Grelha com Vinagrete",
    description:
      "Bifes altos de picanha com a capa de gordura crocante, temperados só com sal grosso e grelhados no ponto, servidos com vinagrete fresquinho.",
    emoji: "🥩",
    cuisine: "brasileira",
    categories: ["carnes-e-churrasco"],
    prepMinutes: 20,
    cookMinutes: 20,
    servings: 6,
    difficulty: "MEDIUM",
    caloriesPerServing: 455,
    costLevel: "HIGH",
    tags: ["churrasco", "fim de semana", "sem glúten", "low carb"],
    ingredients: [
      { name: "picanha", quantity: 1.2, unit: "kg", group: "CARNES", note: "peça inteira, com a capa de gordura" },
      { name: "sal grosso", quantity: 2, unit: "colher de sopa", group: "TEMPEROS" },
      { name: "tomate", quantity: 3, unit: "unidade", group: "HORTIFRUTI", note: "sem sementes, em cubinhos" },
      { name: "cebola", quantity: 1, unit: "unidade", group: "HORTIFRUTI", note: "em cubinhos" },
      { name: "pimentão verde", quantity: 1, unit: "unidade", group: "HORTIFRUTI", note: "em cubinhos" },
      { name: "vinagre", quantity: 3, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "azeite", quantity: 4, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "salsinha", quantity: 2, unit: "colher de sopa", group: "HORTIFRUTI", note: "picada" },
      { name: "sal", quantity: null, unit: "a gosto", group: "TEMPEROS" },
    ],
    steps: [
      {
        text: "Retire a picanha da geladeira e deixe em temperatura ambiente antes de grelhar, para que cozinhe por igual.",
        timerMinutes: 30,
      },
      {
        text: "Enquanto isso, prepare o vinagrete: misture o tomate, a cebola, o pimentão e a salsinha; tempere com vinagre, azeite e sal. Deixe na geladeira para os sabores se integrarem.",
      },
      {
        text: "Corte a picanha no sentido das fibras em bifes grossos, de cerca de 3 dedos de altura, preservando a capa de gordura. Faça pequenos cortes rasos na gordura sem atingir a carne.",
      },
      {
        text: "Tempere os bifes generosamente com sal grosso dos dois lados, apenas no momento de grelhar, e bata levemente para retirar o excesso.",
      },
      {
        text: "Aqueça bem a grelha ou a churrasqueira (brasa forte). Grelhe primeiro com a gordura virada para baixo até ela dourar e ficar crocante; depois sele cada lado por 4 a 5 minutos para o ponto mal passado a ao ponto.",
        timerMinutes: 12,
      },
      {
        text: "Retire os bifes e deixe descansar sobre uma tábua por 5 minutos para os sucos se redistribuírem. Fatie contra as fibras e sirva com o vinagrete.",
        timerMinutes: 5,
      },
    ],
    tips: [
      "A picanha de boa qualidade pesa entre 1 e 1,4 kg; peças muito maiores costumam incluir parte do coxão duro.",
      "Não espete a carne com garfo durante o preparo para não perder suculência; use pegador.",
      "Em casa, uma frigideira de ferro bem quente substitui a churrasqueira.",
    ],
    substitutions: [
      { ingredient: "picanha", substitute: "maminha ou fraldinha" },
      { ingredient: "vinagre", substitute: "suco de limão" },
    ],
    nutrition: { protein: 38, carbs: 6, fat: 31, fiber: 1.5, sodium: 950 },
  },
  // 12
  {
    slug: "frango-a-passarinho",
    title: "Frango a Passarinho na Air Fryer",
    description:
      "Pedacinhos de frango marinados no alho e limão, dourados e crocantes na air fryer com muito menos óleo, finalizados com alho frito e salsinha.",
    emoji: "🍗",
    cuisine: "brasileira",
    categories: ["comidas-de-boteco", "frangos", "air-fryer"],
    prepMinutes: 15,
    cookMinutes: 30,
    servings: 4,
    difficulty: "EASY",
    caloriesPerServing: 380,
    costLevel: "LOW",
    tags: ["petisco", "air fryer", "boteco", "sem glúten"],
    ingredients: [
      { name: "frango", quantity: 1, unit: "kg", group: "CARNES", note: "cortado a passarinho (pedaços pequenos com osso)" },
      { name: "alho", quantity: 6, unit: "dente", group: "HORTIFRUTI", note: "4 amassados e 2 fatiados" },
      { name: "limão", quantity: 1, unit: "unidade", group: "HORTIFRUTI", note: "suco" },
      { name: "páprica", quantity: 1, unit: "colher de chá", group: "TEMPEROS" },
      { name: "amido de milho", quantity: 2, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "azeite", quantity: 2, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "salsinha", quantity: 2, unit: "colher de sopa", group: "HORTIFRUTI", note: "picada" },
      { name: "sal", quantity: null, unit: "a gosto", group: "TEMPEROS" },
      { name: "pimenta-do-reino", quantity: null, unit: "a gosto", group: "TEMPEROS" },
    ],
    steps: [
      {
        text: "Tempere o frango com o alho amassado, o suco de limão, a páprica, sal e pimenta. Misture bem, cubra e deixe marinar na geladeira.",
        timerMinutes: 30,
      },
      {
        text: "Seque levemente os pedaços com papel-toalha, polvilhe o amido de milho e regue com 1 colher de sopa de azeite, misturando até todos ficarem cobertos por uma camada fina.",
      },
      {
        text: "Preaqueça a air fryer a 200 °C por 5 minutos. Distribua os pedaços no cesto em uma única camada, sem amontoar; se necessário, asse em duas levas.",
        timerMinutes: 5,
      },
      {
        text: "Asse por 25 minutos, sacudindo o cesto na metade do tempo, até a pele estar dourada e crocante e o suco perto do osso sair claro.",
        timerMinutes: 25,
      },
      {
        text: "Enquanto isso, doure o alho fatiado no restante do azeite em uma frigideira em fogo baixo, até ficar levemente dourado. Retire logo para não amargar.",
      },
      {
        text: "Transfira o frango para uma travessa, espalhe o alho frito e a salsinha por cima e sirva com gomos de limão.",
      },
    ],
    tips: [
      "Não amontoe o frango no cesto: o ar quente precisa circular para deixar tudo crocante.",
      "O amido de milho forma uma casquinha fina e sequinha sem precisar empanar.",
      "Se preferir na fritura tradicional, frite em óleo a 170 °C por cerca de 12 minutos.",
    ],
    substitutions: [
      { ingredient: "frango", substitute: "coxa de frango ou asinhas (tulipas)" },
      { ingredient: "amido de milho", substitute: "farinha de trigo (deixa de ser sem glúten)" },
    ],
    nutrition: { protein: 34, carbs: 6, fat: 24, fiber: 0.5, sodium: 620 },
  },
  // 13
  {
    slug: "bolinho-de-chuva",
    title: "Bolinho de Chuva",
    description:
      "Bolinhos fritos fofinhos por dentro e dourados por fora, passados no açúcar com canela. Receita de vó para tardes chuvosas.",
    emoji: "🍩",
    cuisine: "brasileira",
    categories: ["sobremesas-e-doces", "economicas"],
    prepMinutes: 10,
    cookMinutes: 20,
    servings: 8,
    difficulty: "EASY",
    caloriesPerServing: 295,
    costLevel: "LOW",
    tags: ["café da tarde", "doce", "frito", "receita de vó"],
    ingredients: [
      { name: "ovo", quantity: 2, unit: "unidade", group: "LATICINIOS" },
      { name: "açúcar", quantity: 1, unit: "xícara", group: "MERCEARIA", note: "metade para a massa e metade para polvilhar" },
      { name: "leite", quantity: 1, unit: "xícara", group: "LATICINIOS" },
      { name: "farinha de trigo", quantity: 2.5, unit: "xícara", group: "MERCEARIA" },
      { name: "fermento químico", quantity: 1, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "sal", quantity: 1, unit: "pitada", group: "TEMPEROS" },
      { name: "canela em pó", quantity: 2, unit: "colher de sopa", group: "TEMPEROS" },
      { name: "óleo", quantity: 1, unit: "l", group: "MERCEARIA", note: "para fritar" },
    ],
    steps: [
      {
        text: "Em uma tigela, bata os ovos com meia xícara de açúcar e o sal usando um batedor de arame até a mistura clarear levemente. Junte o leite e misture.",
      },
      {
        text: "Acrescente a farinha aos poucos, mexendo até formar uma massa grossa e pegajosa, que caia da colher em blocos e não escorra. Por último, incorpore o fermento.",
      },
      {
        text: "Aqueça o óleo em uma panela funda em fogo médio, até cerca de 170 °C. Se estiver quente demais, os bolinhos douram por fora e ficam crus por dentro.",
      },
      {
        text: "Com duas colheres de sobremesa, pingue porções da massa no óleo, sem lotar a panela. Frite, virando, até ficarem dourados por igual e crescidos, cerca de 3 a 4 minutos por leva.",
        timerMinutes: 4,
      },
      {
        text: "Escorra em papel-toalha e, ainda quentes, passe na mistura do restante do açúcar com a canela. Sirva em seguida.",
      },
    ],
    tips: [
      "Faça um bolinho de teste e abra-o: se estiver cru no meio, abaixe um pouco o fogo.",
      "Passe na canela com açúcar enquanto ainda quentes, para que grudem bem.",
      "Uma banana amassada na massa deixa os bolinhos ainda mais úmidos e perfumados.",
    ],
    substitutions: [
      { ingredient: "leite", substitute: "bebida vegetal de aveia" },
      { ingredient: "canela em pó", substitute: "raspas de laranja misturadas ao açúcar" },
    ],
    nutrition: { protein: 6, carbs: 45, fat: 10, fiber: 1, sodium: 140 },
  },
  // 14
  {
    slug: "torta-de-liquidificador-de-sardinha",
    title: "Torta de Liquidificador de Sardinha",
    description:
      "Massa leve batida no liquidificador envolvendo um recheio de sardinha com tomate, cebola e azeitona. Prática, barata e perfeita para o lanche.",
    emoji: "🥧",
    cuisine: "brasileira",
    categories: ["bolos-e-tortas", "peixes-e-frutos-do-mar", "economicas"],
    prepMinutes: 20,
    cookMinutes: 45,
    servings: 8,
    difficulty: "EASY",
    caloriesPerServing: 330,
    costLevel: "LOW",
    tags: ["lanche", "liquidificador", "torta salgada", "prática"],
    ingredients: [
      { name: "ovo", quantity: 3, unit: "unidade", group: "LATICINIOS" },
      { name: "leite", quantity: 2, unit: "xícara", group: "LATICINIOS" },
      { name: "óleo", quantity: 0.5, unit: "xícara", group: "MERCEARIA" },
      { name: "farinha de trigo", quantity: 2, unit: "xícara", group: "MERCEARIA" },
      { name: "queijo parmesão", quantity: 3, unit: "colher de sopa", group: "LATICINIOS", note: "ralado" },
      { name: "fermento químico", quantity: 1, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "sal", quantity: 1, unit: "colher de chá", group: "TEMPEROS" },
      { name: "sardinha em lata", quantity: 2, unit: "lata", group: "PEIXES", note: "escorrida, sem espinha central" },
      { name: "tomate", quantity: 2, unit: "unidade", group: "HORTIFRUTI", note: "sem sementes, picado" },
      { name: "cebola", quantity: 1, unit: "unidade", group: "HORTIFRUTI", note: "picada" },
      { name: "azeitona verde", quantity: 50, unit: "g", group: "MERCEARIA", note: "picada" },
      { name: "cebolinha", quantity: 2, unit: "colher de sopa", group: "HORTIFRUTI", note: "picada" },
      { name: "orégano", quantity: null, unit: "a gosto", group: "TEMPEROS" },
    ],
    steps: [
      {
        text: "Preaqueça o forno a 180 °C e unte com óleo e farinha uma forma retangular média (cerca de 20 x 30 cm).",
      },
      {
        text: "Prepare o recheio em uma tigela: misture a sardinha desfiada grosseiramente com garfo, o tomate, a cebola, a azeitona e a cebolinha. Tempere com orégano e uma pitada de sal.",
      },
      {
        text: "No liquidificador, bata os ovos, o leite, o óleo, o parmesão e o sal por 1 minuto. Acrescente a farinha aos poucos, batendo até obter uma massa lisa e cremosa. Adicione o fermento e pulse apenas para misturar.",
      },
      {
        text: "Despeje metade da massa na forma, espalhe o recheio de maneira uniforme e cubra com o restante da massa. Polvilhe orégano por cima.",
      },
      {
        text: "Asse até a superfície ficar dourada e um palito inserido no centro sair limpo, cerca de 40 a 45 minutos.",
        timerMinutes: 45,
      },
      {
        text: "Deixe descansar por 10 minutos fora do forno antes de cortar em quadrados, para que a torta firme e não se desmanche.",
        timerMinutes: 10,
      },
    ],
    tips: [
      "Use sardinha em óleo e aproveite 1 colher de sopa do óleo da lata na massa para reforçar o sabor.",
      "Escorra bem o tomate para o recheio não soltar água e deixar a massa embatumada.",
      "Fica deliciosa fria também, ótima para a marmita ou o lanche da escola.",
    ],
    substitutions: [
      { ingredient: "sardinha em lata", substitute: "atum em lata ou frango desfiado" },
      { ingredient: "azeitona verde", substitute: "milho verde em lata" },
    ],
    nutrition: { protein: 15, carbs: 28, fat: 18, fiber: 1.5, sodium: 520 },
  },
  // 15
  {
    slug: "mandioca-frita-na-air-fryer",
    title: "Mandioca Frita na Air Fryer",
    description:
      "Mandioca pré-cozida e dourada na air fryer: casquinha crocante e rachadinha por fora, macia e cremosa por dentro, com pouquíssimo óleo.",
    emoji: "🍟",
    cuisine: "brasileira",
    categories: ["air-fryer", "comidas-de-boteco", "vegetarianas-e-veganas"],
    prepMinutes: 15,
    cookMinutes: 50,
    servings: 4,
    difficulty: "EASY",
    caloriesPerServing: 385,
    costLevel: "LOW",
    tags: ["petisco", "air fryer", "vegana", "sem glúten"],
    ingredients: [
      { name: "mandioca", quantity: 1, unit: "kg", group: "HORTIFRUTI", note: "descascada e cortada em toletes" },
      { name: "água", quantity: 2, unit: "l", group: "BEBIDAS" },
      { name: "sal", quantity: 1, unit: "colher de sopa", group: "TEMPEROS", note: "mais um pouco para finalizar" },
      { name: "azeite", quantity: 2, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "páprica", quantity: 1, unit: "colher de chá", group: "TEMPEROS", optional: true },
      { name: "alecrim", quantity: null, unit: "a gosto", group: "TEMPEROS", optional: true },
    ],
    steps: [
      {
        text: "Coloque a mandioca na água fria com o sal e leve ao fogo médio. Cozinhe a partir da fervura até ficar macia ao espetar o garfo, mas ainda inteira, sem desmanchar.",
        timerMinutes: 20,
      },
      {
        text: "Escorra bem, retire as fibras centrais e deixe os pedaços secarem sobre um pano ou grade até perderem todo o vapor; quanto mais secos, mais crocantes ficarão.",
        timerMinutes: 15,
      },
      {
        text: "Em uma tigela, regue a mandioca com o azeite e polvilhe a páprica, misturando com cuidado para envolver todos os pedaços.",
      },
      {
        text: "Preaqueça a air fryer a 200 °C e distribua os toletes no cesto em camada única, com espaço entre eles.",
      },
      {
        text: "Asse por 20 a 25 minutos, sacudindo o cesto na metade do tempo, até a superfície ficar dourada e rachadinha.",
        timerMinutes: 22,
      },
      {
        text: "Finalize com sal e alecrim fresco picado e sirva imediatamente.",
      },
    ],
    tips: [
      "Depois de cozida e seca, a mandioca pode ser congelada; leve direto do freezer à air fryer, acrescentando 5 minutos.",
      "Pedaços de tamanho uniforme garantem que todos fiquem crocantes ao mesmo tempo.",
      "Prefira mandioca amarela e fresca, que cozinha mais rápido e fica mais cremosa.",
    ],
    substitutions: [
      { ingredient: "mandioca", substitute: "batata-doce em palitos, sem necessidade de pré-cozinhar" },
      { ingredient: "páprica", substitute: "alho em pó" },
    ],
    nutrition: { protein: 3, carbs: 80, fat: 6, fiber: 4, sodium: 480 },
  },
  // 16
  {
    slug: "baiao-de-dois",
    title: "Baião de Dois",
    description:
      "Arroz e feijão-de-corda cozidos juntos com carne seca, bacon e calabresa, finalizados com queijo coalho e manteiga de garrafa. Puro sabor do Ceará.",
    emoji: "🫘",
    cuisine: "brasileira",
    categories: ["carnes-e-churrasco"],
    prepMinutes: 30,
    cookMinutes: 60,
    servings: 6,
    difficulty: "MEDIUM",
    caloriesPerServing: 615,
    costLevel: "MEDIUM",
    tags: ["almoço", "nordestina", "panela única", "sem glúten"],
    ingredients: [
      { name: "feijão-de-corda", quantity: 250, unit: "g", group: "MERCEARIA" },
      { name: "arroz branco", quantity: 2, unit: "xícara", group: "MERCEARIA" },
      { name: "carne seca", quantity: 300, unit: "g", group: "CARNES", note: "dessalgada e em cubos" },
      { name: "bacon", quantity: 150, unit: "g", group: "CARNES", note: "em cubos" },
      { name: "linguiça calabresa", quantity: 200, unit: "g", group: "CARNES", note: "em cubos" },
      { name: "queijo coalho", quantity: 200, unit: "g", group: "LATICINIOS", note: "em cubos" },
      { name: "cebola", quantity: 1, unit: "unidade", group: "HORTIFRUTI", note: "picada" },
      { name: "alho", quantity: 4, unit: "dente", group: "HORTIFRUTI", note: "picado" },
      { name: "manteiga de garrafa", quantity: 3, unit: "colher de sopa", group: "LATICINIOS" },
      { name: "coentro", quantity: 3, unit: "colher de sopa", group: "HORTIFRUTI", note: "picado" },
      { name: "cebolinha", quantity: 3, unit: "colher de sopa", group: "HORTIFRUTI", note: "picada" },
      { name: "sal", quantity: null, unit: "a gosto", group: "TEMPEROS" },
    ],
    steps: [
      {
        text: "Cozinhe o feijão-de-corda em água sem sal, em fogo médio, até ficar macio mas com os grãos inteiros. Escorra e reserve 4 xícaras do caldo do cozimento.",
        timerMinutes: 30,
      },
      {
        text: "Cozinhe a carne seca dessalgada em água fervente por 10 minutos, escorra e desfie grosseiramente.",
        timerMinutes: 10,
      },
      {
        text: "Em uma panela grande, doure o bacon em fogo médio até soltar a gordura. Junte a calabresa e a carne seca e frite até dourarem as bordas. Acrescente a cebola e o alho e refogue até a cebola ficar macia.",
        timerMinutes: 8,
      },
      {
        text: "Adicione o arroz e refogue por 2 minutos. Junte o feijão e o caldo reservado bem quente, prove e acerte o sal com cuidado, pois as carnes são salgadas.",
      },
      {
        text: "Cozinhe com a panela semitampada em fogo baixo até o caldo secar e o arroz ficar macio, cerca de 18 minutos.",
        timerMinutes: 18,
      },
      {
        text: "Desligue o fogo, misture o queijo coalho, a manteiga de garrafa, o coentro e a cebolinha. Tampe e deixe descansar 5 minutos para o queijo amolecer antes de servir.",
        timerMinutes: 5,
      },
    ],
    tips: [
      "O caldo do feijão no lugar da água dá cor e sabor ao arroz; não descarte.",
      "Doure o queijo coalho na frigideira antes de misturar para ganhar uma casquinha extra.",
      "Sirva com farofa, vinagrete e uma pimenta de cheiro.",
    ],
    substitutions: [
      { ingredient: "feijão-de-corda", substitute: "feijão-fradinho" },
      { ingredient: "manteiga de garrafa", substitute: "manteiga comum" },
      { ingredient: "queijo coalho", substitute: "queijo minas meia cura" },
    ],
    nutrition: { protein: 33, carbs: 60, fat: 27, fiber: 7, sodium: 1350 },
  },
  // 17
  {
    slug: "pudim-de-leite-condensado",
    title: "Pudim de Leite Condensado",
    description:
      "Pudim lisinho, sem furinhos, com calda de caramelo dourada escorrendo pelas laterais. A sobremesa de domingo que nunca sai de moda.",
    emoji: "🍮",
    cuisine: "brasileira",
    categories: ["sobremesas-e-doces"],
    prepMinutes: 20,
    cookMinutes: 60,
    servings: 10,
    difficulty: "MEDIUM",
    caloriesPerServing: 255,
    costLevel: "LOW",
    tags: ["sobremesa", "domingo", "festa", "sem glúten"],
    ingredients: [
      { name: "leite condensado", quantity: 1, unit: "lata", group: "MERCEARIA", note: "395 g" },
      { name: "leite", quantity: 395, unit: "ml", group: "LATICINIOS", note: "use a lata do leite condensado como medida" },
      { name: "ovo", quantity: 3, unit: "unidade", group: "LATICINIOS" },
      { name: "açúcar", quantity: 1, unit: "xícara", group: "MERCEARIA", note: "para a calda" },
      { name: "água", quantity: 0.5, unit: "xícara", group: "BEBIDAS", note: "quente, para a calda" },
      { name: "essência de baunilha", quantity: 1, unit: "colher de chá", group: "MERCEARIA", optional: true },
    ],
    steps: [
      {
        text: "Para a calda, derreta o açúcar em uma panela em fogo médio, sem mexer, apenas girando a panela, até virar um caramelo cor de âmbar. Afaste do fogo e junte a água quente com cuidado (vai borbulhar), mexendo até dissolver os torrões.",
        timerMinutes: 8,
      },
      {
        text: "Despeje a calda ainda quente em uma forma de pudim com furo central (cerca de 20 cm), girando para cobrir o fundo e as laterais. Reserve.",
      },
      {
        text: "Preaqueça o forno a 180 °C. No liquidificador, bata o leite condensado, o leite, os ovos e a baunilha em velocidade baixa por apenas 30 segundos, o suficiente para misturar sem incorporar muito ar.",
      },
      {
        text: "Passe a mistura por uma peneira diretamente na forma caramelizada. Cubra com papel-alumínio.",
      },
      {
        text: "Coloque a forma dentro de uma assadeira maior com água quente até a metade da altura e asse em banho-maria até o pudim firmar e balançar levemente no centro, cerca de 1 hora. Reponha água quente se secar.",
        timerMinutes: 60,
      },
      {
        text: "Deixe esfriar em temperatura ambiente e leve à geladeira por pelo menos 6 horas.",
        timerMinutes: 360,
      },
      {
        text: "Para desenformar, passe uma faca nas laterais, aqueça rapidamente o fundo da forma na chama do fogão, cubra com o prato de servir e vire de uma vez.",
      },
    ],
    tips: [
      "Bater pouco e coar a mistura é o segredo do pudim liso, sem furinhos.",
      "A água do banho-maria não deve ferver vigorosamente; se borbulhar, abaixe o forno para 160 °C.",
      "Cobrir com papel-alumínio evita que a superfície resseque e forme casca.",
    ],
    substitutions: [
      { ingredient: "leite", substitute: "leite de coco, para um pudim com toque tropical" },
      { ingredient: "essência de baunilha", substitute: "raspas de limão" },
    ],
    nutrition: { protein: 6.5, carbs: 42, fat: 7, fiber: 0, sodium: 90 },
  },
  // 18
  {
    slug: "salpicao-de-frango",
    title: "Salpicão de Frango",
    description:
      "Salada cremosa de frango desfiado com cenoura, maçã, milho e presunto, finalizada com batata palha crocante. Estrela das festas de fim de ano.",
    emoji: "🥗",
    cuisine: "brasileira",
    categories: ["saladas", "frangos"],
    prepMinutes: 30,
    cookMinutes: 25,
    servings: 6,
    difficulty: "EASY",
    caloriesPerServing: 470,
    costLevel: "MEDIUM",
    tags: ["natal", "festa", "salada", "almoço"],
    ingredients: [
      { name: "peito de frango", quantity: 600, unit: "g", group: "CARNES" },
      { name: "cebola", quantity: 1, unit: "unidade", group: "HORTIFRUTI", note: "em pedaços, para o cozimento" },
      { name: "cenoura", quantity: 2, unit: "unidade", group: "HORTIFRUTI", note: "ralada grossa" },
      { name: "maçã verde", quantity: 1, unit: "unidade", group: "HORTIFRUTI", note: "em cubinhos" },
      { name: "milho verde", quantity: 1, unit: "lata", group: "MERCEARIA", note: "escorrido" },
      { name: "uva-passa", quantity: 50, unit: "g", group: "MERCEARIA", optional: true },
      { name: "presunto", quantity: 150, unit: "g", group: "CARNES", note: "em tirinhas" },
      { name: "maionese", quantity: 200, unit: "g", group: "MERCEARIA" },
      { name: "creme de leite", quantity: 100, unit: "g", group: "LATICINIOS" },
      { name: "limão", quantity: 1, unit: "unidade", group: "HORTIFRUTI", note: "suco" },
      { name: "salsinha", quantity: 3, unit: "colher de sopa", group: "HORTIFRUTI", note: "picada" },
      { name: "batata palha", quantity: 100, unit: "g", group: "MERCEARIA" },
      { name: "sal", quantity: null, unit: "a gosto", group: "TEMPEROS" },
      { name: "pimenta-do-reino", quantity: null, unit: "a gosto", group: "TEMPEROS" },
    ],
    steps: [
      {
        text: "Cozinhe o peito de frango em água com a cebola e uma pitada de sal, em fogo médio e panela tampada, até ficar macio e sem partes rosadas no centro.",
        timerMinutes: 25,
      },
      {
        text: "Deixe o frango amornar no próprio caldo para não ressecar e desfie em tiras finas. Espere esfriar completamente.",
        timerMinutes: 15,
      },
      {
        text: "Regue a maçã picada com metade do suco de limão para não escurecer. Em uma tigela grande, junte o frango, a cenoura, a maçã, o milho, a uva-passa e o presunto.",
      },
      {
        text: "Em outra tigela, misture a maionese, o creme de leite e o restante do suco de limão até formar um molho liso. Tempere com sal e pimenta.",
      },
      {
        text: "Incorpore o molho aos ingredientes com uma espátula, sem amassar, e acrescente a salsinha. Leve à geladeira até a hora de servir.",
        timerMinutes: 30,
      },
      {
        text: "Na hora de servir, cubra com a batata palha para que ela continue crocante.",
      },
    ],
    tips: [
      "Coloque a batata palha só no momento de servir; se ficar em contato com o molho, ela amolece.",
      "Cozinhe o frango com uma folha de louro para um caldo mais aromático, que pode ser reaproveitado em sopas.",
      "Prepare na véspera (sem a batata palha): o salpicão fica mais saboroso no dia seguinte.",
    ],
    substitutions: [
      { ingredient: "maionese", substitute: "iogurte natural integral, para uma versão mais leve" },
      { ingredient: "presunto", substitute: "peito de peru defumado" },
    ],
    nutrition: { protein: 28, carbs: 26, fat: 28, fiber: 3, sodium: 720 },
  },
  // 19
  {
    slug: "suco-verde",
    title: "Suco Verde Detox",
    description:
      "Refrescante e vibrante, com couve, abacaxi, limão, hortelã e um toque picante de gengibre. Ótimo para começar o dia.",
    emoji: "🥤",
    cuisine: "brasileira",
    categories: ["cafes-e-bebidas", "fitness", "vegetarianas-e-veganas"],
    prepMinutes: 10,
    cookMinutes: 0,
    servings: 2,
    difficulty: "EASY",
    caloriesPerServing: 90,
    costLevel: "LOW",
    tags: ["café da manhã", "vegana", "saudável", "sem glúten"],
    ingredients: [
      { name: "couve-manteiga", quantity: 2, unit: "unidade", group: "HORTIFRUTI", note: "folhas grandes, sem o talo" },
      { name: "abacaxi", quantity: 2, unit: "fatia", group: "HORTIFRUTI", note: "grossas, sem casca" },
      { name: "pepino", quantity: 0.5, unit: "unidade", group: "HORTIFRUTI", note: "com casca" },
      { name: "limão", quantity: 1, unit: "unidade", group: "HORTIFRUTI", note: "suco" },
      { name: "gengibre", quantity: 5, unit: "g", group: "HORTIFRUTI", note: "um pedaço de 2 cm, descascado" },
      { name: "hortelã", quantity: 10, unit: "unidade", group: "HORTIFRUTI", note: "folhas" },
      { name: "água", quantity: 400, unit: "ml", group: "BEBIDAS", note: "gelada" },
    ],
    steps: [
      {
        text: "Lave bem as folhas de couve e de hortelã e o pepino. Retire o talo central da couve e rasgue as folhas em pedaços.",
      },
      {
        text: "Coloque no liquidificador a couve, o abacaxi em pedaços, o pepino, o gengibre, a hortelã, o suco de limão e a água gelada.",
      },
      {
        text: "Bata em velocidade alta por cerca de 1 minuto, até a mistura ficar bem lisa e de cor verde intensa.",
      },
      {
        text: "Se preferir uma textura mais leve, passe por uma peneira fina pressionando com uma colher; para aproveitar as fibras, sirva sem coar. Beba logo em seguida, com gelo se desejar.",
      },
    ],
    tips: [
      "Tome logo após o preparo: com o tempo, o suco oxida, perde cor e nutrientes.",
      "O abacaxi já adoça naturalmente; prove antes de pensar em adicionar qualquer adoçante.",
      "Comece com pouco gengibre e aumente aos poucos, pois ele é bem picante.",
    ],
    substitutions: [
      { ingredient: "água", substitute: "água de coco" },
      { ingredient: "abacaxi", substitute: "maçã verde" },
    ],
    nutrition: { protein: 2, carbs: 20, fat: 0.4, fiber: 3.5, sodium: 25 },
  },
  // 20
  {
    slug: "tapioca-recheada",
    title: "Tapioca Recheada com Frango e Queijo Branco",
    description:
      "Tapioca fininha e macia recheada com frango desfiado, queijo minas e tomate. Um café da manhã ou lanche rápido, leve e sem glúten.",
    emoji: "🌮",
    cuisine: "brasileira",
    categories: ["fitness", "cafes-e-bebidas", "economicas"],
    prepMinutes: 10,
    cookMinutes: 10,
    servings: 2,
    difficulty: "EASY",
    caloriesPerServing: 400,
    costLevel: "LOW",
    tags: ["café da manhã", "sem glúten", "rápida", "lanche"],
    ingredients: [
      { name: "goma de tapioca", quantity: 120, unit: "g", group: "MERCEARIA", note: "hidratada, cerca de 8 colheres de sopa" },
      { name: "peito de frango", quantity: 150, unit: "g", group: "CARNES", note: "cozido e desfiado" },
      { name: "queijo minas frescal", quantity: 60, unit: "g", group: "LATICINIOS", note: "em fatias finas ou esfarelado" },
      { name: "tomate", quantity: 1, unit: "unidade", group: "HORTIFRUTI", note: "sem sementes, em cubinhos" },
      { name: "cebolinha", quantity: 1, unit: "colher de sopa", group: "HORTIFRUTI", note: "picada" },
      { name: "orégano", quantity: null, unit: "a gosto", group: "TEMPEROS" },
      { name: "sal", quantity: null, unit: "a gosto", group: "TEMPEROS" },
      { name: "pimenta-do-reino", quantity: null, unit: "a gosto", group: "TEMPEROS" },
    ],
    steps: [
      {
        text: "Tempere o frango desfiado com sal, pimenta, orégano e a cebolinha. Misture o tomate e reserve.",
      },
      {
        text: "Passe a goma de tapioca por uma peneira, esfregando com uma colher para desfazer os grumos; ela deve ficar soltinha como uma farinha úmida. Tempere com uma pitada de sal.",
      },
      {
        text: "Aqueça uma frigideira antiaderente média em fogo médio, sem untar. Espalhe metade da goma pela peneira sobre a frigideira, formando uma camada uniforme, e nivele com as costas da colher.",
      },
      {
        text: "Cozinhe por cerca de 1 a 2 minutos, até a goma se unir em um disco e as bordas começarem a soltar. Vire com uma espátula e deixe mais 30 segundos.",
        timerMinutes: 2,
      },
      {
        text: "Distribua metade do queijo e metade do recheio de frango sobre uma das metades da tapioca, dobre ao meio e deixe mais 1 minuto em fogo baixo para o queijo amolecer. Repita com o restante.",
        timerMinutes: 1,
      },
    ],
    tips: [
      "A frigideira não deve estar quente demais: em fogo alto a tapioca fica dura e quebradiça.",
      "Peneirar a goma é o que garante uma tapioca fina, uniforme e sem buracos.",
      "Aproveite sobras de frango assado ou cozido para deixar o preparo ainda mais rápido.",
    ],
    substitutions: [
      { ingredient: "peito de frango", substitute: "ovo mexido ou atum em lata" },
      { ingredient: "queijo minas frescal", substitute: "queijo cottage ou ricota" },
    ],
    nutrition: { protein: 29, carbs: 53, fat: 8, fiber: 1.5, sodium: 420 },
  },
  // 21
  {
    slug: "limonada-suica",
    title: "Limonada Suíça",
    description:
      "Limonada cremosa e superrefrescante feita com limão inteiro batido rapidamente com gelo. Pronta em 5 minutos para o calor brasileiro.",
    emoji: "🍋",
    cuisine: "brasileira",
    categories: ["cafes-e-bebidas", "economicas", "vegetarianas-e-veganas"],
    prepMinutes: 5,
    cookMinutes: 0,
    servings: 4,
    difficulty: "EASY",
    caloriesPerServing: 85,
    costLevel: "LOW",
    tags: ["bebida", "verão", "vegana", "rápida"],
    ingredients: [
      { name: "limão", quantity: 4, unit: "unidade", group: "HORTIFRUTI", note: "taiti, bem lavados" },
      { name: "água", quantity: 1, unit: "l", group: "BEBIDAS", note: "gelada" },
      { name: "açúcar", quantity: 6, unit: "colher de sopa", group: "MERCEARIA" },
      { name: "gelo", quantity: 2, unit: "xícara", group: "CONGELADOS" },
      { name: "hortelã", quantity: null, unit: "a gosto", group: "HORTIFRUTI", optional: true },
    ],
    steps: [
      {
        text: "Lave bem os limões esfregando a casca com uma escovinha. Corte as pontas e divida cada um em 4 partes, retirando o miolo branco central, que é o que mais amarga.",
      },
      {
        text: "Coloque os limões, a água gelada, o açúcar e o gelo no liquidificador.",
      },
      {
        text: "Bata no modo pulsar, 3 a 4 vezes de 3 segundos cada, apenas o suficiente para extrair o sumo e os óleos da casca. Bater por muito tempo deixa a limonada amarga.",
      },
      {
        text: "Coe imediatamente em uma peneira fina, pressionando o bagaço com uma colher. Prove, ajuste o açúcar e sirva com gelo e folhas de hortelã.",
      },
    ],
    tips: [
      "Sirva na hora: depois de alguns minutos a casca continua liberando amargor.",
      "Limões com casca fina e lisa rendem mais suco e menos amargor.",
      "Gelar os limões antes de bater também ajuda a reduzir o amargor.",
    ],
    substitutions: [
      { ingredient: "açúcar", substitute: "leite condensado, para a versão cremosa tradicional (deixa de ser vegana)" },
      { ingredient: "água", substitute: "água com gás, para uma versão gaseificada (misture depois de coar)" },
    ],
    nutrition: { protein: 0.3, carbs: 21, fat: 0.1, fiber: 0.8, sodium: 5 },
  },
];
