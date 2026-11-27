package com.example.musicroom

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.lifecycle.lifecycleScope
import com.example.musicroom.core.ui.gradientBackground
import com.example.musicroom.core.permission.LocalNetworkPermissionGate
import com.example.musicroom.feature.auth.data.AuthDeepLink
import com.example.musicroom.feature.auth.data.AuthUser
import com.example.musicroom.feature.auth.data.GoogleCredentialProvider
import com.example.musicroom.feature.auth.data.GoogleCredentialResult
import com.example.musicroom.feature.auth.data.parseAuthDeepLink
import com.example.musicroom.feature.auth.ui.ConfirmEmailScreen
import com.example.musicroom.feature.auth.ui.ConfirmEmailViewModel
import com.example.musicroom.feature.auth.ui.ForgotPasswordScreen
import com.example.musicroom.feature.auth.ui.ForgotPasswordViewModel
import com.example.musicroom.feature.auth.ui.HealthViewModel
import com.example.musicroom.feature.auth.ui.LinkedAccountsScreen
import com.example.musicroom.feature.auth.ui.LinkedAccountsViewModel
import com.example.musicroom.feature.auth.ui.LoginScreen
import com.example.musicroom.feature.auth.ui.LoginViewModel
import com.example.musicroom.feature.auth.ui.ResetPasswordScreen
import com.example.musicroom.feature.auth.ui.ResetPasswordViewModel
import com.example.musicroom.feature.auth.ui.SignupScreen
import com.example.musicroom.feature.auth.ui.SignupViewModel
import com.example.musicroom.feature.auth.ui.VerifyEmailScreen
import com.example.musicroom.feature.auth.ui.VerifyEmailViewModel
import com.example.musicroom.feature.home.ui.HomeScreen
import com.example.musicroom.ui.theme.MusicroomTheme
import kotlinx.coroutines.launch
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.safeDrawing
import com.example.musicroom.core.ui.Snowfall
import com.example.musicroom.feature.friends.data.Friend
import com.example.musicroom.feature.friends.data.FriendRequest
import com.example.musicroom.feature.friends.data.Relationship
import com.example.musicroom.feature.friends.ui.FriendsScreen
import com.example.musicroom.feature.friends.ui.FriendsViewModel
import com.example.musicroom.feature.friends.ui.UserProfileScreen
import com.example.musicroom.feature.friends.ui.UserProfileViewModel
import com.example.musicroom.feature.friends.ui.UserSearchScreen
import com.example.musicroom.feature.friends.ui.UserSearchViewModel
import com.example.musicroom.feature.profile.ui.EditProfileScreen
import com.example.musicroom.feature.profile.ui.EditProfileState
import com.example.musicroom.feature.profile.ui.EditProfileViewModel
import com.example.musicroom.feature.profile.ui.ProfileScreen
import com.example.musicroom.feature.profile.ui.ProfileState
import com.example.musicroom.feature.profile.ui.ProfileViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class MainActivity : ComponentActivity() {
    private val loginViewModel: LoginViewModel by viewModels { LoginViewModel.Factory }
    private val signupViewModel: SignupViewModel by viewModels { SignupViewModel.Factory }
    private val mainViewModel: MainViewModel by viewModels { MainViewModel.Factory }

    private val verifyEmailViewModel: VerifyEmailViewModel by viewModels { VerifyEmailViewModel.Factory }

    private val forgotPasswordViewModel: ForgotPasswordViewModel by viewModels { ForgotPasswordViewModel.Factory }

    private val confirmEmailViewModel: ConfirmEmailViewModel by viewModels { ConfirmEmailViewModel.Factory }

    private val resetPasswordViewModel: ResetPasswordViewModel by viewModels { ResetPasswordViewModel.Factory }

    private val linkedAccountsViewModel: LinkedAccountsViewModel by viewModels { LinkedAccountsViewModel.Factory }

    private val profileViewModel: ProfileViewModel by viewModels { ProfileViewModel.Factory }

    private val editProfileViewModel: EditProfileViewModel by viewModels { EditProfileViewModel.Factory }

    private val userSearchViewModel: UserSearchViewModel by viewModels { UserSearchViewModel.Factory }

    private val userProfileViewModel: UserProfileViewModel by viewModels { UserProfileViewModel.Factory }

    private val friendsViewModel: FriendsViewModel by viewModels { FriendsViewModel.Factory }
    private val googleCredentialProvider: GoogleCredentialProvider = GoogleCredentialProvider()
    private val healthViewModel: HealthViewModel by viewModels()

    private fun onAvatarPicked(uri: Uri) {
        lifecycleScope.launch {
            val mimeType: String? = contentResolver.getType(uri)
            val bytes: ByteArray? = withContext(Dispatchers.IO) {
                contentResolver.openInputStream(uri)?.use { it.readBytes() }
            }
            if (mimeType != null && bytes != null) {
                profileViewModel.uploadAvatar(bytes, mimeType)
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        mainViewModel.onDeepLink(parseAuthDeepLink(intent.data))
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (savedInstanceState == null) {
            mainViewModel.onDeepLink(parseAuthDeepLink(intent.data))
        }

        enableEdgeToEdge()
        setContent {
            var showSignup: Boolean by rememberSaveable { mutableStateOf(false) }
            var showForgotPassword: Boolean by rememberSaveable { mutableStateOf(false) }
            var showLinkedAccounts: Boolean by rememberSaveable { mutableStateOf(false) }
            var showProfile: Boolean by rememberSaveable { mutableStateOf(false) }
            var showEditProfile: Boolean by rememberSaveable { mutableStateOf(false) }
            var showUserSearch: Boolean by rememberSaveable { mutableStateOf(false) }
            var selectedUserId: String? by rememberSaveable { mutableStateOf(null) }
            var selectedRelationship: Relationship? by rememberSaveable { mutableStateOf(null) }
            var selectedRequestId: String? by rememberSaveable { mutableStateOf(null) }
            var showFriends: Boolean by rememberSaveable { mutableStateOf(false) }

            fun openUserProfile(userId: String, relationship: Relationship, requestId: String?) {
                selectedUserId = userId
                selectedRelationship = relationship
                selectedRequestId = requestId
            }

            val currentUser: AuthUser? by mainViewModel.currentUser.collectAsState()

            val pickAvatar = rememberLauncherForActivityResult(
                contract = ActivityResultContracts.PickVisualMedia(),
            ) { uri: Uri? ->
                // appelé au retour du sélecteur : uri == null si annule
                if (uri != null) {
                    onAvatarPicked(uri)
                }
            }
            MusicroomTheme {
                LocalNetworkPermissionGate {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .gradientBackground(),
                    ) {
                        Snowfall()
                        Scaffold(
                            modifier = Modifier
                                .fillMaxSize(),
                            containerColor = Color.Transparent,
                            contentWindowInsets = WindowInsets.safeDrawing,
                        ) { innerPadding ->
                            val deepLink: AuthDeepLink? = mainViewModel.pendingDeepLink
                            val user: AuthUser? = currentUser
                            val email: String? =
                                signupViewModel.registeredEmail ?: loginViewModel.notVerifiedEmail
                            LaunchedEffect(user) {
                                if (user == null) {
                                    showLinkedAccounts = false
                                    linkedAccountsViewModel.reset()
                                    showProfile = false
                                    profileViewModel.reset()
                                    showEditProfile = false
                                    editProfileViewModel.reset()
                                    showUserSearch = false
                                    userSearchViewModel.reset()
                                    userProfileViewModel.reset()
                                    selectedUserId = null
                                    selectedRelationship = null
                                    selectedRequestId = null
                                    showFriends = false
                                    friendsViewModel.reset()
                                }
                            }
                            if (deepLink is AuthDeepLink.VerifyEmail) {
                                // Lance la vérification une seule fois pour ce lien, pas à chaque recomposition
                                LaunchedEffect(deepLink) {
                                    confirmEmailViewModel.verifyEmail(deepLink.tokenHash)
                                }
                                ConfirmEmailScreen(
                                    state = confirmEmailViewModel.state,
                                    onDoneClick = {
                                        signupViewModel.backToLogin()
                                        loginViewModel.backToLogin()
                                        mainViewModel.consumeDeepLink()
                                        showSignup = false
                                        verifyEmailViewModel.reset()
                                        confirmEmailViewModel.reset()
                                    },
                                    modifier = Modifier.padding(innerPadding),
                                )
                            } else if (deepLink is AuthDeepLink.ResetPassword) {
                                ResetPasswordScreen(
                                    password = resetPasswordViewModel.password,
                                    confirmPassword = resetPasswordViewModel.confirmPassword,
                                    state = resetPasswordViewModel.state,
                                    onPasswordChange = { p: String ->
                                        resetPasswordViewModel.onPasswordChange(
                                            p
                                        )
                                    },
                                    onConfirmPasswordChange = { p: String ->
                                        resetPasswordViewModel.onConfirmPasswordChange(
                                            p
                                        )
                                    },
                                    // Le token vient du lien : MainActivity le connaît, l'écran n'a pas besoin de le voir
                                    onSubmitClick = { resetPasswordViewModel.submit(deepLink.tokenHash) },
                                    onGoToLoginClick = {
                                        mainViewModel.consumeDeepLink()
                                        resetPasswordViewModel.reset()
                                        showSignup = false
                                        showForgotPassword = false
                                    },
                                    onRequestNewLinkClick = {
                                        mainViewModel.consumeDeepLink()
                                        resetPasswordViewModel.reset()
                                        showSignup = false
                                        showForgotPassword = true
                                    },
                                    modifier = Modifier.padding(innerPadding),
                                )
                            } else if (user != null) {
                                //S'exec a l'arrivée sur homescren. relancé uniquement si la clef (user) change (donc si l'utilisateur change)
                                LaunchedEffect(user) {
                                    showSignup = false
                                }
                                if (showLinkedAccounts) {
                                    LaunchedEffect(Unit) {
                                        linkedAccountsViewModel.load()
                                    }
                                    BackHandler {
                                        showLinkedAccounts = false
                                    }
                                    LinkedAccountsScreen(
                                        state = linkedAccountsViewModel.state,
                                        onRetryClick = { linkedAccountsViewModel.load() },
                                        onLinkGoogleClick = {
                                            lifecycleScope.launch {
                                                val res: GoogleCredentialResult =
                                                    googleCredentialProvider.requestIdToken(this@MainActivity)
                                                linkedAccountsViewModel.linkGoogle(res)
                                            }
                                        },
                                        onUnlinkGoogleClick = { linkedAccountsViewModel.unlinkGoogle() },
                                        onBackClick = { showLinkedAccounts = false },
                                        modifier = Modifier.padding(innerPadding)
                                    )
                                } else if (showEditProfile) {
                                    val editState: EditProfileState = editProfileViewModel.state

                                    LaunchedEffect(editState.saved) {
                                        if (editState.saved) {
                                            showEditProfile = false
                                            editProfileViewModel.reset()
                                            profileViewModel.load()
                                        }
                                    }
                                    BackHandler { showEditProfile = false }

                                    EditProfileScreen(
                                        state = editState,
                                        onUsernameChange = {
                                            editProfileViewModel.onUsernameChange(
                                                it
                                            )
                                        },
                                        onBioChange = { editProfileViewModel.onBioChange(it) },
                                        onGenreToggle = { editProfileViewModel.onGenreToggle(it) },
                                        onFullNameChange = {
                                            editProfileViewModel.onFullNameChange(
                                                it
                                            )
                                        },
                                        onBirthDateChange = {
                                            editProfileViewModel.onBirthDateChange(
                                                it
                                            )
                                        },
                                        onSaveClick = { editProfileViewModel.save() },
                                        onCancelClick = { showEditProfile = false },
                                        modifier = Modifier.padding(innerPadding),
                                    )
                                } else if (selectedUserId != null) {
                                    val userId: String = selectedUserId!!
                                    LaunchedEffect(userId) {
                                        userProfileViewModel.load(
                                            userId,
                                            selectedRelationship ?: Relationship.NONE,
                                            selectedRequestId,
                                        )
                                    }
                                    BackHandler { selectedUserId = null }
                                    UserProfileScreen(
                                        state = userProfileViewModel.state,
                                        onRetryClick = {
                                            userProfileViewModel.load(
                                                userId,
                                                selectedRelationship ?: Relationship.NONE,
                                                selectedRequestId,
                                            )
                                        },
                                        onBackClick = { selectedUserId = null },
                                        onAddClick = { userProfileViewModel.sendRequest() },
                                        onAcceptClick = { userProfileViewModel.acceptRequest() },
                                        onDeclineClick = { userProfileViewModel.deleteRequest() },
                                        onCancelClick = { userProfileViewModel.deleteRequest() },
                                        onRemoveClick = { userProfileViewModel.removeFriend() },
                                        modifier = Modifier.padding(innerPadding),
                                    )
                                } else if (showFriends) {
                                    // Relancé à chaque arrivée sur l'écran (y compris au retour d'un profil)
                                    LaunchedEffect(Unit) { friendsViewModel.load() }
                                    BackHandler { showFriends = false }
                                    FriendsScreen(
                                        state = friendsViewModel.state,
                                        onTabSelected = { friendsViewModel.onTabSelected(it) },
                                        onRefreshClick = { friendsViewModel.load() },
                                        onFriendClick = { f: Friend ->
                                            openUserProfile(f.user.id, Relationship.FRIEND, null)
                                        },
                                        onRemoveFriendClick = { f: Friend -> friendsViewModel.removeFriend(f.user.id) },
                                        onReceivedRequestClick = { r: FriendRequest ->
                                            openUserProfile(r.user.id, Relationship.REQUEST_RECEIVED, r.id)
                                        },
                                        onSentRequestClick = { r: FriendRequest ->
                                            openUserProfile(r.user.id, Relationship.REQUEST_SENT, r.id)
                                        },
                                        onAcceptClick = { r: FriendRequest -> friendsViewModel.acceptRequest(r.id) },
                                        onDeclineClick = { r: FriendRequest -> friendsViewModel.deleteRequest(r.id) },
                                        onCancelClick = { r: FriendRequest -> friendsViewModel.deleteRequest(r.id) },
                                        onBackClick = { showFriends = false },
                                        modifier = Modifier.padding(innerPadding),
                                    )
                                } else if (showUserSearch) {
                                    LaunchedEffect(Unit) { userSearchViewModel.refresh() }
                                    BackHandler { showUserSearch = false }
                                    UserSearchScreen(
                                        state = userSearchViewModel.state,
                                        onQueryChange = { userSearchViewModel.onQueryChange(it) },
                                        onSearchClick = { userSearchViewModel.search() },
                                        onUserClick = { user ->
                                            openUserProfile(user.id, user.relationship, user.requestId)
                                        },
                                        onBackClick = { showUserSearch = false },
                                        modifier = Modifier.padding(innerPadding),
                                    )
                                } else if (showProfile) {
                                    LaunchedEffect(Unit) {
                                        profileViewModel.load()
                                    }
                                    BackHandler {
                                        showProfile = false
                                    }
                                    ProfileScreen(
                                        state = profileViewModel.state,
                                        onRetryClick = { profileViewModel.load() },
                                        onEditClick = {
                                            val current = profileViewModel.state
                                            if (current is ProfileState.Loaded) {
                                                editProfileViewModel.start(current.profile)
                                                showEditProfile = true
                                            }
                                        },
                                        onBackClick = { showProfile = false },
                                        onChangeAvatarClick = {
                                            pickAvatar.launch(
                                                PickVisualMediaRequest(
                                                    ActivityResultContracts.PickVisualMedia.ImageOnly
                                                )
                                            )
                                        },
                                        onDeleteAvatarClick = { profileViewModel.deleteAvatar() },
                                        modifier = Modifier.padding(innerPadding)
                                    )
                                } else {
                                    HomeScreen(
                                        user = user,
                                        onLogoutClick = {
                                            mainViewModel.logout()
                                        },
                                        onLinkedAccountsClick = { showLinkedAccounts = true },
                                        onProfileClick = { showProfile = true },
                                        onUserSearchClick = { showUserSearch = true },
                                        onFriendsClick = { showFriends = true },
                                        modifier = Modifier.padding(innerPadding),
                                    )
                                }
                            } else if (email != null) {
                                VerifyEmailScreen(
                                    email = email,
                                    state = verifyEmailViewModel.state,
                                    onResendClick = { e: String ->
                                        verifyEmailViewModel.resendEmail(
                                            e
                                        )
                                    },
                                    onGoToLoginClick = {
                                        signupViewModel.backToLogin()
                                        loginViewModel.backToLogin()
                                        showSignup = false
                                        verifyEmailViewModel.reset()
                                    },
                                    modifier = Modifier.padding(innerPadding),
                                )

                            } else if (showSignup) {
                                SignupScreen(
                                    state = signupViewModel.state,
                                    onSignupClick = { e: String, p: String, u: String ->
                                        signupViewModel.signup(
                                            e,
                                            p,
                                            u
                                        )
                                    },
                                    onGoToLoginClick = { showSignup = false },
                                    onGoogleClick = {
                                        lifecycleScope.launch {
                                            val result: GoogleCredentialResult =
                                                googleCredentialProvider.requestIdToken(this@MainActivity)
                                            signupViewModel.signInWithGoogle(result)
                                        }
                                    },
                                    modifier = Modifier.padding(innerPadding),
                                )
                            } else if (showForgotPassword) {
                                ForgotPasswordScreen(
                                    email = forgotPasswordViewModel.email,
                                    state = forgotPasswordViewModel.state,
                                    onEmailChange = { e: String ->
                                        forgotPasswordViewModel.onEmailChange(
                                            e
                                        )
                                    },
                                    onSendClick = { forgotPasswordViewModel.sendResetEmail() },
                                    onGoToLoginClick = {
                                        showForgotPassword = false
                                        forgotPasswordViewModel.reset()
                                    },
                                    modifier = Modifier.padding(innerPadding)
                                )
                            } else {
                                LoginScreen(
                                    state = loginViewModel.state,
                                    onGoToForgotPasswordClick = { showForgotPassword = true },
                                    onLoginClick = { e: String, p: String ->
                                        loginViewModel.login(
                                            e,
                                            p
                                        )
                                    },
                                    onGoToSignupClick = { showSignup = true },
                                    onGoogleClick = {
                                        lifecycleScope.launch {
                                            val result: GoogleCredentialResult =
                                                googleCredentialProvider.requestIdToken(this@MainActivity)
                                            loginViewModel.signInWithGoogle(result)
                                        }
                                    },
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
}


