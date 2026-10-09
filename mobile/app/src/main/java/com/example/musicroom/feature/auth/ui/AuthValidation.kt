package com.example.musicroom.feature.auth.ui

import android.util.Patterns
import com.example.musicroom.feature.auth.data.FieldError

private val USERNAME_REGEX: Regex = Regex("^[a-zA-Z0-9_.]{3,30}$")

fun validateSignup(email: String, password: String, username: String): List<FieldError> {
    val errors: MutableList<FieldError> = mutableListOf()
    if (email.length > 254 || !Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
        errors.add(FieldError("email", "Adresse e-mail invalide."))
    }
    if (password.length !in 6..72) {
        errors.add(FieldError("password", "Le mot de passe doit faire de 6 à 72 caractères."))
    }
    if (!USERNAME_REGEX.matches(username)) {
        errors.add(FieldError("username", "3 à 30 caractères : lettres, chiffres, _ ou ."))
    }
    return errors
}