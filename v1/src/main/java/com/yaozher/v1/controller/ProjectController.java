package com.yaozher.v1.controller;

import com.yaozher.v1.common.Result;
import com.yaozher.v1.dto.ProjectDto;
import com.yaozher.v1.service.ProjectService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/project")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;

    @GetMapping("/list")
    public Result<List<ProjectDto>> list() {
        return Result.ok(projectService.list());
    }
}
