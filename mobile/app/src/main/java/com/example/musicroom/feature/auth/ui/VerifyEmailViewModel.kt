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
import com.example.musicroom.feature.auth.data.AuthRepository
import com.example.musicroom.feature.auth.data.AuthResult
import kotlinx.coroutines.launch

class VerifyEmailViewModel(
    private val repository: AuthRepository
): ViewModel() {
    var state: AuthUiState by mutableStateOf<AuthUiState>(AuthUiState.Idle)
        private set

    fun resendEmail(email: String) {
        if (state is AuthUiState.Loading) return


        state = AuthUiState.Loading
        viewModelScope.launch {
            state = when (val res: AuthResult<Unit> = repository.resendEmail(email)) {
                is AuthResult.Success -> AuthUiState.Success
                is AuthResult.Failure -> AuthUiState.Failure(res.error)
            }
        }
    }

    fun reset() {
        state = AuthUiState.Idle
    }
    companion object {
        val Factory: ViewModelProvider.Factory = viewModelFactory {
            initializer {
                val app: MusicRoomApp = this[APPLICATION_KEY] as MusicRoomApp
                VerifyEmailViewModel(app.authRepository)
            }
        }
    }
}