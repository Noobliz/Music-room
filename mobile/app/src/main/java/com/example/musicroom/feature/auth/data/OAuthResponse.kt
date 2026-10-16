package com.example.musicroom.feature.auth.data

import kotlinx.serialization.Serializable

@Serializable
data class OAuthResponse(
    val user: AuthUser,
    val session: Session,
    val isNewUser: Boolean,
) {
    fun toAuthResponse(): AuthResponse = AuthResponse(user, session)
}