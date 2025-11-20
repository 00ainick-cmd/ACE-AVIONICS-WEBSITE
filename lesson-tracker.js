/**
 * CAET LMS - Lesson Progress Tracker
 * ====================================
 * Embed this script in external lesson pages to track student progress
 * and communicate with the main LMS window.
 *
 * Usage: Add <script src="lesson-tracker.js"></script> to lesson pages
 */

(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        updateInterval: 5000,        // Send updates every 5 seconds
        scrollThreshold: 80,         // Consider 80% scroll as "read"
        timeCheckInterval: 1000,     // Check time every second
        minActiveTime: 30,           // Minimum 30 seconds for progress
        idleTimeout: 60000           // 60 seconds of inactivity = idle
    };

    // Tracking State
    const trackerState = {
        lessonId: null,
        lessonTitle: document.title,
        startTime: Date.now(),
        lastActivity: Date.now(),
        totalTime: 0,
        activeTime: 0,
        scrollDepth: 0,
        maxScrollDepth: 0,
        interactions: 0,
        objectives: [],
        isActive: true,
        isFullscreen: false,
        quizScores: {},
        topicProgress: {}
    };

    // Initialize tracker
    function init() {
        // Try to detect lesson ID from URL or meta tags
        detectLessonId();

        // Setup event listeners
        setupScrollTracking();
        setupInteractionTracking();
        setupVisibilityTracking();
        setupFullscreenTracking();

        // Start periodic updates
        startProgressReporting();
        startTimeTracking();

        // Announce ready to parent
        sendToParent({
            type: 'TRACKER_READY',
            lessonId: trackerState.lessonId,
            lessonTitle: trackerState.lessonTitle
        });

        console.log('📊 CAET Lesson Tracker initialized');
    }

    // Detect lesson ID from various sources
    function detectLessonId() {
        // Check meta tag
        const metaLesson = document.querySelector('meta[name="lesson-id"]');
        if (metaLesson) {
            trackerState.lessonId = metaLesson.content;
            return;
        }

        // Check URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('lesson')) {
            trackerState.lessonId = urlParams.get('lesson');
            return;
        }

        // Check data attribute on body
        if (document.body.dataset.lessonId) {
            trackerState.lessonId = document.body.dataset.lessonId;
            return;
        }

        // Default fallback
        trackerState.lessonId = 'unknown';
    }

    // Setup scroll depth tracking
    function setupScrollTracking() {
        let scrollTimeout;

        window.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                updateScrollDepth();
                trackerState.interactions++;
                trackerState.lastActivity = Date.now();
            }, 100);
        });
    }

    // Calculate current scroll depth percentage
    function updateScrollDepth() {
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

        const scrollPercent = Math.round((scrollTop / (documentHeight - windowHeight)) * 100);
        trackerState.scrollDepth = Math.min(100, scrollPercent);

        if (trackerState.scrollDepth > trackerState.maxScrollDepth) {
            trackerState.maxScrollDepth = trackerState.scrollDepth;
        }
    }

    // Setup interaction tracking (clicks, keyboard)
    function setupInteractionTracking() {
        document.addEventListener('click', () => {
            trackerState.interactions++;
            trackerState.lastActivity = Date.now();
        });

        document.addEventListener('keydown', () => {
            trackerState.interactions++;
            trackerState.lastActivity = Date.now();
        });

        // Track video plays if any
        document.querySelectorAll('video').forEach(video => {
            video.addEventListener('play', () => {
                sendToParent({
                    type: 'VIDEO_STARTED',
                    lessonId: trackerState.lessonId
                });
            });

            video.addEventListener('ended', () => {
                sendToParent({
                    type: 'VIDEO_COMPLETED',
                    lessonId: trackerState.lessonId
                });
            });
        });
    }

    // Track visibility changes (tab switching)
    function setupVisibilityTracking() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                trackerState.isActive = false;
            } else {
                trackerState.isActive = true;
                trackerState.lastActivity = Date.now();
            }
        });

        // Track focus/blur
        window.addEventListener('blur', () => {
            trackerState.isActive = false;
        });

        window.addEventListener('focus', () => {
            trackerState.isActive = true;
            trackerState.lastActivity = Date.now();
        });
    }

    // Track fullscreen changes
    function setupFullscreenTracking() {
        document.addEventListener('fullscreenchange', () => {
            trackerState.isFullscreen = !!document.fullscreenElement;
            sendToParent({
                type: 'FULLSCREEN_CHANGED',
                isFullscreen: trackerState.isFullscreen
            });
        });
    }

    // Time tracking loop
    function startTimeTracking() {
        setInterval(() => {
            const now = Date.now();
            trackerState.totalTime = Math.floor((now - trackerState.startTime) / 1000);

            // Only count as active time if user is engaged
            const idleTime = now - trackerState.lastActivity;
            if (idleTime < CONFIG.idleTimeout && trackerState.isActive) {
                trackerState.activeTime++;
            }
        }, CONFIG.timeCheckInterval);
    }

    // Start periodic progress reporting
    function startProgressReporting() {
        setInterval(() => {
            sendProgressUpdate();
        }, CONFIG.updateInterval);
    }

    // Calculate and send progress update
    function sendProgressUpdate() {
        const progress = calculateProgress();

        sendToParent({
            type: 'PROGRESS_UPDATE',
            lessonId: trackerState.lessonId,
            data: {
                progress: progress,
                scrollDepth: trackerState.maxScrollDepth,
                activeTime: trackerState.activeTime,
                totalTime: trackerState.totalTime,
                interactions: trackerState.interactions,
                objectives: trackerState.objectives,
                quizScores: trackerState.quizScores,
                topicProgress: trackerState.topicProgress,
                timestamp: Date.now()
            }
        });
    }

    // Calculate overall progress percentage
    function calculateProgress() {
        let progress = 0;

        // Time component (40% weight)
        const timeProgress = Math.min(100, (trackerState.activeTime / CONFIG.minActiveTime) * 40);
        progress += timeProgress;

        // Scroll component (30% weight)
        const scrollProgress = (trackerState.maxScrollDepth / 100) * 30;
        progress += scrollProgress;

        // Interaction component (15% weight)
        const interactionProgress = Math.min(15, trackerState.interactions);
        progress += interactionProgress;

        // Objectives component (15% weight)
        if (trackerState.objectives.length > 0) {
            const completedObjectives = trackerState.objectives.filter(o => o.completed).length;
            const objectiveProgress = (completedObjectives / trackerState.objectives.length) * 15;
            progress += objectiveProgress;
        } else {
            // If no objectives defined, give full credit
            progress += 15;
        }

        return Math.min(100, Math.round(progress));
    }

    // Send message to parent window
    function sendToParent(message) {
        if (window.parent && window.parent !== window) {
            // Running in iframe
            window.parent.postMessage({
                source: 'caet-lesson-tracker',
                ...message
            }, '*');
        } else if (window.opener) {
            // Opened in new window
            window.opener.postMessage({
                source: 'caet-lesson-tracker',
                ...message
            }, '*');
        } else {
            console.log('📊 Tracker (no parent):', message);
        }
    }

    // Public API for lesson pages to use
    window.CAETTracker = {
        // Mark an objective as completed
        completeObjective: function(objectiveName, score = 100) {
            const existing = trackerState.objectives.find(o => o.name === objectiveName);
            if (existing) {
                existing.completed = true;
                existing.score = score;
            } else {
                trackerState.objectives.push({
                    name: objectiveName,
                    completed: true,
                    score: score,
                    timestamp: Date.now()
                });
            }
            sendProgressUpdate();
        },

        // Add an objective to track
        addObjective: function(objectiveName) {
            if (!trackerState.objectives.find(o => o.name === objectiveName)) {
                trackerState.objectives.push({
                    name: objectiveName,
                    completed: false,
                    score: 0,
                    timestamp: Date.now()
                });
            }
        },

        // Record quiz score
        recordQuizScore: function(quizName, score, maxScore = 100) {
            const percentage = Math.round((score / maxScore) * 100);
            trackerState.quizScores[quizName] = {
                score: score,
                maxScore: maxScore,
                percentage: percentage,
                timestamp: Date.now()
            };
            sendProgressUpdate();
        },

        // Update topic progress (for radar chart)
        updateTopicProgress: function(topicName, percentage) {
            trackerState.topicProgress[topicName] = Math.min(100, Math.max(0, percentage));
            sendProgressUpdate();
        },

        // Mark lesson as completed
        markCompleted: function() {
            sendToParent({
                type: 'LESSON_COMPLETED',
                lessonId: trackerState.lessonId,
                data: {
                    activeTime: trackerState.activeTime,
                    scrollDepth: trackerState.maxScrollDepth,
                    objectives: trackerState.objectives,
                    quizScores: trackerState.quizScores,
                    topicProgress: trackerState.topicProgress
                }
            });
        },

        // Get current state
        getState: function() {
            return { ...trackerState };
        },

        // Set lesson ID manually
        setLessonId: function(id) {
            trackerState.lessonId = id;
        }
    };

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Send final update before page unload
    window.addEventListener('beforeunload', () => {
        sendProgressUpdate();
    });

})();
