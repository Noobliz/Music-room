package com.example.musicroom.feature.friends.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.example.musicroom.core.ui.AppTextField
import com.example.musicroom.core.ui.ErrorBanner
import com.example.musicroom.core.ui.PrimaryButton
import com.example.musicroom.core.ui.ScreenHeader
import com.example.musicroom.core.ui.UserAvatar
import com.example.musicroom.feature.auth.data.AuthError
import com.example.musicroom.feature.auth.ui.toMessage
import com.example.musicroom.feature.friends.data.Relationship
import com.example.musicroom.feature.friends.data.UserSearchResult
import com.example.musicroom.feature.friends.ui.UserSearchState.SearchResults
import com.example.musicroom.ui.theme.MusicroomTheme

@Composable
fun UserSearchScreen(
    state: UserSearchState,
    onQueryChange: (String) -> Unit,
    onSearchClick: () -> Unit,
    onUserClick: (UserSearchResult) -> Unit,
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
        ScreenHeader(title = "Rechercher des utilisateurs", onBackClick = onBackClick)

        AppTextField(
            value = state.query,
            onValueChange = onQueryChange,
            label = "Pseudo",
        )
        PrimaryButton(
            text = "Rechercher",
            onClick = onSearchClick,
            loading = state.results is SearchResults.Loading,
        )

        when (val results: SearchResults = state.results) {
            SearchResults.Idle -> {
                HintText("Tapez une partie d'un pseudo, puis lancez la recherche.")
            }

            SearchResults.Loading -> {
                CircularProgressIndicator(
                    modifier = Modifier.align(Alignment.CenterHorizontally),
                )
            }

            is SearchResults.Failed -> {
                ErrorBanner(message = results.error.toMessage())
            }

            is SearchResults.Loaded -> {
                if (results.users.isEmpty()) {
                    HintText("Aucun utilisateur trouvé.")
                } else {
                    results.users.forEach { user: UserSearchResult ->
                        UserRow(user = user, onClick = { onUserClick(user) })
                    }
                }
            }
        }

    }
}

// Une ligne de résultat : avatar + pseudo + lien. Toute la ligne est cliquable.
@Composable
private fun UserRow(user: UserSearchResult, onClick: () -> Unit) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(vertical = 8.dp),
    ) {
        UserAvatar(
            username = user.username,
            avatarUrl = user.avatarUrl,
            size = 48.dp,
            initialStyle = MaterialTheme.typography.titleLarge,
        )
        Column {
            Text(
                text = user.username,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
            )
            val label: String? = relationshipLabel(user.relationship)
            if (label != null) {
                Text(
                    text = label,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

@Composable
private fun HintText(text: String) {
    Text(
        text = text,
        style = MaterialTheme.typography.bodyMedium,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
    )
}


fun relationshipLabel(relationship: Relationship): String? =
    when (relationship) {
        Relationship.NONE -> null
        Relationship.FRIEND -> "Ami·e"
        Relationship.REQUEST_SENT -> "Demande d'ami envoyée"
        Relationship.REQUEST_RECEIVED -> "Vous a envoyé une demande d'ami"
    }

// ── Previews (faites par l'IA)

private val previewUsers: List<UserSearchResult> = listOf(
    UserSearchResult("1", "lisa", null, Relationship.FRIEND, null),
    UserSearchResult("2", "lise_music", null, Relationship.NONE, null),
    UserSearchResult("3", "elise", null, Relationship.REQUEST_RECEIVED, "r1"),
)

@Preview(showBackground = true, name = "Avant la recherche")
@Composable
private fun UserSearchIdlePreview() {
    MusicroomTheme {
        UserSearchScreen(
            state = UserSearchState(),
            onQueryChange = {}, onSearchClick = {}, onUserClick = {}, onBackClick = {},
        )
    }
}

@Preview(showBackground = true, name = "Résultats")
@Composable
private fun UserSearchLoadedPreview() {
    MusicroomTheme {
        UserSearchScreen(
            state = UserSearchState(query = "lis", results = SearchResults.Loaded(previewUsers)),
            onQueryChange = {}, onSearchClick = {}, onUserClick = {}, onBackClick = {},
        )
    }
}

@Preview(showBackground = true, name = "Aucun résultat")
@Composable
private fun UserSearchEmptyPreview() {
    MusicroomTheme {
        UserSearchScreen(
            state = UserSearchState(query = "zzz", results = SearchResults.Loaded(emptyList())),
            onQueryChange = {}, onSearchClick = {}, onUserClick = {}, onBackClick = {},
        )
    }
}

@Preview(showBackground = true, name = "Erreur")
@Composable
private fun UserSearchFailedPreview() {
    MusicroomTheme {
        UserSearchScreen(
            state = UserSearchState(query = "lis", results = SearchResults.Failed(AuthError.Network)),
            onQueryChange = {}, onSearchClick = {}, onUserClick = {}, onBackClick = {},
        )
    }
}
