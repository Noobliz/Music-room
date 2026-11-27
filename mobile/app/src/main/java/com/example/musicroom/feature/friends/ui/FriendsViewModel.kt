package com.example.musicroom.feature.friends.ui

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.ViewModelProvider.AndroidViewModelFactory.Companion.APPLICATION_KEY
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.example.musicroom.MusicRoomApp
import com.example.musicroom.feature.auth.data.AuthResult
import com.example.musicroom.feature.friends.data.Friend
import com.example.musicroom.feature.friends.data.FriendRequests
import com.example.musicroom.feature.friends.data.FriendsRepository
import kotlinx.coroutines.launch

class FriendsViewModel(
    private val repository: FriendsRepository,
) : ViewModel() {
    var state: FriendsState by mutableStateOf<FriendsState>(FriendsState())
        private set

    fun onTabSelected(tab: FriendsTab) {
        state = state.copy(tab = tab)
    }

    // Les deux listes sont chargees en parallele (deux launchs inde).
    fun load() {
        state = state.copy(
            friends = LoadState.Loading,
            requests = LoadState.Loading,
            busyIds = emptySet(),
            actionError = null,
        )
        viewModelScope.launch {
            val res: AuthResult<List<Friend>> = repository.getFriends()
            state = state.copy(friends = res.toLoadState())
        }
        viewModelScope.launch {
            val res: AuthResult<FriendRequests> = repository.getFriendRequests()
            state = state.copy(requests = res.toLoadState())
        }
    }

    fun removeFriend(userId: String) {
        runAction(id = userId, call = { repository.removeFriend(userId) }) {
            state = state.copy(friends = state.friends.map { list -> list.filter { it.user.id != userId } })
        }
    }

    fun acceptRequest(requestId: String) {
        runAction(id = requestId, call = { repository.acceptFriendRequest(requestId) }) { friend: Friend ->
            // Mise a jour locale avec la rep du serveur : pas besoin de tout recharger
            state = state.copy(
                requests = state.requests.map { r -> r.copy(received = r.received.filter { it.id != requestId }) },
                friends = state.friends.map { list -> listOf(friend) + list },
            )
        }
    }

    fun deleteRequest(requestId: String) {
        runAction(id = requestId, call = { repository.deleteFriendRequest(requestId) }) {
            state = state.copy(
                requests = state.requests.map { r ->
                    r.copy(
                        received = r.received.filter { it.id != requestId },
                        sent = r.sent.filter { it.id != requestId },
                    )
                },
            )
        }
    }

    private fun <T> runAction(
        id: String,
        call: suspend () -> AuthResult<T>,
        onSuccess: (T) -> Unit,
    ) {
        if (id in state.busyIds) return
        state = state.copy(busyIds = state.busyIds + id, actionError = null)
        viewModelScope.launch {
            val res: AuthResult<T> = call()
            state = state.copy(busyIds = state.busyIds - id)
            when (res) {
                is AuthResult.Success -> onSuccess(res.data)
                // Ex. FRIEND_REQUEST_NOT_FOUND : la demande a été annulée de l'autre côté.
                // On garde la liste affichée et on montre l'erreur ; « Actualiser » la remet à jour.
                is AuthResult.Failure -> state = state.copy(actionError = res.error)
            }
        }
    }

    fun reset() {
        state = FriendsState()
    }

    companion object {
        val Factory: ViewModelProvider.Factory = viewModelFactory {
            initializer {
                val app: MusicRoomApp = this[APPLICATION_KEY] as MusicRoomApp
                FriendsViewModel(app.friendsRepository)
            }
        }
    }
}

private fun <T> AuthResult<T>.toLoadState(): LoadState<T> =
    when (this) {
        is AuthResult.Success -> LoadState.Loaded(data)
        is AuthResult.Failure -> LoadState.Failed(error)
    }

private fun <T> LoadState<T>.map(transform: (T) -> T): LoadState<T> =
    when (this) {
        is LoadState.Loaded -> LoadState.Loaded(transform(data))
        else -> this
    }
