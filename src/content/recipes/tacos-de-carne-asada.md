---
title: "Tacos de Carne Asada"
titleEn: "Grilled Steak Tacos"
description: "Los tacos de siempre en el rancho — arrachera marinada al carbón, cebolla, cilantro y un buen chorro de limón. Sencillos y con todo el sabor de casa."
descriptionEn: "The classic ranch tacos — charcoal-grilled marinated flank steak, onion, cilantro, and a good squeeze of lime. Simple, with all the flavor of home."
coverImage: "/images/recipes/tacos-carne-asada.jpg"
coverImageAlt: "Tacos de carne asada con cilantro, cebolla y limón sobre un plato de barro"
servings: 4
servingLabel: "porciones"
servingLabelEn: "servings"
prepTime: 25
cookTime: 12
difficulty: media
ranchOriginal: true
featured: true
categories: ["comida", "cena"]
tags: ["tacos", "res", "parrilla", "mexicano"]
healthLabels: ["high-protein"]
macros:
  calories: 543
  protein: 40
  carbs: 46
  fat: 22
  fiber: 5
ingredients:
  - name: "arrachera (flank steak)"
    nameEn: "flank steak"
    amount: 600
    unit: g
    calories: 1188
    protein: 138
    carbs: 0
    fat: 66
    note: "cortada delgada"
    noteEn: "thinly sliced"
  - name: "tortillas de maíz"
    nameEn: "corn tortillas"
    amount: 12
    unit: pieces
    calories: 780
    protein: 18
    carbs: 162
    fat: 9
    fiber: 18
  - name: "cebolla blanca"
    nameEn: "white onion"
    amount: 1
    unit: piece
    calories: 44
    protein: 1
    carbs: 10
    fat: 0
    fiber: 2
    note: "picada finamente"
    noteEn: "finely chopped"
  - name: "cilantro fresco"
    nameEn: "fresh cilantro"
    amount: 30
    unit: g
    calories: 7
    protein: 1
    carbs: 1
    fat: 0
    note: "picado"
    noteEn: "chopped"
  - name: "limones"
    nameEn: "limes"
    amount: 2
    unit: pieces
    calories: 20
    protein: 0
    carbs: 7
    fat: 0
  - name: "aceite"
    nameEn: "oil"
    amount: 15
    unit: ml
    calories: 124
    protein: 0
    carbs: 0
    fat: 14
  - name: "ajo"
    nameEn: "garlic"
    amount: 2
    unit: cloves
    calories: 9
    protein: 0
    carbs: 2
    fat: 0
  - name: "sal y pimienta"
    nameEn: "salt and pepper"
    amount: 1
    unit: "to taste"
    optional: true
healthierAlternatives:
  - recipe: tacos-de-pollo-a-la-plancha
    label: "Versión más ligera: pollo a la plancha en vez de res (menos grasa, más proteína)"
    labelEn: "Lighter version: grilled chicken instead of beef (less fat, more protein)"
instructions:
  - "Marina la arrachera con el ajo machacado, el jugo de un limón, sal, pimienta y la mitad del aceite. Deja reposar 20 minutos."
  - "Calienta la parrilla o el comal a fuego alto con el resto del aceite."
  - "Asa la carne 3–4 minutos por lado hasta el término deseado. Deja reposar 5 minutos y pica en tiras."
  - "Calienta las tortillas en el comal hasta que estén suaves y ligeramente doradas."
  - "Pica finamente la cebolla y el cilantro. Arma los tacos con la carne, la cebolla y el cilantro."
  - "Sirve con los limones partidos y tu salsa favorita."
instructionsEn:
  - "Marinate the flank steak with the crushed garlic, the juice of one lime, salt, pepper, and half the oil. Let it rest for 20 minutes."
  - "Heat the grill or comal over high heat with the rest of the oil."
  - "Grill the meat 3–4 minutes per side to your desired doneness. Let it rest 5 minutes, then slice into strips."
  - "Warm the tortillas on the comal until soft and lightly toasted."
  - "Finely chop the onion and cilantro. Build the tacos with the meat, onion, and cilantro."
  - "Serve with lime wedges and your favorite salsa."
# Rich step-grouped instructions — each step carries its own ingredients + measurements.
# Ingredient chips reference the `ingredients[]` array by 0-based index (they scale live
# with the serving stepper). Use `label` for intermediate products (e.g. the marinated meat).
steps:
  - title: "Marinar la carne"
    titleEn: "Marinate the steak"
    text: "Marina la arrachera con el ajo machacado, el jugo de un limón, sal, pimienta y la mitad del aceite. Deja reposar 20 minutos."
    textEn: "Marinate the flank steak with the crushed garlic, the juice of one lime, salt, pepper, and half the oil. Let it rest for 20 minutes."
    ingredients:
      - 0
      - 6
      - ref: 4
        amountLabel: "el jugo de 1"
        amountLabelEn: "juice of 1"
      - 7
      - ref: 5
        amountLabel: "la mitad"
        amountLabelEn: "half"
  - title: "Calentar la parrilla"
    titleEn: "Heat the grill"
    text: "Calienta la parrilla o el comal a fuego alto con el resto del aceite."
    textEn: "Heat the grill or comal over high heat with the rest of the oil."
    ingredients:
      - ref: 5
        amountLabel: "el resto"
        amountLabelEn: "the rest"
  - title: "Asar la carne"
    titleEn: "Grill the steak"
    text: "Asa la carne 3–4 minutos por lado hasta el término deseado. Deja reposar 5 minutos y pica en tiras."
    textEn: "Grill the meat 3–4 minutes per side to your desired doneness. Let it rest 5 minutes, then slice into strips."
    ingredients:
      - label: "la arrachera marinada"
        labelEn: "the marinated steak"
  - title: "Calentar las tortillas"
    titleEn: "Warm the tortillas"
    text: "Calienta las tortillas en el comal hasta que estén suaves y ligeramente doradas."
    textEn: "Warm the tortillas on the comal until soft and lightly toasted."
    ingredients:
      - 1
  - title: "Armar los tacos"
    titleEn: "Build the tacos"
    text: "Pica finamente la cebolla y el cilantro. Arma los tacos con la carne asada, la cebolla y el cilantro."
    textEn: "Finely chop the onion and cilantro. Build the tacos with the grilled meat, onion, and cilantro."
    ingredients:
      - label: "la carne asada"
        labelEn: "the grilled steak"
      - 2
      - 3
  - title: "Servir"
    titleEn: "Serve"
    text: "Sirve con los limones partidos y tu salsa favorita."
    textEn: "Serve with lime wedges and your favorite salsa."
    ingredients:
      - ref: 4
        amountLabel: "el resto"
        amountLabelEn: "the rest"
storyEn: |
  This is the recipe that never fails at ranch gatherings. The key is not to
  overcook the flank steak and to warm the tortillas well on the comal. Adjust the
  servings to however many show up to eat — the numbers above recalculate on their own.
pubDate: 2026-07-28
author: "Familia El Cerito"
---

Esta es la receta que no falla en las reuniones del rancho. La clave está en no
sobre-cocinar la arrachera y en calentar bien las tortillas en el comal. Ajusta
las porciones según cuántos lleguen a comer — los números de arriba se recalculan
solos.
