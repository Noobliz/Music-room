package com.example.musicroom.core.permission

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Column
import androidx.compose.material3.Button
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import androidx.core.content.ContextCompat
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

private const val LOCAL_NETWORK_API_LEVEL: Int = 37
@Composable
fun LocalNetworkPermissionGate(
    content: @Composable () -> Unit
) {
    val context: Context = LocalContext.current

    var isGranted: Boolean by remember {

        mutableStateOf(
            Build.VERSION.SDK_INT < LOCAL_NETWORK_API_LEVEL ||
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.ACCESS_LOCAL_NETWORK
            ) == PackageManager.PERMISSION_GRANTED
        )
    }

    val launcher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission(),
        onResult = { granted: Boolean ->

            isGranted = granted
        }
    )

    if (isGranted) {
        content()
    } else {
        Column(
            modifier = Modifier.fillMaxSize().padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Text("Pour communiquer avec le serveur, veuillez autoriser la connexion")
            Button(onClick = {
                launcher.launch(Manifest.permission.ACCESS_LOCAL_NETWORK)
            }) {
                Text("Autoriser")
            }
        }
    }
}