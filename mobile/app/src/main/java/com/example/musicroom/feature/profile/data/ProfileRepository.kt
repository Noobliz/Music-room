package com.example.musicroom.feature.profile.data

import com.example.musicroom.core.network.safeApiCall
import com.example.musicroom.feature.auth.data.AuthResult
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody
import okhttp3.RequestBody.Companion.toRequestBody


class ProfileRepository(
    private val api: ProfileApiService,
    private val json: Json
) {
    suspend fun getMyProfile(): AuthResult<OwnProfile> =
        safeApiCall(json) { api.getMyProfile() }

    suspend fun updateMyProfile(username: String? = null, bio: String? = null): AuthResult<OwnProfile> =
        safeApiCall(json) { api.updateMyProfile(UpdateProfileRequest(username, bio)) }

    suspend fun getProfile(userId: String): AuthResult<ProfileView> =
        safeApiCall(json) { api.getProfile(userId) }


    suspend fun uploadMyAvatar(bytes: ByteArray, mimeType: String): AuthResult<OwnProfile> {
        val body: RequestBody = bytes.toRequestBody(mimeType.toMediaType())
        return safeApiCall(json) { api.uploadMyAvatar(body) }
    }

    suspend fun deleteMyAvatar(): AuthResult<Unit> =
        safeApiCall(json, Unit) { api.deleteMyAvatar() }

}