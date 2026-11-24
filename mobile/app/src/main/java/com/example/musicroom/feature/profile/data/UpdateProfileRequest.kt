package com.example.musicroom.feature.profile.data

import kotlinx.serialization.Serializable

@Serializable
data class UpdateProfileRequest(
    val username: String? = null,
    val bio: String? = null,
)