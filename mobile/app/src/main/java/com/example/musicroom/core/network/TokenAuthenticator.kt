package com.example.musicroom.core.network

import com.example.musicroom.core.session.SessionManager
import com.example.musicroom.feature.auth.data.AuthApiService
import com.example.musicroom.feature.auth.data.AuthResponse
import com.example.musicroom.feature.auth.data.RefreshRequest
import kotlinx.serialization.SerializationException
import okhttp3.Authenticator
import okhttp3.Request
import okhttp3.Response
import okhttp3.Route
import java.io.IOException
import retrofit2.Response as RetrofitResponse


class TokenAuthenticator(
    private val sessionManager: SessionManager,
    private val authApi: AuthApiService
): Authenticator {
    private val lock: Any = Any()
    private val codeException: Set<Int> = setOf(408, 429)
    override fun authenticate(route: Route?, response: Response): Request? {

        if (response.priorResponse != null) return null

        //genre de mutex pour eviter 2 authenticate au meme moment sur differents threads
        synchronized(lock){
            val expiredToken: String? = response.request.header("Authorization")
            val expiredTokenTrimmed: String? = expiredToken?.removePrefix("Bearer ")
            val newToken: String? = sessionManager.accessToken()
            if (newToken != null && newToken != expiredTokenTrimmed)
                return response.request.newBuilder()
                    .header("Authorization", "Bearer $newToken")
                    .build()
            val refreshToken: String? = sessionManager.refreshToken()
            if (refreshToken == null) return null
            try{
                val refreshResponse: RetrofitResponse<AuthResponse> = authApi.refreshBlocking(RefreshRequest(refreshToken))
                    .execute()
                val body: AuthResponse? = refreshResponse.body()
                if (refreshResponse.isSuccessful && body != null) {
                    sessionManager.onAuthenticated(body)
                    return response.request.newBuilder()
                        .header("Authorization", "Bearer ${body.session.accessToken}")
                        .build()

                }
                if (refreshResponse.code() in 400..499) {
                    if (refreshResponse.code() !in codeException)
                        sessionManager.clear()
                    return null
                }
                return null
            } catch(e: IOException){
                return null
            } catch(e: SerializationException) {return null}

        }
    }
}