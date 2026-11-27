package com.example.musicroom.feature.friends.ui

import androidx.compose.runtime.MutableState
import com.example.musicroom.feature.auth.data.AuthError
import com.example.musicroom.feature.friends.data.UserSearchResult

data class UserSearchState(
    val query: String = "",
    val results: SearchResults = SearchResults.Idle,
) {


    sealed interface SearchResults {
        data object Idle : SearchResults
        data object Loading : SearchResults
        data class Loaded(val users: List<UserSearchResult>) : SearchResults
        data class Failed(val error: AuthError) : SearchResults
    }

}