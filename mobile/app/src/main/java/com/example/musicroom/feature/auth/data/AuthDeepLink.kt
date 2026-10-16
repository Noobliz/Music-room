package com.example.musicroom.feature.auth.data

import android.net.Uri

// Lien reçu par email, traduit en type sûr. Le token est une donnée sensible : ne jamais logger ces objets.
sealed interface AuthDeepLink {
    data class VerifyEmail(val tokenHash: String) : AuthDeepLink
    data class ResetPassword(val tokenHash: String) : AuthDeepLink
}

// Renvoie null pour tout lien inattendu
fun parseAuthDeepLink(uri: Uri?): AuthDeepLink? {
    val link: Uri = uri ?: return null
    if (link.scheme != "musicroom" || link.host != "auth") return null

    val tokenHash: String? = link.getQueryParameter("token_hash")
    if (tokenHash.isNullOrBlank()) return null

    return when (link.path) {
        "/verify-email" -> AuthDeepLink.VerifyEmail(tokenHash)
        "/reset-password" -> AuthDeepLink.ResetPassword(tokenHash)
        else -> null
    }
}
