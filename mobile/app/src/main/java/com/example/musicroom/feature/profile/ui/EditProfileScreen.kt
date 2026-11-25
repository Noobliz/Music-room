
package com.example.musicroom.feature.profile.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.example.musicroom.core.ui.AppTextField
import com.example.musicroom.core.ui.ErrorBanner
import com.example.musicroom.core.ui.PrimaryButton
import com.example.musicroom.feature.auth.data.AuthError
import com.example.musicroom.feature.auth.data.FieldError
import com.example.musicroom.feature.auth.ui.toMessage
import com.example.musicroom.feature.profile.data.MusicGenre
import com.example.musicroom.ui.theme.MusicroomTheme

const val BIO_MAX_LENGTH: Int = 500


@Composable
fun EditProfileScreen(
    state: EditProfileState,
    onUsernameChange: (String) -> Unit,
    onBioChange: (String) -> Unit,
    onGenreToggle: (MusicGenre) -> Unit,
    onFullNameChange: (String) -> Unit,
    onBirthDateChange: (String) -> Unit,
    onSaveClick: () -> Unit,
    onCancelClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val fields: List<FieldError> = (state.error as? AuthError.Validation)?.fields.orEmpty()
    fun errorFor(name: String): String? = fields.firstOrNull { it.field == name }?.message

    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text(
            text = "Modifier mon profil",
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
        )

        val error: AuthError? = state.error
        if (error != null && (error !is AuthError.Validation || error.fields.isEmpty())) {
            ErrorBanner(message = error.toMessage())
        }

        SectionLabel("Public")
        AppTextField(
            value = state.username,
            onValueChange = onUsernameChange,
            label = "Pseudo",
            errorMessage = errorFor("username"),
        )

        SectionLabel("Visible par mes amis")
        OutlinedTextField(
            value = state.bio,
            onValueChange = onBioChange,
            label = { Text("Bio") },
            minLines = 3,
            isError = errorFor("bio") != null,
            supportingText = {
                Text(errorFor("bio") ?: "${state.bio.length} / $BIO_MAX_LENGTH")
            },
            shape = MaterialTheme.shapes.medium,
            modifier = Modifier.fillMaxWidth(),
        )

        Text(
            text = "Préférences musicales",
            style = MaterialTheme.typography.labelLarge,
        )
        FlowRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            MusicGenre.entries.forEach { genre: MusicGenre ->
                FilterChip(
                    selected = genre in state.musicGenres,
                    onClick = { onGenreToggle(genre) },
                    label = { Text(genreLabel(genre)) },
                )
            }
        }

        SectionLabel("Privé")
        AppTextField(
            value = state.fullName,
            onValueChange = onFullNameChange,
            label = "Nom",
            errorMessage = errorFor("fullName"),
        )
        AppTextField(
            value = state.birthDate,
            onValueChange = onBirthDateChange,
            label = "Date de naissance (AAAA-MM-JJ)",
            errorMessage = errorFor("birthDate"),
        )

        PrimaryButton(
            text = "Enregistrer",
            onClick = onSaveClick,
            loading = state.isSaving,
        )
        TextButton(onClick = onCancelClick, enabled = !state.isSaving) {
            Text("Annuler")
        }
    }
}

@Composable
private fun SectionLabel(text: String) {
    Text(
        text = text,
        style = MaterialTheme.typography.titleMedium,
        fontWeight = FontWeight.SemiBold,
        color = MaterialTheme.colorScheme.primary,
    )
}

// ── Previews

private val previewState: EditProfileState = EditProfileState(
    username = "lise",
    bio = "J'écoute de tout, surtout du jazz.",
    musicGenres = setOf(MusicGenre.JAZZ, MusicGenre.SOUL),
    fullName = "Lise Example",
    birthDate = "1995-03-14",
)

@Preview(showBackground = true, name = "Formulaire", heightDp = 1000)
@Composable
private fun EditProfilePreview() {
    MusicroomTheme {
        EditProfileScreen(
            state = previewState,
            onUsernameChange = {}, onBioChange = {}, onGenreToggle = {},
            onFullNameChange = {}, onBirthDateChange = {},
            onSaveClick = {}, onCancelClick = {},
        )
    }
}

@Preview(showBackground = true, name = "Pseudo pris", heightDp = 1000)
@Composable
private fun EditProfileUsernameTakenPreview() {
    MusicroomTheme {
        EditProfileScreen(
            state = previewState.copy(error = AuthError.UsernameTaken),
            onUsernameChange = {}, onBioChange = {}, onGenreToggle = {},
            onFullNameChange = {}, onBirthDateChange = {},
            onSaveClick = {}, onCancelClick = {},
        )
    }
}

@Preview(showBackground = true, name = "Erreurs de champs", heightDp = 1000)
@Composable
private fun EditProfileFieldErrorsPreview() {
    MusicroomTheme {
        EditProfileScreen(
            state = previewState.copy(
                username = "a",
                error = AuthError.Validation(
                    listOf(
                        FieldError("username", "3 à 30 caractères : lettres, chiffres, _ ou ."),
                        FieldError("birthDate", "Format attendu : AAAA-MM-JJ"),
                    ),
                ),
            ),
            onUsernameChange = {}, onBioChange = {}, onGenreToggle = {},
            onFullNameChange = {}, onBirthDateChange = {},
            onSaveClick = {}, onCancelClick = {},
        )
    }
}
