package com.example.musicroom.feature.auth.data

import com.example.musicroom.core.session.SessionManager
import kotlinx.coroutines.flow.StateFlow
import kotlinx.serialization.SerializationException
import kotlinx.serialization.json.Json
import java.io.IOException
import retrofit2.Response

class AuthRepository(
    private val api: AuthApiService,
    private val authenticatedApi: AuthApiService,
    private val json: Json,
    private val sessionManager: SessionManager
) {

    val currentUser: StateFlow<AuthUser?> = sessionManager.currentUser


    private fun parseError(response: Response<*>): AuthError {
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

    private suspend fun <T> execute(call: suspend () -> Response<T>): AuthResult<T> {

        return try {
            val response: Response<T> = call()
            if (response.isSuccessful) {
                val body: T? = response.body()
                if (body != null) {
                    AuthResult.Success(body)
                } else AuthResult.Failure(AuthError.Unknown(response.code()))
            } else AuthResult.Failure(parseError(response))
        } catch (e: IOException) {
            AuthResult.Failure(AuthError.Network)
        } catch (e: SerializationException) {
            AuthResult.Failure(AuthError.Unknown(null))
        }
    }

    suspend fun signup(
        email: String,
        password: String,
        username: String
    ): AuthResult<SignupResponse> =
        execute { api.signup(SignupRequest(email, password, username)) }

    suspend fun login(email: String, password: String): AuthResult<AuthResponse> {
        val res: AuthResult<AuthResponse> = execute { api.login(LoginRequest(email, password)) }
        if (res is AuthResult.Success) {
            sessionManager.onAuthenticated(res.data)
        }
        return res
    }


//    suspend fun refresh(refreshToken: String): AuthResult =
//        execute { api.refresh(RefreshRequest(refreshToken)) }

    suspend fun logout() {
        try {
            authenticatedApi.logout()
        } catch (e: IOException) {
        } finally {
            sessionManager.clear()
        }
    }
}