package com.example.musicroom.feature.friends.data

import kotlinx.serialization.Serializable

// Réponse de GET /friends/requests.
@Serializable
data class FriendRequests(
    val received: List<FriendRequest>,
    val sent: List<FriendRequest>,
)
