package com.example.musicroom.core.network

import com.example.musicroom.core.session.SessionManager
import okhttp3.Interceptor
import okhttp3.Request
import okhttp3.Response

class AuthInterceptor(
    private val sessionManager: SessionManager
) : Interceptor {
    private val publicPaths: Set<String> = setOf("/auth/signup", "/auth/login", "/auth/refresh")
    override fun intercept(chain: Interceptor.Chain): Response {
        val req: Request = chain.request()
        if (req.url.encodedPath in publicPaths) return chain.proceed(req)
        val token: String? = sessionManager.accessToken()
        if (token == null) return chain.proceed(req)
        val authed: Request = req.newBuilder()
            .header("Authorization", "Bearer $token")
            .build()
        return chain.proceed(authed)
    }
}