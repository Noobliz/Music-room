package com.example.musicroom.feature.friends.data

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
enum class Relationship {
//    ici seralName sert a donner une valeur differente de l'ENUM pour pouvoir etre interprete dans le json
    @SerialName("none") NONE,
    @SerialName("friend") FRIEND,
    @SerialName("request_sent") REQUEST_SENT,
    @SerialName("request_received") REQUEST_RECEIVED,
}
