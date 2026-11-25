package com.example.musicroom.feature.profile.ui

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.ViewModelProvider.AndroidViewModelFactory.Companion.APPLICATION_KEY
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.example.musicroom.MusicRoomApp
import com.example.musicroom.feature.auth.data.AuthError
import com.example.musicroom.feature.auth.data.AuthResult
import com.example.musicroom.feature.auth.data.FieldError
import com.example.musicroom.feature.profile.data.MusicGenre
import com.example.musicroom.feature.profile.data.OwnProfile
import com.example.musicroom.feature.profile.data.ProfileRepository
import kotlinx.coroutines.launch


private val USERNAME_REGEX: Regex = Regex("^[a-zA-Z0-9_.]{3,30}$")
private val DATE_REGEX: Regex = Regex("^\\d{4}-\\d{2}-\\d{2}$")

class EditProfileViewModel(
    private val repository: ProfileRepository

) : ViewModel() {
    var state: EditProfileState by mutableStateOf<EditProfileState>(EditProfileState())
        private set

    fun start(profile: OwnProfile) {
        state = EditProfileState(
            username = profile.username,
            bio = profile.bio ?: "",
            musicGenres = profile.musicGenres.toSet(),
            fullName = profile.fullName ?: "",
            birthDate = profile.birthDate ?: "",
        )
    }

    fun onUsernameChange(value: String) {
        state = state.copy(username = value, error = null)
    }

    fun onBioChange(value: String) {
        state = state.copy(bio = value, error = null)
    }

    fun onFullNameChange(value: String) {
        state = state.copy(fullName = value, error = null)
    }

    fun onBirthDateChange(value: String) {
        state = state.copy(birthDate = value, error = null)
    }

    fun onGenreToggle(genre: MusicGenre) {
        val genres: Set<MusicGenre> =
            if (genre in state.musicGenres) {
                state.musicGenres - genre
            } else {
                state.musicGenres + genre
            }
        state = state.copy(musicGenres = genres)
    }

    fun save() {
        if (state.isSaving) return

        val errors: List<FieldError> = validate()
        if (errors.isNotEmpty()) {
            state = state.copy(error = AuthError.Validation(errors))
            return
        }

        state = state.copy(isSaving = true, error = null)
        viewModelScope.launch {
            val res: AuthResult<OwnProfile> = repository.updateMyProfile(
                username = state.username,
                bio = state.bio,
                musicGenres = state.musicGenres.toList(),
                fullName = state.fullName,
                birthDate = state.birthDate.ifEmpty { null },
            )
            state = when (res) {
                is AuthResult.Success -> state.copy(isSaving = false, saved = true)
                is AuthResult.Failure -> state.copy(isSaving = false, error = res.error)
            }
        }
    }

    fun reset() {
        state = EditProfileState()
    }

    private fun validate(): List<FieldError> {
        val errors: MutableList<FieldError> = mutableListOf()
        if (!USERNAME_REGEX.matches(state.username)) {
            errors.add(FieldError("username", "3 à 30 caractères : lettres, chiffres, _ ou ."))
        }
        if (state.bio.length > BIO_MAX_LENGTH) {
            errors.add(FieldError("bio", "$BIO_MAX_LENGTH caractères maximum."))
        }
        if (state.fullName.length > 100) {
            errors.add(FieldError("fullName", "100 caractères maximum."))
        }
        if (state.birthDate.isNotEmpty() && !DATE_REGEX.matches(state.birthDate)) {
            errors.add(FieldError("birthDate", "Format attendu : AAAA-MM-JJ"))
        }
        return errors
    }

    companion object {
        val Factory: ViewModelProvider.Factory = viewModelFactory {
            initializer {
                val app: MusicRoomApp = this[APPLICATION_KEY] as MusicRoomApp
                EditProfileViewModel(app.profileRepository)
            }
        }
    }

}