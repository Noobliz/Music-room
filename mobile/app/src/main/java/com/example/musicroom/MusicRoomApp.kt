package com.example.musicroom

import android.app.Application
import com.example.musicroom.core.network.ApiClient
import com.example.musicroom.core.session.SessionManager
import com.example.musicroom.core.storage.SessionStorage
import com.example.musicroom.feature.auth.data.AuthApiService
import com.example.musicroom.feature.auth.data.AuthRepository
import com.example.musicroom.feature.profile.data.ProfileApiService
import retrofit2.Retrofit

class MusicRoomApp: Application() {

    val sessionManager: SessionManager by lazy { SessionManager(SessionStorage(this))}

    val authedRetrofit: Retrofit by lazy {
        ApiClient.authenticatedRetrofit(sessionManager)
    }
    
    val authenticatedApi: AuthApiService by lazy {
        authedRetrofit.create(AuthApiService::class.java)
    }

    val profileApi: ProfileApiService by lazy {
        authedRetrofit.create(ProfileApiService::class.java)
    }
    val authRepository: AuthRepository by lazy {
        AuthRepository(ApiClient.authApi, authenticatedApi, ApiClient.json, sessionManager)
    }

}