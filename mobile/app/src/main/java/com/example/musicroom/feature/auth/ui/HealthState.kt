package com.example.musicroom.feature.auth.ui

sealed interface HealthState {
    data object Loading: HealthState
    data object Reachable: HealthState
    data object Unreachable: HealthState
    data class Error(val message: String): HealthState

}