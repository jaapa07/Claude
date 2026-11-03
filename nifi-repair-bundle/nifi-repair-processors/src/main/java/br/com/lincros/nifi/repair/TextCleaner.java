package br.com.lincros.nifi.repair;

import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.Charset;
import java.nio.charset.CharsetDecoder;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;

/**
 * Limpeza de caracteres comum a JSON e XML: decodificação tolerante, BOM,
 * caracteres invisíveis, espaços Unicode, caracteres de controle e mojibake.
 */
public final class TextCleaner {

    /** Mapa windows-1252 para os bytes 0x80..0x9F (0 = indefinido). */
    private static final char[] CP1252_HIGH = {
        '€', 0, '‚', 'ƒ', '„', '…', '†', '‡',
        'ˆ', '‰', 'Š', '‹', 'Œ', 0, 'Ž', 0,
        0, '‘', '’', '“', '”', '•', '–', '—',
        '˜', '™', 'š', '›', 'œ', 0, 'ž', 'Ÿ'
    };

    private TextCleaner() {
    }

    /** Decodifica UTF-8 estrito; retorna null se os bytes não forem UTF-8 válido. */
    public static String decodeStrictUtf8(byte[] bytes) {
        CharsetDecoder decoder = StandardCharsets.UTF_8.newDecoder()
                .onMalformedInput(CodingErrorAction.REPORT)
                .onUnmappableCharacter(CodingErrorAction.REPORT);
        try {
            return decoder.decode(ByteBuffer.wrap(bytes)).toString();
        } catch (CharacterCodingException e) {
            return null;
        }
    }

    /**
     * Decodifica sem nunca falhar. Usa o charset declarado (XML) quando houver;
     * senão tenta UTF-8 e, se houver bytes inválidos, lê como windows-1252
     * (padrão de arquivos gerados no Windows/Excel em português).
     */
    public static String decodeLenient(byte[] bytes, String declaredCharset, RepairLog log) {
        if (declaredCharset != null) {
            try {
                Charset cs = Charset.forName(declaredCharset);
                if (!cs.equals(StandardCharsets.UTF_8)) {
                    if (cs.name().equalsIgnoreCase("windows-1252") || cs.name().equalsIgnoreCase("ISO-8859-1")) {
                        return decodeCp1252(bytes);
                    }
                    return new String(bytes, cs);
                }
            } catch (IllegalArgumentException e) {
                log.add("charset-desconhecido-ignorado");
            }
        }
        String utf8 = decodeStrictUtf8(bytes);
        if (utf8 != null) {
            return utf8;
        }
        log.add("utf8-invalido-lido-como-cp1252");
        return decodeCp1252(bytes);
    }

    /** windows-1252 próprio: bytes indefinidos viram o caractere de mesmo valor (permite reverter mojibake). */
    static String decodeCp1252(byte[] bytes) {
        StringBuilder sb = new StringBuilder(bytes.length);
        for (byte b : bytes) {
            int v = b & 0xFF;
            if (v >= 0x80 && v <= 0x9F && CP1252_HIGH[v - 0x80] != 0) {
                sb.append(CP1252_HIGH[v - 0x80]);
            } else {
                sb.append((char) v);
            }
        }
        return sb.toString();
    }

    /** Byte windows-1252 correspondente ao caractere, ou -1. */
    private static int toCp1252Byte(char c) {
        if (c >= 0x80 && c <= 0xFF) {
            return c;
        }
        for (int i = 0; i < CP1252_HIGH.length; i++) {
            if (CP1252_HIGH[i] == c && c != 0) {
                return 0x80 + i;
            }
        }
        return -1;
    }

    /**
     * Aplica todas as limpezas de caractere.
     *
     * @param fixMojibake corrige sequências como "Ã§" -> "ç"
     */
    public static String clean(String text, boolean fixMojibake, RepairLog log) {
        // a correção de acentuação vem antes: ela pode revelar BOM e invisíveis
        // que estavam "disfarçados" (ex.: "ï»¿" vira BOM, "â€‹" vira zero-width)
        String s = text;
        if (fixMojibake) {
            // texto pode ter sido "quebrado" mais de uma vez (ex.: "JoÃ£o" gravado de novo em Latin-1)
            for (int pass = 0; pass < 3; pass++) {
                String fixed = fixMojibake(s, log);
                if (fixed == s) {
                    break;
                }
                s = fixed;
            }
        }
        s = removeInvisible(s, log);
        s = normalizeSpaces(s, log);
        s = removeControlChars(s, log);
        return s;
    }

    static String removeInvisible(String s, RepairLog log) {
        StringBuilder sb = null;
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            boolean invisible = c == '﻿' || c == '​' || c == '‌' || c == '‍' || c == '⁠';
            if (invisible) {
                if (sb == null) {
                    sb = new StringBuilder(s.length());
                    sb.append(s, 0, i);
                }
                log.add("bom-ou-caractere-invisivel-removido");
            } else if (sb != null) {
                sb.append(c);
            }
        }
        return sb == null ? s : sb.toString();
    }

    /**
     * Reverte texto UTF-8 que foi lido como windows-1252/latin-1.
     * Só troca uma sequência quando ela forma um caractere UTF-8 válido.
     */
    static String fixMojibake(String s, RepairLog log) {
        StringBuilder sb = null;
        int i = 0;
        while (i < s.length()) {
            char c = s.charAt(i);
            int len = c >= 0xC2 && c <= 0xDF ? 2 : c >= 0xE0 && c <= 0xEF ? 3 : c >= 0xF0 && c <= 0xF4 ? 4 : 0;
            String fixed = null;
            if (len > 0 && i + len <= s.length()) {
                byte[] bytes = new byte[len];
                bytes[0] = (byte) c;
                boolean ok = true;
                for (int k = 1; k < len; k++) {
                    int b = toCp1252Byte(s.charAt(i + k));
                    if (b < 0x80 || b > 0xBF) {
                        ok = false;
                        break;
                    }
                    bytes[k] = (byte) b;
                }
                if (ok) {
                    fixed = decodeStrictUtf8(bytes);
                }
            }
            if (fixed != null) {
                if (sb == null) {
                    sb = new StringBuilder(s.length());
                    sb.append(s, 0, i);
                }
                sb.append(fixed);
                log.add("encoding-corrigido");
                i += len;
            } else {
                if (sb != null) {
                    sb.append(c);
                }
                i++;
            }
        }
        return sb == null ? s : sb.toString();
    }

    static String normalizeSpaces(String s, RepairLog log) {
        StringBuilder sb = null;
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            char replacement = 0;
            if (c == ' ' || (c >= ' ' && c <= ' ') || c == ' ' || c == ' ' || c == '　') {
                replacement = ' ';
            } else if (c == ' ' || c == ' ') {
                replacement = '\n';
            }
            if (replacement != 0) {
                if (sb == null) {
                    sb = new StringBuilder(s.length());
                    sb.append(s, 0, i);
                }
                sb.append(replacement);
                log.add("espaco-unicode-normalizado");
            } else if (sb != null) {
                sb.append(c);
            }
        }
        return sb == null ? s : sb.toString();
    }

    static boolean isControl(char c) {
        return (c < 0x20 && c != '\t' && c != '\n' && c != '\r')
                || c == 0x7F
                || (c >= 0x80 && c <= 0x9F)
                || c == '￾' || c == '￿';
    }

    static String removeControlChars(String s, RepairLog log) {
        StringBuilder sb = null;
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (isControl(c)) {
                if (sb == null) {
                    sb = new StringBuilder(s.length());
                    sb.append(s, 0, i);
                }
                log.add("caractere-controle-removido");
            } else if (sb != null) {
                sb.append(c);
            }
        }
        return sb == null ? s : sb.toString();
    }
}
