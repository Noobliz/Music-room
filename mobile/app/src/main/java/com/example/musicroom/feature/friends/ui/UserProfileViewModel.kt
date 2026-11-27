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
import com.example.musicroom.feature.friends.data.Relationship
import com.example.musicroom.feature.profile.data.ProfileRepository
import com.example.musicroom.feature.profile.data.ProfileView
import kotlinx.coroutines.launch


class UserProfileViewModel(
    private val repository: ProfileRepository
) : ViewModel() {
    var state: UserProfileState by mutableStateOf<UserProfileState>(UserProfileState.Loading)
        private set

    fun load(userId: String, relationship: Relationship) {
        state = UserProfileState.Loading
        viewModelScope.launch {
            val res: AuthResult<ProfileView> = repository.getProfile(userId)
            state = when (res) {
                is AuthResult.Success -> UserProfileState.Loaded(res.data, relationship)
                is AuthResult.Failure -> UserProfileState.LoadFailed(res.error)

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
                UserProfileViewModel(app.profileRepository)
            }
        }
    }

}