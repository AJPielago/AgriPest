package com.capstone.pestdetection.models;

import com.google.gson.annotations.SerializedName;

public class FeedbackRequest {
    @SerializedName("feedback_accurate")
    private boolean feedbackAccurate;

    @SerializedName("feedback_notes")
    private String feedbackNotes;

    public FeedbackRequest(boolean feedbackAccurate, String feedbackNotes) {
        this.feedbackAccurate = feedbackAccurate;
        this.feedbackNotes = feedbackNotes;
    }

    public boolean isFeedbackAccurate() { return feedbackAccurate; }
    public String getFeedbackNotes() { return feedbackNotes; }
}
