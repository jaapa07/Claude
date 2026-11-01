package br.com.lincros.nifi.repair;

/** Validador JSON estrito (RFC 8259), sem dependências externas. */
public final class StrictJsonValidator {

    private final String s;
    private int pos;

    private StrictJsonValidator(String s) {
        this.s = s;
    }

    public static boolean isValid(String text) {
        if (text == null) {
            return false;
        }
        StrictJsonValidator v = new StrictJsonValidator(text);
        try {
            v.ws();
            v.value(0);
            v.ws();
            return v.pos == text.length();
        } catch (IllegalStateException e) {
            return false;
        }
    }

    private void fail() {
        throw new IllegalStateException("invalid at " + pos);
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
            fail();
        }
        return s.charAt(pos);
    }

    private void value(int depth) {
        if (depth > 1000) {
            fail();
        }
        char c = peek();
        if (c == '{') {
            object(depth);
        } else if (c == '[') {
            array(depth);
        } else if (c == '"') {
            string();
        } else if (c == '-' || (c >= '0' && c <= '9')) {
            number();
        } else if (s.startsWith("true", pos)) {
            pos += 4;
        } else if (s.startsWith("false", pos)) {
            pos += 5;
        } else if (s.startsWith("null", pos)) {
            pos += 4;
        } else {
            fail();
        }
    }

    private void object(int depth) {
        pos++;
        ws();
        if (peek() == '}') {
            pos++;
            return;
        }
        while (true) {
            ws();
            if (peek() != '"') {
                fail();
            }
            string();
            ws();
            if (peek() != ':') {
                fail();
            }
            pos++;
            ws();
            value(depth + 1);
            ws();
            char c = peek();
            pos++;
            if (c == '}') {
                return;
            }
            if (c != ',') {
                fail();
            }
        }
    }

    private void array(int depth) {
        pos++;
        ws();
        if (peek() == ']') {
            pos++;
            return;
        }
        while (true) {
            ws();
            value(depth + 1);
            ws();
            char c = peek();
            pos++;
            if (c == ']') {
                return;
            }
            if (c != ',') {
                fail();
            }
        }
    }

    private void string() {
        pos++;
        while (true) {
            char c = peek();
            pos++;
            if (c == '"') {
                return;
            }
            if (c < 0x20) {
                fail();
            }
            if (c == '\\') {
                char e = peek();
                pos++;
                if (e == 'u') {
                    for (int i = 0; i < 4; i++) {
                        if (Character.digit(peek(), 16) < 0) {
                            fail();
                        }
                        pos++;
                    }
                } else if ("\"\\/bfnrt".indexOf(e) < 0) {
                    fail();
                }
            }
        }
    }

    private void number() {
        if (peek() == '-') {
            pos++;
        }
        char c = peek();
        if (c == '0') {
            pos++;
        } else if (c >= '1' && c <= '9') {
            digits();
        } else {
            fail();
        }
        if (pos < s.length() && s.charAt(pos) == '.') {
            pos++;
            if (!isDigit(peek())) {
                fail();
            }
            digits();
        }
        if (pos < s.length() && (s.charAt(pos) == 'e' || s.charAt(pos) == 'E')) {
            pos++;
            if (peek() == '+' || peek() == '-') {
                pos++;
            }
            if (!isDigit(peek())) {
                fail();
            }
            digits();
        }
    }

    private void digits() {
        while (pos < s.length() && isDigit(s.charAt(pos))) {
            pos++;
        }
    }

    private static boolean isDigit(char c) {
        return c >= '0' && c <= '9';
    }
}
