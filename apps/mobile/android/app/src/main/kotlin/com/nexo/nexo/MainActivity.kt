package com.nexo.nexo

import android.app.Activity
import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.media.projection.MediaProjectionManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.EventChannel
import io.flutter.plugin.common.MethodCall
import io.flutter.plugin.common.MethodChannel
import java.io.File

class MainActivity : FlutterActivity(), EventChannel.StreamHandler {
    companion object {
        private const val CONTROL_CHANNEL = "nexo/observer_control"
        private const val EVENT_CHANNEL = "nexo/observer_events"
        private const val CAPTURE_REQUEST_CODE = 4301
        private const val NOTIFICATION_REQUEST_CODE = 4302

        private var eventSink: EventChannel.EventSink? = null
        private var pendingCapturePath: String? = null

        fun deliverCapture(path: String) {
            val sink = eventSink
            if (sink == null) {
                pendingCapturePath = path
            } else {
                sink.success(mapOf("type" to "capture", "path" to path))
            }
        }

        fun deliverState(active: Boolean) {
            eventSink?.success(mapOf("type" to "state", "active" to active))
        }
    }

    private var notificationPermissionResult: MethodChannel.Result? = null

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        MethodChannel(
            flutterEngine.dartExecutor.binaryMessenger,
            CONTROL_CHANNEL,
        ).setMethodCallHandler(::handleMethodCall)

        EventChannel(
            flutterEngine.dartExecutor.binaryMessenger,
            EVENT_CHANNEL,
        ).setStreamHandler(this)
    }

    private fun handleMethodCall(call: MethodCall, result: MethodChannel.Result) {
        when (call.method) {
            "isSupported" -> result.success(true)
            "canDrawOverlays" -> result.success(Settings.canDrawOverlays(this))
            "requestOverlayPermission" -> {
                startActivity(
                    Intent(
                        Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                        Uri.parse("package:$packageName"),
                    ),
                )
                result.success(null)
            }
            "startObserver" -> startObserver(result)
            "requestNotificationPermission" -> {
                if (
                    Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
                    checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) ==
                    PackageManager.PERMISSION_GRANTED
                ) {
                    result.success(true)
                } else {
                    notificationPermissionResult = result
                    requestPermissions(
                        arrayOf(Manifest.permission.POST_NOTIFICATIONS),
                        NOTIFICATION_REQUEST_CODE,
                    )
                }
            }
            "stopObserver" -> {
                stopService(Intent(this, ObserverCaptureService::class.java))
                result.success(null)
            }
            "isObserverRunning" -> result.success(ObserverCaptureService.isRunning)
            "consumeCapture" -> {
                val path = call.argument<String>("path")
                if (path.isNullOrBlank()) {
                    result.error("invalid_path", "La captura no es válida.", null)
                    return
                }
                val file = File(path)
                if (!file.exists()) {
                    result.error("missing_capture", "La captura ya no existe.", null)
                    return
                }
                try {
                    val bytes = file.readBytes()
                    file.delete()
                    result.success(bytes)
                } catch (error: Exception) {
                    result.error("capture_read_failed", error.message, null)
                }
            }
            "captureHandled" -> {
                startService(
                    Intent(this, ObserverCaptureService::class.java).apply {
                        action = ObserverCaptureService.ACTION_READY
                    },
                )
                result.success(null)
            }
            "notifySaved" -> {
                val title = call.argument<String>("title") ?: "Nexo"
                val summary = call.argument<String>("summary") ?: "Dato guardado"
                startService(
                    Intent(this, ObserverCaptureService::class.java).apply {
                        action = ObserverCaptureService.ACTION_NOTIFY
                        putExtra(ObserverCaptureService.EXTRA_TITLE, title)
                        putExtra(ObserverCaptureService.EXTRA_SUMMARY, summary)
                    },
                )
                result.success(null)
            }
            else -> result.notImplemented()
        }
    }

    private fun startObserver(result: MethodChannel.Result) {
        if (!Settings.canDrawOverlays(this)) {
            result.error(
                "overlay_permission_required",
                "Permite que Nexo se muestre sobre otras aplicaciones.",
                null,
            )
            return
        }
        if (ObserverCaptureService.isRunning) {
            result.success(true)
            return
        }
        val manager = getSystemService(MediaProjectionManager::class.java)
        startActivityForResult(manager.createScreenCaptureIntent(), CAPTURE_REQUEST_CODE)
        result.success(false)
    }

    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode != CAPTURE_REQUEST_CODE) return
        if (resultCode != Activity.RESULT_OK || data == null) {
            deliverState(false)
            return
        }

        val serviceIntent = Intent(this, ObserverCaptureService::class.java).apply {
            action = ObserverCaptureService.ACTION_START
            putExtra(ObserverCaptureService.EXTRA_RESULT_CODE, resultCode)
            putExtra(ObserverCaptureService.EXTRA_RESULT_DATA, data)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(serviceIntent)
        } else {
            startService(serviceIntent)
        }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray,
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode != NOTIFICATION_REQUEST_CODE) return
        notificationPermissionResult?.success(
            grantResults.firstOrNull() == PackageManager.PERMISSION_GRANTED,
        )
        notificationPermissionResult = null
    }

    override fun onListen(arguments: Any?, events: EventChannel.EventSink?) {
        eventSink = events
        deliverState(ObserverCaptureService.isRunning)
        pendingCapturePath?.let {
            pendingCapturePath = null
            deliverCapture(it)
        }
    }

    override fun onCancel(arguments: Any?) {
        eventSink = null
    }
}
