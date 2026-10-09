package com.example.musicroom

import android.app.Application
import com.example.musicroom.core.network.ApiClient
import com.example.musicroom.core.storage.SessionStorage
import com.example.musicroom.feature.auth.data.AuthRepository

class MusicRoomApp: Application() {
    val authRepository: AuthRepository by lazy {
        AuthRepository(ApiClient.authApi, ApiClient.json, SessionStorage(this))
    }
}