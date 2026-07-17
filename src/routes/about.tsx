import { createFileRoute } from "@tanstack/react-router";

// Keep this list in sync with design-plan.md — add an entry here for
// any new *user-facing* feature milestone.
const featureGroups = [
  {
    title: "Recipe basics",
    description:
      "Write up a recipe with ingredients, step-by-step instructions, photos, tags, and optional nutrition info (yield, calories, protein, carbs, fat).",
  },
  {
    title: "AI-powered import",
    description:
      "Import a recipe by uploading a photo of a handwritten card, a PDF, pasting text from anywhere, or a source URL — Claude reads it and fills in the form for you.",
  },
  {
    title: "Recipe forking",
    description:
      "Copy an existing recipe to make it your own, with a link back to the original recipe so you can see how it differs.",
  },
  {
    title: "Cook mode",
    description:
      "A distraction-free, one-step-at-a-time view with ingredient scaling, built-in timers for steps with a cook time, and a screen wake lock so your display doesn't sleep mid-recipe.",
  },
  {
    title: "Scaling",
    description:
      "Instantly scale a recipe's ingredient quantities up or down — 0.5x, 2x, or a custom multiplier — without editing the recipe itself.",
  },
  {
    title: "Cookbooks & meal planning",
    description:
      "Organize recipes into cookbooks, schedule them across a weekly calendar, and bulk-add a calendar's recipes to a grocery list in one click.",
  },
  {
    title: "Grocery lists",
    description:
      "Build a shopping list from one or more recipes, with duplicate ingredients automatically combined, plus manually-added items. Anything you've already got in your pantry is called out separately, so you're not shopping for things you already have.",
  },
  {
    title: "Pantry mode",
    description:
      "List the ingredients you have on hand and see which recipes you can make right now, plus close matches showing exactly what you're missing.",
  },
  {
    title: "Search & discovery",
    description:
      "Search recipes by title, tag, or ingredient in one box, browse every tag in use, browse public cookbooks from other users, and see recipes similar to the one you're viewing.",
  },
  {
    title: "Sharing & visibility",
    description:
      "Recipes, cookbooks, and calendars can be public or private, with shareable links; public profile pages show a user's public recipes and cookbooks.",
  },
  {
    title: "Community",
    description:
      "Rate and comment on recipes, fork someone else's recipe to make your own version, and get notified when someone comments on, rates, or forks your recipe — with per-event controls in Settings if you'd rather not hear about all three.",
  },
  {
    title: "Personal notes",
    description: "Keep a private note on any recipe — only you can see it, not even the recipe's owner.",
  },
  {
    title: "Export",
    description: "Download any recipe, or an entire cookbook, as a PDF.",
  },
  {
    title: "Dark mode",
    description: "Switch between light, dark, or auto themes to match your system.",
  },
];

export const Route = createFileRoute("/about")({
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-8">
      <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">About LemmeCook</h1>
      <p className="mt-3 text-ink/70">
        LemmeCook is a place to write up, organize, and share your recipes — with a few tools to make
        cooking and meal planning easier along the way.
      </p>

      <div className="mt-8 flex flex-col gap-6">
        {featureGroups.map((group) => (
          <section key={group.title}>
            <h2 className="font-serif text-lg font-semibold text-ink">{group.title}</h2>
            <p className="mt-1 text-ink/70">{group.description}</p>
          </section>
        ))}
      </div>

      <p className="mt-8 text-ink/70">
        <a
          href="https://github.com/G0ldf1sh137/recipe-keeper"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
        >
          View source on GitHub
        </a>
      </p>
    </div>
  );
}
