package com.example.musicroom.feature.friends.data

import com.example.musicroom.core.network.safeApiCall
import com.example.musicroom.feature.auth.data.AuthResult
import kotlinx.serialization.json.Json

class FriendsRepository(
    private val api: FriendsApiService,
    private val json: Json,
) {

    suspend fun searchUsers(query: String): AuthResult<List<UserSearchResult>> =
        safeApiCall(json) { api.searchUsers(query) }

    suspend fun getFriends(): AuthResult<List<Friend>> =
        safeApiCall(json) { api.getFriends() }

    suspend fun removeFriend(userId: String): AuthResult<Unit> =
        safeApiCall(json, emptyBody = Unit) { api.deleteFriendship(userId) }

    suspend fun getFriendRequests(): AuthResult<FriendRequests> =
        safeApiCall(json) { api.getFriendsRequests() }

    suspend fun sendFriendRequest(userId: String): AuthResult<FriendRequest> =
        safeApiCall(json) { api.sendFriendsRequest(SendFriendRequest(userId = userId)) }

    suspend fun acceptFriendRequest(requestId: String): AuthResult<Friend> =
        safeApiCall(json) { api.acceptFriendshipRequest(requestId) }

    suspend fun deleteFriendRequest(requestId: String): AuthResult<Unit> =
        safeApiCall(json, emptyBody = Unit) { api.deleteFriendshipRequest(requestId) }
}
