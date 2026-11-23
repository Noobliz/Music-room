package com.example.musicroom.feature.auth.ui

import com.example.musicroom.feature.auth.data.AuthError
import com.example.musicroom.feature.auth.data.Identity

sealed interface LinkedAccountsState {
    data object Loading: LinkedAccountsState
    data class LoadFailed(val error: AuthError): LinkedAccountsState
    data class Loaded(
        val identities: List<Identity>,
        val isBusy: Boolean = false,
        val actionError: AuthError? = null,
    ): LinkedAccountsState{
        val isGoogleLinked: Boolean
            get() = identities.any { it.provider == "google" }
    }

}