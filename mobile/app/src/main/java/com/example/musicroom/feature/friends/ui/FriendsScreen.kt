package com.example.musicroom.feature.friends.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListScope
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.PrimaryTabRow
import androidx.compose.material3.Tab
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.example.musicroom.core.ui.ErrorBanner
import com.example.musicroom.core.ui.PrimaryButton
import com.example.musicroom.core.ui.ScreenHeader
import com.example.musicroom.core.ui.UserAvatar
import com.example.musicroom.feature.auth.data.AuthError
import com.example.musicroom.feature.auth.ui.toMessage
import com.example.musicroom.feature.friends.data.Friend
import com.example.musicroom.feature.friends.data.FriendRequest
import com.example.musicroom.feature.friends.data.FriendRequests
import com.example.musicroom.feature.friends.data.FriendUser
import com.example.musicroom.ui.theme.MusicroomTheme
import java.text.ParseException
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

@Composable
fun FriendsScreen(
    state: FriendsState,
    onTabSelected: (FriendsTab) -> Unit,
    onRefreshClick: () -> Unit,
    onFriendClick: (Friend) -> Unit,
    onRemoveFriendClick: (Friend) -> Unit,
    onReceivedRequestClick: (FriendRequest) -> Unit,
    onSentRequestClick: (FriendRequest) -> Unit,
    onAcceptClick: (FriendRequest) -> Unit,
    onDeclineClick: (FriendRequest) -> Unit,
    onCancelClick: (FriendRequest) -> Unit,
    onBackClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    // Id de l'ami en attente de confirmation de retrait (null = pas de fenetre).
    var friendToRemoveId: String? by rememberSaveable { mutableStateOf(null) }

    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            ScreenHeader(title = "Mes amis", onBackClick = onBackClick, modifier = Modifier.weight(1f))
            TextButton(onClick = onRefreshClick) { Text("Actualiser") }
        }

        val receivedCount: Int = (state.requests as? LoadState.Loaded)?.data?.received?.size ?: 0
        PrimaryTabRow(
            selectedTabIndex = state.tab.ordinal,
            containerColor = Color.Transparent,
        ) {
            Tab(
                selected = state.tab == FriendsTab.FRIENDS,
                onClick = { onTabSelected(FriendsTab.FRIENDS) },
                text = { Text("Mes amis") },
            )
            Tab(
                selected = state.tab == FriendsTab.REQUESTS,
                onClick = { onTabSelected(FriendsTab.REQUESTS) },
                text = { Text(if (receivedCount > 0) "Demandes ($receivedCount)" else "Demandes") },
            )
        }

        val actionError: AuthError? = state.actionError
        if (actionError != null) {
            ErrorBanner(message = actionError.toMessage())
        }

        Box(modifier = Modifier.weight(1f)) {
            when (state.tab) {
                FriendsTab.FRIENDS -> LoadStateContent(state.friends, onRefreshClick) { friends: List<Friend> ->
                    if (friends.isEmpty()) {
                        HintText("Vous n'avez pas encore d'amis. Recherchez des utilisateurs pour leur envoyer une demande.")
                    } else {
                        LazyColumn(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            // key : Compose suit chaque ligne par son id quand la liste change
                            items(friends, key = { it.user.id }) { friend: Friend ->
                                UserLine(
                                    user = friend.user,
                                    subtitle = "Amis depuis le ${formatDate(friend.friendsSince)}",
                                    onClick = { onFriendClick(friend) },
                                ) {
                                    BusyOr(busy = friend.user.id in state.busyIds) {
                                        TextButton(onClick = { friendToRemoveId = friend.user.id }) { Text("Retirer") }
                                    }
                                }
                            }
                        }
                    }
                }

                FriendsTab.REQUESTS -> LoadStateContent(state.requests, onRefreshClick) { requests: FriendRequests ->
                    if (requests.received.isEmpty() && requests.sent.isEmpty()) {
                        HintText("Aucune demande en attente.")
                    } else {
                        LazyColumn(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            requestSection(
                                title = "Reçues",
                                requests = requests.received,
                                emptyText = "Aucune demande reçue.",
                                onRowClick = onReceivedRequestClick,
                            ) { request: FriendRequest ->
                                BusyOr(busy = request.id in state.busyIds) {
                                    TextButton(onClick = { onAcceptClick(request) }) { Text("Accepter") }
                                    TextButton(onClick = { onDeclineClick(request) }) { Text("Refuser") }
                                }
                            }
                            requestSection(
                                title = "Envoyées",
                                requests = requests.sent,
                                emptyText = "Aucune demande envoyée.",
                                onRowClick = onSentRequestClick,
                            ) { request: FriendRequest ->
                                BusyOr(busy = request.id in state.busyIds) {
                                    TextButton(onClick = { onCancelClick(request) }) { Text("Annuler") }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    val pending: Friend? = (state.friends as? LoadState.Loaded)?.data?.find { it.user.id == friendToRemoveId }
    if (pending != null) {
        AlertDialog(
            onDismissRequest = { friendToRemoveId = null },
            title = { Text("Retirer ${pending.user.username} ?") },
            text = { Text("Vos informations réservées aux amis ne seront plus partagées entre vous.") },
            confirmButton = {
                TextButton(onClick = {
                    friendToRemoveId = null
                    onRemoveFriendClick(pending)
                }) { Text("Retirer") }
            },
            dismissButton = {
                TextButton(onClick = { friendToRemoveId = null }) { Text("Annuler") }
            },
        )
    }
}


@Composable
private fun <T> LoadStateContent(
    state: LoadState<T>,
    onRetryClick: () -> Unit,
    content: @Composable (T) -> Unit,
) {
    when (state) {
        LoadState.Loading -> Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.TopCenter) {
            CircularProgressIndicator(modifier = Modifier.padding(top = 24.dp))
        }

        is LoadState.Failed -> Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            ErrorBanner(message = state.error.toMessage())
            PrimaryButton(text = "Réessayer", onClick = onRetryClick)
        }

        is LoadState.Loaded -> content(state.data)
    }
}

private fun LazyListScope.requestSection(
    title: String,
    requests: List<FriendRequest>,
    emptyText: String,
    onRowClick: (FriendRequest) -> Unit,
    actions: @Composable RowScope.(FriendRequest) -> Unit,
) {
    item(key = "title-$title") {
        Text(
            text = title,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
            modifier = Modifier.padding(top = 12.dp, bottom = 4.dp),
        )
    }
    if (requests.isEmpty()) {
        item(key = "empty-$title") { HintText(emptyText) }
    }
    items(requests, key = { it.id }) { request: FriendRequest ->
        UserLine(
            user = request.user,
            subtitle = "Le ${formatDate(request.createdAt)}",
            onClick = { onRowClick(request) },
        ) { actions(request) }
    }
}

@Composable
private fun UserLine(
    user: FriendUser,
    subtitle: String,
    onClick: () -> Unit,
    actions: @Composable RowScope.() -> Unit,
) {
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
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = user.username,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
            )
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        actions()
    }
}


@Composable
private fun RowScope.BusyOr(busy: Boolean, content: @Composable RowScope.() -> Unit) {
    if (busy) {
        CircularProgressIndicator(modifier = Modifier.size(24.dp), strokeWidth = 2.dp)
    } else {
        content()
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

// Le back-end envoie toISOString() : "2026-11-27T10:15:00.000Z" (UTC).
// SimpleDateFormat plutôt que java.time : minSdk = 24 et java.time demande l'API 26
// Créés à chaque appel car SimpleDateFormat n'est pas thread-safe.
fun formatDate(iso: String): String {
    val parser = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSX", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC")
    }
    return try {
        val date: Date = parser.parse(iso) ?: return iso
        SimpleDateFormat("d MMMM yyyy", Locale.FRENCH).format(date)
    } catch (e: ParseException) {
        iso
    }
}

// ── Previews (faites par l'IA)

private val previewFriends: List<Friend> = listOf(
    Friend(FriendUser("1", "testami", null), "2026-11-20T10:15:00.000Z"),
    Friend(FriendUser("2", "lisa", null), "2026-10-02T08:00:00.000Z"),
)

private val previewRequests: FriendRequests = FriendRequests(
    received = listOf(FriendRequest("r1", FriendUser("3", "testdemande", null), "2026-11-26T09:00:00.000Z")),
    sent = listOf(FriendRequest("r2", FriendUser("4", "testinconnu", null), "2026-11-25T18:30:00.000Z")),
)

@Composable
private fun FriendsPreview(state: FriendsState) {
    MusicroomTheme {
        FriendsScreen(
            state = state,
            onTabSelected = {}, onRefreshClick = {}, onFriendClick = {}, onRemoveFriendClick = {},
            onReceivedRequestClick = {}, onSentRequestClick = {},
            onAcceptClick = {}, onDeclineClick = {}, onCancelClick = {}, onBackClick = {},
        )
    }
}

@Preview(showBackground = true, name = "Amis")
@Composable
private fun FriendsListPreview() {
    FriendsPreview(FriendsState(friends = LoadState.Loaded(previewFriends), requests = LoadState.Loaded(previewRequests)))
}

@Preview(showBackground = true, name = "Demandes")
@Composable
private fun FriendsRequestsPreview() {
    FriendsPreview(
        FriendsState(
            tab = FriendsTab.REQUESTS,
            friends = LoadState.Loaded(previewFriends),
            requests = LoadState.Loaded(previewRequests),
            busyIds = setOf("r2"),
        )
    )
}

@Preview(showBackground = true, name = "Vide")
@Composable
private fun FriendsEmptyPreview() {
    FriendsPreview(FriendsState(friends = LoadState.Loaded(emptyList())))
}

@Preview(showBackground = true, name = "Erreur")
@Composable
private fun FriendsErrorPreview() {
    FriendsPreview(FriendsState(friends = LoadState.Failed(AuthError.Network)))
}
