package com.example.musicroom.feature.auth.data

import kotlinx.serialization.Serializable

@Serializable
data class IdTokenRequest(
    val idToken: String,
    val nonce: String,
)
