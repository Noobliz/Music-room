package com.example.musicroom.feature.friends.ui

import com.example.musicroom.feature.auth.data.AuthError
import com.example.musicroom.feature.friends.data.Friend
import com.example.musicroom.feature.friends.data.FriendRequests


// "out T" : un LoadState<Nothing> (Loading, Failed) peut etre range dans un LoadState<List<Friend>>.
sealed interface LoadState<out T> {
    data object Loading : LoadState<Nothing>
    data class Loaded<T>(val data: T) : LoadState<T>
    data class Failed(val error: AuthError) : LoadState<Nothing>
}

enum class FriendsTab { FRIENDS, REQUESTS }

data class FriendsState(
    val tab: FriendsTab = FriendsTab.FRIENDS,
    val friends: LoadState<List<Friend>> = LoadState.Loading,
    val requests: LoadState<FriendRequests> = LoadState.Loading,
    val busyIds: Set<String> = emptySet(),
    val actionError: AuthError? = null,
)
