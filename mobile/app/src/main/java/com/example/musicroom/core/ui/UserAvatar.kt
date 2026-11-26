package com.example.musicroom.core.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage

// Avatar rond : la photo si elle existe, sinon l'initiale du pseudo.
// Partagé par le profil, la recherche et le profil d'un autre utilisateur.
@Composable
fun UserAvatar(
    username: String,
    avatarUrl: String?,
    modifier: Modifier = Modifier,
    size: Dp = 88.dp,
    initialStyle: TextStyle = MaterialTheme.typography.displaySmall,
) {
    val initial: String = username.firstOrNull()?.uppercase() ?: "?"
    Box(
        modifier = modifier
            .size(size)
            .background(MaterialTheme.colorScheme.primary, CircleShape),
        contentAlignment = Alignment.Center,
    ) {
        if (avatarUrl != null) {
            AsyncImage(
                model = avatarUrl,
                contentDescription = "Photo de profil de $username",
                contentScale = ContentScale.Crop,
                modifier = Modifier
                    .fillMaxSize()
                    .clip(CircleShape),
            )
        } else {
            Text(
                text = initial,
                style = initialStyle,
                color = MaterialTheme.colorScheme.onPrimary,
            )
        }
    }
}
