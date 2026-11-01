package br.com.lincros.nifi.repair;

/** Opções de correção, preenchidas a partir das propriedades do processor. */
public final class RepairOptions {

    public enum Format { AUTO, JSON, XML }

    public enum Mode {
        /** Documentos já válidos passam intactos; só os quebrados são corrigidos. */
        REPAIR_INVALID_ONLY,
        /** Todo documento passa pela limpeza (encoding, espaços etc.), mesmo se já for válido. */
        ALWAYS_NORMALIZE
    }

    public Format format = Format.AUTO;
    public Mode mode = Mode.REPAIR_INVALID_ONLY;
    /** Remove espaços no início/fim de chaves, valores e atributos. */
    public boolean trimWhitespace = true;
    /** Corrige texto com encoding quebrado, como "SÃ£o Paulo" -> "São Paulo". */
    public boolean fixMojibake = true;
    /** Saída JSON indentada (true) ou compacta (false). */
    public boolean prettyJson = false;
    /** Nome do elemento usado para agrupar XML com mais de uma raiz. */
    public String xmlWrapperElement = "root";
}
