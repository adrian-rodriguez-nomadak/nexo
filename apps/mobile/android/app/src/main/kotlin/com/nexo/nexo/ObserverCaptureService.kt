package com.nexo.nexo

import android.app.Activity
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.drawable.GradientDrawable
import android.hardware.display.DisplayManager
import android.hardware.display.VirtualDisplay
import android.media.Image
import android.media.ImageReader
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.os.Build
import android.os.Handler
import android.os.HandlerThread
import android.os.IBinder
import android.os.Looper
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.TextView
import androidx.core.app.NotificationCompat
import java.io.File
import java.io.FileOutputStream
import kotlin.math.abs

class ObserverCaptureService : Service() {
    companion object {
        const val ACTION_START = "com.nexo.nexo.observer.START"
        const val ACTION_STOP = "com.nexo.nexo.observer.STOP"
        const val ACTION_READY = "com.nexo.nexo.observer.READY"
        const val ACTION_NOTIFY = "com.nexo.nexo.observer.NOTIFY"
        const val EXTRA_RESULT_CODE = "resultCode"
        const val EXTRA_RESULT_DATA = "resultData"
        const val EXTRA_TITLE = "title"
        const val EXTRA_SUMMARY = "summary"

        private const val CHANNEL_ID = "nexo_observer"
        private const val NOTIFICATION_ID = 9042

        @Volatile
        var isRunning: Boolean = false
            private set
    }

    private lateinit var windowManager: WindowManager
    private var bubble: View? = null
    private var mediaProjection: MediaProjection? = null
    private var virtualDisplay: VirtualDisplay? = null
    private var imageReader: ImageReader? = null
    private var captureThread: HandlerThread? = null
    private var captureHandler: Handler? = null
    private val mainHandler = Handler(Looper.getMainLooper())
    @Volatile private var captureRequested = false

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            stopSelf()
            return START_NOT_STICKY
        }
        if (intent?.action == ACTION_READY) {
            bubble?.visibility = View.VISIBLE
            return START_STICKY
        }
        if (intent?.action == ACTION_NOTIFY) {
            val title = intent.getStringExtra(EXTRA_TITLE) ?: "Nexo"
            val summary = intent.getStringExtra(EXTRA_SUMMARY) ?: "Dato guardado"
            getSystemService(NotificationManager::class.java).notify(
                (System.currentTimeMillis() % Int.MAX_VALUE).toInt(),
                createResultNotification(title, summary),
            )
            return START_STICKY
        }
        if (isRunning) return START_STICKY

        createNotificationChannel()
        startForeground(NOTIFICATION_ID, createNotification())

        val resultCode = intent?.getIntExtra(EXTRA_RESULT_CODE, Activity.RESULT_CANCELED)
            ?: Activity.RESULT_CANCELED
        val resultData = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            intent?.getParcelableExtra(EXTRA_RESULT_DATA, Intent::class.java)
        } else {
            @Suppress("DEPRECATION")
            intent?.getParcelableExtra(EXTRA_RESULT_DATA)
        }
        if (resultCode != Activity.RESULT_OK || resultData == null) {
            stopSelf()
            return START_NOT_STICKY
        }

        try {
            startProjection(resultCode, resultData)
            showBubble()
            isRunning = true
            MainActivity.deliverState(true)
        } catch (_: Exception) {
            stopSelf()
        }
        return START_STICKY
    }

    private fun startProjection(resultCode: Int, resultData: Intent) {
        windowManager = getSystemService(WindowManager::class.java)
        val metrics = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            windowManager.currentWindowMetrics.bounds
        } else {
            @Suppress("DEPRECATION")
            android.graphics.Rect().also {
                val displayMetrics = resources.displayMetrics
                it.set(0, 0, displayMetrics.widthPixels, displayMetrics.heightPixels)
            }
        }
        val width = metrics.width()
        val height = metrics.height()
        val density = resources.displayMetrics.densityDpi

        captureThread = HandlerThread("NexoObserverCapture").also { it.start() }
        captureHandler = Handler(captureThread!!.looper)
        imageReader = ImageReader.newInstance(
            width,
            height,
            PixelFormat.RGBA_8888,
            2,
        ).also { reader ->
            reader.setOnImageAvailableListener({ available ->
                val image = available.acquireLatestImage() ?: return@setOnImageAvailableListener
                if (!captureRequested) {
                    image.close()
                    return@setOnImageAvailableListener
                }
                captureRequested = false
                saveCapture(image)
            }, captureHandler)
        }

        val manager = getSystemService(MediaProjectionManager::class.java)
        val projection = manager.getMediaProjection(resultCode, resultData)
            ?: error("No fue posible iniciar la captura de pantalla.")
        projection.registerCallback(
            object : MediaProjection.Callback() {
                override fun onStop() {
                    stopSelf()
                }
            },
            mainHandler,
        )
        mediaProjection = projection
        virtualDisplay = projection.createVirtualDisplay(
            "NexoObserver",
            width,
            height,
            density,
            DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
            imageReader?.surface,
            null,
            captureHandler,
        )
    }

    private fun showBubble() {
        val size = (60 * resources.displayMetrics.density).toInt()
        val bubbleView = TextView(this).apply {
            text = "N"
            textSize = 20f
            gravity = Gravity.CENTER
            setTextColor(Color.rgb(12, 12, 14))
            elevation = 14f
            background = GradientDrawable().apply {
                shape = GradientDrawable.OVAL
                setColor(Color.rgb(183, 243, 107))
                setStroke(
                    (2 * resources.displayMetrics.density).toInt(),
                    Color.argb(90, 255, 255, 255),
                )
            }
        }
        val params = WindowManager.LayoutParams(
            size,
            size,
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            } else {
                @Suppress("DEPRECATION")
                WindowManager.LayoutParams.TYPE_PHONE
            },
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT,
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            x = resources.displayMetrics.widthPixels - size - 24
            y = (180 * resources.displayMetrics.density).toInt()
        }

        bubbleView.setOnTouchListener(BubbleTouchListener(params))
        windowManager.addView(bubbleView, params)
        bubble = bubbleView
    }

    private inner class BubbleTouchListener(
        private val params: WindowManager.LayoutParams,
    ) : View.OnTouchListener {
        private var startX = 0
        private var startY = 0
        private var touchX = 0f
        private var touchY = 0f

        override fun onTouch(view: View, event: MotionEvent): Boolean {
            when (event.action) {
                MotionEvent.ACTION_DOWN -> {
                    startX = params.x
                    startY = params.y
                    touchX = event.rawX
                    touchY = event.rawY
                    return true
                }
                MotionEvent.ACTION_MOVE -> {
                    params.x = startX + (event.rawX - touchX).toInt()
                    params.y = startY + (event.rawY - touchY).toInt()
                    windowManager.updateViewLayout(view, params)
                    return true
                }
                MotionEvent.ACTION_UP -> {
                    val moved = abs(event.rawX - touchX) + abs(event.rawY - touchY)
                    if (moved < 18 * resources.displayMetrics.density) {
                        requestCapture()
                    }
                    return true
                }
            }
            return false
        }
    }

    private fun requestCapture() {
        bubble?.visibility = View.INVISIBLE
        mainHandler.postDelayed({
            captureRequested = true
            mainHandler.postDelayed({
                if (captureRequested) {
                    captureRequested = false
                    bubble?.visibility = View.VISIBLE
                }
            }, 3_000)
        }, 180)
    }

    private fun saveCapture(screenImage: Image) {
        try {
            val plane = screenImage.planes[0]
            val buffer = plane.buffer
            val pixelStride = plane.pixelStride
            val rowStride = plane.rowStride
            val rowPadding = rowStride - pixelStride * screenImage.width
            val paddedWidth = screenImage.width + rowPadding / pixelStride
            val padded = Bitmap.createBitmap(
                paddedWidth,
                screenImage.height,
                Bitmap.Config.ARGB_8888,
            )
            padded.copyPixelsFromBuffer(buffer)
            val cropped = Bitmap.createBitmap(
                padded,
                0,
                0,
                screenImage.width,
                screenImage.height,
            )
            val file = File(cacheDir, "observer_${System.currentTimeMillis()}.jpg")
            FileOutputStream(file).use { output ->
                cropped.compress(Bitmap.CompressFormat.JPEG, 86, output)
            }
            padded.recycle()
            if (cropped !== padded) cropped.recycle()

            mainHandler.post {
                MainActivity.deliverCapture(file.absolutePath)
            }
        } finally {
            screenImage.close()
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(
            NotificationChannel(
                CHANNEL_ID,
                "Observador de Nexo",
                NotificationManager.IMPORTANCE_LOW,
            ).apply {
                description = "Mantiene visible la burbuja de captura de Nexo."
            },
        )
    }

    private fun createNotification(): android.app.Notification {
        val openIntent = PendingIntent.getActivity(
            this,
            1,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        val stopIntent = PendingIntent.getService(
            this,
            2,
            Intent(this, ObserverCaptureService::class.java).apply {
                action = ACTION_STOP
            },
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_menu_view)
            .setContentTitle("Observador activo")
            .setContentText("Toca la burbuja de Nexo para analizar la pantalla.")
            .setContentIntent(openIntent)
            .setOngoing(true)
            .addAction(0, "Detener", stopIntent)
            .build()
    }

    private fun createResultNotification(
        title: String,
        summary: String,
    ): android.app.Notification {
        val openIntent = PendingIntent.getActivity(
            this,
            3,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_menu_save)
            .setContentTitle(title)
            .setContentText(summary)
            .setStyle(NotificationCompat.BigTextStyle().bigText(summary))
            .setContentIntent(openIntent)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .build()
    }

    override fun onDestroy() {
        isRunning = false
        MainActivity.deliverState(false)
        bubble?.let {
            try {
                windowManager.removeView(it)
            } catch (_: Exception) {
                // The overlay may already have been removed by the system.
            }
        }
        bubble = null
        virtualDisplay?.release()
        imageReader?.close()
        mediaProjection?.stop()
        captureThread?.quitSafely()
        virtualDisplay = null
        imageReader = null
        mediaProjection = null
        captureThread = null
        super.onDestroy()
    }
}
