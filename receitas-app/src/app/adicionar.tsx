import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Chip } from '../components/Chip';
import { parseCaption } from '../lib/caption';
import { parseViews } from '../lib/ranking';
import { fetchOEmbed, parseVideoLink, platformLabel, type ParsedLink } from '../lib/social';
import { useRecipes } from '../lib/store';
import { useTheme } from '../lib/theme';
import { CATEGORIES, type Category } from '../lib/types';

function lines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

export default function AddRecipeScreen() {
  const t = useTheme();
  const { addRecipe } = useRecipes();

  const [url, setUrl] = useState('');
  const [link, setLink] = useState<ParsedLink | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Category>('Salgados');
  const [minutes, setMinutes] = useState('');
  const [views, setViews] = useState('');
  const [caption, setCaption] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [steps, setSteps] = useState('');
  const [author, setAuthor] = useState<{ name?: string; url?: string; thumb?: string }>({});
  const [error, setError] = useState<string | null>(null);

  const inputStyle = [styles.input, { backgroundColor: t.card, borderColor: t.border, color: t.text }];

  const applyCaption = (text: string) => {
    const parsed = parseCaption(text);
    if (parsed.title && !title) setTitle(parsed.title);
    if (parsed.category) setCategory(parsed.category);
    if (parsed.ingredients.length && !ingredients.trim()) setIngredients(parsed.ingredients.join('\n'));
    if (parsed.steps.length && !steps.trim()) setSteps(parsed.steps.join('\n'));
    return parsed;
  };

  const loadLink = async (value = url) => {
    setError(null);
    const parsed = parseVideoLink(value);
    if (!parsed) {
      setLink(null);
      setStatus(null);
      setError('Cole um link de vídeo do TikTok (tiktok.com/@…/video/…) ou do Instagram (instagram.com/reel/…).');
      return;
    }
    setLoading(true);
    setStatus(`Buscando dados do ${platformLabel(parsed.platform)}…`);
    const info = await fetchOEmbed(parsed);
    setLoading(false);

    const resolved: ParsedLink = info?.videoId && !parsed.id ? { ...parsed, id: info.videoId } : parsed;
    if (resolved.platform === 'tiktok' && info?.videoId && info.authorUrl) {
      // Links curtos viram o link completo, que é o que o player precisa.
      resolved.url = `${info.authorUrl.replace(/\/$/, '')}/video/${info.videoId}`;
    }
    setLink(resolved);

    if (info) {
      setAuthor({ name: info.authorName, url: info.authorUrl, thumb: info.thumbnailUrl });
      if (info.title) {
        setCaption(info.title);
        const p = applyCaption(info.title);
        setStatus(
          p.ingredients.length || p.steps.length
            ? 'Receita extraída da legenda. Revise antes de salvar.'
            : 'Vídeo encontrado. A legenda não tinha a receita completa: preencha os campos abaixo.',
        );
      } else {
        setStatus('Vídeo encontrado. Preencha os campos abaixo.');
      }
    } else if (!resolved.id) {
      setStatus(null);
      setError('Não consegui abrir esse link curto. Abra o vídeo e copie o link completo.');
    } else {
      setStatus(
        resolved.platform === 'instagram'
          ? 'Vídeo do Instagram reconhecido. Cole a legenda abaixo para extrair a receita.'
          : 'Vídeo reconhecido, mas sem acesso aos dados. Cole a legenda abaixo para extrair a receita.',
      );
    }
  };

  const pasteFromClipboard = async () => {
    const text = (await Clipboard.getStringAsync()).trim();
    if (!text) return;
    setUrl(text);
    loadLink(text);
  };

  const save = () => {
    setError(null);
    if (!title.trim()) {
      setError('Dê um nome para a receita.');
      return;
    }
    if (link && !link.id) {
      setError('O link do vídeo ainda não foi reconhecido. Toque em "Buscar" ou use o link completo.');
      return;
    }
    const recipe = addRecipe({
      title: title.trim(),
      category,
      minutes: Number.parseInt(minutes, 10) || undefined,
      views: parseViews(views),
      ingredients: lines(ingredients),
      steps: lines(steps),
      videoUrl: link?.url,
      platform: link?.platform,
      authorName: author.name,
      authorUrl: author.url,
      thumbnailUrl: author.thumb,
    });
    router.replace({ pathname: '/receita/[id]', params: { id: recipe.id } });
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.label, { color: t.text }]}>Link do vídeo (TikTok ou Instagram)</Text>
        <View style={styles.urlRow}>
          <TextInput
            value={url}
            onChangeText={setUrl}
            onSubmitEditing={() => loadLink()}
            placeholder="https://www.tiktok.com/@…/video/…"
            placeholderTextColor={t.muted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            style={[inputStyle, { flex: 1 }]}
          />
          <Pressable onPress={() => loadLink()} style={[styles.smallBtn, { backgroundColor: t.primary }]}>
            {loading ? <ActivityIndicator color={t.primaryText} /> : <Text style={[styles.smallBtnText, { color: t.primaryText }]}>Buscar</Text>}
          </Pressable>
        </View>
        <Pressable onPress={pasteFromClipboard} hitSlop={8}>
          <Text style={[styles.link, { color: t.primary }]}>📋 Colar da área de transferência</Text>
        </Pressable>
        {status ? <Text style={[styles.hint, { color: t.muted }]}>{status}</Text> : null}
        {author.name ? (
          <Text style={[styles.hint, { color: t.text }]}>
            Criador: <Text style={{ fontWeight: '700' }}>{author.name}</Text>
          </Text>
        ) : null}

        <Text style={[styles.label, { color: t.text }]}>Legenda do vídeo (opcional)</Text>
        <TextInput
          value={caption}
          onChangeText={setCaption}
          placeholder="Cole aqui a legenda do post: o app separa ingredientes e modo de preparo."
          placeholderTextColor={t.muted}
          multiline
          style={[inputStyle, styles.multiline]}
        />
        <Pressable
          onPress={() => {
            const p = applyCaption(caption);
            setStatus(
              p.ingredients.length || p.steps.length
                ? `Encontrei ${p.ingredients.length} ingrediente(s) e ${p.steps.length} passo(s). Revise abaixo.`
                : 'Não encontrei ingredientes nem passos nessa legenda.',
            );
          }}
          hitSlop={8}
        >
          <Text style={[styles.link, { color: t.primary }]}>✨ Extrair receita da legenda</Text>
        </Pressable>

        <Text style={[styles.label, { color: t.text }]}>Nome da receita *</Text>
        <TextInput value={title} onChangeText={setTitle} placeholder="Ex.: Bolo de caneca de 3 minutos" placeholderTextColor={t.muted} style={inputStyle} />

        <Text style={[styles.label, { color: t.text }]}>Categoria</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
          {CATEGORIES.map((c) => (
            <Chip key={c} label={c} active={category === c} onPress={() => setCategory(c)} />
          ))}
        </ScrollView>

        <View style={styles.twoCols}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: t.text }]}>Tempo (min)</Text>
            <TextInput value={minutes} onChangeText={setMinutes} keyboardType="number-pad" placeholder="20" placeholderTextColor={t.muted} style={inputStyle} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: t.text }]}>Visualizações</Text>
            <TextInput value={views} onChangeText={setViews} placeholder="1,2 mi" placeholderTextColor={t.muted} style={inputStyle} />
          </View>
        </View>

        <Text style={[styles.label, { color: t.text }]}>Ingredientes (um por linha)</Text>
        <TextInput value={ingredients} onChangeText={setIngredients} multiline placeholder={'2 ovos\n1 xícara de leite'} placeholderTextColor={t.muted} style={[inputStyle, styles.multiline]} />

        <Text style={[styles.label, { color: t.text }]}>Modo de preparo (um passo por linha)</Text>
        <TextInput value={steps} onChangeText={setSteps} multiline placeholder={'Misture tudo\nLeve ao forno por 30 min'} placeholderTextColor={t.muted} style={[inputStyle, styles.multiline]} />

        {error ? <Text style={[styles.error, { color: t.danger }]}>{error}</Text> : null}

        <Pressable onPress={save} style={[styles.save, { backgroundColor: t.primary }]}>
          <Text style={[styles.saveText, { color: t.primaryText }]}>Salvar receita</Text>
        </Pressable>
        <Text style={[styles.hint, { color: t.muted, textAlign: 'center' }]}>
          O vídeo continua no {link ? platformLabel(link.platform) : 'TikTok/Instagram'}, com crédito ao criador. O app só guarda o link.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 48 },
  label: { fontSize: 14, fontWeight: '700', marginTop: 18, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  multiline: { minHeight: 110, textAlignVertical: 'top' },
  urlRow: { flexDirection: 'row', gap: 8 },
  smallBtn: { borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center', minWidth: 84, alignItems: 'center' },
  smallBtnText: { fontWeight: '800', fontSize: 15 },
  link: { fontWeight: '700', marginTop: 10 },
  hint: { fontSize: 13, marginTop: 8, lineHeight: 18 },
  twoCols: { flexDirection: 'row', gap: 12 },
  error: { marginTop: 16, fontWeight: '600' },
  save: { marginTop: 24, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  saveText: { fontSize: 17, fontWeight: '800' },
});
