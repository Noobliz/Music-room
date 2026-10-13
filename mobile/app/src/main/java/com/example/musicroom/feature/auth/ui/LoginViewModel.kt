package com.example.musicroom.feature.auth.ui

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.example.musicroom.MusicRoomApp
import com.example.musicroom.feature.auth.data.AuthRepository
import com.example.musicroom.feature.auth.data.AuthResult
import kotlinx.coroutines.launch
import androidx.lifecycle.ViewModelProvider.AndroidViewModelFactory.Companion.APPLICATION_KEY
import com.example.musicroom.feature.auth.data.AuthResponse


class LoginViewModel(
    private val repository: AuthRepository
) : ViewModel() {
    var state by mutableStateOf<AuthUiState>(AuthUiState.Idle)
        private set


    fun login(
        email: String,
        password: String
    ): Unit {
        if (state is AuthUiState.Loading) return

        state = AuthUiState.Loading
        viewModelScope.launch {
            val res: AuthResult<AuthResponse> = repository.login(email, password)
            state = when (res) {
                is AuthResult.Success -> AuthUiState.Success
                is AuthResult.Failure -> AuthUiState.Failure(res.error)
            }


        }
    }


    companion object {
        val Factory: ViewModelProvider.Factory = viewModelFactory {
            initializer {
                val app: MusicRoomApp = this[APPLICATION_KEY] as MusicRoomApp
                LoginViewModel(app.authRepository)
            }
        }
    }
}