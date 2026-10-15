package com.example.musicroom.feature.auth.ui

import android.util.Patterns
import com.example.musicroom.feature.auth.data.AuthError
import com.example.musicroom.feature.auth.data.FieldError

private val USERNAME_REGEX: Regex = Regex("^[a-zA-Z0-9_.]{3,30}$")

fun validateSignup(email: String, password: String, username: String): List<FieldError> {
    val errors: MutableList<FieldError> = mutableListOf()
    if (email.length > 254 || !Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
        errors.add(FieldError("email", "Adresse e-mail invalide."))
    }
    validatePassword(password)?.let { error: FieldError -> errors.add(error) }
    if (!USERNAME_REGEX.matches(username)) {
        errors.add(FieldError("username", "3 à 30 caractères : lettres, chiffres, _ ou ."))
    }
    return errors
}

// Même règle que le back-end (passwordSchema) : partagée par le signup et le reset
fun validatePassword(password: String): FieldError? =
    if (password.length !in 6..72) {
        FieldError("password", "Le mot de passe doit faire de 6 à 72 caractères.")
    } else null

// Message d'erreur à afficher sous un champ, si l'état contient une erreur de validation pour lui
fun fieldError(state: AuthUiState, field: String): String? {
    val failure: AuthUiState.Failure = state as? AuthUiState.Failure ?: return null
    val validation: AuthError.Validation = failure.error as? AuthError.Validation ?: return null
    return validation.fields.firstOrNull { it.field == field }?.message
}
