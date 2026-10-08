package com.example.musicroom.feature.auth.data

fun ErrorBody.toAuthError(httpCode: Int): AuthError =
    when (code) {
        "EMAIL_TAKEN" -> AuthError.EmailTaken
        "USERNAME_TAKEN" -> AuthError.UsernameTaken
        "INVALID_CREDENTIALS" -> AuthError.InvalidCredentials
        "RATE_LIMITED" -> AuthError.RateLimited
        "VALIDATION_ERROR" -> AuthError.Validation(details?:emptyList())
        else -> AuthError.Unknown(httpCode)
    }
