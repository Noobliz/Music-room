package com.example.musicroom.core.ui

import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawWithCache
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import kotlin.random.Random

fun Modifier.snowCap(color: Color = Color.White): Modifier =
    this.drawWithCache {
        // Calculé une seule fois par taille d'élément (pas à chaque image)
        val random = Random(seed = 42)
        val bumps: MutableList<Pair<Offset, Float>> = mutableListOf()
        var x = 16.dp.toPx()
        while (x < size.width - 16.dp.toPx()) {
            val radius: Float = (3 + random.nextFloat() * 4).dp.toPx()
            bumps.add(Offset(x, 1.dp.toPx()) to radius)
            x += radius * 1.2f // les cercles se chevauchent
        }
        onDrawWithContent {
            drawContent()
            bumps.forEach { (center: Offset, radius: Float) ->
                drawCircle(color = color, radius = radius, center = center)// la neige
            }
        }
    }