package com.example.musicroom.feature.friends.ui

import com.example.musicroom.feature.auth.data.AuthError
import com.example.musicroom.feature.friends.data.Relationship
import com.example.musicroom.feature.profile.data.ProfileView


sealed interface UserProfileState {
    data object Loading : UserProfileState
    data class LoadFailed(val error: AuthError) : UserProfileState
    data class Loaded(
        val profile: ProfileView,
        val relationship: Relationship
    ) : UserProfileState

}