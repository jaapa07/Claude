import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { VideoEmbed } from '../../components/VideoEmbed';
import { formatViews } from '../../lib/ranking';
import { embedUrl, parseVideoLink, platformLabel } from '../../lib/social';
import { useRecipes } from '../../lib/store';
import { CATEGORY_EMOJI, useTheme } from '../../lib/theme';

export default function RecipeScreen() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getRecipe, favorites, toggleFavorite, removeRecipe } = useRecipes();
  const { width } = useWindowDimensions();
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const recipe = getRecipe(id);

  if (!recipe) {
    return (
      <View style={[styles.center, { backgroundColor: t.bg }]}>
        <Text style={{ color: t.muted }}>Receita não encontrada.</Text>
      </View>
    );
  }

  const link = recipe.videoUrl ? parseVideoLink(recipe.videoUrl) : null;
  const embed = link ? embedUrl(link) : null;
  const playerWidth = Math.min(width - 32, 420);
  // Vídeos verticais (9:16); o embed do Instagram tem legenda abaixo, então fica mais alto.
  const playerHeight = Math.round(playerWidth * (link?.platform === 'instagram' ? 1.9 : 16 / 9));
  const fav = favorites.has(recipe.id);
  const views = formatViews(recipe.views);

  const toggleStep = (i: number) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  const share = () => {
    const text = [
      recipe.title,
      '',
      'Ingredientes:',
      ...recipe.ingredients.map((i) => `• ${i}`),
      '',
      'Modo de preparo:',
      ...recipe.steps.map((s, i) => `${i + 1}. ${s}`),
      recipe.videoUrl ? `\nVídeo: ${recipe.videoUrl}` : '',
    ].join('\n');
    Share.share({ message: text }).catch(() => {});
  };

  const confirmRemove = () => {
    const doRemove = () => {
      removeRecipe(recipe.id);
      router.back();
    };
    if (Platform.OS === 'web') {
      if (globalThis.confirm?.('Excluir esta receita?')) doRemove();
      return;
    }
    Alert.alert('Excluir receita', 'Tem certeza? Isso não pode ser desfeito.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: doRemove },
    ]);
  };

  return (
    <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={() => toggleFavorite(recipe.id)} hitSlop={12} accessibilityLabel="Favoritar">
              <Text style={{ fontSize: 22 }}>{fav ? '❤️' : '🤍'}</Text>
            </Pressable>
          ),
        }}
      />

      {embed && recipe.videoUrl ? (
        <View style={{ alignItems: 'center' }}>
          <View style={{ width: playerWidth }}>
            <VideoEmbed uri={embed} sourceUrl={recipe.videoUrl} height={playerHeight} />
          </View>
        </View>
      ) : (
        <View style={[styles.hero, { backgroundColor: t.chip }]}>
          <Text style={{ fontSize: 72 }}>{CATEGORY_EMOJI[recipe.category] ?? '🍽️'}</Text>
        </View>
      )}

      <Text style={[styles.title, { color: t.text }]}>{recipe.title}</Text>
      <Text style={[styles.meta, { color: t.muted }]}>
        {[
          recipe.category,
          recipe.minutes ? `${recipe.minutes} min` : null,
          views ? `${views} visualizações` : null,
          recipe.isSample ? 'receita de exemplo' : null,
        ]
          .filter(Boolean)
          .join(' · ')}
      </Text>

      {recipe.videoUrl ? (
        <Pressable
          onPress={() => Linking.openURL(recipe.authorUrl ?? recipe.videoUrl!)}
          style={[styles.credit, { borderColor: t.border, backgroundColor: t.card }]}
        >
          <Text style={{ color: t.text }}>
            🎬 Vídeo original no {platformLabel(recipe.platform)}
            {recipe.authorName ? ` por ` : ''}
            {recipe.authorName ? <Text style={{ fontWeight: '700' }}>{recipe.authorName}</Text> : null}
          </Text>
          <Text style={{ color: t.primary, fontWeight: '700' }}>Abrir ↗</Text>
        </Pressable>
      ) : null}

      <Text style={[styles.section, { color: t.text }]}>Ingredientes</Text>
      {recipe.ingredients.length === 0 ? (
        <Text style={{ color: t.muted }}>Nenhum ingrediente cadastrado.</Text>
      ) : (
        recipe.ingredients.map((ing, i) => (
          <Text key={i} style={[styles.ingredient, { color: t.text }]}>
            •  {ing}
          </Text>
        ))
      )}

      <Text style={[styles.section, { color: t.text }]}>Modo de preparo</Text>
      {recipe.steps.length === 0 ? (
        <Text style={{ color: t.muted }}>Nenhum passo cadastrado.</Text>
      ) : (
        recipe.steps.map((step, i) => {
          const done = checked.has(i);
          return (
            <Pressable
              key={i}
              onPress={() => toggleStep(i)}
              style={[styles.step, { backgroundColor: t.card, borderColor: t.border, opacity: done ? 0.5 : 1 }]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: done }}
            >
              <View style={[styles.stepNum, { backgroundColor: done ? t.muted : t.primary }]}>
                <Text style={{ color: t.primaryText, fontWeight: '800' }}>{done ? '✓' : i + 1}</Text>
              </View>
              <Text style={[styles.stepText, { color: t.text, textDecorationLine: done ? 'line-through' : 'none' }]}>
                {step}
              </Text>
            </Pressable>
          );
        })
      )}

      <View style={styles.actions}>
        <Pressable onPress={share} style={[styles.button, { backgroundColor: t.primary }]}>
          <Text style={[styles.buttonText, { color: t.primaryText }]}>Compartilhar receita</Text>
        </Pressable>
        <Pressable onPress={confirmRemove} style={[styles.button, { borderColor: t.danger, borderWidth: 1 }]}>
          <Text style={[styles.buttonText, { color: t.danger }]}>Excluir</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 48 },
  hero: { height: 180, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 26, fontWeight: '800', marginTop: 16 },
  meta: { fontSize: 14, marginTop: 4 },
  credit: {
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  section: { fontSize: 20, fontWeight: '800', marginTop: 24, marginBottom: 10 },
  ingredient: { fontSize: 16, lineHeight: 26 },
  step: { flexDirection: 'row', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  stepNum: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  stepText: { flex: 1, fontSize: 16, lineHeight: 23 },
  actions: { marginTop: 24, gap: 10 },
  button: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  buttonText: { fontSize: 16, fontWeight: '700' },
});
