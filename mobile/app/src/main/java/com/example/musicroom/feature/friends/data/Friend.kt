package com.example.musicroom.feature.friends.data

import kotlinx.serialization.Serializable

// Ami accepté. friendsSince : date ISO 8601, formatée à l'affichage.
@Serializable
data class Friend(
    val user: FriendUser,
    val friendsSince: String,
)
