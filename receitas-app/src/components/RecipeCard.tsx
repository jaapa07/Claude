import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatViews } from '../lib/ranking';
import { platformLabel } from '../lib/social';
import { CATEGORY_EMOJI, useTheme } from '../lib/theme';
import type { Recipe } from '../lib/types';

interface Props {
  recipe: Recipe;
  favorite: boolean;
  onToggleFavorite: () => void;
  rank?: number;
}

export function RecipeCard({ recipe, favorite, onToggleFavorite, rank }: Props) {
  const t = useTheme();
  const views = formatViews(recipe.views);
  const badgeColor = recipe.platform === 'tiktok' ? t.tiktok : t.instagram;

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/receita/[id]', params: { id: recipe.id } })}
      accessibilityRole="link"
      style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}
    >
        <View style={[styles.thumb, { backgroundColor: t.chip }]}>
          {recipe.thumbnailUrl ? (
            <Image source={{ uri: recipe.thumbnailUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <Text style={styles.emoji}>{CATEGORY_EMOJI[recipe.category] ?? '🍽️'}</Text>
          )}
          {recipe.videoUrl ? (
            <View style={styles.play}>
              <Text style={styles.playIcon}>▶</Text>
            </View>
          ) : null}
          {rank !== undefined && rank < 3 && recipe.videoUrl ? (
            <View style={[styles.rank, { backgroundColor: t.primary }]}>
              <Text style={[styles.rankText, { color: t.primaryText }]}>🔥 #{rank + 1}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.body}>
          <View style={styles.metaRow}>
            {recipe.platform ? (
              <View style={[styles.badge, { borderColor: badgeColor }]}>
                <Text style={[styles.badgeText, { color: badgeColor }]}>{platformLabel(recipe.platform)}</Text>
              </View>
            ) : (
              <Text style={[styles.meta, { color: t.muted }]}>{recipe.isSample ? 'Exemplo' : 'Receita'}</Text>
            )}
            <Text style={[styles.meta, { color: t.muted }]}>
              {recipe.category}
              {recipe.minutes ? ` · ${recipe.minutes} min` : ''}
              {views ? ` · ${views} views` : ''}
            </Text>
          </View>
          <Text style={[styles.title, { color: t.text }]} numberOfLines={2}>
            {recipe.title}
          </Text>
          {recipe.authorName ? (
            <Text style={[styles.meta, { color: t.muted }]} numberOfLines={1}>
              por {recipe.authorName}
            </Text>
          ) : null}
        </View>

        <Pressable
          hitSlop={12}
          onPress={(e) => {
            e.stopPropagation?.();
            onToggleFavorite();
          }}
          accessibilityRole="button"
          accessibilityLabel={favorite ? 'Remover dos favoritos' : 'Salvar nos favoritos'}
          style={styles.fav}
        >
          <Text style={styles.favIcon}>{favorite ? '❤️' : '🤍'}</Text>
        </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  thumb: { width: 96, height: 120, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 40 },
  play: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: { color: '#fff', fontSize: 14, marginLeft: 2 },
  rank: { position: 'absolute', top: 6, left: 6, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  rankText: { fontSize: 11, fontWeight: '800' },
  body: { flex: 1, padding: 12, gap: 4, justifyContent: 'center' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  badge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  meta: { fontSize: 12 },
  title: { fontSize: 16, fontWeight: '700' },
  fav: { padding: 12, justifyContent: 'flex-start' },
  favIcon: { fontSize: 20 },
});
