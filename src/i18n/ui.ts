/**
 * El Cerito — bilingual UI strings (Spanish primary, English secondary).
 *
 * Spanish is the default language (the ranch is in Ojo de Agua, México). English
 * is the secondary language served under `/en/`. Every user-facing UI string lives
 * here so the whole interface can be rendered in either language.
 *
 * Usage:
 *   import { useTranslations, getLangFromUrl } from '../i18n/utils';
 *   const lang = getLangFromUrl(Astro.url);
 *   const t = useTranslations(lang);
 *   t('nav.recipes'); // → "Recetas" (es) / "Recipes" (en)
 */

export const languages = {
  es: 'Español',
  en: 'English',
} as const;

export type Lang = keyof typeof languages;

export const defaultLang: Lang = 'es';

/** Native short label for the language switcher. */
export const langLabel: Record<Lang, string> = {
  es: 'ES',
  en: 'EN',
};

/** BCP-47 / Open Graph locale codes. */
export const ogLocale: Record<Lang, string> = {
  es: 'es_MX',
  en: 'en_US',
};

export const ui = {
  es: {
    // Site-level meta
    'site.description':
      'Recetas del rancho familiar El Cerito en Ojo de Agua, México. Cocina casera y alternativas saludables con porciones y macros dinámicos.',
    'site.tagline':
      'Recetas del rancho familiar en Ojo de Agua, México. Cocina casera con cariño y alternativas saludables para toda la familia.',

    // Navigation
    'nav.home': 'Inicio',
    'nav.recipes': 'Recetas',
    'nav.healthy': 'Saludables',
    'nav.ranch': 'El Rancho',
    'nav.brand': 'El Cerito',
    'nav.homeAria': 'El Cerito — inicio',
    'nav.openMenu': 'Abrir menú',
    'nav.switchLang': 'Ver en inglés',

    // Accessibility
    'a11y.skip': 'Saltar al contenido',

    // Home — hero
    'home.badge': 'Rancho familiar · Ojo de Agua, México',
    'home.titleTop': 'Las recetas',
    'home.titleBottom': 'de la familia',
    'home.subtitle':
      'La cocina del rancho El Cerito, guardada receta por receta. Sabor de casa, porciones que se ajustan solas y alternativas saludables para todos los días.',
    'home.ctaRecipes': 'Ver las recetas',
    'home.ctaHealthy': 'Opciones saludables',
    'home.statRecipes': 'recetas',
    'home.statHealthy': 'saludables',
    'home.statLove': 'cariño',

    // Home — featured
    'home.featuredTitle': 'Recetas destacadas',
    'home.featuredSubtitle': 'Lo mejor de la mesa del rancho.',
    'home.seeAll': 'Ver todas',

    // Home — healthy band
    'home.healthyTitle': 'Sabor de casa, versión saludable',
    'home.healthyBody':
      'Cada receta clásica del rancho tiene su alternativa más ligera — menos grasa, menos azúcar, más proteína — sin perder el sabor de siempre. Poco a poco llenamos la cocina de opciones para comer rico y bien.',
    'home.healthyCta': 'Descubre las opciones saludables',

    // Recipes index
    'recipes.title': 'Recetas',
    'recipes.metaDescription':
      'Todas las recetas del rancho El Cerito — cocina casera mexicana y alternativas saludables con porciones y macros dinámicos.',
    'recipes.intro':
      'La cocina del rancho, receta por receta. Usa los filtros para encontrar opciones saludables o por tipo de comida.',
    'recipes.filterType': 'Tipo:',
    'recipes.filterHealthy': 'Saludable:',
    'recipes.filterAll': 'Todas',
    'recipes.empty': 'No hay recetas con esos filtros todavía. ¡Pronto agregaremos más! 🌾',

    // Recipe card
    'card.fromRanch': 'Del rancho',

    // Recipe detail
    'recipe.fromRanch': 'Receta del rancho',
    'recipe.prep': 'Preparación',
    'recipe.cook': 'Cocción',
    'recipe.total': 'Total',
    'recipe.difficulty': 'Dificultad',
    'recipe.healthierTitle': 'Alternativa más saludable',
    'recipe.ingredients': 'Ingredientes',
    'recipe.servMinus': 'Menos porciones',
    'recipe.servPlus': 'Más porciones',
    'recipe.optional': '(opcional)',
    'recipe.toTaste': 'al gusto',
    'recipe.nutrition': 'Información nutricional',
    'recipe.perServing': 'Por porción',
    'recipe.totalCol': 'Total',
    'recipe.macroNote': 'Los valores se recalculan automáticamente al cambiar las porciones.',
    'recipe.mCalories': 'Calorías',
    'recipe.mProtein': 'Proteína',
    'recipe.mCarbs': 'Carbohidratos',
    'recipe.mFat': 'Grasa',
    'recipe.mFiber': 'Fibra',
    'recipe.instructions': 'Preparación',
    'recipe.backToAll': 'Ver todas las recetas',
    // Step-grouped layout
    'recipe.groceryList': 'Lista de compras',
    'recipe.grocerySubtitle': 'Lo que necesitas comprar',
    'recipe.groceryHint': 'Con cantidades para la compra — marca lo que ya tienes en casa.',
    'recipe.stepNeeds': 'Necesitas',
    'recipe.stepsHint': 'Cada paso trae sus ingredientes y medidas — ya no tienes que regresar a buscarlos.',

    // Footer
    'footer.explore': 'Explorar',
    'footer.allRecipes': 'Todas las recetas',
    'footer.healthyOptions': 'Opciones saludables',
    'footer.aboutRanch': 'Sobre el rancho',
    'footer.ranch': 'El Rancho',
    'footer.location': 'Ojo de Agua<br />México<br />',
    'footer.madeBy': 'Hecho con cariño por la familia.',
    'footer.copyright': 'El Cerito. Todas las recetas son de la familia.',
    'footer.fromRanch': 'Hecho con 🤎 desde el rancho.',

    // About / El Rancho
    'about.title': 'El Rancho',
    'about.metaTitle': 'El Rancho',
    'about.metaDescription':
      'La historia del rancho El Cerito en Ojo de Agua, México — cocina familiar de generación en generación.',
    'about.heading': 'El Cerito',
    'about.location': 'Ojo de Agua, México',
    'about.p1intro': 'El Cerito',
    'about.p1':
      ' es el rancho de la familia en Ojo de Agua, México — un lugar de tierra cálida, comida hecha en casa y recetas que pasan de generación en generación.',
    'about.p2':
      'Este sitio nació para guardar esas recetas: las de las reuniones grandes, las de todos los días, y las nuevas versiones más saludables que vamos creando para cuidarnos sin dejar de comer rico.',
    'about.p3a': 'Cada receta trae sus ingredientes, sus tiempos y su información nutricional — y lo mejor, las ',
    'about.p3strong': 'porciones se ajustan solas',
    'about.p3b': ': cambia el número de personas y todo se recalcula al instante.',
    'about.p4': 'Poco a poco vamos llenando la cocina de El Cerito. Bienvenido a la mesa. 🤎',
    'about.cta': 'Ver las recetas',
  },

  en: {
    // Site-level meta
    'site.description':
      'Recipes from the El Cerito family ranch in Ojo de Agua, Mexico. Home cooking and healthier alternatives with dynamic servings and macros.',
    'site.tagline':
      'Recipes from the family ranch in Ojo de Agua, Mexico. Home cooking made with love and healthier options for the whole family.',

    // Navigation
    'nav.home': 'Home',
    'nav.recipes': 'Recipes',
    'nav.healthy': 'Healthy',
    'nav.ranch': 'The Ranch',
    'nav.brand': 'El Cerito',
    'nav.homeAria': 'El Cerito — home',
    'nav.openMenu': 'Open menu',
    'nav.switchLang': 'View in Spanish',

    // Accessibility
    'a11y.skip': 'Skip to content',

    // Home — hero
    'home.badge': 'Family ranch · Ojo de Agua, Mexico',
    'home.titleTop': 'The recipes',
    'home.titleBottom': 'of the family',
    'home.subtitle':
      'The kitchen of the El Cerito ranch, saved recipe by recipe. Home-cooked flavor, servings that adjust themselves, and healthier alternatives for every day.',
    'home.ctaRecipes': 'See the recipes',
    'home.ctaHealthy': 'Healthy options',
    'home.statRecipes': 'recipes',
    'home.statHealthy': 'healthy',
    'home.statLove': 'love',

    // Home — featured
    'home.featuredTitle': 'Featured recipes',
    'home.featuredSubtitle': 'The best of the ranch table.',
    'home.seeAll': 'See all',

    // Home — healthy band
    'home.healthyTitle': 'Home flavor, healthier version',
    'home.healthyBody':
      'Every classic ranch recipe has a lighter alternative — less fat, less sugar, more protein — without losing its familiar flavor. Little by little we fill the kitchen with options to eat well and feel good.',
    'home.healthyCta': 'Discover the healthy options',

    // Recipes index
    'recipes.title': 'Recipes',
    'recipes.metaDescription':
      'All the recipes from the El Cerito ranch — Mexican home cooking and healthier alternatives with dynamic servings and macros.',
    'recipes.intro':
      'The ranch kitchen, recipe by recipe. Use the filters to find healthy options or browse by meal type.',
    'recipes.filterType': 'Type:',
    'recipes.filterHealthy': 'Healthy:',
    'recipes.filterAll': 'All',
    'recipes.empty': 'No recipes match those filters yet. More coming soon! 🌾',

    // Recipe card
    'card.fromRanch': 'From the ranch',

    // Recipe detail
    'recipe.fromRanch': 'Ranch recipe',
    'recipe.prep': 'Prep',
    'recipe.cook': 'Cook',
    'recipe.total': 'Total',
    'recipe.difficulty': 'Difficulty',
    'recipe.healthierTitle': 'Healthier alternative',
    'recipe.ingredients': 'Ingredients',
    'recipe.servMinus': 'Fewer servings',
    'recipe.servPlus': 'More servings',
    'recipe.optional': '(optional)',
    'recipe.toTaste': 'to taste',
    'recipe.nutrition': 'Nutrition facts',
    'recipe.perServing': 'Per serving',
    'recipe.totalCol': 'Total',
    'recipe.macroNote': 'Values are recalculated automatically when you change the servings.',
    'recipe.mCalories': 'Calories',
    'recipe.mProtein': 'Protein',
    'recipe.mCarbs': 'Carbs',
    'recipe.mFat': 'Fat',
    'recipe.mFiber': 'Fiber',
    'recipe.instructions': 'Instructions',
    'recipe.backToAll': 'See all recipes',
    // Step-grouped layout
    'recipe.groceryList': 'Grocery list',
    'recipe.grocerySubtitle': 'What to buy',
    'recipe.groceryHint': 'Shopping quantities included — check off what you already have.',
    'recipe.stepNeeds': "You'll need",
    'recipe.stepsHint': 'Every step carries its own ingredients and measurements — no more scrolling back up.',

    // Footer
    'footer.explore': 'Explore',
    'footer.allRecipes': 'All recipes',
    'footer.healthyOptions': 'Healthy options',
    'footer.aboutRanch': 'About the ranch',
    'footer.ranch': 'The Ranch',
    'footer.location': 'Ojo de Agua<br />Mexico<br />',
    'footer.madeBy': 'Made with love by the family.',
    'footer.copyright': 'El Cerito. All recipes are the family\u2019s.',
    'footer.fromRanch': 'Made with 🤎 from the ranch.',

    // About / The Ranch
    'about.title': 'The Ranch',
    'about.metaTitle': 'The Ranch',
    'about.metaDescription':
      'The story of the El Cerito ranch in Ojo de Agua, Mexico — family cooking passed down through generations.',
    'about.heading': 'El Cerito',
    'about.location': 'Ojo de Agua, Mexico',
    'about.p1intro': 'El Cerito',
    'about.p1':
      ' is the family ranch in Ojo de Agua, Mexico — a place of warm earth, home-cooked food, and recipes passed down from generation to generation.',
    'about.p2':
      'This site was born to keep those recipes: the ones for big gatherings, the everyday ones, and the new, healthier versions we create to take care of ourselves without giving up good food.',
    'about.p3a': 'Every recipe comes with its ingredients, its times, and its nutrition facts — and best of all, the ',
    'about.p3strong': 'servings adjust themselves',
    'about.p3b': ': change the number of people and everything recalculates instantly.',
    'about.p4': 'Little by little we\u2019re filling the El Cerito kitchen. Welcome to the table. 🤎',
    'about.cta': 'See the recipes',
  },
} as const;

export type UIKey = keyof (typeof ui)['es'];
