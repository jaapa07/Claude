import { createElement } from 'react';
import { StyleSheet, View } from 'react-native';

interface Props {
  uri: string;
  sourceUrl: string;
  height: number;
}

/** Na versão web, o player oficial entra num <iframe>. */
export function VideoEmbed({ uri, height }: Props) {
  return (
    <View style={[styles.box, { height }]}>
      {createElement('iframe', {
        src: uri,
        style: { border: 0, width: '100%', height: '100%' },
        allow: 'autoplay; encrypted-media; fullscreen; picture-in-picture',
        allowFullScreen: true,
        title: 'Vídeo da receita',
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: '100%', backgroundColor: '#000', borderRadius: 16, overflow: 'hidden' },
});
