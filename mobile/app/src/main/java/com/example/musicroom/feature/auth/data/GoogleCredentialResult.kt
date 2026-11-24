package com.example.musicroom.feature.auth.data



sealed interface GoogleCredentialResult {
    data class Success(val idToken: String, val nonce: String) : GoogleCredentialResult
    data object Cancelled : GoogleCredentialResult   // l'utilisateur a ferme la fenetre
    data object NoAccount : GoogleCredentialResult   // aucun compte Google sur l'appareil
    data object Failure : GoogleCredentialResult     // tout le reste
}