package com.example.musicroom


import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.ViewModelProvider.AndroidViewModelFactory.Companion.APPLICATION_KEY
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.example.musicroom.feature.auth.data.AuthDeepLink
import com.example.musicroom.feature.auth.data.AuthRepository
import com.example.musicroom.feature.auth.data.AuthUser
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class MainViewModel(private val repository: AuthRepository) : ViewModel() {
    val currentUser: StateFlow<AuthUser?> = repository.currentUser


    var pendingDeepLink: AuthDeepLink? by mutableStateOf<AuthDeepLink?>(null)
        private set
    fun logout() {
        viewModelScope.launch {
            repository.logout()

        }
    }

    fun onDeepLink(link: AuthDeepLink?){
        if (link != null)
            pendingDeepLink = link
    }

    fun consumeDeepLink() {
        pendingDeepLink = null
    }
    companion object {
        val Factory: ViewModelProvider.Factory = viewModelFactory {
            initializer {
                val app: MusicRoomApp = this[APPLICATION_KEY] as MusicRoomApp
                MainViewModel(app.authRepository)
            }
        }
    }
}
