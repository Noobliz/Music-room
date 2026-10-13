package com.example.musicroom.feature.auth.ui

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.ViewModelProvider.AndroidViewModelFactory.Companion.APPLICATION_KEY
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.example.musicroom.MusicRoomApp
import com.example.musicroom.feature.auth.data.AuthError
import com.example.musicroom.feature.auth.data.AuthRepository
import com.example.musicroom.feature.auth.data.AuthResult
import com.example.musicroom.feature.auth.data.FieldError
import kotlinx.coroutines.launch
class SignupViewModel(
    private val repository: AuthRepository
) : ViewModel() {
    var state: AuthUiState by mutableStateOf<AuthUiState>(AuthUiState.Idle)
        private set

    fun signup(email: String, password: String, username: String) {
        if (state is AuthUiState.Loading) return

        val cleanEmail: String = email.trim()
        val cleanUsername: String = username.trim()

        val errors: List<FieldError> = validateSignup(cleanEmail, password, cleanUsername)
        if (errors.isNotEmpty()) {
            state = AuthUiState.Failure(AuthError.Validation(errors))
            return
        }

        state = AuthUiState.Loading
        viewModelScope.launch {
            state = when (val res: AuthResult = repository.signup(cleanEmail, password, cleanUsername)) {
                is AuthResult.Success -> AuthUiState.Success
                is AuthResult.Failure -> AuthUiState.Failure(res.error)
            }
        }
    }

    companion object {
        val Factory: ViewModelProvider.Factory = viewModelFactory {
            initializer {
                val app: MusicRoomApp = this[APPLICATION_KEY] as MusicRoomApp
                SignupViewModel(app.authRepository)
            }
        }
    }
}