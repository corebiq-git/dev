plugins { id("com.android.application"); id("org.jetbrains.kotlin.android"); id("org.jetbrains.kotlin.plugin.compose"); id("com.google.gms.google-services") }
android { namespace="com.corebiq.care"; compileSdk=35
 defaultConfig { applicationId="com.corebiq.care"; minSdk=24; targetSdk=35; versionCode=1; versionName="1.0.0" }
 buildFeatures { compose=true }
 compileOptions { sourceCompatibility=JavaVersion.VERSION_17; targetCompatibility=JavaVersion.VERSION_17 }
 kotlinOptions { jvmTarget="17" }
}
dependencies {
 implementation(platform("androidx.compose:compose-bom:2024.12.01"))
 implementation("androidx.activity:activity-compose:1.10.0")
 implementation("androidx.compose.ui:ui")
 implementation("androidx.compose.ui:ui-tooling-preview")
 implementation("androidx.compose.material3:material3")
 implementation("androidx.compose.material:material-icons-extended")
 implementation("androidx.navigation:navigation-compose:2.8.5")
 implementation(platform("com.google.firebase:firebase-bom:33.7.0"))
 implementation("com.google.firebase:firebase-auth")
 implementation("com.google.firebase:firebase-firestore")
 implementation("com.google.firebase:firebase-storage")
 implementation("com.google.firebase:firebase-analytics")
 implementation("com.google.firebase:firebase-messaging")
 debugImplementation("androidx.compose.ui:ui-tooling")
}