package br.com.lincros.nifi.repair;

/** Lançada quando o documento não pode ser corrigido com segurança. */
public class RepairException extends Exception {

    private static final long serialVersionUID = 1L;

    public RepairException(String message) {
        super(message);
    }

    public RepairException(String message, Throwable cause) {
        super(message, cause);
    }
}
