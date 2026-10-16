plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.compose)
    id("org.jetbrains.kotlin.plugin.serialization") version "2.2.10"
}

// Le .env racine (git-ignoré) est lu sur le PC au moment de la compilation.
val envFile: File = rootProject.projectDir.parentFile.resolve(".env")
if (!envFile.exists()) {
    error("Fichier .env introuvable (${envFile.path}). Copier .env.example en .env à la racine du repo.")
}
val env: Map<String, String> = envFile.readLines()
    .map { line: String -> line.trim() }
    .filter { line: String -> line.isNotBlank() && !line.startsWith("#") && line.contains("=") }
    .associate { line: String -> line.substringBefore("=").trim() to line.substringAfter("=").trim() }

val googleWebClientId: String = env["SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID"]
    ?.takeIf { value: String -> value.endsWith(".apps.googleusercontent.com") }
    ?: error("SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID absent ou invalide dans .env (client ID Web Google attendu).")

android {
    namespace = "com.example.musicroom"
    compileSdk {
        version = release(37)
    }

    defaultConfig {
        applicationId = "com.example.music_room"
        minSdk = 24
        targetSdk = 37
        versionCode = 1
        versionName = "1.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        buildConfigField("String", "API_BASE_URL", "\"http://10.0.2.2:3000/\"")
        buildConfigField("String", "GOOGLE_WEB_CLIENT_ID", "\"$googleWebClientId\"")
    }

    buildTypes {
        release {
            optimization {
                enable = false
            }
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
    buildFeatures {
        compose = true
        buildConfig = true
    }
}

dependencies {
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.graphics)
    implementation(libs.androidx.compose.ui.tooling.preview)
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    testImplementation(libs.junit)
    androidTestImplementation(platform(libs.androidx.compose.bom))
    androidTestImplementation(libs.androidx.compose.ui.test.junit4)
    androidTestImplementation(libs.androidx.espresso.core)
    androidTestImplementation(libs.androidx.junit)
    debugImplementation(libs.androidx.compose.ui.test.manifest)
    debugImplementation(libs.androidx.compose.ui.tooling)
    implementation("com.squareup.retrofit2:retrofit:2.11.0")
    implementation("com.squareup.retrofit2:converter-kotlinx-serialization:2.11.0")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.3")
    implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")
    implementation("androidx.security:security-crypto:1.1.0")
    implementation(libs.androidx.credentials)
    implementation(libs.androidx.credentials.play.services.auth)
    implementation(libs.googleid)
}