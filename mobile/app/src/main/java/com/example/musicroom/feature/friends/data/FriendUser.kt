package com.example.musicroom.feature.friends.data

import kotlinx.serialization.Serializable

// Champs publics de l'autre personne
// Reutilisée dans Friend et FriendRequest
@Serializable
data class FriendUser(
    val id: String,
    val username: String,
    val avatarUrl: String?,
)
