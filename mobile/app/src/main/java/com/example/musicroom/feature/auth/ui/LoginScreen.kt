package com.example.musicroom.feature.auth.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp

@Composable
fun LoginScreen(
    state: AuthUiState,
    onLoginClick: (String, String) -> Unit,
    onGoToSignupClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    var email: String by remember { mutableStateOf("") }
    var password: String by remember { mutableStateOf("") }

    Column(
        modifier = modifier.fillMaxSize().padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = "Connexion"
        )
        Spacer(
            modifier = Modifier.height(32.dp)
        )
        OutlinedTextField(
            value = email,
            onValueChange = { email = it },
            label = { Text("Email") },
            modifier = Modifier.fillMaxWidth(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email)
        )
        Spacer(
            modifier = Modifier.height(16.dp)
        )
        OutlinedTextField(
            value = password,
            onValueChange = { password = it },
            label = { Text("Mot de passe") },
            visualTransformation = PasswordVisualTransformation(),
            modifier = Modifier.fillMaxWidth(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password)
        )
        Spacer(
            modifier = Modifier.height(24.dp)
        )
        when (state) {
            AuthUiState.Idle -> {}
            AuthUiState.Loading -> CircularProgressIndicator()
            is AuthUiState.Failure -> Text(
                text = state.error.toMessage(),
                color = MaterialTheme.colorScheme.error
            )
            AuthUiState.Success -> {}
        }
        Button(
            onClick = { onLoginClick(email, password) },
            enabled = state !is AuthUiState.Loading
        ) {
            Text("Se connecter")
        }
        TextButton(onClick = onGoToSignupClick) {
            Text("Pas de compte ? S'inscrire")
        }
    }
}
