package com.example.musicroom.feature.profile.data

import kotlinx.serialization.Serializable

// Un champ laissé à null n'est pas envoyé, le serveur le laisse inchangé.
// Pour effacer : bio = "", fullName = "", musicGenres = emptyList().
@Serializable
data class UpdateProfileRequest(
    val username: String? = null,
    val bio: String? = null,
    val musicGenres: List<MusicGenre>? = null,
    val fullName: String? = null,
    val birthDate: String? = null,
)
