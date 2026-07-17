import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import type { Ingredient, Step } from "#/db/schema";

export type RecipePdfData = {
  title: string;
  description: string | null;
  ownerName: string;
  photoUrls: string[];
  ingredients: Ingredient[];
  steps: Step[];
  tags: string[];
  yield: string | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  sourceUrl: string | null;
};

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 11, fontFamily: "Helvetica" },
  title: { fontSize: 22, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  byline: { fontSize: 10, color: "#666666", marginBottom: 8 },
  description: { marginBottom: 8, lineHeight: 1.4 },
  metaLine: { fontSize: 10, color: "#444444", marginBottom: 8 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  tag: {
    fontSize: 9,
    color: "#444444",
    backgroundColor: "#f0ece4",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  coverImage: { width: "100%", height: 220, objectFit: "cover", marginBottom: 12, borderRadius: 4 },
  sectionHeading: { fontSize: 14, fontFamily: "Helvetica-Bold", marginBottom: 6, marginTop: 12 },
  ingredientRow: { flexDirection: "row", marginBottom: 3 },
  bullet: { width: 10 },
  ingredientText: { flex: 1 },
  stepRow: { marginBottom: 8 },
  stepText: { lineHeight: 1.4 },
  stepImages: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  stepImage: { width: 100, height: 100, objectFit: "cover", borderRadius: 4 },
  footer: { marginTop: 16, fontSize: 9, color: "#888888" },
});

function sourceUrlHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function RecipePdfPage({ recipe }: { recipe: RecipePdfData }) {
  const metaParts = [
    recipe.yield ?? undefined,
    recipe.calories !== null ? `${recipe.calories} cal/serving` : undefined,
  ].filter(Boolean);
  const macroParts = [
    recipe.protein !== null ? `${recipe.protein}g protein` : undefined,
    recipe.carbs !== null ? `${recipe.carbs}g carbs` : undefined,
    recipe.fat !== null ? `${recipe.fat}g fat` : undefined,
  ].filter(Boolean);

  return (
    <Page size="LETTER" style={styles.page}>
      <Text style={styles.title}>{recipe.title}</Text>
      <Text style={styles.byline}>by {recipe.ownerName}</Text>

      {recipe.description && <Text style={styles.description}>{recipe.description}</Text>}
      {metaParts.length > 0 && <Text style={styles.metaLine}>{metaParts.join(" · ")}</Text>}
      {macroParts.length > 0 && <Text style={styles.metaLine}>{macroParts.join(" · ")}</Text>}

      {recipe.tags.length > 0 && (
        <View style={styles.tags}>
          {recipe.tags.map((tag) => (
            <Text key={tag} style={styles.tag}>
              {tag}
            </Text>
          ))}
        </View>
      )}

      {recipe.photoUrls.length > 0 && <Image src={recipe.photoUrls[0]} style={styles.coverImage} />}

      <Text style={styles.sectionHeading}>Ingredients</Text>
      {recipe.ingredients.map((ing, i) => (
        <View key={i} style={styles.ingredientRow}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.ingredientText}>{[ing.qty, ing.unit, ing.name].filter(Boolean).join(" ")}</Text>
        </View>
      ))}

      <Text style={styles.sectionHeading}>Steps</Text>
      {recipe.steps.map((step, i) => (
        <View key={i} style={styles.stepRow} wrap={false}>
          <Text style={styles.stepText}>
            {i + 1}. {step.text}
          </Text>
          {step.imageUrls.length > 0 && (
            <View style={styles.stepImages}>
              {step.imageUrls.map((url) => (
                <Image key={url} src={url} style={styles.stepImage} />
              ))}
            </View>
          )}
        </View>
      ))}

      {recipe.sourceUrl && (
        <Text style={styles.footer}>Originally from {sourceUrlHostname(recipe.sourceUrl)}</Text>
      )}
    </Page>
  );
}

export function RecipePdfDocument({ recipe }: { recipe: RecipePdfData }) {
  return (
    <Document title={recipe.title}>
      <RecipePdfPage recipe={recipe} />
    </Document>
  );
}
