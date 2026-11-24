package com.example.musicroom.feature.auth.ui

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
import com.example.musicroom.feature.auth.data.AuthError
import com.example.musicroom.feature.auth.data.AuthRepository
import com.example.musicroom.feature.auth.data.AuthResult
import com.example.musicroom.feature.auth.data.GoogleCredentialResult
import com.example.musicroom.feature.auth.data.IdentitiesResponse
import kotlinx.coroutines.launch

class LinkedAccountsViewModel(
    private val repository: AuthRepository
): ViewModel() {
     var state: LinkedAccountsState by mutableStateOf<LinkedAccountsState>(LinkedAccountsState.Loading)
        private set


    fun load(){
        if (state !is LinkedAccountsState.Loaded)
            state = LinkedAccountsState.Loading
        viewModelScope.launch {
            val res: AuthResult<IdentitiesResponse> = repository.listIdentities()
            state = when(res){
                is AuthResult.Success -> LinkedAccountsState.Loaded(res.data.identities)
                is AuthResult.Failure -> LinkedAccountsState.LoadFailed(res.error)
            }
        }

    }

    fun linkGoogle(credential: GoogleCredentialResult){
        val current: LinkedAccountsState = state
        if (current !is LinkedAccountsState.Loaded || current.isBusy) return

        when (credential){
            is GoogleCredentialResult.Success -> {
                state = current.copy(isBusy = true, actionError = null)
                viewModelScope.launch {
                    val res: AuthResult<IdentitiesResponse> =
                        repository.linkGoogle(credential.idToken, credential.nonce)
                    state = when (res) {
                        is AuthResult.Success -> LinkedAccountsState.Loaded(res.data.identities)
                        is AuthResult.Failure -> current.copy(isBusy = false, actionError = res.error)
                    }
                }

            }
            GoogleCredentialResult.Cancelled -> Unit
            GoogleCredentialResult.NoAccount -> state = current.copy(actionError = AuthError.NoGoogleAccount)
            GoogleCredentialResult.Failure -> state = current.copy(actionError = AuthError.InvalidIdToken)
        }


    }

    fun unlinkGoogle(){
        val current: LinkedAccountsState = state
        if (current !is LinkedAccountsState.Loaded || current.isBusy) return
        state = current.copy(isBusy = true, actionError = null)
        viewModelScope.launch{
            val res: AuthResult<Unit> =
                repository.unlinkGoogle()
            state = when(res) {
                is AuthResult.Failure -> current.copy(isBusy = false, actionError = res.error)
                is AuthResult.Success -> {
                    val resGetList: AuthResult<IdentitiesResponse> = repository.listIdentities()
                    when(resGetList) {
                        is AuthResult.Success -> LinkedAccountsState.Loaded(resGetList.data.identities)
                        is AuthResult.Failure -> LinkedAccountsState.LoadFailed(resGetList.error)
                    }
                }
            }
        }

    }

    fun reset() {
        state = LinkedAccountsState.Loading
    }


    companion object {
        val Factory: ViewModelProvider.Factory = viewModelFactory {
            initializer {
                val app: MusicRoomApp = this[APPLICATION_KEY] as MusicRoomApp
                LinkedAccountsViewModel(app.authRepository)
            }
        }
    }


}