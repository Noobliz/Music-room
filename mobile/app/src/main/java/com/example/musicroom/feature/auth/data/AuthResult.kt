package com.example.musicroom.feature.auth.data

sealed interface AuthResult {
    data class Success(val response: AuthResponse): AuthResult
    data class Failure(val error: AuthError): AuthResult
}