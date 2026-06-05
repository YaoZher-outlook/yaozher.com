package com.yaozher.v1.exception;

public interface ErrorCode {

    int OK = 0;

    int PARAM_ERROR = 40000;

    int UNAUTHORIZED = 40100;

    int FORBIDDEN = 40300;

    int BIZ_ERROR = 40001;

    int SYSTEM_ERROR = 50000;
}
