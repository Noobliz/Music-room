package com.example.musicroom.feature.profile.data

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

// Liste fixe du back-end
@Serializable
enum class MusicGenre {
    @SerialName("pop") POP,
    @SerialName("rock") ROCK,
    @SerialName("hip_hop") HIP_HOP,
    @SerialName("rnb") RNB,
    @SerialName("electronic") ELECTRONIC,
    @SerialName("jazz") JAZZ,
    @SerialName("classical") CLASSICAL,
    @SerialName("metal") METAL,
    @SerialName("folk") FOLK,
    @SerialName("reggae") REGGAE,
    @SerialName("blues") BLUES,
    @SerialName("country") COUNTRY,
    @SerialName("soul") SOUL,
    @SerialName("latin") LATIN,
    @SerialName("world") WORLD,
}
