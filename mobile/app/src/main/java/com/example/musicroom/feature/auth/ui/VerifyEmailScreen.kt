package com.example.musicroom.feature.auth.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.musicroom.core.ui.ErrorBanner
import com.example.musicroom.core.ui.PrimaryButton



@Composable
fun VerifyEmailScreen(
    email: String,
    state: AuthUiState,
    onResendClick: (String) -> Unit,
    onGoToLoginClick: () -> Unit,
    modifier: Modifier = Modifier,
)
{
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
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            text = "Un lien de confirmation a ete envoye a $email. Clique dessus pour activer ton compte.",
            style = MaterialTheme.typography.bodyLarge,
        )

        when (state) {
            is AuthUiState.Failure -> ErrorBanner(message = state.error.toMessage())
            AuthUiState.Success -> Text("Si un compte non verifie utilise cette adresse, un nouvel email vient d'etre envoye.")
            AuthUiState.Idle, AuthUiState.Loading -> Unit
        }
        Spacer(modifier = Modifier.height(16.dp))
        PrimaryButton(
            text = "Renvoyer l'email",
            onClick = { onResendClick(email) },
            loading = state is AuthUiState.Loading,
        )

        Spacer(modifier = Modifier.height(16.dp))
        TextButton(onClick = onGoToLoginClick) {
            Text("Retourner a la page de connexion")
        }
    }
}


