package br.com.lincros.nifi.xml;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Leitor JSON estrito (RFC 8259) que monta a árvore de dados:
 * Map (objeto), List (array), String, {@link Num}, Boolean e {@link #NULL}.
 * Números são guardados como texto original, sem perda de precisão.
 */
public final class JsonTree {

    /** Representa o null do JSON. */
    public static final Object NULL = new Object() {
        @Override
        public String toString() {
            return "null";
        }
    };

    /** Número JSON preservado como texto original. */
    public static final class Num {
        public final String raw;

        Num(String raw) {
            this.raw = raw;
        }

        @Override
        public String toString() {
            return raw;
        }
    }

    private final String s;
    private int pos;

    private JsonTree(String s) {
        this.s = s;
    }

    /** Lê o JSON; lança TemplateException com linha/coluna se for inválido. */
    public static Object parse(String text) throws TemplateException {
        JsonTree p = new JsonTree(text);
        try {
            p.ws();
            if (p.pos < text.length() && text.charAt(p.pos) == '﻿') {
                p.pos++;
                p.ws();
            }
            Object v = p.value(0);
            p.ws();
            if (p.pos != text.length()) {
                p.fail("conteúdo extra depois do fim do JSON");
            }
            return v;
        } catch (IllegalStateException e) {
            throw new TemplateException("JSON inválido: " + e.getMessage()
                    + ". Dica: use o RepairXmlJson antes deste processor.");
        }
    }

    private void fail(String msg) {
        int line = 1;
        int col = 1;
        for (int i = 0; i < pos && i < s.length(); i++) {
            if (s.charAt(i) == '\n') {
                line++;
                col = 1;
            } else {
                col++;
            }
        }
        throw new IllegalStateException(msg + " (linha " + line + ", coluna " + col + ")");
    }

    private void ws() {
        while (pos < s.length()) {
            char c = s.charAt(pos);
            if (c == ' ' || c == '\t' || c == '\n' || c == '\r') {
                pos++;
            } else {
                break;
            }
        }
    }

    private char peek() {
        if (pos >= s.length()) {
            fail("fim inesperado do JSON");
        }
        return s.charAt(pos);
    }

    private Object value(int depth) {
        if (depth > 1000) {
            fail("aninhamento excessivo");
        }
        char c = peek();
        if (c == '{') {
            return object(depth);
        }
        if (c == '[') {
            return array(depth);
        }
        if (c == '"') {
            return string();
        }
        if (c == '-' || (c >= '0' && c <= '9')) {
            return number();
        }
        if (s.startsWith("true", pos)) {
            pos += 4;
            return Boolean.TRUE;
        }
        if (s.startsWith("false", pos)) {
            pos += 5;
            return Boolean.FALSE;
        }
        if (s.startsWith("null", pos)) {
            pos += 4;
            return NULL;
        }
        fail("valor inesperado '" + c + "'");
        return null;
    }

    private Map<String, Object> object(int depth) {
        Map<String, Object> map = new LinkedHashMap<>();
        pos++;
        ws();
        if (peek() == '}') {
            pos++;
            return map;
        }
        while (true) {
            ws();
            if (peek() != '"') {
                fail("esperava aspas duplas no nome do campo");
            }
            String key = string();
            ws();
            if (peek() != ':') {
                fail("esperava ':' depois de \"" + key + "\"");
            }
            pos++;
            ws();
            map.put(key, value(depth + 1));
            ws();
            char c = peek();
            pos++;
            if (c == '}') {
                return map;
            }
            if (c != ',') {
                pos--;
                fail("esperava ',' ou '}'");
            }
        }
    }

    private List<Object> array(int depth) {
        List<Object> list = new ArrayList<>();
        pos++;
        ws();
        if (peek() == ']') {
            pos++;
            return list;
        }
        while (true) {
            ws();
            list.add(value(depth + 1));
            ws();
            char c = peek();
            pos++;
            if (c == ']') {
                return list;
            }
            if (c != ',') {
                pos--;
                fail("esperava ',' ou ']'");
            }
        }
    }

    private String string() {
        pos++;
        StringBuilder sb = new StringBuilder();
        while (true) {
            char c = peek();
            pos++;
            if (c == '"') {
                return sb.toString();
            }
            if (c < 0x20) {
                pos--;
                fail("caractere de controle dentro de texto");
            }
            if (c != '\\') {
                sb.append(c);
                continue;
            }
            char e = peek();
            pos++;
            switch (e) {
                case '"': sb.append('"'); break;
                case '\\': sb.append('\\'); break;
                case '/': sb.append('/'); break;
                case 'b': sb.append('\b'); break;
                case 'f': sb.append('\f'); break;
                case 'n': sb.append('\n'); break;
                case 'r': sb.append('\r'); break;
                case 't': sb.append('\t'); break;
                case 'u':
                    if (pos + 4 > s.length()) {
                        fail("escape \\u incompleto");
                    }
                    try {
                        sb.append((char) Integer.parseInt(s.substring(pos, pos + 4), 16));
                    } catch (NumberFormatException ex) {
                        fail("escape \\u inválido");
                    }
                    pos += 4;
                    break;
                default:
                    pos--;
                    fail("escape inválido '\\" + e + "'");
            }
        }
    }

    private Num number() {
        int start = pos;
        if (peek() == '-') {
            pos++;
        }
        char c = peek();
        if (c == '0') {
            pos++;
        } else if (c >= '1' && c <= '9') {
            digits();
        } else {
            fail("número inválido");
        }
        if (pos < s.length() && s.charAt(pos) == '.') {
            pos++;
            if (!Character.isDigit(peek())) {
                fail("número inválido");
            }
            digits();
        }
        if (pos < s.length() && (s.charAt(pos) == 'e' || s.charAt(pos) == 'E')) {
            pos++;
            if (peek() == '+' || peek() == '-') {
                pos++;
            }
            if (!Character.isDigit(peek())) {
                fail("número inválido");
            }
            digits();
        }
        return new Num(s.substring(start, pos));
    }

    private void digits() {
        while (pos < s.length() && s.charAt(pos) >= '0' && s.charAt(pos) <= '9') {
            pos++;
        }
    }

    /** Converte um valor da árvore de volta para texto JSON compacto. */
    @SuppressWarnings("unchecked")
    public static String toJson(Object v) {
        StringBuilder out = new StringBuilder();
        write(v, out);
        return out.toString();
    }

    @SuppressWarnings("unchecked")
    private static void write(Object v, StringBuilder out) {
        if (v instanceof Map) {
            out.append('{');
            boolean first = true;
            for (Map.Entry<String, Object> e : ((Map<String, Object>) v).entrySet()) {
                if (!first) {
                    out.append(',');
                }
                first = false;
                quote(e.getKey(), out);
                out.append(':');
                write(e.getValue(), out);
            }
            out.append('}');
        } else if (v instanceof List) {
            out.append('[');
            boolean first = true;
            for (Object item : (List<Object>) v) {
                if (!first) {
                    out.append(',');
                }
                first = false;
                write(item, out);
            }
            out.append(']');
        } else if (v instanceof String) {
            quote((String) v, out);
        } else if (v instanceof Num || v instanceof Boolean) {
            out.append(v.toString());
        } else {
            out.append("null");
        }
    }

    private static void quote(String value, StringBuilder out) {
        out.append('"');
        for (int i = 0; i < value.length(); i++) {
            char c = value.charAt(i);
            switch (c) {
                case '"': out.append("\\\""); break;
                case '\\': out.append("\\\\"); break;
                case '\n': out.append("\\n"); break;
                case '\r': out.append("\\r"); break;
                case '\t': out.append("\\t"); break;
                default:
                    if (c < 0x20) {
                        out.append(String.format("\\u%04x", (int) c));
                    } else {
                        out.append(c);
                    }
            }
        }
        out.append('"');
    }
}
