package com.capstone.pestdetection.views;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.RectF;
import android.util.AttributeSet;
import android.view.View;

import androidx.annotation.Nullable;

import com.capstone.pestdetection.models.BoundingBoxDto;

import java.util.ArrayList;
import java.util.List;

public class BoundingBoxOverlayView extends View {

    private final List<BoundingBoxDto> boundingBoxes = new ArrayList<>();
    private final Paint boxPaint = new Paint();
    private final Paint labelBgPaint = new Paint();
    private final Paint textPaint = new Paint();

    public BoundingBoxOverlayView(Context context) {
        super(context);
        init();
    }

    public BoundingBoxOverlayView(Context context, @Nullable AttributeSet attrs) {
        super(context, attrs);
        init();
    }

    public BoundingBoxOverlayView(Context context, @Nullable AttributeSet attrs, int defStyleAttr) {
        super(context, attrs, defStyleAttr);
        init();
    }

    private void init() {
        // High contrast agricultural emerald outline for bounding boxes
        boxPaint.setColor(Color.parseColor("#10B981")); // Emerald 500
        boxPaint.setStyle(Paint.Style.STROKE);
        boxPaint.setStrokeWidth(6f);
        boxPaint.setAntiAlias(true);

        // Dark background for legibility overlay
        labelBgPaint.setColor(Color.parseColor("#E6064E3B")); // Dark Emerald with opacity
        labelBgPaint.setStyle(Paint.Style.FILL);
        labelBgPaint.setAntiAlias(true);

        // Text paint for label and confidence score
        textPaint.setColor(Color.WHITE);
        textPaint.setTextSize(34f);
        textPaint.setAntiAlias(true);
        textPaint.setFakeBoldText(true);
    }

    public void setBoundingBoxes(List<BoundingBoxDto> boxes) {
        this.boundingBoxes.clear();
        if (boxes != null) {
            this.boundingBoxes.addAll(boxes);
        }
        invalidate(); // Trigger redraw on UI thread
    }

    @Override
    protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);

        if (boundingBoxes.isEmpty()) {
            return;
        }

        int width = getWidth();
        int height = getHeight();

        for (BoundingBoxDto box : boundingBoxes) {
            float left = box.getXMin() * width;
            float top = box.getYMin() * height;
            float right = box.getXMax() * width;
            float bottom = box.getYMax() * height;

            // Check if this box is for a plant disease
            boolean isDisease = "disease".equalsIgnoreCase(box.getType()) 
                    || (box.getLabel() != null && box.getLabel().toLowerCase().startsWith("disease"));

            if (isDisease) {
                boxPaint.setColor(Color.parseColor("#F59E0B")); // Amber 500
                labelBgPaint.setColor(Color.parseColor("#E678350F")); // Amber 900
            } else {
                boxPaint.setColor(Color.parseColor("#10B981")); // Emerald 500
                labelBgPaint.setColor(Color.parseColor("#E6064E3B")); // Emerald 900
            }

            // Draw bounding box rectangle
            RectF rect = new RectF(left, top, right, bottom);
            canvas.drawRect(rect, boxPaint);

            // Construct text label
            String label = box.getLabel() != null ? box.getLabel() : "Detected Specimen";
            if (box.getConfidence() > 0) {
                int confPercent = Math.round(box.getConfidence() * 100);
                label += " (" + confPercent + "%)";
            }

            // Draw background badge for text
            float textWidth = textPaint.measureText(label);
            float textHeight = textPaint.descent() - textPaint.ascent();
            float badgePadding = 12f;

            float badgeLeft = left;
            float badgeTop = Math.max(0, top - textHeight - (badgePadding * 2));
            float badgeRight = Math.min(width, left + textWidth + (badgePadding * 2));
            float badgeBottom = top;

            RectF badgeRect = new RectF(badgeLeft, badgeTop, badgeRight, badgeBottom);
            canvas.drawRoundRect(badgeRect, 8f, 8f, labelBgPaint);

            // Draw label text inside badge
            canvas.drawText(label, badgeLeft + badgePadding, badgeBottom - badgePadding, textPaint);
        }
    }
}
