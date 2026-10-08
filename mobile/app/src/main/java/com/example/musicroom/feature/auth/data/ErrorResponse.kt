package com.example.musicroom.feature.auth.data

import kotlinx.serialization.Serializable

@Serializable
data class ErrorResponse(
    val error: ErrorBody,
)
