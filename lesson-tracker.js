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
        topicProgress: {},
        questionsAnswered: {
            total: 0,
            correct: 0,
            questions: {}  // Track individual questions: { questionId: { answered: true, correct: boolean, timestamp } }
        }
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
                questionsAnswered: trackerState.questionsAnswered,
                timestamp: Date.now()
            }
        });
    }

    // Calculate overall progress percentage
    function calculateProgress() {
        let progress = 0;

        // Check if we have quiz scores - if so, use quiz-weighted progress
        const hasQuizzes = Object.keys(trackerState.quizScores).length > 0;
        const hasObjectives = trackerState.objectives.length > 0;
        const hasQuestions = trackerState.questionsAnswered.total > 0;

        if (hasQuizzes || hasQuestions) {
            // Quiz-aware progress calculation:
            // Time: 25%, Scroll: 20%, Interactions: 10%, Quiz/Questions: 30%, Objectives: 15%

            // Time component (25% weight)
            const timeProgress = Math.min(100, (trackerState.activeTime / CONFIG.minActiveTime) * 25);
            progress += timeProgress;

            // Scroll component (20% weight)
            const scrollProgress = (trackerState.maxScrollDepth / 100) * 20;
            progress += scrollProgress;

            // Interaction component (10% weight)
            const interactionProgress = Math.min(10, trackerState.interactions * 0.5);
            progress += interactionProgress;

            // Quiz/Questions component (30% weight)
            let quizProgress = 0;
            if (hasQuizzes) {
                // Calculate average quiz score
                const quizScores = Object.values(trackerState.quizScores);
                const avgQuizScore = quizScores.reduce((sum, q) => sum + q.percentage, 0) / quizScores.length;
                quizProgress = (avgQuizScore / 100) * 30;
            } else if (hasQuestions) {
                // Use questions answered percentage
                const correctPercent = trackerState.questionsAnswered.total > 0
                    ? (trackerState.questionsAnswered.correct / trackerState.questionsAnswered.total) * 100
                    : 0;
                quizProgress = (correctPercent / 100) * 30;
            }
            progress += quizProgress;

            // Objectives component (15% weight)
            if (hasObjectives) {
                const completedObjectives = trackerState.objectives.filter(o => o.completed).length;
                const objectiveProgress = (completedObjectives / trackerState.objectives.length) * 15;
                progress += objectiveProgress;
            } else {
                // If no objectives defined, give full credit
                progress += 15;
            }
        } else {
            // Standard progress calculation (no quizzes):
            // Time: 40%, Scroll: 30%, Interactions: 15%, Objectives: 15%

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
            if (hasObjectives) {
                const completedObjectives = trackerState.objectives.filter(o => o.completed).length;
                const objectiveProgress = (completedObjectives / trackerState.objectives.length) * 15;
                progress += objectiveProgress;
            } else {
                // If no objectives defined, give full credit
                progress += 15;
            }
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
            // Case-insensitive search for existing objective
            const normalizedName = objectiveName.toLowerCase().replace(/[^a-z0-9]/g, '');
            const existing = trackerState.objectives.find(o =>
                o.name.toLowerCase().replace(/[^a-z0-9]/g, '') === normalizedName
            );
            if (existing) {
                existing.completed = true;
                existing.score = Math.max(existing.score, score);
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
            const normalizedName = objectiveName.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (!trackerState.objectives.find(o =>
                o.name.toLowerCase().replace(/[^a-z0-9]/g, '') === normalizedName
            )) {
                trackerState.objectives.push({
                    name: objectiveName,
                    completed: false,
                    score: 0,
                    timestamp: Date.now()
                });
            }
        },

        // Record quiz score (with optional totalQuestions for better tracking)
        recordQuizScore: function(quizName, score, maxScore = 100, totalQuestions = null) {
            const percentage = Math.round((score / maxScore) * 100);
            const existingQuiz = trackerState.quizScores[quizName];

            // Only update if new score is higher
            if (!existingQuiz || percentage > existingQuiz.percentage) {
                trackerState.quizScores[quizName] = {
                    score: score,
                    maxScore: maxScore,
                    percentage: percentage,
                    totalQuestions: totalQuestions || maxScore, // Fallback to maxScore if not provided
                    timestamp: Date.now()
                };
            }
            sendProgressUpdate();
        },

        // Track individual question answer (for practice tests)
        recordQuestionAnswer: function(questionId, isCorrect, questionText = '') {
            // Only record if not already tracked
            if (!trackerState.questionsAnswered.questions[questionId]) {
                trackerState.questionsAnswered.questions[questionId] = {
                    answered: true,
                    correct: isCorrect,
                    text: questionText,
                    timestamp: Date.now()
                };
                trackerState.questionsAnswered.total++;
                if (isCorrect) {
                    trackerState.questionsAnswered.correct++;
                }
                sendProgressUpdate();
            }
        },

        // Get questions answered stats
        getQuestionsStats: function() {
            return {
                total: trackerState.questionsAnswered.total,
                correct: trackerState.questionsAnswered.correct,
                percentage: trackerState.questionsAnswered.total > 0
                    ? Math.round((trackerState.questionsAnswered.correct / trackerState.questionsAnswered.total) * 100)
                    : 0
            };
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
                    topicProgress: trackerState.topicProgress,
                    questionsAnswered: trackerState.questionsAnswered
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
        },

        // Reset questions for retaking a quiz/test
        resetQuestions: function() {
            trackerState.questionsAnswered = {
                total: 0,
                correct: 0,
                questions: {}
            };
            sendProgressUpdate();
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
