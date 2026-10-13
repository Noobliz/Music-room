package com.example.musicroom.core.storage

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import com.example.musicroom.feature.auth.data.AuthUser
import com.example.musicroom.feature.auth.data.Session


class SessionStorage(
    context: Context
) {
    private val prefs: SharedPreferences = EncryptedSharedPreferences.create(
        context,
        "session_prefs",
        MasterKey.Builder(context).setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build(),
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
    )

    fun save(session: Session) {
        prefs.edit()
            .putString(KEY_ACCESS_TOKEN, session.accessToken)
            .putString(KEY_REFRESH_TOKEN, session.refreshToken)
            .putString(KEY_TOKEN_TYPE, session.tokenType)
            .putInt(KEY_EXPIRES_IN, session.expiresIn)
            .putInt(KEY_EXPIRES_AT, session.expiresAt)
            .apply()
    }

    fun read(): Session? {
        val accessToken: String = prefs.getString(KEY_ACCESS_TOKEN, null) ?: return null
        val refreshToken: String = prefs.getString(KEY_REFRESH_TOKEN, null) ?: return null
        val tokenType: String = prefs.getString(KEY_TOKEN_TYPE, null) ?: return null
        if (!prefs.contains(KEY_EXPIRES_IN) || !prefs.contains(KEY_EXPIRES_AT)) return null

        return Session(
            accessToken = accessToken,
            refreshToken = refreshToken,
            tokenType = tokenType,
            expiresIn = prefs.getInt(KEY_EXPIRES_IN, 0),
            expiresAt = prefs.getInt(KEY_EXPIRES_AT, 0),
        )
    }

    fun clear() {
        prefs.edit().clear().apply()
    }


    fun saveUser(user: AuthUser) {
        prefs.edit()
            .putString(KEY_USER_ID, user.id)
            .putString(KEY_USER_EMAIL, user.email)
            .putString(KEY_USERNAME, user.username)
            .apply()
    }

    fun readUser(): AuthUser? {
        val id: String = prefs.getString(KEY_USER_ID, null) ?: return null
        val email: String = prefs.getString(KEY_USER_EMAIL, null) ?: return null
        val username: String = prefs.getString(KEY_USERNAME, null) ?: return null
        return AuthUser(id = id, email = email, username = username)
    }

    private companion object {
        const val KEY_ACCESS_TOKEN = "access_token"
        const val KEY_REFRESH_TOKEN = "refresh_token"
        const val KEY_TOKEN_TYPE = "token_type"
        const val KEY_EXPIRES_IN = "expires_in"
        const val KEY_EXPIRES_AT = "expires_at"
        const val KEY_USER_ID = "user_id"
        const val KEY_USER_EMAIL = "user_email"
        const val KEY_USERNAME = "username"
    }
}