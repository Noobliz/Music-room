package com.example.musicroom

import androidx.compose.runtime.MutableIntState
import androidx.compose.runtime.mutableIntStateOf
import androidx.lifecycle.ViewModel

class MainViewModel: ViewModel() {
    val counter: MutableIntState = mutableIntStateOf(0)

}