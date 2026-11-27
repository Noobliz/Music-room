package com.example.musicroom.feature.friends.data

import kotlinx.serialization.Serializable

// Corps de POST /friends/requests.
@Serializable
data class SendFriendRequest(
    val userId: String,
)
