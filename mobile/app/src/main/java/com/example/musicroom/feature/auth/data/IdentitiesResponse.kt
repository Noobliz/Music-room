package com.example.musicroom.feature.auth.data


import kotlinx.serialization.Serializable

@Serializable
data class IdentitiesResponse(
    val identities: List<Identity>,
)