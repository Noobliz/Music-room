package com.example.musicroom.feature.auth.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CircularProgressIndicator
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
fun ConfirmEmailScreen(
    state: AuthUiState,
    onDoneClick: () -> Unit,
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

        when (state) {
            is AuthUiState.Failure -> {
                ErrorBanner(message = state.error.toMessage())
                Text("Connecte-toi pour envoyer un nouveau lien")
                PrimaryButton("Retour a la connexion",onDoneClick)
            }
            AuthUiState.Success -> {
                Text("email active")
                PrimaryButton("Continuer",onDoneClick)
            }
            AuthUiState.Idle, AuthUiState.Loading -> {
                Text("Verification de l'adresse...")
                CircularProgressIndicator()
            }
        }
    }
}