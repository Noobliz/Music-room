package com.example.musicroom.feature.profile.ui

import com.example.musicroom.feature.auth.data.AuthError
import com.example.musicroom.feature.profile.data.MusicGenre

data class EditProfileState(
    val username: String = "",
    val bio: String = "",
    val musicGenres: Set<MusicGenre> = emptySet(),
    val fullName: String = "",
    val birthDate: String = "",
    val isSaving: Boolean = false,
    val error: AuthError? = null,
    val saved: Boolean = false,
)