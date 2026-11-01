package br.com.lincros.nifi.repair;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;

/** Ponto de entrada: detecta o formato, valida e corrige se necessário. */
public final class Repairer {

    public enum Status {
        /** Já era válido; conteúdo não foi alterado. */
        VALID,
        /** Era inválido e foi corrigido. */
        REPAIRED,
        /** Era válido, mas foi limpo (modo "sempre normalizar"). */
        NORMALIZED,
        /** Não foi possível corrigir; conteúdo original mantido. */
        FAILED
    }

    public static final class Outcome {
        public final Status status;
        public final RepairOptions.Format format;
        public final byte[] content;
        public final RepairLog log;
        public final String error;

        Outcome(Status status, RepairOptions.Format format, byte[] content, RepairLog log, String error) {
            this.status = status;
            this.format = format;
            this.content = content;
            this.log = log;
            this.error = error;
        }

        public String text() {
            return new String(content, StandardCharsets.UTF_8);
        }

        public List<String> actions() {
            return log.actions();
        }
    }

    private Repairer() {
    }

    public static Outcome process(byte[] input, RepairOptions opts) {
        RepairLog log = new RepairLog();
        RepairOptions.Format format = opts.format == RepairOptions.Format.AUTO ? detect(input) : opts.format;
        if (format == null) {
            return new Outcome(Status.FAILED, null, input, log,
                    "Formato não reconhecido: conteúdo não parece JSON nem XML");
        }
        try {
            return format == RepairOptions.Format.JSON ? processJson(input, opts, log) : processXml(input, opts, log);
        } catch (RepairException e) {
            return new Outcome(Status.FAILED, format, input, log, e.getMessage());
        } catch (RuntimeException e) {
            return new Outcome(Status.FAILED, format, input, log, "Erro inesperado: " + e);
        }
    }

    private static Outcome processJson(byte[] input, RepairOptions opts, RepairLog log) throws RepairException {
        String strict = TextCleaner.decodeStrictUtf8(input);
        boolean valid = strict != null && StrictJsonValidator.isValid(strict);
        if (valid && opts.mode == RepairOptions.Mode.REPAIR_INVALID_ONLY) {
            return new Outcome(Status.VALID, RepairOptions.Format.JSON, input, log, null);
        }
        String text = TextCleaner.decodeLenient(input, null, log);
        boolean fixMojibake = opts.fixMojibake || log.has("utf8-invalido-lido-como-cp1252");
        text = TextCleaner.clean(text, fixMojibake, log);
        String repaired = JsonRepairer.repair(text, opts, log);
        return finish(valid, strict, repaired, RepairOptions.Format.JSON, input, log);
    }

    private static Outcome processXml(byte[] input, RepairOptions opts, RepairLog log) throws RepairException {
        boolean valid = XmlRepairer.isWellFormed(input);
        if (valid && opts.mode == RepairOptions.Mode.REPAIR_INVALID_ONLY) {
            return new Outcome(Status.VALID, RepairOptions.Format.XML, input, log, null);
        }
        String text = TextCleaner.decodeLenient(input, XmlRepairer.declaredEncoding(input), log);
        boolean fixMojibake = opts.fixMojibake || log.has("utf8-invalido-lido-como-cp1252");
        text = TextCleaner.clean(text, fixMojibake, log);
        String repaired = XmlRepairer.repair(text, opts, log);
        return finish(valid, TextCleaner.decodeStrictUtf8(input), repaired, RepairOptions.Format.XML, input, log);
    }

    private static Outcome finish(boolean wasValid, String original, String repaired,
                                  RepairOptions.Format format, byte[] input, RepairLog log) {
        byte[] bytes = repaired.getBytes(StandardCharsets.UTF_8);
        if (wasValid) {
            if (repaired.equals(original) || Arrays.equals(bytes, input)) {
                return new Outcome(Status.VALID, format, input, log, null);
            }
            return new Outcome(Status.NORMALIZED, format, bytes, log, null);
        }
        return new Outcome(Status.REPAIRED, format, bytes, log, null);
    }

    /** Detecta JSON ou XML pelo primeiro caractere significativo. */
    static RepairOptions.Format detect(byte[] input) {
        int limit = Math.min(input.length, 64 * 1024);
        for (int i = 0; i < limit; i++) {
            int b = input[i] & 0xFF;
            if (b == '<') {
                return RepairOptions.Format.XML;
            }
            if (b == '{' || b == '[') {
                return RepairOptions.Format.JSON;
            }
        }
        return null;
    }
}
