package com.example.musicroom.feature.auth.data

import retrofit2.Response
import retrofit2.http.GET

interface AuthApiService {
    @GET("health")
    suspend fun checkServerHealth(): Response<HealthResponse>
}