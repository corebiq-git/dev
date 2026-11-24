package com.corebiq.care

import android.content.Context
import com.google.firebase.FirebaseApp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.storage.FirebaseStorage

object FirebaseSetup {
    fun initialize(context: Context) {
        if (FirebaseApp.getApps(context).isEmpty()) {
            FirebaseApp.initializeApp(context)
        }
    }

    val auth get() = FirebaseAuth.getInstance()
    val db get() = FirebaseFirestore.getInstance()
    val storage get() = FirebaseStorage.getInstance()
}
