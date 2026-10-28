package it.aivision.auto

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.Typeface
import android.view.View
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.min

/** Circular instrument display; readings are supplied by the device sensors. */
class InstrumentGauge(context: Context, private val compass: Boolean) : View(context) {
    private val ink = Color.rgb(242, 247, 253)
    private val muted = Color.rgb(156, 179, 202)
    private val blue = Color.rgb(75, 184, 255)
    private val panel = Color.rgb(7, 21, 36)
    private val ring = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.rgb(36, 61, 83)
        style = Paint.Style.STROKE
        strokeWidth = dp(5f)
        strokeCap = Paint.Cap.ROUND
    }
    private val active = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = blue
        style = Paint.Style.STROKE
        strokeWidth = dp(5f)
        strokeCap = Paint.Cap.ROUND
    }
    private val fill = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = panel; style = Paint.Style.FILL }
    private val ticks = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = muted
        style = Paint.Style.STROKE
        strokeWidth = dp(1.7f)
        strokeCap = Paint.Cap.ROUND
    }
    private val valuePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = ink
        textAlign = Paint.Align.CENTER
        typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
    }
    private val labelPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = muted
        textAlign = Paint.Align.CENTER
        typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
    }
    private var valueText = "—"
    private var unitText = if (compass) "DIREZIONE" else "km/h"
    private var fraction = 0f
    private var bearing = 0f

    fun setReading(value: String, unit: String, progress: Float = 0f, directionDegrees: Float = 0f) {
        valueText = value
        unitText = unit
        fraction = progress.coerceIn(0f, 1f)
        bearing = directionDegrees
        invalidate()
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        val cx = width / 2f
        val cy = height * 0.52f
        val radius = min(width * 0.42f, height * 0.40f)
        if (radius < dp(20f)) return
        canvas.drawCircle(cx, cy, radius, fill)
        val arc = RectF(cx - radius * 0.80f, cy - radius * 0.80f, cx + radius * 0.80f, cy + radius * 0.80f)
        canvas.drawArc(arc, 135f, 270f, false, ring)

        if (compass) {
            for (degree in 0 until 360 step 30) {
                val angle = Math.toRadians((degree - 90).toDouble())
                val inner = if (degree % 90 == 0) radius * 0.66f else radius * 0.73f
                val outer = radius * 0.84f
                canvas.drawLine(
                    cx + cos(angle).toFloat() * inner, cy + sin(angle).toFloat() * inner,
                    cx + cos(angle).toFloat() * outer, cy + sin(angle).toFloat() * outer, ticks
                )
            }
            val directions = arrayOf("N", "E", "S", "W")
            labelPaint.textSize = dp(10f)
            for (i in directions.indices) {
                val angle = Math.toRadians((i * 90 - 90).toDouble())
                canvas.drawText(
                    directions[i],
                    cx + cos(angle).toFloat() * radius * 0.55f,
                    cy + sin(angle).toFloat() * radius * 0.55f + dp(3f),
                    labelPaint
                )
            }
            val angle = Math.toRadians((bearing - 90f).toDouble())
            canvas.drawLine(
                cx, cy,
                cx + cos(angle).toFloat() * radius * 0.40f,
                cy + sin(angle).toFloat() * radius * 0.40f,
                active
            )
            canvas.drawCircle(cx, cy, dp(3.5f), active)
        } else {
            canvas.drawArc(arc, 135f, 270f * fraction, false, active)
            for (i in 0..9) {
                val angle = Math.toRadians(135.0 + 270.0 * i / 9.0)
                canvas.drawLine(
                    cx + cos(angle).toFloat() * radius * 0.72f,
                    cy + sin(angle).toFloat() * radius * 0.72f,
                    cx + cos(angle).toFloat() * radius * 0.86f,
                    cy + sin(angle).toFloat() * radius * 0.86f,
                    ticks
                )
            }
        }

        labelPaint.textSize = dp(9f)
        canvas.drawText(if (compass) "DIREZIONE" else "VELOCITÀ", cx, cy - radius * 0.28f, labelPaint)
        valuePaint.textSize = dp(if (valueText.length > 4) 18f else 24f)
        canvas.drawText(valueText, cx, cy + radius * 0.12f, valuePaint)
        labelPaint.textSize = dp(10.5f)
        canvas.drawText(unitText, cx, cy + radius * 0.42f, labelPaint)
    }

    private fun dp(value: Float): Float = value * resources.displayMetrics.density
}
