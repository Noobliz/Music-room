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
fun ResetPasswordScreen(
    password: String,
    confirmPassword: String,
    state: AuthUiState,
    onPasswordChange: (String) -> Unit,
    onConfirmPasswordChange: (String) -> Unit,
    onSubmitClick: () -> Unit,
    onGoToLoginClick: () -> Unit,
    onRequestNewLinkClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
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
                    text = "Nouveau mot de passe",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.SemiBold,
                )
                when {
                    state is AuthUiState.Success -> {
                        Text("Le mot de passe a été changé. Connecte-toi avec ton nouveau mot de passe.")
                        PrimaryButton(text = "Aller à la connexion", onClick = onGoToLoginClick)
                    }
                    state is AuthUiState.Failure && state.error is AuthError.InvalidOrExpiredLink -> {
                        ErrorBanner(message = state.error.toMessage())
                        PrimaryButton(text = "Redemander un email", onClick = onRequestNewLinkClick)
                    }
                    else -> {
                        AppTextField(
                            value = password,
                            onValueChange = onPasswordChange,
                            label = "Nouveau mot de passe",
                            keyboardType = KeyboardType.Password,
                            isPassword = true,
                            errorMessage = fieldError(state, "password"),
                        )
                        AppTextField(
                            value = confirmPassword,
                            onValueChange = onConfirmPasswordChange,
                            label = "Confirmer le mot de passe",
                            keyboardType = KeyboardType.Password,
                            isPassword = true,
                            errorMessage = fieldError(state, "confirmPassword"),
                        )
                        if (state is AuthUiState.Failure) {
                            val error: AuthError = state.error
                            when {
                                error !is AuthError.Validation -> ErrorBanner(message = error.toMessage())

                                error.fields.isEmpty() -> ErrorBanner(
                                    message = "Ce mot de passe n'est pas accepté. Choisis-en un différent de l'ancien.",
                                )
                            }
                        }
                        PrimaryButton(
                            text = "Valider",
                            onClick = onSubmitClick,
                            loading = state is AuthUiState.Loading,
                        )
                    }
                }
            }
        }

        if (state !is AuthUiState.Success) {
            Spacer(modifier = Modifier.height(16.dp))
            TextButton(onClick = onGoToLoginClick) {
                Text("Retour à la connexion")
            }
        }
    }
}
