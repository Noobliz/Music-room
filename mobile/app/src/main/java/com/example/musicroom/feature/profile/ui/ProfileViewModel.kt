package com.example.musicroom.feature.profile.ui

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
import com.example.musicroom.feature.profile.data.OwnProfile
import com.example.musicroom.feature.profile.data.ProfileRepository
import kotlinx.coroutines.launch

class ProfileViewModel(
    private val repository: ProfileRepository
) : ViewModel() {
    var state: ProfileState by mutableStateOf<ProfileState>(ProfileState.Loading)
        private set

    fun load() {
        if (state !is ProfileState.Loaded) {
            state = ProfileState.Loading
        }
        viewModelScope.launch {
            val res: AuthResult<OwnProfile> = repository.getMyProfile()
            state = when (res) {
                is AuthResult.Success -> ProfileState.Loaded(res.data)
                is AuthResult.Failure -> ProfileState.LoadFailed(res.error)
            }
        }
    }

    fun reset() {
        state = ProfileState.Loading
    }

    fun uploadAvatar(bytes: ByteArray, mimeType: String) {
        val current: ProfileState = state
        if (current !is ProfileState.Loaded || current.isBusy) return
        state = current.copy(isBusy = true, actionError = null)
        viewModelScope.launch {
            val res: AuthResult<OwnProfile> =
                repository.uploadMyAvatar(bytes, mimeType)
            state = when (res) {
                is AuthResult.Failure -> current.copy(isBusy = false, actionError = res.error)
                is AuthResult.Success -> ProfileState.Loaded(res.data)
            }
        }
    }

    fun deleteAvatar() {
        val current: ProfileState = state
        if (current !is ProfileState.Loaded || current.isBusy) return
        state = current.copy(isBusy = true, actionError = null)
        viewModelScope.launch {
            val res: AuthResult<Unit> =
                repository.deleteMyAvatar()
            state = when (res) {
                is AuthResult.Failure -> current.copy(isBusy = false, actionError = res.error)
                is AuthResult.Success -> current.copy(
                    profile = current.profile.copy(avatarUrl = null),
                    isBusy = false,
                )

            }
        }
    }


    companion object {
        val Factory: ViewModelProvider.Factory = viewModelFactory {
            initializer {
                val app: MusicRoomApp = this[APPLICATION_KEY] as MusicRoomApp
                ProfileViewModel(app.profileRepository)
            }
        }
    }
}