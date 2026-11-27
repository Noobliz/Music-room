package com.example.musicroom.feature.friends.ui

import com.example.musicroom.feature.auth.data.AuthError
import com.example.musicroom.feature.friends.data.Relationship
import com.example.musicroom.feature.profile.data.ProfileView


sealed interface UserProfileState {
    data object Loading : UserProfileState
    data class LoadFailed(val error: AuthError) : UserProfileState
    data class Loaded(
        val profile: ProfileView,
        val relationship: Relationship,
        // Id de la demande en attente (REQUEST_SENT / REQUEST_RECEIVED), null sinon
        val requestId: String? = null,
        // Une action (ajouter, accepter...) est en cours : boutons désactivés
        val isBusy: Boolean = false,
        // Erreur de la dernière action, affichée sans perdre le profil
        val actionError: AuthError? = null,
    ) : UserProfileState

}
