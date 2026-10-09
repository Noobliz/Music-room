package com.example.musicroom


import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.ViewModelProvider.AndroidViewModelFactory.Companion.APPLICATION_KEY
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.example.musicroom.feature.auth.data.AuthRepository
import com.example.musicroom.feature.auth.data.AuthUser
import kotlinx.coroutines.flow.StateFlow

class MainViewModel(private val repository: AuthRepository) : ViewModel() {
    val currentUser: StateFlow<AuthUser?> = repository.currentUser

    fun logout() {
        repository.logout()
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