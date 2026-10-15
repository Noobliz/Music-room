package com.example.musicroom

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import com.example.musicroom.core.ui.gradientBackground
import com.example.musicroom.core.permission.LocalNetworkPermissionGate
import com.example.musicroom.feature.auth.data.AuthUser
import com.example.musicroom.feature.auth.ui.ForgotPasswordScreen
import com.example.musicroom.feature.auth.ui.ForgotPasswordViewModel
import com.example.musicroom.feature.auth.ui.HealthScreen
import com.example.musicroom.feature.auth.ui.HealthViewModel
import com.example.musicroom.feature.auth.ui.LoginScreen
import com.example.musicroom.feature.auth.ui.LoginViewModel
import com.example.musicroom.feature.auth.ui.SignupScreen
import com.example.musicroom.feature.auth.ui.SignupViewModel
import com.example.musicroom.feature.auth.ui.VerifyEmailScreen
import com.example.musicroom.feature.auth.ui.VerifyEmailViewModel
import com.example.musicroom.feature.home.ui.HomeScreen
import com.example.musicroom.ui.theme.MusicroomTheme

class MainActivity : ComponentActivity() {
    private val loginViewModel: LoginViewModel by viewModels { LoginViewModel.Factory }
    private val signupViewModel: SignupViewModel by viewModels { SignupViewModel.Factory }
    private val mainViewModel: MainViewModel by viewModels { MainViewModel.Factory }

    private val verifyEmailViewModel: VerifyEmailViewModel by viewModels { VerifyEmailViewModel.Factory }

    private val forgotPasswordViewModel: ForgotPasswordViewModel by viewModels { ForgotPasswordViewModel.Factory }

    private val healthViewModel: HealthViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            var showSignup: Boolean by rememberSaveable { mutableStateOf(false) }
            var showForgotPassword: Boolean by rememberSaveable{ mutableStateOf(false) }
            val currentUser: AuthUser? by mainViewModel.currentUser.collectAsState()
            MusicroomTheme {
                LocalNetworkPermissionGate {
                    Scaffold(
                        modifier = Modifier.fillMaxSize().gradientBackground(),
                        containerColor = Color.Transparent,
                    ) { innerPadding ->
//                        LoginScreen(
//                            state = loginViewModel.state,
//                            onLoginClick = { inputEmail: String, inputPassword: String ->
//                                loginViewModel.login(inputEmail, inputPassword)
//                            },
//                            modifier = Modifier.padding(innerPadding),
//                        )
                        val user: AuthUser? = currentUser
                        val email: String? = signupViewModel.registeredEmail?: loginViewModel.notVerifiedEmail

                        if (user != null) {
                            HomeScreen(
                                user = user,
                                onLogoutClick = { mainViewModel.logout() },
                                modifier = Modifier.padding(innerPadding),                            )
                        }
                        else if (email != null) {
                            VerifyEmailScreen(
                                email = email,
                                state = verifyEmailViewModel.state,
                                onResendClick = { e: String -> verifyEmailViewModel.resendEmail(e)},
                                onGoToLoginClick = {
                                    signupViewModel.backToLogin()
                                    loginViewModel.backToLogin()
                                    showSignup = false
                                    verifyEmailViewModel.reset()
                                },
                                modifier = Modifier.padding(innerPadding),
                            )

                        }
                        else if (showSignup) {
                            SignupScreen(
                                state = signupViewModel.state,
                                onSignupClick = { e: String, p: String, u: String -> signupViewModel.signup(e, p, u) },
                                onGoToLoginClick = { showSignup = false },
                                modifier = Modifier.padding(innerPadding),
                            )
                        } else if (showForgotPassword){
                            ForgotPasswordScreen(
                                email = forgotPasswordViewModel.email,
                                state = forgotPasswordViewModel.state,
                                onEmailChange = {e: String -> forgotPasswordViewModel.onEmailChange(e)},
                                onSendClick = { forgotPasswordViewModel.sendResetEmail()},
                                onGoToLoginClick = {
                                    showForgotPassword = false
                                    forgotPasswordViewModel.reset()
                                },
                                modifier = Modifier.padding(innerPadding)
                            )
                        }
                        else {
                            LoginScreen(
                                state = loginViewModel.state,
                                onGoToForgotPasswordClick = {showForgotPassword = true},
                                onLoginClick = { e: String, p: String -> loginViewModel.login(e, p) },
                                onGoToSignupClick = { showSignup = true },
                                modifier = Modifier.padding(innerPadding),
                            )
                        }
//                        HealthScreen(
//                            state = healthViewModel.state,
//                            onRetryClick = { healthViewModel.checkHealth()},
//                            modifier = Modifier.padding(innerPadding),
//                        )
                    }
                }
            }
        }
    }
}


