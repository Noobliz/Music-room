package com.example.musicroom.core.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.withFrameNanos
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import kotlin.math.sin
import kotlin.random.Random

private data class Snowflake(
    val x: Float,        // position horizontale, entre 0 et 1 (fraction de la largeur)
    val startY: Float,   // position de départ, entre 0 et 1
    val radius: Float,   // taille en pixels
    val speed: Float,    // vitesse de chute (fraction de hauteur par seconde)
    val drift: Float,    // amplitude du balancement gauche-droite
)

@Composable
fun Snowfall(modifier: Modifier = Modifier) {

    //flocons tires au hasard une seule fois (remember)
    val flakes: List<Snowflake> = remember {
        List(50) {
            Snowflake(
                x = Random.nextFloat(),
                startY = Random.nextFloat(),
                radius = 2f + Random.nextFloat() * 4f,
                speed = 0.03f + Random.nextFloat() * 0.07f,
                drift = 0.005f + Random.nextFloat() * 0.015f,
            )
        }
    }

    // nb de secondes ecoulees mis a jour a chaque image
    var time: Float by remember { mutableFloatStateOf(0f) }
    LaunchedEffect(Unit) {
        val start: Long = withFrameNanos { it }
        while (true) {
            withFrameNanos { now: Long ->
                time = (now - start) / 1_000_000_000f //(secondes ecoulees)
            }
        }
    }

    val flakeColor: Color =
        if (isSystemInDarkTheme()) Color.White.copy(alpha = 0.6f)
        else MaterialTheme.colorScheme.primary.copy(alpha = 0.25f)

    // le dessin (calcul de la pos de chaque flocon a partir du temps)
    Canvas(modifier = modifier
        .fillMaxSize()
        .graphicsLayer(),
    ) {
        flakes.forEach { flake: Snowflake ->
            val y: Float = (flake.startY + flake.speed * time) % 1f
            val x: Float = flake.x + flake.drift * sin(time + flake.startY * 10f)
            drawCircle(
                color = flakeColor,
                radius = flake.radius.dp.toPx(),
                center = Offset(x * size.width, y * size.height),
            )
        }
    }
}

@Preview(showBackground = true, backgroundColor = 0xFFF5FAFE)
@Composable
private fun SnowfallPreview() {
    Snowfall()
}