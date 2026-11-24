package com.example.musicroom.feature.profile.data

import kotlinx.serialization.Serializable
// id, email, username, avatarUrl, bio, createdAt, updatedAt.
@Serializable
data class OwnProfile(
    val id: String,
    val email: String,
    val username: String,
    val avatarUrl: String?,
    val bio: String?,
    val createdAt: String,
    val updatedAt: String,

)