package com.example.musicroom.feature.auth.data

import com.example.musicroom.core.storage.SessionStorage
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.serialization.SerializationException
import kotlinx.serialization.json.Json
import java.io.IOException
import retrofit2.Response

class AuthRepository(
    private val api: AuthApiService,
    private val json: Json,
    private val storage: SessionStorage
) {
    private val _currentUser: MutableStateFlow<AuthUser?> = MutableStateFlow(
        if (storage.read() != null) storage.readUser() else null
    )
    val currentUser: StateFlow<AuthUser?> = _currentUser.asStateFlow()

    fun logout() {
        storage.clear()
        _currentUser.value = null
    }
    private fun parseError(response: Response<*>): AuthError {
        val raw = response.errorBody()?.string()
        if (raw == null){
            return (AuthError.Unknown(response.code()))
        }
        return try{
            val res = json.decodeFromString<ErrorResponse>(raw)
            res.error.toAuthError(response.code())
        } catch(e: SerializationException){
            AuthError.Unknown(response.code())
        }
    }

    private suspend fun execute(call: suspend () -> Response<AuthResponse>): AuthResult {

        return try {
            val response = call()
            if (response.isSuccessful) {
                val body = response.body()
                if (body != null) {
                    storage.save(body.session)
                    storage.saveUser(body.user)
                    _currentUser.value = body.user
                    AuthResult.Success(body)
                }
                else AuthResult.Failure(AuthError.Unknown(response.code()))
            }
            else AuthResult.Failure(parseError(response))
        } catch (e: IOException){
            AuthResult.Failure(AuthError.Network)
        } catch (e: SerializationException){
            AuthResult.Failure(AuthError.Unknown(null))
        }

    }

    suspend fun signup(email:String, password: String, username: String): AuthResult =
        execute { api.signup(SignupRequest(email, password, username)) }
    suspend fun login(email: String, password: String): AuthResult =
        execute { api.login(LoginRequest(email, password)) }
    suspend fun refresh(refreshToken: String): AuthResult =
        execute { api.refresh(RefreshRequest(refreshToken)) }
}