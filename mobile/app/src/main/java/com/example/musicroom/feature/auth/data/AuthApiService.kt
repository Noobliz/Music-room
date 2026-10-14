package com.example.musicroom.feature.auth.data

import retrofit2.Call
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

interface AuthApiService {
    @GET("health")
    suspend fun checkServerHealth(): Response<HealthResponse>

    @POST("auth/signup")
    suspend fun signup(@Body request: SignupRequest): Response<SignupResponse>

    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): Response<AuthResponse>

//    @POST("auth/refresh")
//    suspend fun refresh(@Body request: RefreshRequest): Response<AuthResponse>
    @POST("auth/refresh")
    fun refreshBlocking(@Body request: RefreshRequest): Call<AuthResponse> // sans suspend car la fonction TokenAuthenticator de okhttp n'est pas une coroutine

    @GET("auth/me")
    suspend fun me(): Response<AuthUser>


    @POST("auth/logout")
    suspend fun logout(): Response<Unit>

    @POST("auth/email/verify")
    suspend fun verifyEmail(@Body request: VerifyEmailRequest): Response<AuthResponse>

    @POST("auth/email/resend")
    suspend fun resendEmail(@Body request: ResendEmailRequest): Response<Unit>

    @POST("auth/password/forgot")
    suspend fun forgotPassword(@Body request: ForgotPasswordRequest): Response<Unit>

    @POST("auth/password/reset")
    suspend fun resetPassword(@Body request: ResetPasswordRequest): Response<Unit>
}
