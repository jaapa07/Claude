package br.com.lincros.nifi.repair;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * Parser JSON tolerante: entende JSON quebrado (aspas simples, aspas extras,
 * aspas internas sem escape, vírgulas faltando/sobrando, chaves sem aspas,
 * comentários, estruturas não fechadas...) e reescreve como JSON válido.
 *
 * Números são preservados exatamente como vieram (sem perda de precisão).
 */
public final class JsonRepairer {

    static final Object NULL = new Object();

    static final class JsonNumber {
        final String raw;

        JsonNumber(String raw) {
            this.raw = raw;
        }
    }

    private enum Ctx { TOP, KEY, OBJECT_VALUE, ARRAY }

    private static final Pattern STRICT_NUMBER = Pattern.compile("-?(0|[1-9]\\d*)(\\.\\d+)?([eE][+-]?\\d+)?");
    private static final Pattern LOOSE_NUMBER = Pattern.compile("[+-]?(\\d+\\.?\\d*|\\.\\d+)([eE][+-]?\\d+)?");
    private static final Pattern LEADING_ZERO = Pattern.compile("-?0\\d+");
    private static final Pattern INTEGER = Pattern.compile("-?\\d+");
    private static final int MAX_DEPTH = 1000;

    private final String s;
    private final int n;
    private final RepairOptions opts;
    private final RepairLog log;
    private int pos;
    private int depth;

    private JsonRepairer(String s, RepairOptions opts, RepairLog log) {
        this.s = s;
        this.n = s.length();
        this.opts = opts;
        this.log = log;
    }

    /** Corrige o texto e retorna JSON válido. */
    public static String repair(String text, RepairOptions opts, RepairLog log) throws RepairException {
        JsonRepairer parser = new JsonRepairer(text, opts, log);
        Object value = parser.parseDocument();
        StringBuilder out = new StringBuilder(text.length() + 16);
        write(value, out, opts.prettyJson, 0);
        String result = out.toString();
        if (!StrictJsonValidator.isValid(result)) {
            throw new RepairException("Falha interna: o JSON gerado não é válido");
        }
        return result;
    }

    // ------------------------------------------------------------------ documento

    private Object parseDocument() throws RepairException {
        skipWs();
        if (pos >= n) {
            throw new RepairException("Documento JSON vazio");
        }
        char c0 = s.charAt(pos);
        if (c0 != '{' && c0 != '[') {
            int first = indexOfContainerStart(pos);
            if (first < 0) {
                Object scalar = parseValue(Ctx.TOP);
                skipWs();
                if (pos < n) {
                    log.add("lixo-final-removido");
                }
                return scalar;
            }
            log.add("lixo-inicial-removido");
            pos = first;
        }
        List<Object> roots = new ArrayList<>();
        roots.add(parseValue(Ctx.TOP));
        while (true) {
            skipWs();
            if (pos >= n) {
                break;
            }
            char c = s.charAt(pos);
            if (c == '{' || c == '[') {
                roots.add(parseValue(Ctx.TOP));
            } else if (c == ',') {
                pos++;
            } else {
                log.add("lixo-final-removido");
                int next = indexOfContainerStart(pos);
                if (next < 0) {
                    break;
                }
                pos = next;
            }
        }
        if (roots.size() > 1) {
            log.add("multiplas-raizes-agrupadas-em-array");
            return roots;
        }
        return roots.get(0);
    }

    private int indexOfContainerStart(int from) {
        for (int i = from; i < n; i++) {
            char c = s.charAt(i);
            if (c == '{' || c == '[') {
                return i;
            }
        }
        return -1;
    }

    // ------------------------------------------------------------------ valores

    private Object parseValue(Ctx ctx) {
        skipWs();
        if (pos >= n) {
            log.add("valor-ausente-preenchido-null");
            return NULL;
        }
        char c = s.charAt(pos);
        if (c == '{') {
            return parseObject();
        }
        if (c == '[') {
            return parseArray();
        }
        if (isQuote(c)) {
            return parseString(ctx);
        }
        if (c == ',' || c == '}' || c == ']') {
            log.add("valor-ausente-preenchido-null");
            return NULL;
        }
        if (c == ':') {
            pos++;
            log.add("caractere-invalido-removido");
            return parseValue(ctx);
        }
        return parseBare(ctx);
    }

    private Object parseObject() {
        pos++;
        depth++;
        Map<String, Object> map = new LinkedHashMap<>();
        boolean afterComma = false;
        while (true) {
            skipWs();
            if (pos >= n) {
                log.add("objeto-nao-fechado");
                break;
            }
            char c = s.charAt(pos);
            if (c == '}') {
                pos++;
                if (afterComma) {
                    log.add("virgula-extra-removida");
                }
                break;
            }
            if (c == ']') {
                pos++;
                log.add("fechamento-trocado-corrigido");
                break;
            }
            if (c == ',') {
                pos++;
                log.add("virgula-extra-removida");
                continue;
            }
            if (!isQuote(c) && !isKeyStart(c)) {
                pos++;
                log.add("caractere-invalido-removido");
                continue;
            }
            String key = isQuote(c) ? (String) parseString(Ctx.KEY) : parseUnquotedKey();
            skipWs();
            if (pos < n && s.charAt(pos) == ':') {
                pos++;
            } else if (pos < n && s.charAt(pos) == '=') {
                pos++;
                log.add("igual-trocado-por-dois-pontos");
            } else {
                log.add("dois-pontos-ausente-adicionado");
            }
            Object value = depth > MAX_DEPTH ? NULL : parseValue(Ctx.OBJECT_VALUE);
            if (map.containsKey(key)) {
                log.add("chave-duplicada-ultima-mantida");
            }
            map.put(key, value);
            afterComma = false;

            skipWs();
            if (pos >= n) {
                continue;
            }
            c = s.charAt(pos);
            if (c == ',') {
                pos++;
                afterComma = true;
            } else if (c == '}' || c == ']') {
                // tratado no início do laço
            } else if (isQuote(c) && isStrayQuoteRun(pos, "},")) {
                log.add("aspas-extras-removidas");
                pos = endOfQuoteRun(pos);
            } else if (isQuote(c) || isKeyStart(c)) {
                log.add("virgula-ausente-adicionada");
            } else {
                pos++;
                log.add("caractere-invalido-removido");
            }
        }
        depth--;
        return map;
    }

    private Object parseArray() {
        pos++;
        depth++;
        List<Object> list = new ArrayList<>();
        boolean afterComma = false;
        while (true) {
            skipWs();
            if (pos >= n) {
                log.add("array-nao-fechado");
                break;
            }
            char c = s.charAt(pos);
            if (c == ']') {
                pos++;
                if (afterComma) {
                    log.add("virgula-extra-removida");
                }
                break;
            }
            if (c == '}') {
                pos++;
                log.add("fechamento-trocado-corrigido");
                break;
            }
            if (c == ',') {
                pos++;
                log.add("virgula-extra-removida");
                continue;
            }
            list.add(depth > MAX_DEPTH ? NULL : parseValue(Ctx.ARRAY));
            afterComma = false;

            skipWs();
            if (pos >= n) {
                continue;
            }
            c = s.charAt(pos);
            if (c == ',') {
                pos++;
                afterComma = true;
            } else if (c == ']' || c == '}') {
                // tratado no início do laço
            } else if (isQuote(c) && isStrayQuoteRun(pos, "],")) {
                log.add("aspas-extras-removidas");
                pos = endOfQuoteRun(pos);
            } else if (c == ':') {
                pos++;
                log.add("caractere-invalido-removido");
            } else {
                log.add("virgula-ausente-adicionada");
            }
        }
        depth--;
        return list;
    }

    private String parseUnquotedKey() {
        int start = pos;
        while (pos < n) {
            char c = s.charAt(pos);
            if (c == ':' || c == '=' || c == ',' || c == '{' || c == '}' || c == '[' || c == ']'
                    || c == '\n' || c == '\r' || isQuote(c)) {
                break;
            }
            pos++;
        }
        log.add("chave-sem-aspas-corrigida");
        return s.substring(start, pos).trim();
    }

    /**
     * Lê uma string delimitada por qualquer tipo de aspas (" ' “ ” ‘ ’ ` ´).
     * Uma aspa só fecha a string se o que vem depois faz sentido estruturalmente
     * (":" para chaves; "," "}" "]" para valores). Senão, é aspa interna.
     */
    private Object parseString(Ctx ctx) {
        char open = s.charAt(pos);
        int r = 1;
        while (pos + r < n && s.charAt(pos + r) == open) {
            r++;
        }
        if (open != '"') {
            log.add(open == '\'' ? "aspas-simples-convertidas" : "aspas-tipograficas-convertidas");
        }
        if (r >= 2) {
            if (r == 2 && isTerminator(ctx, skipWsIdx(pos + 2))) {
                pos += 2;
                return "";
            }
            log.add("aspas-extras-removidas");
            if (isTerminator(ctx, skipWsIdx(pos + r))) {
                pos += r;
                return "";
            }
        }
        pos += r;

        StringBuilder sb = new StringBuilder();
        while (pos < n) {
            char c = s.charAt(pos);
            if (c == '\\') {
                readEscape(sb);
                continue;
            }
            if (isQuote(c)) {
                int runEnd = endOfQuoteRun(pos);
                if (isTerminator(ctx, skipWsIdx(runEnd))) {
                    closeRun(open, pos, runEnd, sb);
                    pos = runEnd;
                    return finishString(sb);
                }
                for (int i = pos; i < runEnd; i++) {
                    char q = s.charAt(i);
                    if (q == '"') {
                        log.add("aspas-internas-escapadas");
                    }
                    sb.append(q);
                }
                pos = runEnd;
                continue;
            }
            if ((c == '\n' || c == '\r') && ctx != Ctx.TOP && looksLikeNextItem(ctx, skipWsIdx(pos))) {
                log.add("string-nao-fechada");
                String content = sb.toString();
                int end = content.length();
                while (end > 0 && (content.charAt(end - 1) <= ' ' || content.charAt(end - 1) == ',')) {
                    end--;
                }
                sb.setLength(end);
                return finishString(sb);
            }
            sb.append(c);
            pos++;
        }
        log.add("string-nao-fechada");
        return finishString(sb);
    }

    /**
     * Na sequência de aspas que fecha a string, escolhe a aspa delimitadora
     * (a última da mesma família da abertura). Aspas iguais repetidas são
     * descartadas; aspas diferentes antes dela fazem parte do conteúdo.
     */
    private void closeRun(char open, int start, int end, StringBuilder sb) {
        int delimiter = -1;
        for (int i = end - 1; i >= start; i--) {
            if (sameFamily(open, s.charAt(i))) {
                delimiter = i;
                break;
            }
        }
        if (delimiter < 0) {
            delimiter = end - 1;
        }
        char d = s.charAt(delimiter);
        // aspa interna aberta no conteúdo (ex.: "Ele disse "oi""): uma das aspas do fim fecha a palavra
        boolean keepOne = XmlRepairer.countChar(sb, d) % 2 == 1;
        for (int i = start; i < delimiter; i++) {
            char q = s.charAt(i);
            if (q == d && keepOne) {
                if (q == '"') {
                    log.add("aspas-internas-escapadas");
                }
                sb.append(q);
                keepOne = false;
            } else if (q == d) {
                log.add("aspas-extras-removidas");
            } else {
                if (q == '"') {
                    log.add("aspas-internas-escapadas");
                }
                sb.append(q);
            }
        }
        if (delimiter < end - 1) {
            log.add("aspas-extras-removidas");
        }
    }

    private String finishString(StringBuilder sb) {
        String value = sb.toString();
        if (opts.trimWhitespace) {
            String trimmed = value.trim();
            if (!trimmed.equals(value)) {
                log.add("espacos-aparados");
            }
            return trimmed;
        }
        return value;
    }

    private void readEscape(StringBuilder sb) {
        if (pos + 1 >= n) {
            sb.append('\\');
            pos++;
            log.add("escape-invalido-corrigido");
            return;
        }
        char e = s.charAt(pos + 1);
        switch (e) {
            case '"': sb.append('"'); pos += 2; return;
            case '\\': sb.append('\\'); pos += 2; return;
            case '/': sb.append('/'); pos += 2; return;
            case 'b': sb.append('\b'); pos += 2; return;
            case 'f': sb.append('\f'); pos += 2; return;
            case 'n': sb.append('\n'); pos += 2; return;
            case 'r': sb.append('\r'); pos += 2; return;
            case 't': sb.append('\t'); pos += 2; return;
            case 'u':
                if (pos + 6 <= n && isHex4(pos + 2)) {
                    sb.append((char) Integer.parseInt(s.substring(pos + 2, pos + 6), 16));
                    pos += 6;
                    return;
                }
                break;
            case '\'':
                sb.append('\'');
                pos += 2;
                log.add("escape-invalido-corrigido");
                return;
            default:
                break;
        }
        // escape desconhecido (ex.: C:\pasta): mantém a barra como texto
        sb.append('\\');
        pos++;
        log.add("escape-invalido-corrigido");
    }

    private boolean isHex4(int from) {
        for (int i = from; i < from + 4; i++) {
            if (Character.digit(s.charAt(i), 16) < 0) {
                return false;
            }
        }
        return true;
    }

    /** Valor sem aspas: literal, número ou texto solto. */
    private Object parseBare(Ctx ctx) {
        int start = pos;
        while (pos < n) {
            char c = s.charAt(pos);
            if (c == ',' || c == '}' || c == ']' || c == '{' || c == '[' || c == '\n' || c == '\r') {
                break;
            }
            if (c == '/' && pos + 1 < n && (s.charAt(pos + 1) == '/' || s.charAt(pos + 1) == '*')
                    && (pos == start || s.charAt(pos - 1) <= ' ')) {
                break;
            }
            if (c == ':' && ctx == Ctx.ARRAY) {
                break;
            }
            // vírgula ausente depois de valor sem aspas: {"a": 1 "b": 2}
            if (c <= ' ' && ctx == Ctx.OBJECT_VALUE && looksLikeKeyAt(skipWsIdx(pos))) {
                break;
            }
            pos++;
        }
        String token = s.substring(start, pos).trim();
        int end = token.length();
        while (end > 0 && isQuote(token.charAt(end - 1))) {
            end--;
        }
        if (end < token.length()) {
            log.add("aspas-extras-removidas");
            token = token.substring(0, end).trim();
        }
        if (token.isEmpty()) {
            log.add("valor-ausente-preenchido-null");
            return NULL;
        }

        String lower = token.toLowerCase(Locale.ROOT);
        if (lower.equals("true") || lower.equals("false") || lower.equals("null")) {
            if (!token.equals(lower)) {
                log.add("literal-normalizado");
            }
            return lower.equals("null") ? NULL : Boolean.valueOf(lower);
        }
        if (lower.equals("none") || lower.equals("nil") || lower.equals("undefined")
                || lower.equals("nan") || lower.equals("infinity") || lower.equals("-infinity")) {
            log.add("literal-normalizado");
            return NULL;
        }

        if (STRICT_NUMBER.matcher(token).matches()) {
            if (ctx == Ctx.OBJECT_VALUE && INTEGER.matcher(token).matches()) {
                String withDecimal = tryDecimalComma(token);
                if (withDecimal != null) {
                    return new JsonNumber(withDecimal);
                }
            }
            return new JsonNumber(token);
        }
        if (LEADING_ZERO.matcher(token).matches()) {
            log.add("zero-a-esquerda-mantido-como-texto");
            return token;
        }
        if (LOOSE_NUMBER.matcher(token).matches()) {
            String normalized = normalizeNumber(token);
            if (STRICT_NUMBER.matcher(normalized).matches()) {
                log.add("numero-normalizado");
                return new JsonNumber(normalized);
            }
        }
        log.add("texto-sem-aspas-corrigido");
        return token;
    }

    /** "valor": 1,5 (vírgula decimal brasileira) -> 1.5 */
    private String tryDecimalComma(String integerPart) {
        if (pos + 1 >= n || s.charAt(pos) != ',' || !isDigit(s.charAt(pos + 1))) {
            return null;
        }
        int j = pos + 1;
        while (j < n && isDigit(s.charAt(j))) {
            j++;
        }
        int k = skipWsIdx(j);
        if (k < n && s.charAt(k) != ',' && s.charAt(k) != '}') {
            return null;
        }
        String result = integerPart + "." + s.substring(pos + 1, j);
        pos = j;
        log.add("virgula-decimal-corrigida");
        return result;
    }

    private static String normalizeNumber(String token) {
        String t = token.startsWith("+") ? token.substring(1) : token;
        boolean negative = t.startsWith("-");
        if (negative) {
            t = t.substring(1);
        }
        if (t.startsWith(".")) {
            t = "0" + t;
        }
        t = t.replace(".e", "e").replace(".E", "E");
        if (t.endsWith(".")) {
            t = t.substring(0, t.length() - 1);
        }
        return negative ? "-" + t : t;
    }

    // ------------------------------------------------------------------ heurísticas

    /** Depois da aspa candidata a fechamento, o próximo caractere faz sentido? */
    private boolean isTerminator(Ctx ctx, int k) {
        if (k >= n) {
            return true;
        }
        char c = s.charAt(k);
        switch (ctx) {
            case KEY:
                return c == ':' || c == '=';
            case OBJECT_VALUE:
                if (c == '}' || c == ']') {
                    return true;
                }
                if (c == ',') {
                    int k2 = skipWsAndCommentsIdx(k + 1);
                    return k2 >= n || s.charAt(k2) == '}' || isQuote(s.charAt(k2)) || looksLikeKeyAt(k2);
                }
                // vírgula ausente entre pares: "a": "x" "b": 1
                return (isQuote(c) || isKeyStart(c)) && hasNewlineBetween(k) && looksLikeKeyAt(k);
            case ARRAY:
                return c == ',' || c == ']' || c == '}';
            case TOP:
            default:
                return c == '{' || c == '[' || c == ',';
        }
    }

    private boolean looksLikeNextItem(Ctx ctx, int k) {
        if (k >= n) {
            return true;
        }
        char c = s.charAt(k);
        if (c == '}' || c == ']') {
            return true;
        }
        if (ctx == Ctx.OBJECT_VALUE || ctx == Ctx.KEY) {
            return looksLikeKeyAt(k);
        }
        return isQuote(c) || c == '{' || c == '[';
    }

    private boolean hasNewlineBetween(int k) {
        for (int i = k - 1; i >= 0 && s.charAt(i) <= ' '; i--) {
            if (s.charAt(i) == '\n' || s.charAt(i) == '\r') {
                return true;
            }
        }
        return false;
    }

    /** Em k começa algo como "chave": ou chave: ? */
    private boolean looksLikeKeyAt(int k) {
        if (k >= n) {
            return false;
        }
        char c = s.charAt(k);
        int i;
        if (isQuote(c)) {
            i = k + 1;
            while (i < n && !isQuote(s.charAt(i)) && s.charAt(i) != '\n') {
                i++;
            }
            if (i >= n || s.charAt(i) == '\n') {
                return false;
            }
            i = endOfQuoteRun(i);
        } else if (isKeyStart(c)) {
            i = k;
            while (i < n && (isKeyStart(s.charAt(i)) || s.charAt(i) == '-' || s.charAt(i) == '.')) {
                i++;
            }
        } else {
            return false;
        }
        i = skipWsIdx(i);
        return i < n && s.charAt(i) == ':';
    }

    private boolean isStrayQuoteRun(int at, String followers) {
        int k = skipWsIdx(endOfQuoteRun(at));
        return k >= n || followers.indexOf(s.charAt(k)) >= 0;
    }

    private int endOfQuoteRun(int at) {
        int i = at;
        while (i < n && isQuote(s.charAt(i))) {
            i++;
        }
        return i;
    }

    private void skipWs() {
        while (pos < n) {
            char c = s.charAt(pos);
            if (c <= ' ') {
                pos++;
                continue;
            }
            if (c == '/' && pos + 1 < n) {
                char d = s.charAt(pos + 1);
                if (d == '/') {
                    int e = s.indexOf('\n', pos);
                    pos = e < 0 ? n : e + 1;
                    log.add("comentario-removido");
                    continue;
                }
                if (d == '*') {
                    int e = s.indexOf("*/", pos + 2);
                    pos = e < 0 ? n : e + 2;
                    log.add("comentario-removido");
                    continue;
                }
            }
            break;
        }
    }

    private int skipWsIdx(int i) {
        while (i < n && s.charAt(i) <= ' ') {
            i++;
        }
        return i;
    }

    /** Como skipWsIdx, mas também pula comentários // e /* *&#47; (sem registrar). */
    private int skipWsAndCommentsIdx(int i) {
        while (true) {
            i = skipWsIdx(i);
            if (i + 1 < n && s.charAt(i) == '/' && s.charAt(i + 1) == '/') {
                int e = s.indexOf('\n', i);
                i = e < 0 ? n : e + 1;
            } else if (i + 1 < n && s.charAt(i) == '/' && s.charAt(i + 1) == '*') {
                int e = s.indexOf("*/", i + 2);
                i = e < 0 ? n : e + 2;
            } else {
                return i;
            }
        }
    }

    static boolean isQuote(char c) {
        return c == '"' || c == '\'' || c == '\u201C' || c == '\u201D' || c == '\u201E'
                || c == '\u2018' || c == '\u2019' || c == '`' || c == '\u00B4';
    }

    private static boolean isDoubleFamily(char c) {
        return c == '"' || c == '\u201C' || c == '\u201D' || c == '\u201E';
    }

    static boolean sameFamily(char a, char b) {
        return isDoubleFamily(a) == isDoubleFamily(b);
    }

    private static boolean isKeyStart(char c) {
        return Character.isLetterOrDigit(c) || c == '_' || c == '$';
    }

    private static boolean isDigit(char c) {
        return c >= '0' && c <= '9';
    }

    // ------------------------------------------------------------------ escrita

    @SuppressWarnings("unchecked")
    static void write(Object v, StringBuilder out, boolean pretty, int level) {
        if (v instanceof Map) {
            Map<String, Object> map = (Map<String, Object>) v;
            if (map.isEmpty()) {
                out.append("{}");
                return;
            }
            out.append('{');
            boolean first = true;
            for (Map.Entry<String, Object> e : map.entrySet()) {
                if (!first) {
                    out.append(',');
                }
                first = false;
                newline(out, pretty, level + 1);
                quote(e.getKey(), out);
                out.append(pretty ? ": " : ":");
                write(e.getValue(), out, pretty, level + 1);
            }
            newline(out, pretty, level);
            out.append('}');
        } else if (v instanceof List) {
            List<Object> list = (List<Object>) v;
            if (list.isEmpty()) {
                out.append("[]");
                return;
            }
            out.append('[');
            boolean first = true;
            for (Object item : list) {
                if (!first) {
                    out.append(',');
                }
                first = false;
                newline(out, pretty, level + 1);
                write(item, out, pretty, level + 1);
            }
            newline(out, pretty, level);
            out.append(']');
        } else if (v instanceof String) {
            quote((String) v, out);
        } else if (v instanceof JsonNumber) {
            out.append(((JsonNumber) v).raw);
        } else if (v instanceof Boolean) {
            out.append(v.toString());
        } else {
            out.append("null");
        }
    }

    private static void newline(StringBuilder out, boolean pretty, int level) {
        if (!pretty) {
            return;
        }
        out.append('\n');
        for (int i = 0; i < level; i++) {
            out.append("  ");
        }
    }

    static void quote(String value, StringBuilder out) {
        out.append('"');
        for (int i = 0; i < value.length(); i++) {
            char c = value.charAt(i);
            switch (c) {
                case '"': out.append("\\\""); break;
                case '\\': out.append("\\\\"); break;
                case '\b': out.append("\\b"); break;
                case '\f': out.append("\\f"); break;
                case '\n': out.append("\\n"); break;
                case '\r': out.append("\\r"); break;
                case '\t': out.append("\\t"); break;
                default:
                    if (c < 0x20 || c == '\u2028' || c == '\u2029') {
                        out.append(String.format("\\u%04x", (int) c));
                    } else {
                        out.append(c);
                    }
            }
        }
        out.append('"');
    }
}
