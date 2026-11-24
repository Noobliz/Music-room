package com.example.musicroom.feature.auth.data

import kotlinx.serialization.Serializable

@Serializable
data class Identity(
    val id: String,
    val provider: String,
    val email: String?,
    val createdAt: String?,
)
