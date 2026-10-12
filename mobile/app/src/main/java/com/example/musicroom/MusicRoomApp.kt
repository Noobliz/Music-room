package com.example.musicroom

import android.app.Application
import com.example.musicroom.core.network.ApiClient
import com.example.musicroom.core.session.SessionManager
import com.example.musicroom.core.storage.SessionStorage
import com.example.musicroom.feature.auth.data.AuthApiService
import com.example.musicroom.feature.auth.data.AuthRepository

class MusicRoomApp: Application() {

    val sessionManager: SessionManager by lazy { SessionManager(SessionStorage(this))}

    val authenticatedApi: AuthApiService by lazy {
        ApiClient.authenticatedApi(sessionManager)
    }

    val authRepository: AuthRepository by lazy {
        AuthRepository(ApiClient.authApi, authenticatedApi, ApiClient.json, sessionManager)
    }

}