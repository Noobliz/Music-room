import java.io.ByteArrayOutputStream
import javax.inject.Inject

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.compose)
    id("org.jetbrains.kotlin.plugin.serialization") version "2.2.10"
}

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

abstract class ReverseLocalSupabasePort : DefaultTask() {
    @get:Internal
    abstract val adb: RegularFileProperty

    @get:Input
    abstract val port: Property<Int>

    @get:Inject
    abstract val execOperations: ExecOperations

    @TaskAction
    fun reverse() {
        val adbPath = adb.get().asFile.absolutePath
        val devices = ByteArrayOutputStream()
        val listing = execOperations.exec {
            commandLine(adbPath, "devices")
            standardOutput = devices
            isIgnoreExitValue = true
        }
        val serials = if (listing.exitValue != 0) {
            emptyList()
        } else {
            devices.toString().lines()
                .drop(1)
                .map { it.split('\t') }
                .filter { it.size == 2 && it[1] == "device" }
                .map { it[0] }
        }
        if (serials.isEmpty()) {
            logger.lifecycle("adb reverse skipped: no Android device connected")
            return
        }
        val rule = "tcp:${port.get()}"
        serials.forEach { serial ->
            execOperations.exec {
                commandLine(adbPath, "-s", serial, "reverse", rule, rule)
                isIgnoreExitValue = true
            }
            logger.lifecycle("adb reverse $rule $rule on $serial")
        }
    }
}

val localSupabaseApiPort = providers
    .fileContents(rootProject.layout.projectDirectory.file("../.env"))
    .asText
    .map { env ->
        env.lineSequence()
            .firstOrNull { it.startsWith("SUPABASE_API_PORT=") }
            ?.substringAfter('=')
            ?.trim()
            ?.toIntOrNull()
            ?: 54321
    }
    .orElse(54321)

val reverseLocalSupabasePort = tasks.register<ReverseLocalSupabasePort>("reverseLocalSupabasePort") {
    adb.set(androidComponents.sdkComponents.adb)
    port.set(localSupabaseApiPort)
}

tasks.matching { it.name == "preDebugBuild" }.configureEach {
    dependsOn(reverseLocalSupabasePort)
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
}