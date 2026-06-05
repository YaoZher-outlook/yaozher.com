package com.yaozher.v1.exception;

import lombok.Getter;

@Getter
public class BusinessException extends RuntimeException {

    private final Integer code;

    public BusinessException(Integer code, String message) {
        super(message);
        this.code = code;
    }

    public static BusinessException of(Integer code, String message) {
        return new BusinessException(code, message);
    }
}
