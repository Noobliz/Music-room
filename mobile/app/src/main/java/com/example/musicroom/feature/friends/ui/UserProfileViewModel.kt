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
import com.example.musicroom.feature.friends.data.FriendRequest
import com.example.musicroom.feature.friends.data.FriendsRepository
import com.example.musicroom.feature.friends.data.Relationship
import com.example.musicroom.feature.profile.data.ProfileRepository
import com.example.musicroom.feature.profile.data.ProfileView
import kotlinx.coroutines.launch


class UserProfileViewModel(
    private val profileRepository: ProfileRepository,
    private val friendsRepository: FriendsRepository,
) : ViewModel() {
    var state: UserProfileState by mutableStateOf<UserProfileState>(UserProfileState.Loading)
        private set

    fun load(userId: String, relationship: Relationship, requestId: String?) {
        state = UserProfileState.Loading
        viewModelScope.launch {
            val res: AuthResult<ProfileView> = profileRepository.getProfile(userId)
            state = when (res) {
                is AuthResult.Success -> UserProfileState.Loaded(res.data, relationship, requestId)
                is AuthResult.Failure -> UserProfileState.LoadFailed(res.error)
            }
        }
    }

    fun sendRequest() {
        runAction(newRelationship = Relationship.REQUEST_SENT, newRequestId = { r: FriendRequest -> r.id }) { s ->
            friendsRepository.sendFriendRequest(s.profile.id)
        }
    }

    fun acceptRequest() {
        val requestId: String = currentRequestId() ?: return
        runAction(newRelationship = Relationship.FRIEND) { friendsRepository.acceptFriendRequest(requestId) }
    }

    // Refuser (demande reçue) et annuler (demande envoyée) : même appel
    fun deleteRequest() {
        val requestId: String = currentRequestId() ?: return
        runAction(newRelationship = Relationship.NONE) { friendsRepository.deleteFriendRequest(requestId) }
    }

    fun removeFriend() {
        runAction(newRelationship = Relationship.NONE) { s -> friendsRepository.removeFriend(s.profile.id) }
    }

    private fun currentRequestId(): String? = (state as? UserProfileState.Loaded)?.requestId

    /**
     * Lance une action d'amitié puis recharge le profil : le serveur décide de ce qui est visible
     * (accepter fait apparaître bio/genres, retirer les masque).
     * La nouvelle relation est déduite de l'action réussie, car GET /profiles/:id ne la renvoie pas.
     */
    private fun <T> runAction(
        newRelationship: Relationship,
        newRequestId: (T) -> String? = { null },
        call: suspend (UserProfileState.Loaded) -> AuthResult<T>,
    ) {
        val current: UserProfileState.Loaded = state as? UserProfileState.Loaded ?: return
        if (current.isBusy) return
        state = current.copy(isBusy = true, actionError = null)
        viewModelScope.launch {
            when (val res: AuthResult<T> = call(current)) {
                is AuthResult.Failure -> {
                    state = current.copy(isBusy = false, actionError = res.error)
                }

                is AuthResult.Success -> {
                    val requestId: String? = newRequestId(res.data)
                    val reloaded: AuthResult<ProfileView> = profileRepository.getProfile(current.profile.id)
                    state = when (reloaded) {
                        is AuthResult.Success -> UserProfileState.Loaded(reloaded.data, newRelationship, requestId)
                        // Action réussie mais rechargement raté : on garde l'ancien profil et on le signale
                        is AuthResult.Failure -> current.copy(
                            relationship = newRelationship,
                            requestId = requestId,
                            isBusy = false,
                            actionError = reloaded.error,
                        )
                    }
                }
            }
        }
    }

    fun reset() {
        state = UserProfileState.Loading
    }

    companion object {
        val Factory: ViewModelProvider.Factory = viewModelFactory {
            initializer {
                val app: MusicRoomApp = this[APPLICATION_KEY] as MusicRoomApp
                UserProfileViewModel(app.profileRepository, app.friendsRepository)
            }
        }
    }

}
