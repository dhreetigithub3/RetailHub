package com.retailhub.platform.exception;

public class InsufficientAccessException extends RuntimeException {
    public InsufficientAccessException(String message) {
        super(message);
    }

    public InsufficientAccessException(String message, Throwable cause) {
        super(message, cause);
    }
}
