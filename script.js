class APWorldDatesGame {
    constructor() {
        this.eventsData = null;
        this.currentPeriod = null;
        this.currentEvents = [];
        this.matches = new Map(); // Map of event index to date index
        this.selectedDate = null;
        this.selectedEvent = null;
        this.isSubmitted = false;
        
        this.initializeElements();
        this.loadData();
        this.bindEvents();
        this.setupResizeHandler();
    }
    
    initializeElements() {
        this.periodSelect = document.getElementById('period-select');
        this.periodInfo = document.getElementById('period-info');
        this.periodTitle = document.getElementById('period-title');
        this.periodSubtitle = document.getElementById('period-subtitle');
        this.matchingInterface = document.getElementById('matching-interface');
        this.datesList = document.getElementById('dates-list');
        this.eventsList = document.getElementById('events-list');
        this.submitBtn = document.getElementById('submit-btn');
        this.retryBtn = document.getElementById('retry-btn');
        this.clearAllBtn = document.getElementById('clear-all-btn');
        this.completionState = document.getElementById('completion-state');
        this.replayBtn = document.getElementById('replay-btn');
        this.changePeriodBtn = document.getElementById('change-period-btn');
        this.confettiCanvas = document.getElementById('confetti-canvas');
        this.instructions = document.getElementById('instructions');
        this.connectionsSvg = document.getElementById('connections-svg');
        this.matchingContainer = document.querySelector('.matching-container');
        this.hideCorrectToggle = document.getElementById('hide-correct-toggle');
        this.hideCorrectCheckbox = document.getElementById('hide-correct-checkbox');
    }
    
    async loadData() {
        try {
            const response = await fetch('data/events.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.eventsData = await response.json();

            // Validate data structure
            if (!this.eventsData || !this.eventsData.periods) {
                throw new Error('Invalid data structure');
            }
        } catch (error) {
            console.error('Error loading events data:', error);
            this.showError('Failed to load historical events data. Please refresh the page and try again.');
        }
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `
            <div style="background-color: var(--red-100); border: 1px solid var(--red-500);
                        color: var(--red-500); padding: 1rem; border-radius: var(--border-radius);
                        margin: 1rem 0; text-align: center;">
                <strong>Error:</strong> ${message}
            </div>
        `;

        const container = document.querySelector('.container');
        const controls = document.querySelector('.controls');
        container.insertBefore(errorDiv, controls.nextSibling);
    }
    
    bindEvents() {
        this.periodSelect.addEventListener('change', (e) => this.onPeriodChange(e.target.value));
        this.submitBtn.addEventListener('click', () => this.submitAnswers());
        this.retryBtn.addEventListener('click', () => this.retryIncorrect());
        this.clearAllBtn.addEventListener('click', () => this.clearAll());
        this.replayBtn.addEventListener('click', () => this.replay());
        this.changePeriodBtn.addEventListener('click', () => this.changePeriod());
        this.hideCorrectCheckbox.addEventListener('change', (e) => this.onHideCorrectToggle(e.target.checked));
    }

    setupResizeHandler() {
        window.addEventListener('resize', () => {
            // Update confetti canvas size if it exists
            if (this.confettiCanvas) {
                this.confettiCanvas.width = window.innerWidth;
                this.confettiCanvas.height = window.innerHeight;
            }

            // Redraw connection lines on resize
            this.redrawAllConnectionLines();
        });
    }

    redrawAllConnectionLines() {
        // Store current matches and their states
        const currentMatches = new Map(this.matches);
        const matchStates = new Map();

        // Determine the state of each match
        for (let [eventIndex, dateIndex] of currentMatches.entries()) {
            const dateEl = this.findElementByOriginalIndex('date', dateIndex);
            const eventEl = this.findElementByOriginalIndex('event', eventIndex);

            if (dateEl && eventEl) {
                if (dateEl.classList.contains('correct')) {
                    matchStates.set(`${dateIndex}-${eventIndex}`, 'correct');
                } else if (dateEl.classList.contains('incorrect')) {
                    matchStates.set(`${dateIndex}-${eventIndex}`, 'incorrect');
                } else if (dateEl.classList.contains('matched')) {
                    matchStates.set(`${dateIndex}-${eventIndex}`, 'matched');
                }
            }
        }

        // Clear all lines and redraw
        this.clearAllConnectionLines();

        for (let [eventIndex, dateIndex] of currentMatches.entries()) {
            const dateEl = this.findElementByOriginalIndex('date', dateIndex);
            const eventEl = this.findElementByOriginalIndex('event', eventIndex);
            const state = matchStates.get(`${dateIndex}-${eventIndex}`) || 'matched';

            if (dateEl && eventEl) {
                this.drawConnectionLine(dateEl, eventEl, state);
            }
        }
    }
    
    onPeriodChange(periodId) {
        if (!periodId || !this.eventsData) return;
        
        this.currentPeriod = periodId;
        const periodData = this.eventsData.periods[periodId];
        
        // Update period info
        this.periodTitle.textContent = periodData.title;
        this.periodSubtitle.textContent = periodData.subtitle || '';
        this.periodInfo.classList.remove('hidden');
        this.instructions.classList.remove('hidden');
        
        // Load events for this period
        this.currentEvents = [...periodData.events];
        this.shuffleArray(this.currentEvents);
        
        // Reset game state
        this.matches.clear();
        this.selectedDate = null;
        this.selectedEvent = null;
        this.isSubmitted = false;
        
        // Show interface and render items
        this.matchingInterface.classList.remove('hidden');
        this.completionState.classList.add('hidden');
        this.clearAllBtn.classList.remove('hidden');
        this.hideCorrectToggle.classList.remove('hidden');
        
        this.renderItems();
        this.updateSubmitButton();
    }
    
    renderItems() {
        // Create shuffled arrays for dates and events
        const dates = this.currentEvents.map((item, index) => ({ ...item, originalIndex: index }));
        const events = this.currentEvents.map((item, index) => ({ ...item, originalIndex: index }));
        
        this.shuffleArray(dates);
        this.shuffleArray(events);
        
        // Render dates
        this.datesList.innerHTML = '';
        dates.forEach((item, displayIndex) => {
            const dateElement = this.createItemElement(item.date, 'date', item.originalIndex, displayIndex);
            this.datesList.appendChild(dateElement);
        });
        
        // Render events
        this.eventsList.innerHTML = '';
        events.forEach((item, displayIndex) => {
            const eventElement = this.createItemElement(item.event, 'event', item.originalIndex, displayIndex);
            this.eventsList.appendChild(eventElement);
        });
    }
    
    createItemElement(text, type, originalIndex, displayIndex) {
        const element = document.createElement('div');
        element.className = 'item';
        element.textContent = text;
        element.dataset.type = type;
        element.dataset.originalIndex = originalIndex;
        element.dataset.displayIndex = displayIndex;

        // Accessibility attributes
        element.setAttribute('role', 'button');
        element.setAttribute('tabindex', '0');
        element.setAttribute('aria-label', `${type === 'date' ? 'Date' : 'Event'}: ${text}`);
        element.setAttribute('aria-describedby', 'instructions');

        // Add click event
        element.addEventListener('click', () => this.onItemClick(element, type, originalIndex));

        // Add keyboard events for accessibility
        element.addEventListener('keydown', (e) => this.onKeyDown(e, element, type, originalIndex));

        // Add drag and drop events
        element.draggable = true;
        element.addEventListener('dragstart', (e) => this.onDragStart(e, element, type, originalIndex));
        element.addEventListener('dragover', (e) => this.onDragOver(e));
        element.addEventListener('drop', (e) => this.onDrop(e, element, type, originalIndex));
        element.addEventListener('dragenter', (e) => this.onDragEnter(e, element));
        element.addEventListener('dragleave', (e) => this.onDragLeave(e, element));
        element.addEventListener('dragend', (e) => this.onDragEnd(e, element));

        return element;
    }
    
    onItemClick(element, type, _originalIndex) {
        if (this.isSubmitted) return;
        
        // Handle selection logic
        if (type === 'date') {
            // Deselect previous date
            if (this.selectedDate) {
                this.selectedDate.classList.remove('selected');
            }
            
            // Select new date or deselect if same
            if (this.selectedDate === element) {
                this.selectedDate = null;
            } else {
                this.selectedDate = element;
                element.classList.add('selected');
            }
        } else if (type === 'event') {
            // Deselect previous event
            if (this.selectedEvent) {
                this.selectedEvent.classList.remove('selected');
            }
            
            // Select new event or deselect if same
            if (this.selectedEvent === element) {
                this.selectedEvent = null;
            } else {
                this.selectedEvent = element;
                element.classList.add('selected');
            }
        }
        
        // If both date and event are selected, create match
        if (this.selectedDate && this.selectedEvent) {
            this.createMatch();
        }
        
        this.updateSubmitButton();
    }
    
    createMatch() {
        const dateIndex = parseInt(this.selectedDate.dataset.originalIndex);
        const eventIndex = parseInt(this.selectedEvent.dataset.originalIndex);

        // Remove previous matches for these items
        this.removeMatchesForItems(dateIndex, eventIndex);

        // Create new match
        this.matches.set(eventIndex, dateIndex);

        // Update visual state
        this.selectedDate.classList.remove('selected');
        this.selectedEvent.classList.remove('selected');
        this.selectedDate.classList.add('matched');
        this.selectedEvent.classList.add('matched');

        // Draw connection line
        this.drawConnectionLine(this.selectedDate, this.selectedEvent, 'matched');

        // Clear selections
        this.selectedDate = null;
        this.selectedEvent = null;
    }
    
    removeMatchesForItems(dateIndex, eventIndex) {
        // Remove any existing matches for these items
        for (let [eIdx, dIdx] of this.matches.entries()) {
            if (eIdx === eventIndex || dIdx === dateIndex) {
                this.matches.delete(eIdx);

                // Remove visual matching state
                const dateEl = this.findElementByOriginalIndex('date', dIdx);
                const eventEl = this.findElementByOriginalIndex('event', eIdx);

                if (dateEl) dateEl.classList.remove('matched', 'correct', 'incorrect');
                if (eventEl) eventEl.classList.remove('matched', 'correct', 'incorrect');

                // Remove connection line
                this.removeConnectionLine(dIdx, eIdx);
            }
        }
    }
    
    findElementByOriginalIndex(type, originalIndex) {
        const container = type === 'date' ? this.datesList : this.eventsList;
        return container.querySelector(`[data-original-index="${originalIndex}"]`);
    }
    
    updateSubmitButton() {
        const hasMatches = this.matches.size > 0;
        this.submitBtn.disabled = !hasMatches;
    }
    
    submitAnswers() {
        if (this.matches.size === 0) return;

        this.isSubmitted = true;
        let correctCount = 0;

        // Check each match
        for (let [eventIndex, dateIndex] of this.matches.entries()) {
            const isCorrect = eventIndex === dateIndex;

            const dateEl = this.findElementByOriginalIndex('date', dateIndex);
            const eventEl = this.findElementByOriginalIndex('event', eventIndex);

            if (isCorrect) {
                dateEl.classList.remove('matched');
                eventEl.classList.remove('matched');
                dateEl.classList.add('correct');
                eventEl.classList.add('correct');
                correctCount++;

                // Update connection line to correct style
                this.drawConnectionLine(dateEl, eventEl, 'correct');
            } else {
                dateEl.classList.remove('matched');
                eventEl.classList.remove('matched');
                dateEl.classList.add('incorrect');
                eventEl.classList.add('incorrect');

                // Update connection line to incorrect style
                this.drawConnectionLine(dateEl, eventEl, 'incorrect');
            }
        }

        // Update button states
        this.submitBtn.style.display = 'none';

        if (correctCount === this.matches.size && this.matches.size === this.currentEvents.length) {
            // All matches are correct and complete - show completion
            setTimeout(() => this.showCompletion(), 1000);
        } else if (correctCount === this.matches.size && this.matches.size < this.currentEvents.length) {
            // All submitted matches are correct but some items are unmatched - auto continue
            setTimeout(() => this.autoRetryPartialCorrect(), 1500);
        } else {
            // Some incorrect matches - show retry option
            this.retryBtn.classList.remove('hidden');
        }
    }
    
    retryIncorrect() {
        // Remove incorrect matches and their visual states
        const incorrectMatches = [];

        for (let [eventIndex, dateIndex] of this.matches.entries()) {
            const dateEl = this.findElementByOriginalIndex('date', dateIndex);
            const eventEl = this.findElementByOriginalIndex('event', eventIndex);

            if (dateEl.classList.contains('incorrect')) {
                incorrectMatches.push([eventIndex, dateIndex]);
                dateEl.classList.remove('incorrect', 'matched');
                eventEl.classList.remove('incorrect', 'matched');

                // Remove connection line
                this.removeConnectionLine(dateIndex, eventIndex);
            }
        }

        // Remove incorrect matches from the matches map
        incorrectMatches.forEach(([eventIndex]) => {
            this.matches.delete(eventIndex);
        });

        // Reset game state for retry
        this.isSubmitted = false;
        this.retryBtn.classList.add('hidden');
        this.submitBtn.style.display = 'inline-flex';
        this.updateSubmitButton();
    }
    
    clearAll() {
        this.matches.clear();
        this.selectedDate = null;
        this.selectedEvent = null;
        this.isSubmitted = false;

        // Remove all visual states
        const allItems = document.querySelectorAll('.item');
        allItems.forEach(item => {
            item.classList.remove('selected', 'matched', 'correct', 'incorrect', 'hidden-correct');
        });

        // Clear all connection lines
        this.clearAllConnectionLines();

        // Reset buttons
        this.submitBtn.style.display = 'inline-flex';
        this.retryBtn.classList.add('hidden');
        this.updateSubmitButton();
    }
    
    showCompletion() {
        this.matchingInterface.classList.add('hidden');
        this.completionState.classList.remove('hidden');
        this.clearAllBtn.classList.add('hidden');
        
        // Trigger confetti animation
        this.startConfetti();
    }
    
    replay() {
        this.completionState.classList.add('hidden');
        // Reset the toggle
        this.hideCorrectCheckbox.checked = false;
        this.onPeriodChange(this.currentPeriod);
    }
    
    autoRetryPartialCorrect() {
        // Hide correct matches if toggle is enabled
        if (this.hideCorrectCheckbox.checked) {
            this.hideCorrectMatches();
        }

        // Reset game state for continuing
        this.isSubmitted = false;
        this.submitBtn.style.display = 'inline-flex';
        this.updateSubmitButton();

        // Show a brief message
        this.showAutoRetryMessage();
    }

    hideCorrectMatches() {
        for (let [eventIndex, dateIndex] of this.matches.entries()) {
            const dateEl = this.findElementByOriginalIndex('date', dateIndex);
            const eventEl = this.findElementByOriginalIndex('event', eventIndex);

            if (dateEl && eventEl && dateEl.classList.contains('correct')) {
                dateEl.classList.add('hidden-correct');
                eventEl.classList.add('hidden-correct');

                // Hide the connection line
                const connectionId = `connection-${dateIndex}-${eventIndex}`;
                const line = this.connectionsSvg.querySelector(`#${connectionId}`);
                if (line) {
                    line.style.opacity = '0';
                }
            }
        }
    }

    showAutoRetryMessage() {
        // Create a temporary message
        const message = document.createElement('div');
        message.className = 'auto-retry-message';
        message.innerHTML = `
            <div style="background-color: var(--green-100); border: 2px solid var(--green-500);
                        color: var(--green-500); padding: 1rem; border-radius: var(--border-radius);
                        margin: 1rem 0; text-align: center; font-weight: 500;">
                Great! All your matches are correct. ${this.hideCorrectCheckbox.checked ? 'Correct matches hidden. ' : ''}Continue matching the remaining items.
            </div>
        `;

        const actionButtons = document.querySelector('.action-buttons');
        actionButtons.parentNode.insertBefore(message, actionButtons);

        // Remove message after 3 seconds
        setTimeout(() => {
            if (message.parentNode) {
                message.parentNode.removeChild(message);
            }
        }, 3000);
    }

    onHideCorrectToggle(isChecked) {
        if (!isChecked) {
            // Show all hidden correct matches
            this.showHiddenCorrectMatches();
        }
    }

    showHiddenCorrectMatches() {
        const hiddenItems = document.querySelectorAll('.item.hidden-correct');
        hiddenItems.forEach(item => {
            item.classList.remove('hidden-correct');
        });

        // Show connection lines for correct matches
        const connectionLines = this.connectionsSvg.querySelectorAll('.connection-line.correct');
        connectionLines.forEach(line => {
            line.style.opacity = '1';
        });
    }

    changePeriod() {
        this.completionState.classList.add('hidden');
        this.matchingInterface.classList.add('hidden');
        this.periodInfo.classList.add('hidden');
        this.instructions.classList.add('hidden');
        this.clearAllBtn.classList.add('hidden');
        this.hideCorrectToggle.classList.add('hidden');
        this.periodSelect.value = '';

        // Reset toggle
        this.hideCorrectCheckbox.checked = false;
    }
    
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
    
    // Drag and Drop Event Handlers
    onDragStart(e, element, type, originalIndex) {
        if (this.isSubmitted) {
            e.preventDefault();
            return;
        }

        element.classList.add('dragging');
        e.dataTransfer.setData('text/plain', JSON.stringify({
            type: type,
            originalIndex: originalIndex,
            element: element.dataset.displayIndex
        }));
        e.dataTransfer.effectAllowed = 'move';
    }

    onDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }

    onDragEnter(e, element) {
        if (this.isSubmitted) return;

        const dragData = e.dataTransfer.types.includes('text/plain');
        if (dragData) {
            element.classList.add('drag-over');
        }
    }

    onDragLeave(e, element) {
        // Only remove drag-over if we're actually leaving the element
        if (!element.contains(e.relatedTarget)) {
            element.classList.remove('drag-over');
        }
    }

    onDrop(e, dropElement, dropType, _dropOriginalIndex) {
        e.preventDefault();

        if (this.isSubmitted) return;

        try {
            const dragData = JSON.parse(e.dataTransfer.getData('text/plain'));
            const dragType = dragData.type;
            const dragOriginalIndex = dragData.originalIndex;

            // Only allow drops between different types (date to event or event to date)
            if (dragType === dropType) {
                dropElement.classList.remove('drag-over');
                return;
            }

            // Find the dragged element
            const dragElement = this.findElementByOriginalIndex(dragType, dragOriginalIndex);

            if (dragElement && dropElement) {
                // Clear any existing selections
                this.clearSelections();

                // Set the elements as if they were clicked
                if (dragType === 'date') {
                    this.selectedDate = dragElement;
                    this.selectedEvent = dropElement;
                } else {
                    this.selectedDate = dropElement;
                    this.selectedEvent = dragElement;
                }

                // Create the match
                this.createMatch();
                this.updateSubmitButton();
            }

        } catch (error) {
            console.error('Error processing drop:', error);
        }

        dropElement.classList.remove('drag-over');
    }

    onDragEnd(_e, element) {
        element.classList.remove('dragging');
        // Remove drag-over class from all elements
        document.querySelectorAll('.drag-over').forEach(el => {
            el.classList.remove('drag-over');
        });
    }

    onKeyDown(e, element, type, originalIndex) {
        // Handle Enter and Space key presses
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.onItemClick(element, type, originalIndex);
        }
        // Handle Escape key to clear selections
        else if (e.key === 'Escape') {
            this.clearSelections();
        }
    }

    drawConnectionLine(dateElement, eventElement, type = 'matched') {
        // Update SVG size to match container
        this.updateSvgSize();

        // Get positions relative to the matching container
        const containerRect = this.matchingContainer.getBoundingClientRect();
        const dateRect = dateElement.getBoundingClientRect();
        const eventRect = eventElement.getBoundingClientRect();

        // Calculate connection points
        const startX = dateRect.right - containerRect.left;
        const startY = dateRect.top + dateRect.height / 2 - containerRect.top;
        const endX = eventRect.left - containerRect.left;
        const endY = eventRect.top + eventRect.height / 2 - containerRect.top;

        // Create unique ID for this connection
        const connectionId = `connection-${dateElement.dataset.originalIndex}-${eventElement.dataset.originalIndex}`;

        // Remove existing connection with same ID
        const existingLine = this.connectionsSvg.querySelector(`#${connectionId}`);
        if (existingLine) {
            existingLine.remove();
        }

        // Create curved path for better visual appeal
        const controlX1 = startX + (endX - startX) * 0.3;
        const controlY1 = startY;
        const controlX2 = startX + (endX - startX) * 0.7;
        const controlY2 = endY;

        const pathData = `M ${startX} ${startY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${endX} ${endY}`;

        // Create SVG path element
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('id', connectionId);
        path.setAttribute('d', pathData);
        path.setAttribute('class', `connection-line ${type}`);
        path.setAttribute('data-date-index', dateElement.dataset.originalIndex);
        path.setAttribute('data-event-index', eventElement.dataset.originalIndex);

        this.connectionsSvg.appendChild(path);
    }

    updateSvgSize() {
        const containerRect = this.matchingContainer.getBoundingClientRect();
        this.connectionsSvg.setAttribute('width', containerRect.width);
        this.connectionsSvg.setAttribute('height', containerRect.height);
    }

    removeConnectionLine(dateIndex, eventIndex) {
        const connectionId = `connection-${dateIndex}-${eventIndex}`;
        const line = this.connectionsSvg.querySelector(`#${connectionId}`);
        if (line) {
            line.remove();
        }
    }

    clearAllConnectionLines() {
        while (this.connectionsSvg.firstChild && this.connectionsSvg.firstChild.tagName !== 'defs') {
            if (this.connectionsSvg.firstChild.tagName === 'defs') {
                break;
            }
            this.connectionsSvg.removeChild(this.connectionsSvg.firstChild);
        }
        // Remove all path elements but keep defs
        const paths = this.connectionsSvg.querySelectorAll('path');
        paths.forEach(path => path.remove());
    }

    clearSelections() {
        if (this.selectedDate) {
            this.selectedDate.classList.remove('selected');
            this.selectedDate = null;
        }
        if (this.selectedEvent) {
            this.selectedEvent.classList.remove('selected');
            this.selectedEvent = null;
        }
    }

    startConfetti() {
        const canvas = this.confettiCanvas;
        const ctx = canvas.getContext('2d');

        // Set canvas size
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const confettiPieces = [];
        const colors = ['#4ade80', '#86efac', '#22c55e', '#10b981', '#ffffff', '#f0fdf4'];

        // Create confetti pieces
        for (let i = 0; i < 100; i++) {
            confettiPieces.push({
                x: Math.random() * canvas.width,
                y: -10,
                vx: (Math.random() - 0.5) * 4,
                vy: Math.random() * 3 + 2,
                rotation: Math.random() * 360,
                rotationSpeed: (Math.random() - 0.5) * 10,
                size: Math.random() * 8 + 4,
                color: colors[Math.floor(Math.random() * colors.length)],
                shape: Math.random() > 0.5 ? 'square' : 'circle'
            });
        }

        let animationId;
        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            confettiPieces.forEach((piece, index) => {
                // Update position
                piece.x += piece.vx;
                piece.y += piece.vy;
                piece.rotation += piece.rotationSpeed;

                // Apply gravity
                piece.vy += 0.1;

                // Draw piece
                ctx.save();
                ctx.translate(piece.x, piece.y);
                ctx.rotate(piece.rotation * Math.PI / 180);
                ctx.fillStyle = piece.color;

                if (piece.shape === 'circle') {
                    ctx.beginPath();
                    ctx.arc(0, 0, piece.size / 2, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    ctx.fillRect(-piece.size / 2, -piece.size / 2, piece.size, piece.size);
                }

                ctx.restore();

                // Remove pieces that are off screen
                if (piece.y > canvas.height + 50) {
                    confettiPieces.splice(index, 1);
                }
            });

            if (confettiPieces.length > 0) {
                animationId = requestAnimationFrame(animate);
            } else {
                // Clear canvas when animation is done
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        };

        animate();

        // Stop animation after 5 seconds regardless
        setTimeout(() => {
            if (animationId) {
                cancelAnimationFrame(animationId);
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        }, 5000);
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new APWorldDatesGame();
});
