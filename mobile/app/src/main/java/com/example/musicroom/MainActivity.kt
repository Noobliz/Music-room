package com.example.musicroom

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.ui.Modifier
import com.example.musicroom.core.permission.LocalNetworkPermissionGate
import com.example.musicroom.feature.auth.ui.HealthScreen
import com.example.musicroom.feature.auth.ui.HealthViewModel
import com.example.musicroom.feature.auth.ui.LoginScreen
import com.example.musicroom.feature.auth.ui.LoginViewModel
import com.example.musicroom.ui.theme.MusicroomTheme

class MainActivity : ComponentActivity() {
    private val viewModel: LoginViewModel by viewModels()
    private val healthViewModel: HealthViewModel by viewModels()
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            MusicroomTheme {
                LocalNetworkPermissionGate {
                    Scaffold(modifier = Modifier.fillMaxSize()) { innerPadding ->
//                    LoginScreen(
//                        modifier = Modifier.padding(innerPadding),
//                        onLoginClick = { inputEmail, inputPassword ->
//                            viewModel.connectUser(inputEmail, inputPassword)
//                        },
//                        errorMessage = viewModel.errorMessage
                        HealthScreen(
                            state = healthViewModel.state,
                            onRetryClick = { healthViewModel.checkHealth()},
                            modifier = Modifier.padding(innerPadding),
                        )
                    }
                }
            }
        }
    }
}


