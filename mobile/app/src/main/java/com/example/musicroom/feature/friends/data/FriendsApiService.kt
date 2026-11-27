package com.example.musicroom.feature.friends.data

import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Query

interface FriendsApiService{
    @GET("friends/search")
    suspend fun searchUsers(@Query("q") query: String): Response<List<UserSearchResult>>
}