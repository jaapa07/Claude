import { useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

interface Props {
  uri: string;
  /** Link original, aberto no app/navegador quando o usuário toca em algo fora do player. */
  sourceUrl: string;
  height: number;
}

/** Player oficial do TikTok/Instagram dentro de uma WebView (iOS e Android). */
export function VideoEmbed({ uri, sourceUrl, height }: Props) {
  const [loading, setLoading] = useState(true);
  const embedHost = new URL(uri).host;

  return (
    <View style={[styles.box, { height }]}>
      <WebView
        source={{ uri }}
        style={styles.web}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        allowsFullscreenVideo
        onLoadEnd={() => setLoading(false)}
        setSupportMultipleWindows={false}
        onShouldStartLoadWithRequest={(req) => {
          // Mantém o player dentro do app; links para perfil, música etc. abrem fora.
          if (!req.isTopFrame || new URL(req.url).host === embedHost || req.url === 'about:blank') return true;
          Linking.openURL(req.url || sourceUrl).catch(() => {});
          return false;
        }}
      />
      {loading ? <ActivityIndicator style={StyleSheet.absoluteFill} size="large" color="#fff" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: '100%', backgroundColor: '#000', borderRadius: 16, overflow: 'hidden' },
  web: { flex: 1, backgroundColor: '#000' },
});
