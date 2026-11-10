import { FlatList, StyleSheet, Text, View } from 'react-native';

import { RecipeCard } from '../../components/RecipeCard';
import { useRecipes } from '../../lib/store';
import { useTheme } from '../../lib/theme';

export default function FavoritesScreen() {
  const t = useTheme();
  const { recipes, favorites, toggleFavorite } = useRecipes();
  const list = recipes.filter((r) => favorites.has(r.id));

  return (
    <FlatList
      style={{ backgroundColor: t.bg }}
      data={list}
      keyExtractor={(r) => r.id}
      contentContainerStyle={styles.content}
      renderItem={({ item }) => (
        <RecipeCard recipe={item} favorite onToggleFavorite={() => toggleFavorite(item.id)} />
      )}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emoji}>🤍</Text>
          <Text style={[styles.text, { color: t.muted }]}>
            Toque no coração de uma receita para guardá-la aqui.
          </Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, flexGrow: 1 },
  empty: { alignItems: 'center', paddingVertical: 64, gap: 12 },
  emoji: { fontSize: 48 },
  text: { textAlign: 'center', fontSize: 15, paddingHorizontal: 24 },
});
