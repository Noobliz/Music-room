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

@Composable
fun ForgotPasswordScreen(
    email: String,
    state: AuthUiState,
    onEmailChange: (email: String) -> Unit,
    onSendClick: () -> Unit,
    onGoToLoginClick: () -> Unit,
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
                    text = "Reinitialiser le mot de passe",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.SemiBold,
                )
                AppTextField(
                    value = email,
                    onValueChange = onEmailChange,
                    label = "Email",
                    keyboardType = KeyboardType.Email,
                )

                PrimaryButton(
                    text = "Envoyer l'email",
                    onClick = onSendClick,
                    loading = state is AuthUiState.Loading,
                )
                when (state) {
                    is AuthUiState.Failure -> ErrorBanner(message = state.error.toMessage())
                    AuthUiState.Success -> Text("Si un compte utilise cette adresse, un email de reinitialisation vient d'etre envoye.")
                    AuthUiState.Idle, AuthUiState.Loading -> Unit
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))
        TextButton(onClick = onGoToLoginClick) {
            Text("Retour a la page de connexion")
        }
    }
}