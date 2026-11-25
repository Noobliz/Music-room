package com.example.musicroom.feature.profile.data

import kotlinx.serialization.Serializable

@Serializable
data class ProfileView(
    val id: String,
    val username: String,
    val avatarUrl: String?,
    // Champs réservés aux amis
    val bio: String? = null,
    val musicGenres: List<MusicGenre>? = null,
)
