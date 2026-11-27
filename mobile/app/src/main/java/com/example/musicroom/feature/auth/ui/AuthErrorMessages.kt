package com.example.musicroom.feature.auth.ui

import com.example.musicroom.feature.auth.data.AuthError

fun AuthError.toMessage(): String =
    when (this) {
        AuthError.EmailNotVerified -> "Cette adresse e-mail n'est pas vérifiée. Merci de la confirmer"
        AuthError.InvalidOrExpiredLink -> "Ce lien est expiré ou invalide, demandez un nouvel email"
        AuthError.UsernameTaken -> "Ce nom d'utilisateur est déjà pris."
        AuthError.InvalidCredentials -> "E-mail ou mot de passe incorrect."
        AuthError.RateLimited -> "Trop de tentatives. Réessayez dans quelques instants."
        is AuthError.Validation -> "Certains champs sont invalides."
        AuthError.Network -> "Impossible de joindre le serveur."
        is AuthError.Unknown -> "Une erreur est survenue. Réessayez plus tard."
        AuthError.InvalidIdToken -> "La connexion Google a échoué."
        AuthError.IdentityAlreadyLinked -> "Ce compte Google est déjà utilisé par un autre compte."
        AuthError.LastIdentity -> "Impossible de délier Google : c'est le seul moyen de connexion."
        AuthError.IdentityNotFound -> "Aucun compte Google n'est lié."
        AuthError.IdentityNotDeletable -> "Ce moyen de connexion ne peut pas être supprimé."
        AuthError.NoGoogleAccount -> "Aucun compte Google sur cet appareil."
        AuthError.ProfileNotFound -> "Ce profil n'existe pas."
        AuthError.PayloadTooLarge -> "L'image est trop lourde (50mo maximum)."
        AuthError.UnsupportedMediaType -> "Format non pris en charge : choisissez une image JPEG, PNG ou WebP."
        AuthError.CannotFriendSelf -> "Vous ne pouvez pas vous ajouter vous-même."
        AuthError.AlreadyFriends -> "Vous êtes déjà amis."
        AuthError.FriendRequestExists -> "Une demande est déjà en attente avec cette personne."
        AuthError.FriendRequestNotFound -> "Cette demande n'existe plus. Actualisez la liste."
        AuthError.FriendNotFound -> "Cette personne ne fait plus partie de vos amis."
    }
