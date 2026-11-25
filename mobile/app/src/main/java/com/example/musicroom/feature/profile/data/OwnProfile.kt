package com.example.musicroom.feature.profile.data

import kotlinx.serialization.Serializable

@Serializable
data class OwnProfile(
    val id: String,
    val email: String,
    val username: String,
    val avatarUrl: String?,
    val bio: String?,
    val musicGenres: List<MusicGenre>,
    val fullName: String?,
    val birthDate: String?, // "YYYY-MM-DD"
    val createdAt: String,
    val updatedAt: String,
)
