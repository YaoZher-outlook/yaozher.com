package com.yaozher.v1.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.yaozher.v1.entity.BizChatMessage;
import com.yaozher.v1.entity.SysSkillBot;
import com.yaozher.v1.entity.SysUser;
import com.yaozher.v1.exception.BusinessException;
import com.yaozher.v1.exception.ErrorCode;
import com.yaozher.v1.mapper.BizChatMessageMapper;
import com.yaozher.v1.mapper.SysSkillBotMapper;
import com.yaozher.v1.mapper.SysUserMapper;
import com.yaozher.v1.security.SecurityUtils;
import com.yaozher.v1.service.ChatMessageService;
import com.yaozher.v1.vo.ChatContactVo;
import com.yaozher.v1.vo.ChatMessageVo;
import com.yaozher.v1.websocket.ChatInboundMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatMessageServiceImpl implements ChatMessageService {

    private final BizChatMessageMapper chatMessageMapper;
    private final SysUserMapper sysUserMapper;
    private final SysSkillBotMapper skillBotMapper;

    @Async
    @Override
    public void saveAsync(Long senderId, Long receiverId, ChatInboundMessage inbound) {
        try {
            BizChatMessage msg = BizChatMessage.builder()
                    .senderId(senderId)
                    .receiverId(receiverId)
                    .messageType(inbound.getType() == null ? null : inbound.getType().name())
                    .content(inbound.getContent())
                    .fileUrl(inbound.getFileUrl())
                    .build();
            chatMessageMapper.insert(msg);
        } catch (Exception e) {
            log.error("save chat message failed", e);
        }
    }

    @Override
    public List<ChatContactVo> listContacts() {
        SysUser current = getCurrentUser();
        if ("ADMIN".equalsIgnoreCase(current.getRole())) {
            return listAdminContacts(current.getId());
        }
        return listUserContacts();
    }

    @Override
    public List<ChatMessageVo> listHistory(String peerId) {
        SysUser current = getCurrentUser();
        Long peer = parsePeerId(peerId);
        assertCanChat(current, peer);

        List<BizChatMessage> rows = chatMessageMapper.selectList(new LambdaQueryWrapper<BizChatMessage>()
                .and(w -> w
                        .eq(BizChatMessage::getSenderId, current.getId())
                        .eq(BizChatMessage::getReceiverId, peer)
                        .or()
                        .eq(BizChatMessage::getSenderId, peer)
                        .eq(BizChatMessage::getReceiverId, current.getId())
                )
                .orderByAsc(BizChatMessage::getCreateTime)
                .last("limit 200"));
        return rows.stream().map(this::toVo).toList();
    }

    private List<ChatContactVo> listAdminContacts(Long adminId) {
        List<BizChatMessage> rows = chatMessageMapper.selectList(new LambdaQueryWrapper<BizChatMessage>()
                .eq(BizChatMessage::getReceiverId, adminId)
                .gt(BizChatMessage::getSenderId, 0)
                .orderByDesc(BizChatMessage::getCreateTime)
                .last("limit 500"));

        Set<Long> userIds = new LinkedHashSet<>();
        for (BizChatMessage row : rows) {
            if (!adminId.equals(row.getSenderId())) {
                userIds.add(row.getSenderId());
            }
        }

        List<ChatContactVo> contacts = new ArrayList<>();
        for (Long id : userIds) {
            SysUser user = sysUserMapper.selectById(id);
            if (user != null) {
                contacts.add(userContact(user, user.getUsername()));
            }
        }
        contacts.addAll(botContacts());
        return contacts;
    }

    private List<ChatContactVo> listUserContacts() {
        List<ChatContactVo> contacts = new ArrayList<>();
        SysUser admin = sysUserMapper.selectOne(new LambdaQueryWrapper<SysUser>()
                .eq(SysUser::getRole, "ADMIN")
                .orderByAsc(SysUser::getId)
                .last("limit 1"));
        if (admin != null) {
            contacts.add(userContact(admin, "站点管理员"));
        }
        contacts.addAll(botContacts());
        return contacts;
    }

    private List<ChatContactVo> botContacts() {
        List<SysSkillBot> bots = skillBotMapper.selectList(new LambdaQueryWrapper<SysSkillBot>()
                .orderByAsc(SysSkillBot::getId));
        List<ChatContactVo> contacts = new ArrayList<>();
        for (SysSkillBot bot : bots) {
            contacts.add(ChatContactVo.builder()
                    .id(String.valueOf(-bot.getId()))
                    .type("BOT")
                    .role("CHATBOT")
                    .name(bot.getBotName())
                    .avatar(null)
                    .description(bot.getDescription())
                    .build());
        }
        return contacts;
    }

    private ChatContactVo userContact(SysUser user, String description) {
        return ChatContactVo.builder()
                .id(String.valueOf(user.getId()))
                .type("USER")
                .role(user.getRole())
                .name(StringUtils.hasText(user.getNickname()) ? user.getNickname() : user.getUsername())
                .avatar(user.getAvatar())
                .description(description)
                .build();
    }

    private void assertCanChat(SysUser current, Long peer) {
        if (peer == null) {
            throw BusinessException.of(ErrorCode.PARAM_ERROR, "聊天对象不存在");
        }
        if (peer < 0) {
            SysSkillBot bot = skillBotMapper.selectById(Math.abs(peer));
            if (bot == null) {
                throw BusinessException.of(ErrorCode.PARAM_ERROR, "聊天机器人不存在");
            }
            return;
        }

        SysUser peerUser = sysUserMapper.selectById(peer);
        if (peerUser == null) {
            throw BusinessException.of(ErrorCode.PARAM_ERROR, "聊天对象不存在");
        }

        boolean admin = "ADMIN".equalsIgnoreCase(current.getRole());
        boolean peerAdmin = "ADMIN".equalsIgnoreCase(peerUser.getRole());
        if (!admin && !peerAdmin) {
            throw BusinessException.of(ErrorCode.FORBIDDEN, "普通用户只能联系 ADMIN 或 chatbot");
        }
    }

    private SysUser getCurrentUser() {
        String username = SecurityUtils.getCurrentUsername();
        if (!StringUtils.hasText(username)) {
            throw BusinessException.of(ErrorCode.UNAUTHORIZED, "Unauthorized");
        }
        SysUser user = sysUserMapper.selectOne(new LambdaQueryWrapper<SysUser>()
                .eq(SysUser::getUsername, username)
                .last("limit 1"));
        if (user == null) {
            throw BusinessException.of(ErrorCode.UNAUTHORIZED, "Unauthorized");
        }
        return user;
    }

    private Long parsePeerId(String peerId) {
        try {
            return Long.valueOf(peerId);
        } catch (Exception e) {
            throw BusinessException.of(ErrorCode.PARAM_ERROR, "聊天对象格式错误");
        }
    }

    private ChatMessageVo toVo(BizChatMessage msg) {
        return ChatMessageVo.builder()
                .id(msg.getId())
                .senderId(String.valueOf(msg.getSenderId()))
                .receiverId(String.valueOf(msg.getReceiverId()))
                .type(msg.getMessageType())
                .content(msg.getContent())
                .fileUrl(msg.getFileUrl())
                .createTime(msg.getCreateTime())
                .build();
    }
}
