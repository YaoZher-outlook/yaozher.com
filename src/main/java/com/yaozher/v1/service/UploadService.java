package com.yaozher.v1.service;

import org.springframework.web.multipart.MultipartFile;

public interface UploadService {

    String upload(MultipartFile file);
}
