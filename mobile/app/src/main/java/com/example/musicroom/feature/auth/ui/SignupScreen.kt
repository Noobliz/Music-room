package com.example.musicroom.feature.auth.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.example.musicroom.feature.auth.data.AuthError
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.ui.text.input.PasswordVisualTransformation


@Composable
fun SignupScreen(
    state: AuthUiState,
    onSignupClick: (String, String, String) -> Unit,
    onGoToLoginClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    var email: String by remember { mutableStateOf("") }
    var username: String by remember { mutableStateOf("") }
    var password: String by remember { mutableStateOf("") }

    Column(
        modifier = modifier.fillMaxSize().padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(text = "Inscription")
        Spacer(modifier = Modifier.height(32.dp))

        OutlinedTextField(
            value = email,
            onValueChange = { email = it },
            label = { Text("Email") },
            isError = fieldError(state, "email") != null,
            supportingText = { fieldError(state, "email")?.let { Text(it) } },
            modifier = Modifier.fillMaxWidth(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email)
        )
        Spacer(modifier = Modifier.height(16.dp))
        OutlinedTextField(
            value = username,
            onValueChange = { username = it },
            label = { Text("Nom d'utilisateur") },
            isError = fieldError(state, "username") != null,
            supportingText = { fieldError(state, "username")?.let { Text(it) } },
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(modifier = Modifier.height(16.dp))
        OutlinedTextField(
            value = password,
            onValueChange = { password = it },
            label = { Text("Mot de passe") },
            isError = fieldError(state, "password") != null,
            supportingText = { fieldError(state, "password")?.let { Text(it) } },
            visualTransformation = PasswordVisualTransformation(),
            modifier = Modifier.fillMaxWidth(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password)
        )
        Spacer(modifier = Modifier.height(24.dp))

        when (state) {
            AuthUiState.Loading -> CircularProgressIndicator()
            is AuthUiState.Failure -> {
                if (state.error !is AuthError.Validation) {
                    Text(text = state.error.toMessage(), color = MaterialTheme.colorScheme.error)
                }
            }
            AuthUiState.Idle -> {}
            AuthUiState.Success -> {}
        }
        Button(
            onClick = { onSignupClick(email, password, username) },
            enabled = state !is AuthUiState.Loading
        ) {
            Text("Créer mon compte")
        }
        TextButton(onClick = onGoToLoginClick) {
            Text("Déjà un compte ? Se connecter")
        }
    }
}

private fun fieldError(state: AuthUiState, field: String): String? {
    val failure: AuthUiState.Failure = state as? AuthUiState.Failure ?: return null
    val validation: AuthError.Validation = failure.error as? AuthError.Validation ?: return null
    return validation.fields.firstOrNull { it.field == field }?.message
}