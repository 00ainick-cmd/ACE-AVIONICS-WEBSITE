# CAET LMS - Lesson Tracking Integration Guide

## Overview
This guide explains how to integrate progress tracking into external lesson pages so they can communicate with the main LMS system.

---

## Quick Start

### Step 1: Add the Tracking Script
Add this script tag to your external lesson page (e.g., https://www.aceavionicstraining.com/principles-of-direct-current):

```html
<head>
    <!-- Your existing head content -->

    <!-- CAET LMS Progress Tracker -->
    <script src="https://yourdomain.com/lesson-tracker.js"></script>

    <!-- Optional: Set lesson ID via meta tag -->
    <meta name="lesson-id" content="1">
</head>
```

### Step 2: Configure Lesson ID
The tracker needs to know which lesson it's tracking. You can set this in **three ways** (in order of priority):

#### Option A: Meta Tag (Recommended)
```html
<meta name="lesson-id" content="1">
```

#### Option B: URL Parameter
```
https://yourlesson.com/page?lesson=1
```

#### Option C: Body Data Attribute
```html
<body data-lesson-id="1">
```

### Step 3: Test the Integration
Open your lesson page in an iframe from the LMS. You should see in the browser console:
```
📊 CAET Lesson Tracker initialized
✅ Tracker ready for lesson: 1
```

---

## Automatic Tracking

The tracker **automatically** monitors:

- ✅ **Time Spent** - Active time with the page focused
- ✅ **Scroll Depth** - How far the user scrolls (percentage)
- ✅ **Interactions** - Clicks and keyboard activity
- ✅ **Video Playback** - Automatically detects `<video>` elements

---

## Manual Tracking (Optional)

For more control, use the **`CAETTracker` API** in your lesson page:

### Mark Objectives as Completed

```javascript
// When user completes a learning objective
CAETTracker.completeObjective("Ohm's Law", 95); // Name and score (0-100)
```

### Record Quiz Scores

```javascript
// When user finishes a quiz
CAETTracker.recordQuizScore("DC Circuits Quiz", 8, 10); // score, maxScore
// Result: 80% will be recorded
```

### Update Topic Progress (for Radar Chart)

```javascript
// Update individual topic mastery (shows on dashboard radar chart)
CAETTracker.updateTopicProgress("dc_theory", 85);
CAETTracker.updateTopicProgress("circuit_analysis", 92);
CAETTracker.updateTopicProgress("problem_solving", 78);
CAETTracker.updateTopicProgress("troubleshooting", 88);
```

### Manually Mark Lesson as Completed

```javascript
// When user clicks "Complete Lesson" button
document.getElementById('completeLessonBtn').addEventListener('click', function() {
    CAETTracker.markCompleted();
});
```

---

## Complete Example

Here's a full example of an integrated lesson page:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fundamentals of Direct Current</title>

    <!-- Set lesson ID -->
    <meta name="lesson-id" content="1">

    <!-- Include CAET Tracker -->
    <script src="https://yourdomain.com/lesson-tracker.js"></script>
</head>
<body>
    <h1>Lesson 1: Fundamentals of Direct Current</h1>

    <section id="ohms-law">
        <h2>Ohm's Law</h2>
        <p>Content here...</p>
        <button onclick="completeOhmsLaw()">Mark as Completed</button>
    </section>

    <section id="quiz">
        <h2>Knowledge Check</h2>
        <form id="quizForm">
            <!-- Quiz questions -->
        </form>
        <button onclick="submitQuiz()">Submit Quiz</button>
    </section>

    <button onclick="finishLesson()">Complete Lesson</button>

    <script>
        // Mark objective complete
        function completeOhmsLaw() {
            CAETTracker.completeObjective("Ohm's Law", 100);
            alert("Objective completed!");
        }

        // Submit quiz
        function submitQuiz() {
            // Calculate score
            let score = 0;
            let total = 10;

            // Your quiz scoring logic here
            score = 8; // Example

            // Record in LMS
            CAETTracker.recordQuizScore("DC Fundamentals Quiz", score, total);

            // Update topic progress based on quiz performance
            const percentage = (score / total) * 100;
            CAETTracker.updateTopicProgress("dc_theory", percentage);

            alert(`You scored ${score}/${total}!`);
        }

        // Finish lesson
        function finishLesson() {
            // Complete all objectives
            CAETTracker.completeObjective("Ohm's Law", 100);
            CAETTracker.completeObjective("Series Circuits", 100);
            CAETTracker.completeObjective("Parallel Circuits", 100);
            CAETTracker.completeObjective("Power Calculations", 100);

            // Update all topic scores
            CAETTracker.updateTopicProgress("dc_theory", 95);
            CAETTracker.updateTopicProgress("circuit_analysis", 90);
            CAETTracker.updateTopicProgress("problem_solving", 85);
            CAETTracker.updateTopicProgress("troubleshooting", 88);

            // Mark lesson as complete
            CAETTracker.markCompleted();

            alert("Lesson completed! Returning to LMS...");
        }
    </script>
</body>
</html>
```

---

## Progress Calculation

The tracker calculates progress based on:

| Factor | Weight | Description |
|--------|--------|-------------|
| **Time Spent** | 40% | Active engagement time (minimum 30 seconds) |
| **Scroll Depth** | 30% | How much content was viewed |
| **Interactions** | 15% | Clicks, keyboard input |
| **Objectives** | 15% | Manually marked objectives completed |

**Total Progress = Time + Scroll + Interactions + Objectives**

Once progress reaches **100%**, the lesson is automatically marked as complete and XP is awarded.

---

## Topic Scores (for Dashboard Radar Chart)

Each lesson can track **4 topic scores** that appear on the dashboard radar chart. Use meaningful topic names:

### Lesson 1: DC Fundamentals
```javascript
CAETTracker.updateTopicProgress("dc_theory", 85);
CAETTracker.updateTopicProgress("circuit_analysis", 92);
CAETTracker.updateTopicProgress("problem_solving", 78);
CAETTracker.updateTopicProgress("troubleshooting", 88);
```

### Lesson 2: AC Fundamentals
```javascript
CAETTracker.updateTopicProgress("ac_theory", 80);
CAETTracker.updateTopicProgress("transformers", 90);
CAETTracker.updateTopicProgress("phase_systems", 75);
CAETTracker.updateTopicProgress("power_distribution", 85);
```

---

## Objectives Setup

Each lesson has **4 objectives** defined in the LMS. To mark them as completed:

### Lesson 1 Objectives:
1. Ohm's Law
2. Series Circuits
3. Parallel Circuits
4. Power Calculations

```javascript
// Mark each as completed with a score
CAETTracker.completeObjective("Ohm's Law", 95);
CAETTracker.completeObjective("Series Circuits", 88);
CAETTracker.completeObjective("Parallel Circuits", 92);
CAETTracker.completeObjective("Power Calculations", 90);
```

**Note:** Objective names must **exactly match** the names defined in the LMS (see `index.html` line 1003-1007 for Lesson 1).

---

## Debugging

### View Tracker State
Open browser console and run:
```javascript
CAETTracker.getState()
```

This shows current tracking data:
```javascript
{
    lessonId: "1",
    scrollDepth: 75,
    activeTime: 120,
    interactions: 45,
    objectives: [...],
    topicProgress: {...}
}
```

### Common Issues

**❌ Tracker not communicating with LMS**
- Check that the lesson is loaded in an iframe from the LMS
- Verify the lesson ID is set correctly
- Check browser console for errors

**❌ Progress not updating**
- Ensure user is actively engaging (clicking, scrolling)
- Progress updates every 5 seconds
- Minimum 30 seconds of active time required

**❌ Objectives not tracking**
- Verify objective names match exactly (case-sensitive)
- Check that `completeObjective()` is being called
- View state with `CAETTracker.getState()`

---

## Hosting the Tracker Script

### Option 1: Same Domain
Host `lesson-tracker.js` on your web server and reference it:
```html
<script src="/path/to/lesson-tracker.js"></script>
```

### Option 2: CDN (Recommended for external lessons)
Upload to a CDN and reference:
```html
<script src="https://cdn.yourdomain.com/caet/lesson-tracker.js"></script>
```

### Option 3: Inline
For external sites you don't control, you can inline the entire script:
```html
<script>
    // Paste contents of lesson-tracker.js here
</script>
```

---

## Security Considerations

### Cross-Origin Communication
The tracker uses `postMessage` API which is safe for cross-origin communication. However, in production:

1. **Verify Origin** - Update the LMS receiver to check `event.origin`
2. **Use HTTPS** - Always serve lesson pages over HTTPS
3. **Content Security Policy** - Allow script source in CSP headers

Example origin check in `index.html`:
```javascript
window.addEventListener('message', (event) => {
    // Verify origin
    if (event.origin !== 'https://trusted-domain.com') {
        return;
    }

    // Process message
    if (event.data.source === 'caet-lesson-tracker') {
        // Handle tracking data
    }
});
```

---

## Next Steps

1. ✅ Add tracking script to your first lesson page
2. ✅ Test in the LMS by clicking "START" on Lesson 1
3. ✅ Verify progress updates in the modal header
4. ✅ Check dashboard to see radar chart and objectives
5. ✅ Customize objectives and topic scores for your content

---

## Support

For issues or questions:
- Check browser console for error messages
- Review `CAETTracker.getState()` output
- Verify lesson ID configuration
- Ensure lesson is loaded via the LMS (not directly)

---

**Happy Training! 🚀**
