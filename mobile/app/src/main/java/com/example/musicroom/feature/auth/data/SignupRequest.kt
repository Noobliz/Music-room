package com.example.musicroom.feature.auth.data

import kotlinx.serialization.Serializable

@Serializable
data class SignupRequest(
    val email: String,
    val password: String,
    val username: String,
)