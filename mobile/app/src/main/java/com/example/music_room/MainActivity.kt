package com.example.music_room

import android.annotation.SuppressLint
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.MutableIntState
import androidx.compose.runtime.MutableState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import com.example.music_room.ui.theme.MusicroomTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            var counter: Int by remember { mutableIntStateOf(0)}
            val increment: () -> Unit = {counter++}
            MusicroomTheme {
                Scaffold(modifier = Modifier.fillMaxSize()) { innerPadding ->
                    Greeting(
                        counterValue = counter,
                        modifier = Modifier.padding(innerPadding),
                        onIncrement = increment
                    )


                }
            }
        }
    }
}


@Composable
fun Greeting(counterValue: Int, modifier: Modifier = Modifier, onIncrement: () -> Unit) {
    Column {
        Text(
            text = "My counter: $counterValue",
            modifier = modifier
        )
        Button(
            onClick = { onIncrement() }
        ) {
            Text(
                text = "+1"
            )
        }
    }
}

//@Preview(showBackground = true)
//@Composable
//fun GreetingPreview() {
//    MusicroomTheme {
//        Greeting(counter = counter)
//    }
//}