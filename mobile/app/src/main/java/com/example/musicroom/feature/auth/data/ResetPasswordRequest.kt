package com.example.musicroom.feature.auth.data

import kotlinx.serialization.Serializable


@Serializable
data class ResetPasswordRequest(
    val tokenHash: String,
    val password: String
)
