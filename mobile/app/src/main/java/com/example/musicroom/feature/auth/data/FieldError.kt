package com.example.musicroom.feature.auth.data

import kotlinx.serialization.Serializable


@Serializable
data class FieldError(
    val field: String,
    val message: String,
)
