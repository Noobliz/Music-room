package com.example.musicroom.feature.profile.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.example.musicroom.core.ui.ErrorBanner
import com.example.musicroom.core.ui.PrimaryButton
import com.example.musicroom.core.ui.UserAvatar
import com.example.musicroom.feature.auth.data.AuthError
import com.example.musicroom.feature.auth.ui.toMessage
import com.example.musicroom.feature.profile.data.MusicGenre
import com.example.musicroom.feature.profile.data.OwnProfile
import com.example.musicroom.ui.theme.MusicroomTheme

@Composable
fun ProfileScreen(
    state: ProfileState,
    onRetryClick: () -> Unit,
    onEditClick: () -> Unit,
    onBackClick: () -> Unit,
    onChangeAvatarClick: () -> Unit,
    onDeleteAvatarClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text(
            text = "Mon profil",
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
        )

        when (state) {
            ProfileState.Loading -> {
                CircularProgressIndicator(
                    modifier = Modifier.align(Alignment.CenterHorizontally),
                )
            }

            is ProfileState.LoadFailed -> {
                ErrorBanner(message = state.error.toMessage())
                PrimaryButton(text = "Réessayer", onClick = onRetryClick)
            }

            is ProfileState.Loaded -> {
                val profile: OwnProfile = state.profile
                UserAvatar(
                    username = profile.username,
                    avatarUrl = profile.avatarUrl,
                    modifier = Modifier.align(Alignment.CenterHorizontally),
                )
                val actionError: AuthError? = state.actionError
                if (actionError != null) {
                    ErrorBanner(message = actionError.toMessage())
                }
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.align(Alignment.CenterHorizontally),
                ) {
                    OutlinedButton(onClick = onChangeAvatarClick, enabled = !state.isBusy) {
                        Text(if (profile.avatarUrl == null) "Ajouter une photo" else "Changer la photo")
                    }
                    if (profile.avatarUrl != null) {
                        TextButton(onClick = onDeleteAvatarClick, enabled = !state.isBusy) {
                            Text("Supprimer")
                        }
                    }
                }
                if (state.isBusy) {
                    CircularProgressIndicator(modifier = Modifier.align(Alignment.CenterHorizontally))
                }


                SectionTitle("Public")
                ProfileField(label = "Pseudo", value = profile.username)

                HorizontalDivider()
                SectionTitle("Visible par mes amis")
                ProfileField(label = "Bio", value = profile.bio)
                ProfileField(
                    label = "Préférences musicales",
                    value = profile.musicGenres
                        .takeIf { it.isNotEmpty() }
                        ?.joinToString(", ") { genreLabel(it) },
                )

                HorizontalDivider()
                SectionTitle("Privé")
                ProfileField(label = "E-mail", value = profile.email)
                ProfileField(label = "Nom", value = profile.fullName)
                ProfileField(
                    label = "Date de naissance",
                    value = profile.birthDate?.let { formatDate(it) },
                )

                PrimaryButton(text = "Modifier mon profil", onClick = onEditClick)
            }
        }

        TextButton(onClick = onBackClick) {
            Text("Retour")
        }
    }
}

@Composable
fun SectionTitle(text: String) {
    Text(
        text = text,
        style = MaterialTheme.typography.titleMedium,
        fontWeight = FontWeight.SemiBold,
        color = MaterialTheme.colorScheme.primary,
    )
}

// Une ligne « libellé + valeur ». Valeur absente : « Non renseigné » en gris.
@Composable
fun ProfileField(label: String, value: String?) {
    Column {
        Text(
            text = label,
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        if (value != null) {
            Text(text = value, style = MaterialTheme.typography.bodyLarge)
        } else {
            Text(
                text = "Non renseigné",
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

// "1995-03-14" -> "14/03/1995". Format inattendu : on renvoie la date telle quelle.
private fun formatDate(isoDate: String): String {
    val parts: List<String> = isoDate.split("-")
    if (parts.size != 3) {
        return isoDate
    }
    return "${parts[2]}/${parts[1]}/${parts[0]}"
}

// ── Previews

private val previewProfile: OwnProfile = OwnProfile(
    id = "1",
    email = "lise@example.com",
    username = "lise",
    avatarUrl = null,
    bio = "J'écoute de tout, surtout du jazz.",
    musicGenres = listOf(MusicGenre.JAZZ, MusicGenre.SOUL, MusicGenre.HIP_HOP),
    fullName = "Lise Example",
    birthDate = "1995-03-14",
    createdAt = "2026-01-01T00:00:00.000Z",
    updatedAt = "2026-01-01T00:00:00.000Z",
)

@Preview(showBackground = true, name = "Chargement")
@Composable
private fun ProfileLoadingPreview() {
    MusicroomTheme {
        ProfileScreen(
            state = ProfileState.Loading,
            onRetryClick = {}, onEditClick = {}, onBackClick = {}, onChangeAvatarClick = {}, onDeleteAvatarClick = {}
        )
    }
}

@Preview(showBackground = true, name = "Échec du chargement")
@Composable
private fun ProfileLoadFailedPreview() {
    MusicroomTheme {
        ProfileScreen(
            state = ProfileState.LoadFailed(AuthError.Network),
            onRetryClick = {}, onEditClick = {}, onBackClick = {},onChangeAvatarClick = {}, onDeleteAvatarClick = {}
        )
    }
}

@Preview(showBackground = true, name = "Profil complet", heightDp = 900)
@Composable
private fun ProfileLoadedPreview() {
    MusicroomTheme {
        ProfileScreen(
            state = ProfileState.Loaded(previewProfile),
            onRetryClick = {}, onEditClick = {}, onBackClick = {}, onChangeAvatarClick = {}, onDeleteAvatarClick = {}
        )
    }
}

@Preview(showBackground = true, name = "Profil vide", heightDp = 900)
@Composable
private fun ProfileEmptyPreview() {
    MusicroomTheme {
        ProfileScreen(
            state = ProfileState.Loaded(
                previewProfile.copy(
                    bio = null,
                    musicGenres = emptyList(),
                    fullName = null,
                    birthDate = null,
                ),
            ),
            onRetryClick = {}, onEditClick = {}, onBackClick = {}, onChangeAvatarClick = {}, onDeleteAvatarClick = {}
        )
    }
}
