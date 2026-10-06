package com.example.musicroom.core.network


import kotlinx.serialization.json.Json
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import java.util.concurrent.TimeUnit
import com.example.musicroom.BuildConfig
import com.example.musicroom.feature.auth.data.AuthApiService
import okhttp3.MediaType.Companion.toMediaType
import retrofit2.converter.kotlinx.serialization.asConverterFactory


object ApiClient {
    val json: Json = Json

    val client: OkHttpClient by lazy {
        OkHttpClient.Builder()
            .connectTimeout(10, TimeUnit.SECONDS)
            .readTimeout(10, TimeUnit.SECONDS)
            .build()
    }

    private val retrofit: Retrofit by lazy {
        Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL)
            .client(client)
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build()
    }
    val authApi: AuthApiService by lazy{
        retrofit.create(AuthApiService::class.java)
    }


}