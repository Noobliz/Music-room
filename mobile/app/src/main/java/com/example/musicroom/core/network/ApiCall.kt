package com.example.musicroom.core.network

import com.example.musicroom.feature.auth.data.AuthError
import com.example.musicroom.feature.auth.data.AuthResult
import com.example.musicroom.feature.auth.data.ErrorResponse
import com.example.musicroom.feature.auth.data.toAuthError
import kotlinx.serialization.SerializationException
import kotlinx.serialization.json.Json
import retrofit2.Response
import java.io.IOException

private fun parseError(response:  Response<*>, json: Json): AuthError {
    val raw: String? = response.errorBody()?.string()
    if (raw == null) {
        return (AuthError.Unknown(response.code()))
    }
    return try {
        val res: ErrorResponse = json.decodeFromString<ErrorResponse>(raw)
        res.error.toAuthError(response.code())
    } catch (e: SerializationException) {
        AuthError.Unknown(response.code())
    }
}

suspend fun <T> safeApiCall(
    json: Json,
    emptyBody: T? = null,
    call: suspend () ->  Response<T>,
): AuthResult<T> {

    return try {
        val response:  Response<T> = call()
        if (response.isSuccessful) {
            val data: T? = response.body() ?: emptyBody
            if (data != null) {
                AuthResult.Success(data)
            } else AuthResult.Failure(AuthError.Unknown(response.code()))
        } else AuthResult.Failure(parseError(response, json))
    } catch (e: IOException) {
        AuthResult.Failure(AuthError.Network)
    } catch (e: SerializationException) {
        AuthResult.Failure(AuthError.Unknown(null))
    }
}