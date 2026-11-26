package com.example.musicroom.feature.profile.ui

import com.example.musicroom.feature.auth.data.AuthError
import com.example.musicroom.feature.profile.data.OwnProfile

sealed interface ProfileState {

    data object Loading : ProfileState
    data class LoadFailed(val error: AuthError) : ProfileState
    data class Loaded(
        val profile: OwnProfile,
        val isBusy: Boolean = false,
        val actionError: AuthError? = null,
    ) : ProfileState
}