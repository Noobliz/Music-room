package com.example.musicroom.feature.profile.data

import okhttp3.RequestBody
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.PUT
import retrofit2.http.Path


interface ProfileApiService {

    @GET("profiles/me")
    suspend fun getMyProfile(): Response<OwnProfile>


    @PATCH("profiles/me")
    suspend fun updateMyProfile(@Body request: UpdateProfileRequest): Response<OwnProfile>

    @PUT("profiles/me/avatar")
    suspend fun uploadMyAvatar(@Body avatar: RequestBody): Response<OwnProfile>

    @DELETE("profiles/me/avatar")
    suspend fun deleteMyAvatar(): Response<Unit>

    @GET("profiles/{userId}")
    suspend fun getProfile(@Path("userId") userId: String): Response<ProfileView>

}