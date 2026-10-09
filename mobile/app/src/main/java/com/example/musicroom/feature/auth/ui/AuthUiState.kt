package com.example.musicroom.feature.auth.ui

import com.example.musicroom.feature.auth.data.AuthError

sealed interface AuthUiState {
    data object Idle: AuthUiState

    data object Loading: AuthUiState

    data class Failure(val error: AuthError): AuthUiState

    data object Success: AuthUiState

}