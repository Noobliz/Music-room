package com.example.musicroom.feature.profile.data

import kotlinx.serialization.Serializable

@Serializable
data class ProfileView(
    val id: String,
    val username: String,
    val avatarUrl: String?,
    val bio: String? = null,
)