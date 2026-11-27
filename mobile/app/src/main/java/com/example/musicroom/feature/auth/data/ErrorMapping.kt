package com.example.musicroom.feature.auth.data

fun ErrorBody.toAuthError(httpCode: Int): AuthError =
    when (code) {
        "EMAIL_NOT_VERIFIED" -> AuthError.EmailNotVerified
        "INVALID_OR_EXPIRED_LINK" -> AuthError.InvalidOrExpiredLink
        "USERNAME_TAKEN" -> AuthError.UsernameTaken
        "INVALID_CREDENTIALS" -> AuthError.InvalidCredentials
        "RATE_LIMITED" -> AuthError.RateLimited
        "VALIDATION_ERROR" -> AuthError.Validation(details?:emptyList())
        "INVALID_ID_TOKEN" -> AuthError.InvalidIdToken
        "IDENTITY_ALREADY_LINKED" -> AuthError.IdentityAlreadyLinked
        "LAST_IDENTITY" -> AuthError.LastIdentity
        "IDENTITY_NOT_FOUND" -> AuthError.IdentityNotFound
        "IDENTITY_NOT_DELETABLE" -> AuthError.IdentityNotDeletable
        "PROFILE_NOT_FOUND" -> AuthError.ProfileNotFound
        "PAYLOAD_TOO_LARGE" -> AuthError.PayloadTooLarge
        "UNSUPPORTED_MEDIA_TYPE" -> AuthError.UnsupportedMediaType
        "CANNOT_FRIEND_SELF" -> AuthError.CannotFriendSelf
        "ALREADY_FRIENDS" -> AuthError.AlreadyFriends
        "FRIEND_REQUEST_EXISTS" -> AuthError.FriendRequestExists
        "FRIEND_REQUEST_NOT_FOUND" -> AuthError.FriendRequestNotFound
        "FRIEND_NOT_FOUND" -> AuthError.FriendNotFound
        else -> AuthError.Unknown(httpCode)
    }
