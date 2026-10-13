package com.example.musicroom.feature.auth.ui

import com.example.musicroom.feature.auth.data.AuthError

fun AuthError.toMessage(): String =
    when (this) {
        AuthError.EmailTaken -> "Cette adresse e-mail est déjà utilisée."
        AuthError.UsernameTaken -> "Ce nom d'utilisateur est déjà pris."
        AuthError.InvalidCredentials -> "E-mail ou mot de passe incorrect."
        AuthError.RateLimited -> "Trop de tentatives. Réessaie dans quelques instants."
        is AuthError.Validation -> "Certains champs sont invalides."
        AuthError.Network -> "Impossible de joindre le serveur."
        is AuthError.Unknown -> "Une erreur est survenue. Réessaie plus tard."
    }
