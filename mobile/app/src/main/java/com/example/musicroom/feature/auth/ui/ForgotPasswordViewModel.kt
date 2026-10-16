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

class ForgotPasswordViewModel(
    private val repository: AuthRepository

): ViewModel() {
    var state: AuthUiState by mutableStateOf<AuthUiState>(AuthUiState.Idle)
        private set
    var email: String by mutableStateOf<String>("")
        private set

    fun onEmailChange(newEmail: String){
        email = newEmail
    }

    fun sendResetEmail(){
        if (state is AuthUiState.Loading) return
        state = AuthUiState.Loading
        viewModelScope.launch {
            val emailTrimmed = email.trim()
            state = when (val res: AuthResult<Unit> = repository.forgotPassword(emailTrimmed)){
                is AuthResult.Success -> AuthUiState.Success
                is AuthResult.Failure -> AuthUiState.Failure(res.error)
            }
        }
    }

    fun reset() {
        state = AuthUiState.Idle
        email = ""
    }





    companion object {
        val Factory: ViewModelProvider.Factory = viewModelFactory {
            initializer {
                val app: MusicRoomApp = this[APPLICATION_KEY] as MusicRoomApp
                ForgotPasswordViewModel(app.authRepository)
            }
        }
    }

}