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
import com.example.musicroom.feature.auth.data.AuthError
import com.example.musicroom.feature.auth.data.AuthResponse


class LoginViewModel(
    private val repository: AuthRepository
) : ViewModel() {
    var state: AuthUiState by mutableStateOf<AuthUiState>(AuthUiState.Idle)
        private set

    var notVerifiedEmail: String? by mutableStateOf(null)
        private set
    fun login(
        email: String,
        password: String
    ): Unit {
        if (state is AuthUiState.Loading) return
        val cleanEmail: String = email.trim()
        state = AuthUiState.Loading
        viewModelScope.launch {
            val res: AuthResult<AuthResponse> = repository.login(cleanEmail, password)
            state = when (res) {
                is AuthResult.Success -> AuthUiState.Success
                is AuthResult.Failure -> {
                    if (res.error is AuthError.EmailNotVerified){
                        notVerifiedEmail = cleanEmail
                    }
                    AuthUiState.Failure(res.error)
                }
            }


        }
    }
    fun  backToLogin() {
       notVerifiedEmail = null
        state = AuthUiState.Idle
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