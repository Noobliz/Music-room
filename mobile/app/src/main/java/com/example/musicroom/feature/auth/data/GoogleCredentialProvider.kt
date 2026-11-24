package com.example.musicroom.feature.auth.data

import android.content.Context
import androidx.credentials.Credential
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.GetCredentialResponse
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialException
import androidx.credentials.exceptions.NoCredentialException
import com.example.musicroom.BuildConfig
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.android.libraries.identity.googleid.GoogleIdTokenParsingException
import java.security.MessageDigest
import java.security.SecureRandom

class GoogleCredentialProvider(
    private val webClientId: String = BuildConfig.GOOGLE_WEB_CLIENT_ID,
) {

    suspend fun requestIdToken(activityContext: Context): GoogleCredentialResult {
        val rawNonce: String = randomBytes(32).toHex()

        val option: GetSignInWithGoogleOption = GetSignInWithGoogleOption.Builder(webClientId)
            .setNonce(sha256(rawNonce).toHex())
            .build()
        val request: GetCredentialRequest = GetCredentialRequest.Builder()
            .addCredentialOption(option)
            .build()

        return try {
            val response: GetCredentialResponse =
                CredentialManager.create(activityContext).getCredential(activityContext, request)
            val credential: Credential = response.credential
            if (credential is CustomCredential &&
                credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL
            ) {
                val google: GoogleIdTokenCredential = GoogleIdTokenCredential.createFrom(credential.data)
                GoogleCredentialResult.Success(google.idToken, rawNonce)
            } else {
                GoogleCredentialResult.Failure
            }
        } catch (e: GetCredentialCancellationException) {
            GoogleCredentialResult.Cancelled
        } catch (e: NoCredentialException) {
            GoogleCredentialResult.NoAccount
        } catch (e: GetCredentialException) {
            GoogleCredentialResult.Failure
        } catch (e: GoogleIdTokenParsingException) {
            GoogleCredentialResult.Failure
        }
    }
    private fun randomBytes(size: Int): ByteArray {
        val bytes: ByteArray = ByteArray(size)
        SecureRandom().nextBytes(bytes)
        return bytes
    }

    private fun sha256(input: String): ByteArray =
        MessageDigest.getInstance("SHA-256").digest(input.toByteArray())

    private fun ByteArray.toHex(): String =
        joinToString("") { byte: Byte -> "%02x".format(byte) }
}