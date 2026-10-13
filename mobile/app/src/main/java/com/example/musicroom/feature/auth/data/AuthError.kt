package com.example.musicroom.feature.auth.data

//Network: in case of timeout
// Unknown: everything unexpected
// data object = singleton, une seule  instance pour un transport d'infos qui ne changent pas
// data class = peut avoir plusieurs instances (ex Unknown(500), Unknown(501) etc.)
sealed interface AuthError {
    data object EmailTaken : AuthError
    data object UsernameTaken : AuthError
    data object InvalidCredentials : AuthError
    data object RateLimited : AuthError
    data class Validation(val fields: List<FieldError>) : AuthError
    data object Network : AuthError
    data class Unknown(val httpCode: Int?) : AuthError

}