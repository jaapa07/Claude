import type { Recipe } from './types';

/**
 * Receitas de exemplo para o app não abrir vazio. Elas não têm vídeo:
 * os vídeos entram quando o usuário cola um link do TikTok ou do Instagram.
 */
const base = Date.UTC(2026, 0, 1);

export const SAMPLE_RECIPES: Recipe[] = [
  {
    id: 'sample-pao-de-queijo-frigideira',
    title: 'Pão de queijo de frigideira',
    category: 'Salgados',
    minutes: 10,
    ingredients: [
      '1 ovo',
      '2 colheres (sopa) de tapioca (goma hidratada)',
      '2 colheres (sopa) de queijo parmesão ralado',
      '1 colher (sopa) de requeijão',
      'Sal a gosto',
    ],
    steps: [
      'Misture todos os ingredientes em uma tigela até formar uma massa lisa.',
      'Aqueça uma frigideira antiaderente untada em fogo baixo.',
      'Despeje a massa, tampe e deixe dourar por cerca de 3 minutos.',
      'Vire e doure o outro lado. Sirva quente.',
    ],
    isSample: true,
    createdAt: base + 6,
  },
  {
    id: 'sample-macarrao-feta-forno',
    title: 'Macarrão com queijo feta assado',
    category: 'Massas',
    minutes: 40,
    ingredients: [
      '250 g de macarrão curto',
      '400 g de tomate-cereja',
      '200 g de queijo feta em bloco',
      '1/3 xícara de azeite',
      '3 dentes de alho',
      'Manjericão fresco, sal e pimenta a gosto',
    ],
    steps: [
      'Coloque os tomates em um refratário, regue com azeite e tempere com sal e pimenta.',
      'Ponha o bloco de feta no centro e leve ao forno a 200 °C por 30 minutos.',
      'Enquanto isso, cozinhe o macarrão al dente.',
      'Tire do forno, amasse o feta e os tomates com o alho e misture o macarrão.',
      'Finalize com manjericão.',
    ],
    isSample: true,
    createdAt: base + 5,
  },
  {
    id: 'sample-brigadeiro-de-colher',
    title: 'Brigadeiro de colher cremoso',
    category: 'Doces',
    minutes: 15,
    ingredients: [
      '1 lata de leite condensado',
      '1 caixinha de creme de leite',
      '2 colheres (sopa) de cacau em pó',
      '1 colher (sopa) de manteiga',
    ],
    steps: [
      'Leve o leite condensado, o cacau e a manteiga ao fogo baixo, mexendo sempre.',
      'Quando começar a desgrudar do fundo, desligue o fogo.',
      'Misture o creme de leite e sirva em potinhos.',
    ],
    isSample: true,
    createdAt: base + 4,
  },
  {
    id: 'sample-frango-airfryer',
    title: 'Frango crocante na airfryer',
    category: 'Airfryer',
    minutes: 25,
    ingredients: [
      '500 g de filé de frango em tiras',
      '1 ovo batido',
      '1 xícara de farinha panko',
      '1 colher (chá) de páprica defumada',
      'Sal, alho em pó e pimenta a gosto',
    ],
    steps: [
      'Tempere o frango com sal, alho em pó, páprica e pimenta.',
      'Passe cada tira no ovo e depois na farinha panko.',
      'Asse na airfryer a 200 °C por 15 a 18 minutos, virando na metade.',
    ],
    isSample: true,
    createdAt: base + 3,
  },
  {
    id: 'sample-cafe-gelado-cremoso',
    title: 'Café gelado cremoso',
    category: 'Bebidas',
    minutes: 5,
    ingredients: [
      '2 colheres (sopa) de café solúvel',
      '2 colheres (sopa) de açúcar',
      '2 colheres (sopa) de água quente',
      '1 copo de leite gelado',
      'Gelo a gosto',
    ],
    steps: [
      'Bata o café, o açúcar e a água quente até virar um creme claro e firme.',
      'Encha um copo com gelo e leite.',
      'Coloque o creme de café por cima e misture na hora de beber.',
    ],
    isSample: true,
    createdAt: base + 2,
  },
  {
    id: 'sample-wrap-de-ovo',
    title: 'Wrap de ovo low carb',
    category: 'Saudável',
    minutes: 10,
    ingredients: [
      '2 ovos',
      '1 fatia de queijo',
      'Folhas de alface',
      '2 fatias de peito de peru',
      'Sal e orégano a gosto',
    ],
    steps: [
      'Bata os ovos com sal e despeje em uma frigideira grande, formando um disco fino.',
      'Quando firmar, vire e coloque o queijo para derreter.',
      'Recheie com alface e peito de peru, enrole e corte ao meio.',
    ],
    isSample: true,
    createdAt: base + 1,
  },
];
