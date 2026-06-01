package com.yaozher.v1.service;

import com.yaozher.v1.vo.MusicPlaylistVo;

import java.util.List;

public interface MusicService {

    List<MusicPlaylistVo> listPlaylists();

    String findOnlineCover(String artist, String title);
}
