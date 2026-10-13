package com.example.musicroom.feature.auth.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.example.musicroom.core.ui.AppTextField
import com.example.musicroom.core.ui.ErrorBanner
import com.example.musicroom.core.ui.PrimaryButton
import com.example.musicroom.feature.auth.data.AuthError

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
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text(
            text = "Music Room",
            style = MaterialTheme.typography.displaySmall,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.primary,
        )
        Text(
            text = "Crée ton compte pour commencer",
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(modifier = Modifier.height(32.dp))

        Card(
            shape = MaterialTheme.shapes.large,
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            elevation = CardDefaults.cardElevation(defaultElevation = 6.dp),
            modifier = Modifier.fillMaxWidth(),
        ) {
            Column(
                modifier = Modifier.padding(24.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                Text(
                    text = "Inscription",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.SemiBold,
                )
                AppTextField(
                    value = email,
                    onValueChange = { email = it },
                    label = "E-mail",
                    keyboardType = KeyboardType.Email,
                    errorMessage = fieldError(state, "email"),
                )
                AppTextField(
                    value = username,
                    onValueChange = { username = it },
                    label = "Nom d'utilisateur",
                    errorMessage = fieldError(state, "username"),
                )
                AppTextField(
                    value = password,
                    onValueChange = { password = it },
                    label = "Mot de passe",
                    keyboardType = KeyboardType.Password,
                    isPassword = true,
                    errorMessage = fieldError(state, "password"),
                )
                if (state is AuthUiState.Failure && state.error !is AuthError.Validation) {
                    ErrorBanner(message = state.error.toMessage())
                }
                PrimaryButton(
                    text = "Créer mon compte",
                    onClick = { onSignupClick(email, password, username) },
                    loading = state is AuthUiState.Loading,
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))
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
