package com.example.musicroom.feature.profile.ui

import com.example.musicroom.feature.profile.data.MusicGenre

// `when` exhaustif sur l'enum
fun genreLabel(genre: MusicGenre): String =
    when (genre) {
        MusicGenre.POP -> "Pop"
        MusicGenre.ROCK -> "Rock"
        MusicGenre.HIP_HOP -> "Hip-hop"
        MusicGenre.RNB -> "R&B"
        MusicGenre.ELECTRONIC -> "Électro"
        MusicGenre.JAZZ -> "Jazz"
        MusicGenre.CLASSICAL -> "Classique"
        MusicGenre.METAL -> "Metal"
        MusicGenre.FOLK -> "Folk"
        MusicGenre.REGGAE -> "Reggae"
        MusicGenre.BLUES -> "Blues"
        MusicGenre.COUNTRY -> "Country"
        MusicGenre.SOUL -> "Soul"
        MusicGenre.LATIN -> "Latino"
        MusicGenre.WORLD -> "Musiques du monde"
    }
