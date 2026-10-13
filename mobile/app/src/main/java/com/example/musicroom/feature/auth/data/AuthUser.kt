package com.example.musicroom.feature.auth.data

import kotlinx.serialization.Serializable

@Serializable
data class AuthUser(
    val id: String,
    val email: String,
    val username: String,
)
