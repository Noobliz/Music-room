package com.example.musicroom.feature.auth.ui


import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

import androidx.compose.foundation.layout.Column
import androidx.compose.material3.Button
import androidx.compose.material3.Text
import androidx.compose.ui.graphics.Color

@Composable
fun HealthScreen(
    state: HealthState,
    onRetryClick: () -> Unit,
    modifier: Modifier = Modifier
) {

    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text="Test de sante"
        )
        when(state) {
            HealthState.Loading -> {
                CircularProgressIndicator()
                Text(
                    text="Chargement..."
                )
            }

            HealthState.Reachable -> {
                Text(
                    text="OK",
                    color = Color.Green
                )

            }

            HealthState.Unreachable -> {
                Text(
                    text="Le serveur ne repond pas.",
                    color = MaterialTheme.colorScheme.error
                )

            }

            is HealthState.Error -> {
                Text(
                    text = state.message,
                    color = MaterialTheme.colorScheme.error
                )

            }

        }
        if (state != HealthState.Loading){
            Button(
                onClick = onRetryClick
            ) {
                Text(
                    text="Reessayer",
                )

            }

        }
    }
}