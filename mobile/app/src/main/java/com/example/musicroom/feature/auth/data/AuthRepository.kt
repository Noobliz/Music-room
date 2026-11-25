package com.example.musicroom.feature.auth.data

import com.example.musicroom.core.network.safeApiCall
import com.example.musicroom.core.session.SessionManager
import kotlinx.coroutines.flow.StateFlow
import kotlinx.serialization.json.Json
import java.io.IOException


class AuthRepository(
    private val api: AuthApiService,
    private val authenticatedApi: AuthApiService,
    private val json: Json,
    private val sessionManager: SessionManager
) {

    val currentUser: StateFlow<AuthUser?> = sessionManager.currentUser


    suspend fun signup(
        email: String,
        password: String,
        username: String
    ): AuthResult<SignupResponse> =
        safeApiCall(json) { api.signup(SignupRequest(email, password, username)) }


    suspend fun login(email: String, password: String): AuthResult<AuthResponse> {
        val res: AuthResult<AuthResponse> =
            safeApiCall(json) { api.login(LoginRequest(email, password)) }

        if (res is AuthResult.Success) {
            sessionManager.onAuthenticated(res.data)
        }
        return res
    }

    suspend fun resetPassword(tokenHash: String, password: String): AuthResult<Unit> {
        val res: AuthResult<Unit> = safeApiCall(json, emptyBody = Unit) {
            api.resetPassword(
                ResetPasswordRequest(
                    tokenHash,
                    password
                )
            )
        }
        // Le serveur ferme toutes les sessions après un reset
        if (res is AuthResult.Success) {
            sessionManager.clear()
        }
        return res
    }


    suspend fun verifyEmail(tokenHash: String):
            AuthResult<AuthResponse> {
        val res: AuthResult<AuthResponse> =
            safeApiCall(json) { api.verifyEmail(VerifyEmailRequest(tokenHash)) }
        if (res is AuthResult.Success) {
            sessionManager.onAuthenticated(res.data)
        }
        return res
    }


    suspend fun resendEmail(email: String):
            AuthResult<Unit> =
        safeApiCall(json) { api.resendEmail(ResendEmailRequest(email)) }

    suspend fun forgotPassword(email: String): AuthResult<Unit> =
        safeApiCall(json) { api.forgotPassword(ForgotPasswordRequest(email)) }


    suspend fun logout() {
        try {
            authenticatedApi.logout()
        } catch (e: IOException) {
        } finally {
            sessionManager.clear()
        }
    }

    suspend fun signInWithGoogle(idToken: String, nonce: String): AuthResult<OAuthResponse> {
        val res: AuthResult<OAuthResponse> =
            safeApiCall(json) { api.signInWithGoogle(IdTokenRequest(idToken, nonce)) }
        if (res is AuthResult.Success) {
            sessionManager.onAuthenticated(res.data.toAuthResponse())
        }
        return res
    }

    suspend fun listIdentities(): AuthResult<IdentitiesResponse> =
        safeApiCall(json) { authenticatedApi.listIdentities() }

    suspend fun linkGoogle(idToken: String, nonce: String): AuthResult<IdentitiesResponse> =
        safeApiCall(json) { authenticatedApi.linkGoogle(IdTokenRequest(idToken, nonce)) }

    suspend fun unlinkGoogle(): AuthResult<Unit> =
        safeApiCall(json, emptyBody = Unit) { authenticatedApi.unlinkGoogle() }
}