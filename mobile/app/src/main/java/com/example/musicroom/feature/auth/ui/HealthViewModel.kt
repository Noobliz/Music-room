package com.example.musicroom.feature.auth.ui

import android.util.Log
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.musicroom.core.network.ApiClient
import com.example.musicroom.feature.auth.data.HealthResponse
import kotlinx.coroutines.launch
import kotlinx.serialization.SerializationException
import retrofit2.Response
import java.io.IOException


class HealthViewModel: ViewModel() {
    var state: HealthState by mutableStateOf<HealthState>(HealthState.Loading)
        private set
    init {
        checkHealth()
    }

    fun checkHealth () {
        state = HealthState.Loading
        viewModelScope.launch {
            state = try {
                val response: Response<HealthResponse> = ApiClient.authApi.checkServerHealth()
                if (response.isSuccessful && response.body()?.status == "ok" )
                    HealthState.Reachable
                else {
                    HealthState.Error("Server answered with an error")

                }
            } catch(e: IOException) {

                HealthState.Unreachable

            } catch(e: SerializationException) {
                HealthState.Error("Json invalid")
            }
        }
    }

}