package com.example.musicroom.feature.auth.ui

import com.example.musicroom.feature.auth.data.AuthError

fun AuthError.toMessage(): String =
    when (this) {
        AuthError.EmailNotVerified -> "Cette adresse e-mail n'est pas vérifiée. Merci de la confirmer"
        AuthError.InvalidOrExpiredLink -> "Ce lien est expiré ou invalide, demande un nouvel email"
        AuthError.UsernameTaken -> "Ce nom d'utilisateur est déjà pris."
        AuthError.InvalidCredentials -> "E-mail ou mot de passe incorrect."
        AuthError.RateLimited -> "Trop de tentatives. Réessaie dans quelques instants."
        is AuthError.Validation -> "Certains champs sont invalides."
        AuthError.Network -> "Impossible de joindre le serveur."
        is AuthError.Unknown -> "Une erreur est survenue. Réessaie plus tard."
        AuthError.InvalidIdToken -> "La connexion Google a échoué."
        AuthError.IdentityAlreadyLinked -> "Ce compte Google est déjà utilisé par un autre compte."
        AuthError.LastIdentity -> "Impossible de délier Google : c'est ton seul moyen de connexion."
        AuthError.IdentityNotFound -> "Aucun compte Google n'est lié."
        AuthError.IdentityNotDeletable -> "Ce moyen de connexion ne peut pas être supprimé."
        AuthError.NoGoogleAccount -> "Aucun compte Google sur cet appareil."
    }
