package com.example.musicroom.feature.friends.data

import kotlinx.serialization.Serializable

// user = l'expéditeur pour une demande reçue,
// le destinataire pour une demande envoyée.
@Serializable
data class FriendRequest(
    val id: String,
    val user: FriendUser,
    val createdAt: String,
)
