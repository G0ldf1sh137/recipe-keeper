import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { RecipePdfPage } from "#/recipes/RecipePdfDocument";
import type { RecipePdfData } from "#/recipes/RecipePdfDocument";

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 11, fontFamily: "Helvetica" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  headerText: { flex: 1, paddingRight: 12 },
  qrCode: { width: 70, height: 70 },
  title: { fontSize: 26, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  byline: { fontSize: 10, color: "#666666", marginBottom: 4 },
  count: { fontSize: 10, color: "#666666", marginBottom: 20 },
  sectionHeading: { fontSize: 14, fontFamily: "Helvetica-Bold", marginBottom: 8 },
  tocRow: { flexDirection: "row", marginBottom: 4 },
  tocBullet: { width: 10 },
  tocText: { flex: 1 },
});

export function CookbookPdfDocument({
  collectionName,
  ownerName,
  qrCodeDataUrl,
  recipes,
}: {
  collectionName: string;
  ownerName: string;
  qrCodeDataUrl: string;
  recipes: RecipePdfData[];
}) {
  return (
    <Document title={collectionName}>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.title}>{collectionName}</Text>
            <Text style={styles.byline}>by {ownerName}</Text>
            <Text style={styles.count}>
              {recipes.length} recipe{recipes.length === 1 ? "" : "s"}
            </Text>
          </View>
          <Image src={qrCodeDataUrl} style={styles.qrCode} />
        </View>

        <Text style={styles.sectionHeading}>Contents</Text>
        {recipes.map((recipe, i) => (
          <View key={i} style={styles.tocRow}>
            <Text style={styles.tocBullet}>•</Text>
            <Text style={styles.tocText}>{recipe.title}</Text>
          </View>
        ))}
      </Page>

      {recipes.map((recipe, i) => (
        <RecipePdfPage key={i} recipe={recipe} />
      ))}
    </Document>
  );
}
