package com.yaozher.v1.service.impl;

import com.yaozher.v1.exception.BusinessException;
import com.yaozher.v1.exception.ErrorCode;
import com.yaozher.v1.service.VerificationCodePurpose;
import com.yaozher.v1.service.VerificationMailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.core.env.Environment;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Slf4j
@Service
@RequiredArgsConstructor
public class SmtpVerificationMailService implements VerificationMailService {

    private final ObjectProvider<JavaMailSender> mailSenderProvider;
    private final Environment environment;

    @Override
    public void sendCode(String email, String code, VerificationCodePurpose purpose) {
        String host = environment.getProperty("spring.mail.host");
        JavaMailSender sender = mailSenderProvider.getIfAvailable();
        if (sender == null || !StringUtils.hasText(host)) {
            throw BusinessException.of(ErrorCode.BIZ_ERROR, "邮件服务尚未配置，请联系管理员");
        }

        SimpleMailMessage message = new SimpleMailMessage();
        String from = environment.getProperty("spring.mail.username");
        if (StringUtils.hasText(from)) {
            message.setFrom(from);
        }
        message.setTo(email);
        message.setSubject(subject(purpose));
        message.setText("""
                您的验证码是：%s

                验证码 10 分钟内有效，请勿转发给他人。
                如果不是您本人发起的操作，请忽略这封邮件。
                """.formatted(code));
        try {
            sender.send(message);
        } catch (MailException e) {
            log.error("Failed to send {} verification email", purpose, e);
            throw BusinessException.of(ErrorCode.BIZ_ERROR, "验证码发送失败，请稍后重试");
        }
    }

    private String subject(VerificationCodePurpose purpose) {
        return switch (purpose) {
            case REGISTER -> "yaozher.com 注册验证码";
            case LOGIN -> "yaozher.com 登录验证码";
            case CHANGE_EMAIL -> "yaozher.com 更换绑定邮箱验证码";
        };
    }
}
