package com.example.musicroom.feature.friends.data

import kotlinx.serialization.Serializable


@Serializable
data class UserSearchResult (
    val id: String,
    val username: String,
    val avatarUrl: String?,
    val relationship: Relationship,
    val requestId: String?,
    )