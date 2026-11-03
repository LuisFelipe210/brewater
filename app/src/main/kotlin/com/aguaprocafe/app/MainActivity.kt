package com.aguaprocafe.app

import android.content.ActivityNotFoundException
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalContext
import androidx.core.content.FileProvider
import androidx.lifecycle.viewmodel.compose.viewModel
import com.aguaprocafe.app.ui.BrewaterTheme
import com.aguaprocafe.app.ui.AppViewModel
import com.aguaprocafe.app.ui.EditScreen
import com.aguaprocafe.app.ui.HomeScreen
import com.aguaprocafe.app.ui.ResultScreen
import com.aguaprocafe.app.ui.Screen
import com.aguaprocafe.app.update.UpdateDialog

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        setContent {
            BrewaterTheme {
                App()
                UpdateDialog()
            }
        }
    }
}

@Composable
private fun App(vm: AppViewModel = viewModel()) {
    val context = LocalContext.current
    val camera = rememberLauncherForActivityResult(ActivityResultContracts.TakePicture()) { vm.onCameraResult(it) }
    val gallery = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri ->
        if (uri != null) vm.onGalleryResult(uri)
    }

    val openCamera = {
        val file = vm.preparePhotoFile()
        try {
            camera.launch(FileProvider.getUriForFile(context, "${context.packageName}.files", file))
        } catch (e: ActivityNotFoundException) {
            vm.cancelPendingPhoto()
            Toast.makeText(context, "Nenhum app de câmera encontrado", Toast.LENGTH_SHORT).show()
        }
    }
    val openGallery = {
        gallery.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
    }

    BackHandler(enabled = vm.stack.size > 1) { vm.back() }

    // Avançar desliza para a esquerda, voltar para a direita, com as molas do Material Expressive.
    val motion = MaterialTheme.motionScheme
    AnimatedContent(
        targetState = vm.stack,
        transitionSpec = {
            val dir = if (targetState.size >= initialState.size) 1 else -1
            (slideInHorizontally(motion.defaultSpatialSpec()) { w -> dir * w / 5 } + fadeIn(motion.defaultEffectsSpec())) togetherWith
                (slideOutHorizontally(motion.defaultSpatialSpec()) { w -> -dir * w / 5 } + fadeOut(motion.fastEffectsSpec()))
        },
        contentKey = { it.last() },
        label = "tela",
    ) { stack ->
        when (val screen = stack.last()) {
            Screen.Home -> HomeScreen(
                waters = vm.waters
                    .map { it to vm.evaluation(it) }
                    .sortedByDescending { it.second.score ?: -1 },
                loaded = vm.loaded,
                onOpen = vm::open,
                onCamera = openCamera,
                onGallery = openGallery,
                onManual = vm::startManual,
            )

            Screen.Edit -> vm.draft?.let { d ->
                EditScreen(
                    draft = d,
                    onBack = vm::back,
                    onSave = vm::save,
                    onCamera = openCamera,
                    onGallery = openGallery,
                    onRemovePhoto = vm::removePhoto,
                )
            }

            is Screen.Result -> vm.water(screen.id)?.let { w ->
                ResultScreen(
                    water = w,
                    eval = vm.evaluation(w),
                    all = vm.waters,
                    onBack = vm::back,
                    onEdit = { vm.edit(w.id) },
                    onDelete = { vm.delete(w.id) },
                    onOpen = vm::open,
                )
            }
        }
    }
}
