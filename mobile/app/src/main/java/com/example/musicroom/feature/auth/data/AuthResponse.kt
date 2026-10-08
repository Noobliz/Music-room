package com.example.musicroom.feature.auth.data

import kotlinx.serialization.Serializable

@Serializable
data class AuthResponse(
    val user: AuthUser,
    val session: Session,
)
