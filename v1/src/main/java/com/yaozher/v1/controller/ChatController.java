package com.yaozher.v1.controller;

import com.yaozher.v1.common.Result;
import com.yaozher.v1.service.ChatMessageService;
import com.yaozher.v1.vo.ChatContactVo;
import com.yaozher.v1.vo.ChatMessageVo;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatMessageService chatMessageService;

    @GetMapping("/contacts")
    public Result<List<ChatContactVo>> contacts() {
        return Result.ok(chatMessageService.listContacts());
    }

    @GetMapping("/history")
    public Result<List<ChatMessageVo>> history(@RequestParam String peerId) {
        return Result.ok(chatMessageService.listHistory(peerId));
    }

    @PostMapping("/clear-view")
    public Result<Void> clearView(@RequestParam String peerId) {
        chatMessageService.clearView(peerId);
        return Result.ok();
    }

    @DeleteMapping("/history")
    public Result<Void> deleteHistory(@RequestParam String peerId) {
        chatMessageService.deleteHistory(peerId);
        return Result.ok();
    }
}
