/**
 * CAET LMS - Radar Chart with Sweeping Animation
 * ================================================
 * Creates an analog radar-style visualization of topic mastery
 * with a continuously sweeping scan line effect
 */

(function() {
    'use strict';

    let sweepAngle = 0;
    let animationFrame = null;

    /**
     * Create radar chart on canvas
     * @param {string} canvasId - ID of the canvas element
     * @param {Object} topicScores - Object with topic names as keys and scores (0-100) as values
     */
    window.createRadarChart = function(canvasId, topicScores) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.error('Canvas element not found:', canvasId);
            return;
        }

        const ctx = canvas.getContext('2d');
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const maxRadius = Math.min(centerX, centerY) - 60;

        // Prepare data
        const topics = Object.keys(topicScores).length > 0
            ? Object.keys(topicScores)
            : ['DC Theory', 'AC Theory', 'Semiconductors', 'Digital Logic', 'Power Systems', 'Troubleshooting'];

        const scores = topics.map(topic => topicScores[topic] || 0);
        const numTopics = topics.length;
        const angleStep = (Math.PI * 2) / numTopics;

        // Animation loop
        function animate() {
            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw radar background
            drawRadarBackground(ctx, centerX, centerY, maxRadius, numTopics, angleStep);

            // Draw topic labels and axes
            drawTopicLabels(ctx, centerX, centerY, maxRadius, topics, angleStep);

            // Draw data polygon
            drawDataPolygon(ctx, centerX, centerY, maxRadius, scores, angleStep);

            // Draw sweeping radar line
            drawSweepLine(ctx, centerX, centerY, maxRadius);

            // Update sweep angle
            sweepAngle += 0.02; // Rotation speed
            if (sweepAngle >= Math.PI * 2) {
                sweepAngle = 0;
            }

            // Continue animation
            animationFrame = requestAnimationFrame(animate);
        }

        // Start animation
        animate();
    };

    /**
     * Draw radar background with concentric circles
     */
    function drawRadarBackground(ctx, centerX, centerY, maxRadius, numTopics, angleStep) {
        // Draw concentric circles (range rings)
        const numRings = 5;
        for (let i = 1; i <= numRings; i++) {
            const radius = (maxRadius / numRings) * i;

            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(0, 255, 65, ${0.1 + (i * 0.05)})`;
            ctx.lineWidth = 1;
            ctx.stroke();

            // Draw percentage label
            ctx.fillStyle = 'rgba(0, 255, 65, 0.5)';
            ctx.font = '10px "Share Tech Mono", monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`${(i * 20)}%`, centerX, centerY - radius - 5);
        }

        // Draw axis lines (spokes)
        for (let i = 0; i < numTopics; i++) {
            const angle = angleStep * i - Math.PI / 2; // Start from top
            const x = centerX + Math.cos(angle) * maxRadius;
            const y = centerY + Math.sin(angle) * maxRadius;

            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(x, y);
            ctx.strokeStyle = 'rgba(0, 255, 65, 0.2)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // Draw center circle
        ctx.beginPath();
        ctx.arc(centerX, centerY, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#00ff41';
        ctx.fill();
        ctx.strokeStyle = '#ffcc00';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    /**
     * Draw topic labels around the radar
     */
    function drawTopicLabels(ctx, centerX, centerY, maxRadius, topics, angleStep) {
        ctx.font = '14px "Orbitron", sans-serif';
        ctx.fillStyle = '#ffcc00';

        topics.forEach((topic, i) => {
            const angle = angleStep * i - Math.PI / 2;
            const labelRadius = maxRadius + 40;
            const x = centerX + Math.cos(angle) * labelRadius;
            const y = centerY + Math.sin(angle) * labelRadius;

            // Format topic name (replace underscores with spaces, capitalize)
            const formattedTopic = topic
                .replace(/_/g, ' ')
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');

            // Adjust text alignment based on position
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            if (Math.abs(angle) < Math.PI / 4 || Math.abs(angle) > (3 * Math.PI / 4)) {
                // Top or bottom
                ctx.textAlign = 'center';
            } else if (angle > 0) {
                // Right side
                ctx.textAlign = 'left';
            } else {
                // Left side
                ctx.textAlign = 'right';
            }

            ctx.fillText(formattedTopic, x, y);
        });
    }

    /**
     * Draw the data polygon showing scores
     */
    function drawDataPolygon(ctx, centerX, centerY, maxRadius, scores, angleStep) {
        if (scores.length === 0) return;

        // Create gradient for fill
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxRadius);
        gradient.addColorStop(0, 'rgba(0, 255, 65, 0.3)');
        gradient.addColorStop(1, 'rgba(0, 255, 65, 0.05)');

        // Draw filled polygon
        ctx.beginPath();
        scores.forEach((score, i) => {
            const angle = angleStep * i - Math.PI / 2;
            const scoreRadius = (score / 100) * maxRadius;
            const x = centerX + Math.cos(angle) * scoreRadius;
            const y = centerY + Math.sin(angle) * scoreRadius;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();

        // Draw outline
        ctx.strokeStyle = '#00ff41';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw points with values
        ctx.font = '12px "Orbitron", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        scores.forEach((score, i) => {
            const angle = angleStep * i - Math.PI / 2;
            const scoreRadius = (score / 100) * maxRadius;
            const x = centerX + Math.cos(angle) * scoreRadius;
            const y = centerY + Math.sin(angle) * scoreRadius;

            // Draw point
            ctx.beginPath();
            ctx.arc(x, y, 6, 0, Math.PI * 2);
            ctx.fillStyle = '#ffcc00';
            ctx.fill();
            ctx.strokeStyle = '#ff6600';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Draw score value
            const valueOffsetX = Math.cos(angle) * 20;
            const valueOffsetY = Math.sin(angle) * 20;

            // Draw background for text
            const textMetrics = ctx.measureText(Math.round(score) + '%');
            const textWidth = textMetrics.width;
            const textHeight = 16;

            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(
                x + valueOffsetX - textWidth / 2 - 4,
                y + valueOffsetY - textHeight / 2,
                textWidth + 8,
                textHeight
            );

            // Draw text
            ctx.fillStyle = '#00ff41';
            ctx.fillText(Math.round(score) + '%', x + valueOffsetX, y + valueOffsetY);
        });
    }

    /**
     * Draw the sweeping radar line with fade trail
     */
    function drawSweepLine(ctx, centerX, centerY, maxRadius) {
        // Create gradient for sweep line
        const gradient = ctx.createLinearGradient(
            centerX,
            centerY,
            centerX + Math.cos(sweepAngle) * maxRadius,
            centerY + Math.sin(sweepAngle) * maxRadius
        );
        gradient.addColorStop(0, 'rgba(255, 204, 0, 0)');
        gradient.addColorStop(0.7, 'rgba(255, 204, 0, 0.3)');
        gradient.addColorStop(1, 'rgba(255, 204, 0, 0.8)');

        // Draw sweep trail (fade effect)
        const trailSegments = 20;
        for (let i = 0; i < trailSegments; i++) {
            const trailAngle = sweepAngle - (i * 0.05);
            const opacity = 1 - (i / trailSegments);
            const x = centerX + Math.cos(trailAngle) * maxRadius;
            const y = centerY + Math.sin(trailAngle) * maxRadius;

            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(x, y);
            ctx.strokeStyle = `rgba(255, 204, 0, ${opacity * 0.5})`;
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Draw main sweep line
        const sweepX = centerX + Math.cos(sweepAngle) * maxRadius;
        const sweepY = centerY + Math.sin(sweepAngle) * maxRadius;

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(sweepX, sweepY);
        ctx.strokeStyle = '#ffcc00';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#ffcc00';
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Draw sweep point at the end
        ctx.beginPath();
        ctx.arc(sweepX, sweepY, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffcc00';
        ctx.fill();
        ctx.strokeStyle = '#ff6600';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    /**
     * Stop radar animation
     */
    window.stopRadarAnimation = function() {
        if (animationFrame) {
            cancelAnimationFrame(animationFrame);
            animationFrame = null;
        }
    };

})();
