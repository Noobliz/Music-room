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

}
