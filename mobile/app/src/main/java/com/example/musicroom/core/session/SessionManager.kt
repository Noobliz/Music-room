package com.example.musicroom.core.session

import com.example.musicroom.core.storage.SessionStorage
import com.example.musicroom.feature.auth.data.AuthResponse
import com.example.musicroom.feature.auth.data.AuthUser
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class SessionManager(
    private val storage: SessionStorage
) {
    private val _currentUser: MutableStateFlow<AuthUser?> = MutableStateFlow(
        if (storage.read() != null) storage.readUser() else null
    )
    val currentUser: StateFlow<AuthUser?> = _currentUser.asStateFlow()

    fun accessToken(): String?
        = storage.read()?.accessToken


    fun refreshToken(): String?
        = storage.read()?.refreshToken


    fun onAuthenticated(response: AuthResponse) {
        storage.save(response.session)
        storage.saveUser(response.user)
        _currentUser.value = response.user
    }

    fun clear(){
        storage.clear()
        _currentUser.value = null
    }
}