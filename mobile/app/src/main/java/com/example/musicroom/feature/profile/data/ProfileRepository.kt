package com.example.musicroom.feature.profile.data

import com.example.musicroom.core.network.safeApiCall
import com.example.musicroom.core.session.SessionManager
import com.example.musicroom.feature.auth.data.AuthResult
import com.example.musicroom.feature.auth.data.AuthUser
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody
import okhttp3.RequestBody.Companion.toRequestBody


class ProfileRepository(
    private val api: ProfileApiService,
    private val json: Json,
    private val sessionManager: SessionManager,
) {
    suspend fun getMyProfile(): AuthResult<OwnProfile> =
        safeApiCall(json) { api.getMyProfile() }

    suspend fun updateMyProfile(
        username: String? = null,
        bio: String? = null,
        musicGenres: List<MusicGenre>? = null,
        fullName: String? = null,
        birthDate: String? = null
    ): AuthResult<OwnProfile> {
        val res: AuthResult<OwnProfile> = safeApiCall(json) {
            api.updateMyProfile(
                UpdateProfileRequest(
                    username = username,
                    bio = bio,
                    musicGenres = musicGenres,
                    fullName = fullName,
                    birthDate = birthDate
                )
            )
        }
        if (res is AuthResult.Success) {
            sessionManager.updateUser(
                AuthUser(
                    id = res.data.id,
                    email = res.data.email,
                    username = res.data.username
                )
            )
        }
        return res
    }

    suspend fun getProfile(userId: String): AuthResult<ProfileView> =
        safeApiCall(json) { api.getProfile(userId) }


    suspend fun uploadMyAvatar(bytes: ByteArray, mimeType: String): AuthResult<OwnProfile> {
        val body: RequestBody = bytes.toRequestBody(mimeType.toMediaType())
        return safeApiCall(json) { api.uploadMyAvatar(body) }
    }

    suspend fun deleteMyAvatar(): AuthResult<Unit> =
        safeApiCall(json, Unit) { api.deleteMyAvatar() }

}