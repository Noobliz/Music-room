package com.example.musicroom.feature.friends.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.example.musicroom.core.ui.ErrorBanner
import com.example.musicroom.core.ui.PrimaryButton
import com.example.musicroom.core.ui.ScreenHeader
import com.example.musicroom.core.ui.UserAvatar
import com.example.musicroom.feature.auth.data.AuthError
import com.example.musicroom.feature.auth.ui.toMessage
import com.example.musicroom.feature.friends.data.Relationship
import com.example.musicroom.feature.profile.data.MusicGenre
import com.example.musicroom.feature.profile.data.ProfileView
import com.example.musicroom.feature.profile.ui.ProfileField
import com.example.musicroom.feature.profile.ui.SectionTitle
import com.example.musicroom.feature.profile.ui.genreLabel
import com.example.musicroom.ui.theme.MusicroomTheme

@Composable
fun UserProfileScreen(
    state: UserProfileState,
    onRetryClick: () -> Unit,
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
        ScreenHeader(title = null, onBackClick = onBackClick)

        when (state) {
            UserProfileState.Loading -> {
                CircularProgressIndicator(
                    modifier = Modifier.align(Alignment.CenterHorizontally),
                )
            }

            is UserProfileState.LoadFailed -> {
                ErrorBanner(message = state.error.toMessage())
                PrimaryButton(text = "Réessayer", onClick = onRetryClick)
            }

            is UserProfileState.Loaded -> {
                val profile: ProfileView = state.profile

                // Public
                UserAvatar(
                    username = profile.username,
                    avatarUrl = profile.avatarUrl,
                    modifier = Modifier.align(Alignment.CenterHorizontally),
                )
                Text(
                    text = profile.username,
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.align(Alignment.CenterHorizontally),
                )
                val label: String? = relationshipLabel(state.relationship)
                if (label != null) {
                    Text(
                        text = label,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.align(Alignment.CenterHorizontally),
                    )
                }

                HorizontalDivider()
                SectionTitle("Réservé aux amis")

                // bio et genres que pour les amis. Relationship dit
                // si "absent" veut dire "caché" ou "non renseigné".
                if (state.relationship == Relationship.FRIEND) {
                    ProfileField(label = "Bio", value = profile.bio)
                    ProfileField(
                        label = "Préférences musicales",
                        value = profile.musicGenres
                            ?.takeIf { it.isNotEmpty() }
                            ?.joinToString(", ") { genreLabel(it) },
                    )
                } else {
                    Text(
                        text = "Ces informations ne sont visibles que par les amis de ${profile.username}.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = TextAlign.Start,
                    )
                }
            }
        }

    }
}

// ── Previews (faites par l'IA)

private val previewFriend: ProfileView = ProfileView(
    id = "1",
    username = "lisa",
    avatarUrl = null,
    bio = "Toujours au premier rang des concerts.",
    musicGenres = listOf(MusicGenre.ROCK, MusicGenre.METAL),
)

@Preview(showBackground = true, name = "Ami·e")
@Composable
private fun UserProfileFriendPreview() {
    MusicroomTheme {
        UserProfileScreen(
            state = UserProfileState.Loaded(previewFriend, Relationship.FRIEND),
            onRetryClick = {}, onBackClick = {},
        )
    }
}

@Preview(showBackground = true, name = "Pas ami·e")
@Composable
private fun UserProfileNotFriendPreview() {
    MusicroomTheme {
        UserProfileScreen(
            state = UserProfileState.Loaded(
                previewFriend.copy(bio = null, musicGenres = null),
                Relationship.NONE,
            ),
            onRetryClick = {}, onBackClick = {},
        )
    }
}

@Preview(showBackground = true, name = "Introuvable")
@Composable
private fun UserProfileNotFoundPreview() {
    MusicroomTheme {
        UserProfileScreen(
            state = UserProfileState.LoadFailed(AuthError.ProfileNotFound),
            onRetryClick = {}, onBackClick = {},
        )
    }
}
