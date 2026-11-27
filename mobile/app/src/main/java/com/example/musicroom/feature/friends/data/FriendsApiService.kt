package com.example.musicroom.feature.friends.data

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query


interface FriendsApiService{
    @GET("friends/search")
    suspend fun searchUsers(@Query("q") query: String): Response<List<UserSearchResult>>

    @GET("friends")
    suspend fun getFriends(): Response<List<Friend>>

    @DELETE("friends/{userId}")
    suspend fun deleteFriendship(@Path("userId") userId: String): Response<Unit>

    @GET("friends/requests")
    suspend fun getFriendsRequests(): Response<FriendRequests>

    @POST("friends/requests")
    suspend fun sendFriendsRequest(@Body body: SendFriendRequest): Response<FriendRequest>

    @POST("friends/requests/{id}/accept")
    suspend fun acceptFriendshipRequest(@Path("id") id: String): Response<Friend>

    @DELETE("friends/requests/{id}")
    suspend fun deleteFriendshipRequest(@Path("id") id: String): Response<Unit>



}