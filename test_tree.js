
const itemMap = new Map([
  ['Banquet', { id: 'Banquet', name: 'Banquet', buyPrice: 0 }],
  ['Coffee', { id: 'Coffee', name: 'Coffee', buyPrice: 10 }],
  ['Latte', { id: 'Latte', name: 'Latte', buyPrice: 15 }],
  ['Milk', { id: 'Milk', name: 'Milk', buyPrice: 2 }],
  ['Sugar', { id: 'Sugar', name: 'Sugar', buyPrice: 1 }],
  ['CoffeeBeans', { id: 'CoffeeBeans', name: 'CoffeeBeans', buyPrice: 5 }]
]);

const recipeMapByProduct = new Map();
const allRecipesByProduct = new Map();

const recipes = [
  { 
    id: 'R_Banquet', 
    itemId: 'Banquet', 
    amount: 1, 
    ingredients: [{ id: 'category:Drink', amount: 1, type: 'category' }],
    stations: ['Oven']
  },
  {
    id: 'R_Coffee',
    itemId: 'Coffee',
    amount: 1,
    ingredients: [
      { id: 'CoffeeBeans', amount: 3, type: 'item' },
      { id: 'Sugar', amount: 1, type: 'item' }
    ],
    stations: ['Stove']
  },
  {
    id: 'R_Latte',
    itemId: 'Latte',
    amount: 1,
    ingredients: [
      { id: 'Coffee', amount: 1, type: 'item' },
      { id: 'Milk', amount: 2, type: 'item' },
      { id: 'Sugar', amount: 1, type: 'item' }
    ],
    stations: ['Stove']
  }
];

recipes.forEach(r => {
  recipeMapByProduct.set(r.itemId, r);
  allRecipesByProduct.set(r.itemId, [r]);
});

const shopMap = new Map([
  ['Milk', 'ShopA'],
  ['Sugar', 'ShopA'],
  ['CoffeeBeans', 'ShopA']
]);

const shopNames = new Map([['ShopA', 'General Store']]);

function getCraftingTree(id, amount, type, options, visited = new Set()) {
  const { itemMap, entityMap, categoryChoices } = options;
  let actualId = id;
  let actualType = type;
  if (type === "category" && categoryChoices?.[id]) {
    actualId = categoryChoices[id];
    actualType = "item";
  }
  
  let recipe = options.recipeMapByProduct.get(actualId);
  const item = itemMap.get(actualId);
  
  const node = {
    id: actualId,
    name: item?.name || actualId,
    amount,
    type: actualType,
    ingredients: [],
    recipe,
    shopName: options.shopMap.get(actualId) ? options.shopNames.get(options.shopMap.get(actualId)) : undefined
  };

  if (!recipe || visited.has(actualId)) return node;

  const newVisited = new Set(visited);
  newVisited.add(actualId);

  recipe.ingredients.forEach(ing => {
    node.ingredients.push(getCraftingTree(ing.id, ing.amount * amount, ing.type || "item", options, newVisited));
  });

  return node;
}

const options = {
  itemMap,
  entityMap: new Map(),
  recipeMapByProduct,
  allRecipesByProduct,
  shopMap,
  shopNames,
  categoryChoices: { 'category:Drink': 'Latte' },
  recipeChoices: {}
};

const tree = getCraftingTree('Banquet', 1, 'item', options);
console.log(JSON.stringify(tree, null, 2));
