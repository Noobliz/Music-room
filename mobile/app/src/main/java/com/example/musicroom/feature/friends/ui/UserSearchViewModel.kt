package com.example.musicroom.feature.friends.ui

import androidx.compose.runtime.mutableStateOf
import androidx.lifecycle.ViewModel
import com.example.musicroom.feature.friends.data.FriendsRepository
import androidx.compose.runtime.setValue
import androidx.compose.runtime.getValue
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.ViewModelProvider.AndroidViewModelFactory.Companion.APPLICATION_KEY
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.example.musicroom.MusicRoomApp
import com.example.musicroom.feature.auth.data.AuthResult
import com.example.musicroom.feature.friends.data.UserSearchResult
import com.example.musicroom.feature.friends.ui.UserSearchState.SearchResults
import kotlinx.coroutines.launch


class UserSearchViewModel(
    private val repository: FriendsRepository

) : ViewModel() {
    var state: UserSearchState by mutableStateOf<UserSearchState>(UserSearchState())
        private set

    fun onQueryChange(value: String) {
        state = state.copy(query = value)
    }

    fun search() {
        if (state.results is SearchResults.Loading) return
        val queryTrimmed: String = state.query.trim()
        if (queryTrimmed.isEmpty()) return
        state = state.copy(results = SearchResults.Loading)
        viewModelScope.launch {
            val res: AuthResult<List<UserSearchResult>> = repository.searchUsers(queryTrimmed)
            state = when (res) {
                is AuthResult.Success -> state.copy(results = SearchResults.Loaded(res.data))
                is AuthResult.Failure -> state.copy(results = SearchResults.Failed(res.error))
            }
        }

    }

    fun reset() {
        state = UserSearchState()
    }

    companion object {
        val Factory: ViewModelProvider.Factory = viewModelFactory {
            initializer {
                val app: MusicRoomApp = this[APPLICATION_KEY] as MusicRoomApp
                UserSearchViewModel(app.friendsRepository)
            }
        }
    }
}