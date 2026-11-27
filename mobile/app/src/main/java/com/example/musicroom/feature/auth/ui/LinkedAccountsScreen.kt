package com.example.musicroom.feature.auth.ui


import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.example.musicroom.core.ui.ErrorBanner
import com.example.musicroom.core.ui.PrimaryButton
import com.example.musicroom.core.ui.ScreenHeader
import com.example.musicroom.feature.auth.data.AuthError
import com.example.musicroom.feature.auth.data.Identity
import com.example.musicroom.ui.theme.MusicroomTheme

@Composable
fun LinkedAccountsScreen(
    state: LinkedAccountsState,
    onRetryClick: () -> Unit,
    onLinkGoogleClick: () -> Unit,
    onUnlinkGoogleClick: () -> Unit,
    onBackClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {

        ScreenHeader(title = "Comptes liés", onBackClick = onBackClick)

        when (state) {
            LinkedAccountsState.Loading -> {
                CircularProgressIndicator(
                    modifier = Modifier.align(Alignment.CenterHorizontally),
                )
            }

            is LinkedAccountsState.LoadFailed -> {
                ErrorBanner(message = state.error.toMessage())
                PrimaryButton(text = "Réessayer", onClick = onRetryClick)
            }

            is LinkedAccountsState.Loaded -> {
                state.identities.forEach { identity: Identity ->
                    Column {
                        Text(
                            text = providerLabel(identity.provider),
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold,
                        )
                        if (identity.email != null) {
                            Text(
                                text = identity.email,
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                }

                // Erreur d'action (liaison / déliaison)
                val actionError: AuthError? = state.actionError
                if (actionError != null) {
                    ErrorBanner(message = actionError.toMessage())
                }

                if (state.isGoogleLinked) {
                    // On grise le bouton si c'est l'unique compte
                    // Le back-end refuse de toute façon (LAST_IDENTITY)
                    val canUnlink: Boolean = state.identities.size > 1
                    OutlinedButton(
                        onClick = onUnlinkGoogleClick,
                        enabled = canUnlink && !state.isBusy,
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text("Délier Google")
                    }
                    if (!canUnlink) {
                        Text(
                            text = "Google est le seul moyen de connexion, vous ne pouvez pas le délier.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                } else {
                    PrimaryButton(
                        text = "Lier mon compte Google",
                        onClick = onLinkGoogleClick,
                        loading = state.isBusy,
                    )
                }
            }
        }

    }
}

// Traduit le nom technique renvoye par le back-end en texte lisible
private fun providerLabel(provider: String): String =
    when (provider) {
        "email" -> "E-mail et mot de passe"
        "google" -> "Google"
        else -> provider.replaceFirstChar { it.uppercase() }
    }

// ── Previews

private val previewIdentities: List<Identity> = listOf(
    Identity(id = "1", provider = "email", email = "lise@example.com", createdAt = null),
    Identity(id = "2", provider = "google", email = "lise@gmail.com", createdAt = null),
)

@Preview(showBackground = true, name = "Chargement")
@Composable
private fun LinkedAccountsLoadingPreview() {
    MusicroomTheme {
        LinkedAccountsScreen(
            state = LinkedAccountsState.Loading,
            onRetryClick = {}, onLinkGoogleClick = {}, onUnlinkGoogleClick = {}, onBackClick = {},
        )
    }
}

@Preview(showBackground = true, name = "Échec du chargement")
@Composable
private fun LinkedAccountsLoadFailedPreview() {
    MusicroomTheme {
        LinkedAccountsScreen(
            state = LinkedAccountsState.LoadFailed(AuthError.Network),
            onRetryClick = {}, onLinkGoogleClick = {}, onUnlinkGoogleClick = {}, onBackClick = {},
        )
    }
}

@Preview(showBackground = true, name = "Google lié")
@Composable
private fun LinkedAccountsLinkedPreview() {
    MusicroomTheme {
        LinkedAccountsScreen(
            state = LinkedAccountsState.Loaded(previewIdentities),
            onRetryClick = {}, onLinkGoogleClick = {}, onUnlinkGoogleClick = {}, onBackClick = {},
        )
    }
}

@Preview(showBackground = true, name = "Google non lié + erreur")
@Composable
private fun LinkedAccountsNotLinkedErrorPreview() {
    MusicroomTheme {
        LinkedAccountsScreen(
            state = LinkedAccountsState.Loaded(
                identities = previewIdentities.take(1),
                actionError = AuthError.IdentityAlreadyLinked,
            ),
            onRetryClick = {}, onLinkGoogleClick = {}, onUnlinkGoogleClick = {}, onBackClick = {},
        )
    }
}

@Preview(showBackground = true, name = "Google seul moyen de connexion")
@Composable
private fun LinkedAccountsGoogleOnlyPreview() {
    MusicroomTheme {
        LinkedAccountsScreen(
            state = LinkedAccountsState.Loaded(previewIdentities.drop(1)),
            onRetryClick = {}, onLinkGoogleClick = {}, onUnlinkGoogleClick = {}, onBackClick = {},
        )
    }
}
