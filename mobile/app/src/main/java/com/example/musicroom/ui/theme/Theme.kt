package com.example.musicroom.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.ColorScheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val DarkColorScheme: ColorScheme = darkColorScheme(
    primary = IceBlue,
    onPrimary = OnIceBlue,
    primaryContainer = IceBlueContainer,
    onPrimaryContainer = OnIceBlueContainer,
    secondary = MistGrey,
    onSecondary = OnMistGrey,
    secondaryContainer = MistGreyContainer,
    onSecondaryContainer = OnMistGreyContainer,
    tertiary = FirGreen,
    onTertiary = OnFirGreen,
    tertiaryContainer = FirGreenContainer,
    onTertiaryContainer = OnFirGreenContainer,
    background = NightSky,
    onBackground = OnNightSky,
    surface = NightSky,
    onSurface = OnNightSky,
    surfaceVariant = NightVariant,
    onSurfaceVariant = OnNightVariant,
    outline = NightOutline,
)

private val LightColorScheme: ColorScheme = lightColorScheme(
    primary = GlacierBlue,
    onPrimary = OnGlacierBlue,
    primaryContainer = GlacierBlueContainer,
    onPrimaryContainer = OnGlacierBlueContainer,
    secondary = FrostGrey,
    onSecondary = OnFrostGrey,
    secondaryContainer = FrostGreyContainer,
    onSecondaryContainer = OnFrostGreyContainer,
    tertiary = PineGreen,
    onTertiary = OnPineGreen,
    tertiaryContainer = PineGreenContainer,
    onTertiaryContainer = OnPineGreenContainer,
    background = Snow,
    onBackground = OnSnow,
    surface = Snow,
    onSurface = OnSnow,
    surfaceVariant = SnowVariant,
    onSurfaceVariant = OnSnowVariant,
    outline = SnowOutline,
)

@Composable
fun MusicroomTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme: ColorScheme = if (darkTheme) DarkColorScheme else LightColorScheme

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        shapes = AppShapes,
        content = content
    )
}
