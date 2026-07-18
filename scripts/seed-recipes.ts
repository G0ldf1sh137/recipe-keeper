// Disposable local dev seeding script — not part of the app. Run with:
//   npx tsx scripts/seed-recipes.ts
// Populates 1000 varied recipes (50 dish names x 20 modifiers) owned by the
// persistent test-admin/test-sub/test-free fixtures (never real users), each
// tagged "seed-data" for easy identification/cleanup:
//   DELETE FROM recipes WHERE tags @> '{"seed-data"}';
// Photo/step-photo URLs are drawn from a small pool of images already sitting
// in the app's S3 bucket (reused verbatim across many rows, exactly how
// forking already shares one S3 object across multiple recipes — see
// findAllReferencedImageUrls in recipes.server.ts) rather than uploading or
// referencing 1000+ new external images.
import { insertRecipe } from "#/recipes/recipes.server";
import { findUserByUsername } from "#/auth/users.server";
import type { createRecipeSchema } from "#/recipes/schemas";
import type { z } from "zod";

const DISH_NAMES = [
  "Spaghetti Carbonara", "Chicken Tikka Masala", "Beef Tacos", "Miso Ramen", "Margherita Pizza",
  "Pad Thai", "Greek Salad", "Butter Chicken", "Falafel Wrap", "Shakshuka",
  "Pho Bo", "Korean Bibimbap", "Fish and Chips", "Chili Con Carne", "Vegetable Stir Fry",
  "Lentil Soup", "BBQ Pulled Pork", "Caprese Salad", "Mushroom Risotto", "Chicken Parmesan",
  "Beef Bourguignon", "Tom Yum Soup", "Sushi Rolls", "Fluffy Waffles", "Buttermilk Pancakes",
  "French Toast", "Quiche Lorraine", "Ratatouille", "Seafood Paella", "Moussaka",
  "Pork Dumplings", "Banh Mi Sandwich", "Ahi Poke Bowl", "Curry Laksa", "Beef Enchiladas",
  "Chicken Gumbo", "Shrimp Jambalaya", "New England Clam Chowder", "Minestrone Soup", "Baked Ziti",
  "Shepherd's Pie", "Egg Fried Rice", "Kung Pao Chicken", "Beef Stroganoff", "Chana Masala",
  "Baba Ganoush", "Tabbouleh Salad", "Osso Buco", "Coq au Vin", "Seafood Cioppino",
];

const INGREDIENT_POOL: { name: string; units: string[] }[] = [
  { name: "onion", units: ["whole", "cup"] },
  { name: "garlic", units: ["clove", "tsp"] },
  { name: "olive oil", units: ["tbsp", "cup"] },
  { name: "salt", units: ["tsp", "pinch"] },
  { name: "black pepper", units: ["tsp", "pinch"] },
  { name: "tomato", units: ["whole", "cup"] },
  { name: "chicken breast", units: ["lb", "oz"] },
  { name: "ground beef", units: ["lb", "oz"] },
  { name: "pasta", units: ["oz", "lb"] },
  { name: "rice", units: ["cup"] },
  { name: "butter", units: ["tbsp", "cup"] },
  { name: "flour", units: ["cup", "g"] },
  { name: "sugar", units: ["cup", "tbsp"] },
  { name: "egg", units: ["whole"] },
  { name: "milk", units: ["cup", "ml"] },
  { name: "parmesan", units: ["cup", "oz"] },
  { name: "basil", units: ["tbsp", "whole"] },
  { name: "parsley", units: ["tbsp", "whole"] },
  { name: "cilantro", units: ["tbsp", "whole"] },
  { name: "cumin", units: ["tsp"] },
  { name: "paprika", units: ["tsp"] },
  { name: "chili powder", units: ["tsp", "tbsp"] },
  { name: "soy sauce", units: ["tbsp", "cup"] },
  { name: "ginger", units: ["tsp", "tbsp"] },
  { name: "lime", units: ["whole"] },
  { name: "lemon", units: ["whole"] },
  { name: "carrot", units: ["whole", "cup"] },
  { name: "celery", units: ["stalk", "cup"] },
  { name: "potato", units: ["whole", "lb"] },
  { name: "bell pepper", units: ["whole", "cup"] },
  { name: "mushroom", units: ["cup", "oz"] },
  { name: "spinach", units: ["cup", "oz"] },
  { name: "coconut milk", units: ["cup", "can"] },
  { name: "curry powder", units: ["tsp", "tbsp"] },
  { name: "yogurt", units: ["cup"] },
  { name: "bread crumbs", units: ["cup"] },
  { name: "mozzarella", units: ["cup", "oz"] },
  { name: "bacon", units: ["slice", "oz"] },
  { name: "shallot", units: ["whole"] },
  { name: "white wine", units: ["cup", "ml"] },
  { name: "beef broth", units: ["cup", "l"] },
  { name: "chicken broth", units: ["cup", "l"] },
  { name: "bay leaf", units: ["whole"] },
  { name: "thyme", units: ["tsp", "sprig"] },
  { name: "cinnamon", units: ["tsp"] },
  { name: "vanilla extract", units: ["tsp"] },
  { name: "baking powder", units: ["tsp"] },
];

const STEP_TEMPLATES = [
  "Heat the {ingredient} in a large pan over medium heat.",
  "Add the {ingredient} and cook until softened, about 5 minutes.",
  "Season generously with salt and pepper to taste.",
  "Stir in the {ingredient} and simmer for 10-15 minutes, stirring occasionally.",
  "Preheat the oven to 375°F (190°C).",
  "Whisk together the dry ingredients in a large bowl.",
  "Bring a large pot of salted water to a boil.",
  "Sear the {ingredient} on both sides until golden brown.",
  "Fold in the {ingredient} gently, being careful not to overmix.",
  "Let the dish rest for 5 minutes before serving.",
  "Garnish with fresh herbs and serve immediately.",
  "Cover and let simmer on low heat for 20 minutes.",
  "Deglaze the pan with {ingredient}, scraping up any browned bits.",
  "Transfer to a baking dish and bake for 25-30 minutes.",
  "Taste and adjust seasoning as needed before plating.",
];

const TAG_POOL = [
  "quick", "easy", "vegetarian", "dinner", "breakfast", "lunch", "dessert", "spicy",
  "comfort food", "healthy", "one-pot", "kid-friendly", "meal-prep", "italian", "mexican",
  "indian", "thai", "french", "asian", "mediterranean", "american", "budget-friendly",
  "high-protein", "slow-cooker",
];

const IMAGE_KEYWORDS = ["food", "cooking", "kitchen", "dinner", "meal", "plate", "recipe", "restaurant"];

// Combined with DISH_NAMES (50 x 20 = 1000) to get enough unique-ish titles
// without repeating the exact same dish name a thousand times.
const MODIFIERS = [
  "Classic", "Spicy", "Quick", "Grandma's", "Weeknight", "Restaurant-Style", "Healthy", "Loaded",
  "Smoky", "Zesty", "Homestyle", "Rustic", "Simple", "Ultimate", "Creamy", "Crispy",
  "Slow-Cooked", "One-Pot", "5-Ingredient", "Copycat",
];

// Real objects already sitting in the app's S3 bucket (uploaded during earlier
// manual testing) — reused across every seeded recipe's photos/step photos
// instead of creating new S3 objects for 1000+ rows.
const S3_PHOTO_POOL = [
  "https://recipe-keeper-103930329104-us-east-2-an.s3.us-east-2.amazonaws.com/1755e46202c8b43307ba1fed3e76b59c.jpg",
  "https://recipe-keeper-103930329104-us-east-2-an.s3.us-east-2.amazonaws.com/ef8f5731011bab08db1130b7b63a8244.jpg",
  "https://recipe-keeper-103930329104-us-east-2-an.s3.us-east-2.amazonaws.com/3361e8251abd2716037d247b581fd93f.jpg",
  "https://recipe-keeper-103930329104-us-east-2-an.s3.us-east-2.amazonaws.com/edc5738797c181cb602373b71f851fa9.jpg",
  "https://recipe-keeper-103930329104-us-east-2-an.s3.us-east-2.amazonaws.com/70c8247e11fc10b9b3b13c9457b3024e.jpg",
  "https://recipe-keeper-103930329104-us-east-2-an.s3.us-east-2.amazonaws.com/5da835c09145abcbd35e0068b3f91bde.jpg",
  "https://recipe-keeper-103930329104-us-east-2-an.s3.us-east-2.amazonaws.com/f583ca7251b2e2aefd997a120a5789b2.jpg",
  "https://recipe-keeper-103930329104-us-east-2-an.s3.us-east-2.amazonaws.com/1f4bc76c3d20519450b1e416b2ccdfb9.jpg",
  "https://recipe-keeper-103930329104-us-east-2-an.s3.us-east-2.amazonaws.com/9768d7ddd5d6dcf9a77461742eab2cbd.jpg",
  "https://recipe-keeper-103930329104-us-east-2-an.s3.us-east-2.amazonaws.com/b22a0a8ccd5f6193d6b610961df145fb.jpg",
  "https://recipe-keeper-103930329104-us-east-2-an.s3.us-east-2.amazonaws.com/8506941727f612da49558deb46c424bc.jpg",
  "https://recipe-keeper-103930329104-us-east-2-an.s3.us-east-2.amazonaws.com/de276f66cf9219fabcd499845689f0de.jpg",
  "https://recipe-keeper-103930329104-us-east-2-an.s3.us-east-2.amazonaws.com/b0cb69af96e0486627398cba9d78ab17.jpg",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickMany<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomImageUrl(): string {
  return pick(S3_PHOTO_POOL);
}

function buildRecipe(dishName: string, index: number): z.infer<typeof createRecipeSchema> {
  const ingredientCount = randomInt(4, 10);
  const chosenIngredients = pickMany(INGREDIENT_POOL, ingredientCount);
  const ingredients = chosenIngredients.map((ing) => ({
    qty: String(randomInt(1, 4)),
    unit: pick(ing.units),
    name: ing.name,
  }));

  const stepCount = randomInt(3, 7);
  const steps = Array.from({ length: stepCount }, () => {
    const template = pick(STEP_TEMPLATES);
    const text = template.replace("{ingredient}", pick(chosenIngredients).name);
    // Only some steps get photos, matching how real recipes are authored.
    const hasImages = Math.random() < 0.35;
    const imageUrls = hasImages ? Array.from({ length: randomInt(1, 2) }, randomImageUrl) : [];
    return { text, imageUrls };
  });

  const photoCount = randomInt(1, 4);
  const photoUrls = Array.from({ length: photoCount }, randomImageUrl);

  const tags = [...pickMany(TAG_POOL, randomInt(2, 4)), "seed-data"];

  return {
    title: dishName,
    description: `A seeded test recipe for ${dishName.toLowerCase()}, generated for local testing (image keyword: ${pick(IMAGE_KEYWORDS)}).`,
    ingredients,
    steps,
    photoUrls,
    coverPhotoUrl: photoUrls[0],
    sourceUrl: null,
    sourcePdfUrl: null,
    tags,
    yield: `${randomInt(2, 8)} servings`,
    calories: randomInt(150, 900),
    protein: randomInt(5, 60),
    carbs: randomInt(10, 100),
    fat: randomInt(2, 40),
    // A handful of private recipes exercises visibility filtering too.
    visibility: index % 10 === 0 ? "private" : "public",
  };
}

// 50 dish names x 20 modifiers = 1000 unique titles, shuffled so runs aren't
// alphabetically/dish-grouped in the DB.
const TITLES = MODIFIERS.flatMap((modifier) => DISH_NAMES.map((dish) => `${modifier} ${dish}`)).sort(
  () => Math.random() - 0.5,
);

async function main() {
  const owners = await Promise.all(
    ["test-admin", "test-sub", "test-free"].map((username) => findUserByUsername(username)),
  );
  const missing = owners
    .map((u, i) => (u ? null : ["test-admin", "test-sub", "test-free"][i]))
    .filter((u): u is string => u !== null);
  if (missing.length > 0) {
    throw new Error(`Missing persistent test user(s): ${missing.join(", ")}. Create them first.`);
  }
  const ownerIds = owners.map((u) => u!.id);

  console.log(`Seeding ${TITLES.length} recipes across ${ownerIds.length} owners...`);
  for (let i = 0; i < TITLES.length; i++) {
    const recipe = buildRecipe(TITLES[i], i);
    const ownerId = ownerIds[i % ownerIds.length];
    await insertRecipe(recipe, ownerId);
    if ((i + 1) % 50 === 0 || i === TITLES.length - 1) {
      console.log(`  [${i + 1}/${TITLES.length}] ${recipe.title} (owner ${i % ownerIds.length})`);
    }
  }
  console.log("Done.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
