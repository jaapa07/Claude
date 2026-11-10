import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Chip } from '../../components/Chip';
import { RecipeCard } from '../../components/RecipeCard';
import { matches, rankRecipes, type Filters } from '../../lib/ranking';
import { useRecipes } from '../../lib/store';
import { CATEGORY_EMOJI, useTheme } from '../../lib/theme';
import { CATEGORIES } from '../../lib/types';

const PLATFORMS = [
  { key: 'all', label: 'Todas' },
  { key: 'tiktok', label: 'TikTok' },
  { key: 'instagram', label: 'Instagram' },
] as const;

export default function FeedScreen() {
  const t = useTheme();
  const { ready, recipes, favorites, toggleFavorite } = useRecipes();
  const [filters, setFilters] = useState<Filters>({ query: '', platform: 'all', category: 'all' });

  const list = useMemo(() => rankRecipes(recipes.filter((r) => matches(r, filters))), [recipes, filters]);

  if (!ready) {
    return (
      <View style={[styles.center, { backgroundColor: t.bg }]}>
        <ActivityIndicator color={t.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <FlatList
        data={list}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.header}>
            <TextInput
              value={filters.query}
              onChangeText={(query) => setFilters((f) => ({ ...f, query }))}
              placeholder="Buscar receita ou ingrediente…"
              placeholderTextColor={t.muted}
              style={[styles.search, { backgroundColor: t.card, borderColor: t.border, color: t.text }]}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.row}>
              {PLATFORMS.map((p) => (
                <Chip
                  key={p.key}
                  label={p.label}
                  active={filters.platform === p.key}
                  onPress={() => setFilters((f) => ({ ...f, platform: p.key }))}
                />
              ))}
            </ScrollView>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.row}>
              <Chip
                label="Tudo"
                active={filters.category === 'all'}
                onPress={() => setFilters((f) => ({ ...f, category: 'all' }))}
              />
              {CATEGORIES.map((c) => (
                <Chip
                  key={c}
                  label={`${CATEGORY_EMOJI[c]} ${c}`}
                  active={filters.category === c}
                  onPress={() => setFilters((f) => ({ ...f, category: f.category === c ? 'all' : c }))}
                />
              ))}
            </ScrollView>
          </View>
        }
        renderItem={({ item, index }) => (
          <RecipeCard
            recipe={item}
            rank={index}
            favorite={favorites.has(item.id)}
            onToggleFavorite={() => toggleFavorite(item.id)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🍳</Text>
            <Text style={[styles.emptyText, { color: t.muted }]}>
              Nenhuma receita encontrada. Cole o link de um vídeo do TikTok ou do Instagram para começar.
            </Text>
          </View>
        }
      />

      <Pressable
          onPress={() => router.push('/adicionar')}
          style={[styles.fab, { backgroundColor: t.primary }]}
          accessibilityRole="button"
          accessibilityLabel="Adicionar receita de um vídeo"
        >
          <Text style={[styles.fabText, { color: t.primaryText }]}>＋ Adicionar vídeo</Text>
        </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 100 },
  header: { marginBottom: 8 },
  search: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  row: { marginTop: 12, flexGrow: 0 },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyEmoji: { fontSize: 48 },
  emptyText: { textAlign: 'center', fontSize: 15, lineHeight: 22, paddingHorizontal: 24 },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 20,
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 14,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  fabText: { fontSize: 16, fontWeight: '800' },
});
