package com.example.musicroom.core.network


import kotlinx.serialization.json.Json
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import java.util.concurrent.TimeUnit
import com.example.musicroom.BuildConfig
import com.example.musicroom.core.session.SessionManager
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

    private fun buildRetrofit(okHttpClient: OkHttpClient): Retrofit =
        Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build()
    val authApi: AuthApiService by lazy {
        buildRetrofit(client).create(AuthApiService::class.java)
    }


    fun authenticatedApi(sessionManager: SessionManager): AuthApiService{
        val authedClient: OkHttpClient = client.newBuilder()
            .addInterceptor(AuthInterceptor(sessionManager))
            .authenticator(TokenAuthenticator(sessionManager, authApi))
            .build()
        val retrofit = buildRetrofit(authedClient)
        return retrofit.create(AuthApiService::class.java)
    }
}