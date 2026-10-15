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

class ResetPasswordViewModel(
    private val repository: AuthRepository
) : ViewModel() {
    var state: AuthUiState by mutableStateOf<AuthUiState>(AuthUiState.Idle)
        private set

    var password: String by mutableStateOf<String>("")
        private set

    var confirmPassword: String by mutableStateOf<String>("")
        private set

    fun onPasswordChange(newPassword: String) {
        password = newPassword
    }

    fun onConfirmPasswordChange(newConfirmPassword: String) {
        confirmPassword = newConfirmPassword
    }

    fun submit(tokenHash: String) {
        if (state is AuthUiState.Loading) return


        val errors: MutableList<FieldError> = mutableListOf()
        validatePassword(password)?.let { error: FieldError -> errors.add(error) }
        if (password != confirmPassword) {
            errors.add(FieldError("confirmPassword", "Les mots de passe ne correspondent pas."))
        }
        if (errors.isNotEmpty()) {
            state = AuthUiState.Failure(AuthError.Validation(errors))
            return
        }

        state = AuthUiState.Loading
        viewModelScope.launch {
            state = when (val res: AuthResult<Unit> = repository.resetPassword(tokenHash, password)) {
                is AuthResult.Success -> AuthUiState.Success
                is AuthResult.Failure -> AuthUiState.Failure(res.error)
            }
        }
    }

    fun reset() {
        state = AuthUiState.Idle
        password = ""
        confirmPassword = ""
    }

    companion object {
        val Factory: ViewModelProvider.Factory = viewModelFactory {
            initializer {
                val app: MusicRoomApp = this[APPLICATION_KEY] as MusicRoomApp
                ResetPasswordViewModel(app.authRepository)
            }
        }
    }
}
