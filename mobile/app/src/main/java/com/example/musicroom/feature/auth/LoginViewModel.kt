package com.example.musicroom.feature.auth

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel

class LoginViewModel: ViewModel() {
    var errorMessage by mutableStateOf<String?>(null)
        private set

    fun connectUser(
        email: String,
        password: String
    ): Unit
    {
        if (email == "test@test.com" && password == "azerty") {
            println("Connexion reussie")
            errorMessage = null
        } else {
            errorMessage = "Mauvais identifiants"

        }
    }
}
