class ClipboardPinboard {
    constructor() {
        this.board = document.getElementById('board');
        this.pasteArea = document.querySelector('.paste-area');
        this.search = document.getElementById('search');
        this.toast = document.getElementById('toast');
        this.linkDialog = document.getElementById('linkDialog');
        this.linkUrl = document.getElementById('linkUrl');
        this.cancelLink = document.getElementById('cancelLink');
        this.addLink = document.getElementById('addLink');
        this.contextMenu = document.getElementById('contextMenu');
        this.textActions = document.getElementById('textActions');
        this.imageActions = document.getElementById('imageActions');
        this.currentItem = null;
        this.items = JSON.parse(localStorage.getItem('clipboardItems')) || [];
        this.draggingItem = null;
        this.dragStart = { x: 0, y: 0 };
        this.resizingItem = null;
        this.resizeStart = { x: 0, y: 0, width: 0, height: 0 };
        this.clearBoardBtn = document.getElementById('clearBoard');
        this.clearConfirmationDialog = document.getElementById('clearConfirmationDialog');
        this.cancelClearBtn = document.getElementById('cancelClear');
        this.confirmClearBtn = document.getElementById('confirmClear');
        
        this.setupEventListeners();
        this.renderItems();
    }

    setupEventListeners() {
        // Paste event
        document.addEventListener('paste', this.handlePaste.bind(this));
        
        // Search functionality
        this.search.addEventListener('input', this.handleSearch.bind(this));
        
        // Click on paste area
        this.pasteArea.addEventListener('click', () => {
            this.showToast('Press Ctrl+V to paste content');
        });

        // Mouse down for dragging and resizing
        this.board.addEventListener('mousedown', (e) => {
            const item = e.target.closest('.item');
            const resizeHandle = e.target.closest('.resize-handle');
            
            if (resizeHandle) {
                this.startResizing(item, e);
                return;
            }

            if (item) {
                this.startDragging(item, e);
            }
        });

        // Mouse move for dragging and resizing
        document.addEventListener('mousemove', (e) => {
            if (this.resizingItem) {
                this.handleResize(e);
            } else if (this.draggingItem) {
                this.handleDrag(e);
            }
        });

        // Mouse up to stop dragging and resizing
        document.addEventListener('mouseup', () => {
            if (this.resizingItem) {
                this.stopResizing();
            } else if (this.draggingItem) {
                this.stopDragging();
            }
        });

        // Context menu events
        document.addEventListener('contextmenu', (e) => {
            const item = e.target.closest('.item');
            if (item) {
                e.preventDefault();
                this.currentItem = item;
                this.showContextMenu(e.clientX, e.clientY, item.classList.contains('text-item'));
            } else {
                this.hideContextMenu();
            }
        });

        document.addEventListener('click', () => {
            this.hideContextMenu();
        });

        // Context menu button events
        document.getElementById('copyItem').addEventListener('click', () => {
            if (this.currentItem) {
                this.copyItem(this.currentItem);
            }
        });

        document.getElementById('deleteItem').addEventListener('click', () => {
            if (this.currentItem) {
                this.deleteItem(this.currentItem);
                this.hideContextMenu();
            }
        });

        document.getElementById('rotateImage').addEventListener('click', () => {
            if (this.currentItem && this.currentItem.classList.contains('image-item')) {
                this.rotateImage();
            }
        });

        document.getElementById('flipHorizontal').addEventListener('click', () => {
            if (this.currentItem && this.currentItem.classList.contains('image-item')) {
                this.flipImage('horizontal');
            }
        });

        document.getElementById('flipVertical').addEventListener('click', () => {
            if (this.currentItem && this.currentItem.classList.contains('image-item')) {
                this.flipImage('vertical');
            }
        });

        document.getElementById('resizeImage').addEventListener('click', () => {
            if (this.currentItem && this.currentItem.classList.contains('image-item')) {
                this.resizeImage(this.currentItem);
            }
        });

        // Link dialog events
        this.cancelLink.addEventListener('click', () => this.hideLinkDialog());
        this.addLink.addEventListener('click', () => this.addHyperlink());
        this.linkUrl.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addHyperlink();
        });

        // Clear board functionality
        this.clearBoardBtn.addEventListener('click', () => {
            this.clearConfirmationDialog.style.display = 'block';
        });

        this.cancelClearBtn.addEventListener('click', () => {
            this.clearConfirmationDialog.style.display = 'none';
        });

        this.confirmClearBtn.addEventListener('click', () => {
            this.clearBoard();
            this.clearConfirmationDialog.style.display = 'none';
        });

        // Double click to add text
        this.board.addEventListener('dblclick', (e) => {
            // Don't create text if clicking on an existing item
            if (e.target.closest('.item')) return;

            const boardRect = this.board.getBoundingClientRect();
            const x = e.clientX - boardRect.left;
            const y = e.clientY - boardRect.top;

            const item = {
                id: Date.now(),
                type: 'text',
                content: 'Double click to edit',
                timestamp: new Date().toISOString(),
                position: { x, y },
                size: { width: 200, height: 100 }
            };

            this.items.push(item);
            this.saveItems();
            this.renderItem(item);

            // Focus the text element
            const textElement = document.querySelector(`.item[data-id="${item.id}"] p`);
            if (textElement) {
                textElement.focus();
                // Select all text for immediate editing
                const range = document.createRange();
                range.selectNodeContents(textElement);
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
            }
        });
    }

    startDragging(item, event) {
        this.draggingItem = item;
        const rect = item.getBoundingClientRect();
        this.dragStart = {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
        item.classList.add('dragging');
        item.style.zIndex = '1000';
    }

    handleDrag(event) {
        const boardRect = this.board.getBoundingClientRect();
        const x = event.clientX - boardRect.left - this.dragStart.x;
        const y = event.clientY - boardRect.top - this.dragStart.y;
        
        this.draggingItem.style.left = `${x}px`;
        this.draggingItem.style.top = `${y}px`;
        
        const itemId = parseInt(this.draggingItem.dataset.id);
        const item = this.items.find(i => i.id === itemId);
        if (item) {
            item.position = { x, y };
            this.saveItems();
        }
    }

    stopDragging() {
        if (this.draggingItem) {
            this.draggingItem.classList.remove('dragging');
            this.draggingItem.style.zIndex = '';
            this.draggingItem = null;
        }
    }

    startResizing(item, event) {
        this.resizingItem = item;
        const rect = item.getBoundingClientRect();
        this.resizeStart = {
            x: event.clientX,
            y: event.clientY,
            width: rect.width,
            height: rect.height
        };
    }

    handleResize(event) {
        const deltaX = event.clientX - this.resizeStart.x;
        const deltaY = event.clientY - this.resizeStart.y;
        
        const newWidth = Math.max(100, this.resizeStart.width + deltaX);
        const newHeight = Math.max(100, this.resizeStart.height + deltaY);
        
        this.resizingItem.style.width = `${newWidth}px`;
        this.resizingItem.style.height = `${newHeight}px`;
        
        const itemId = parseInt(this.resizingItem.dataset.id);
        const item = this.items.find(i => i.id === itemId);
        if (item) {
            item.size = { width: newWidth, height: newHeight };
            this.saveItems();
        }
    }

    stopResizing() {
        this.resizingItem = null;
    }

    renderItem(item) {
        const div = document.createElement('div');
        div.className = `item ${item.type}-item`;
        div.dataset.id = item.id;
        
        if (item.position) {
            div.style.left = `${item.position.x}px`;
            div.style.top = `${item.position.y}px`;
        }
        
        if (item.size) {
            div.style.width = `${item.size.width}px`;
            div.style.height = `${item.size.height}px`;
        }
        
        if (item.type === 'text') {
            const p = document.createElement('p');
            p.contentEditable = true;
            p.spellcheck = true;
            p.textContent = item.content;
            p.addEventListener('input', () => {
                item.content = p.textContent;
                this.saveItems();
            });
            div.appendChild(p);
        } else if (item.type === 'image') {
            const img = document.createElement('img');
            img.src = item.content;
            div.appendChild(img);
            
            // Add resize handles
            const handles = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
            handles.forEach(position => {
                const handle = document.createElement('div');
                handle.className = `resize-handle ${position}`;
                div.appendChild(handle);
            });
        }
        
        this.board.appendChild(div);
    }

    async handlePaste(event) {
        const items = event.clipboardData.items;
        for (const item of items) {
            if (item.type.includes('image')) {
                const blob = item.getAsFile();
                const url = URL.createObjectURL(blob);
                await this.addImageItem(url, blob);
            } else if (item.type === 'text/plain') {
                item.getAsString(text => this.addTextItem(text));
            }
        }
    }

    addTextItem(text) {
        const item = {
            id: Date.now(),
            type: 'text',
            content: text,
            timestamp: new Date().toISOString(),
            position: { x: 0, y: 0 },
            size: { width: 200, height: 100 }
        };
        this.items.push(item);
        this.saveItems();
        this.renderItem(item);
        this.showToast('Text added to pinboard');
    }

    async addImageItem(url, blob) {
        const item = {
            id: Date.now(),
            type: 'image',
            content: url,
            blob: blob,
            timestamp: new Date().toISOString(),
            position: { x: 0, y: 0 },
            size: { width: 300, height: 200 },
            transform: { rotate: 0, scaleX: 1, scaleY: 1 }
        };
        this.items.push(item);
        this.saveItems();
        this.renderItem(item);
        this.showToast('Image added to pinboard');
    }

    showLinkDialog(item) {
        this.currentTextItem = item;
        this.linkDialog.classList.add('show');
        this.linkUrl.focus();
    }

    hideLinkDialog() {
        this.linkDialog.classList.remove('show');
        this.linkUrl.value = '';
        this.currentTextItem = null;
    }

    addHyperlink() {
        if (!this.currentTextItem) return;

        const url = this.linkUrl.value.trim();
        if (!url) return;

        // Add http:// if no protocol is specified
        const fullUrl = url.startsWith('http') ? url : `https://${url}`;
        
        const itemElement = document.querySelector(`.item[data-id="${this.currentTextItem.id}"]`);
        const contentElement = itemElement.querySelector('p');
        
        // Get selected text or use the URL as text
        const selection = window.getSelection();
        const selectedText = selection.toString();
        
        if (selectedText) {
            // Replace selected text with link
            const range = selection.getRangeAt(0);
            const link = document.createElement('a');
            link.href = fullUrl;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.textContent = selectedText;
            range.deleteContents();
            range.insertNode(link);
        } else {
            // Add link at cursor position
            const link = document.createElement('a');
            link.href = fullUrl;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.textContent = fullUrl;
            contentElement.appendChild(link);
        }

        this.currentTextItem.content = contentElement.innerHTML;
        this.saveItems();
        this.hideLinkDialog();
    }

    async copyItem(item) {
        try {
            if (item.type === 'text') {
                await navigator.clipboard.writeText(item.content);
                this.showToast('Text copied to clipboard');
            } else {
                const response = await fetch(item.content);
                const blob = await response.blob();
                await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
                this.showToast('Image copied to clipboard');
            }
        } catch (error) {
            this.showToast('Failed to copy item', 'error');
        }
    }

    deleteItem(item) {
        const index = this.items.findIndex(i => i.id === parseInt(item.dataset.id));
        if (index !== -1) {
            this.items.splice(index, 1);
            this.saveItems();
            item.remove();
            this.showToast('Item deleted');
        }
    }

    handleSearch(event) {
        const searchTerm = event.target.value.toLowerCase();
        const items = document.querySelectorAll('.item');
        
        items.forEach(item => {
            const content = item.querySelector('p')?.textContent.toLowerCase() || '';
            const isVisible = content.includes(searchTerm);
            item.style.display = isVisible ? 'block' : 'none';
        });
    }

    saveItems() {
        localStorage.setItem('clipboardItems', JSON.stringify(this.items));
    }

    renderItems() {
        this.items.forEach(item => this.renderItem(item));
    }

    showToast(message, type = 'success') {
        this.toast.textContent = message;
        this.toast.className = `toast show ${type}`;
        setTimeout(() => {
            this.toast.className = 'toast';
        }, 3000);
    }

    showContextMenu(x, y, isTextItem) {
        this.contextMenu.style.display = 'block';
        this.contextMenu.style.left = `${x}px`;
        this.contextMenu.style.top = `${y}px`;
        
        // Show/hide appropriate actions
        this.textActions.style.display = isTextItem ? 'block' : 'none';
        this.imageActions.style.display = isTextItem ? 'none' : 'block';
    }

    hideContextMenu() {
        this.contextMenu.style.display = 'none';
    }

    rotateImage() {
        if (!this.currentItem) return;
        
        const item = document.querySelector(`.item[data-id="${this.currentItem.id}"]`);
        const img = item.querySelector('img');
        
        this.currentItem.transform.rotate = (this.currentItem.transform.rotate + 90) % 360;
        img.style.transform = `rotate(${this.currentItem.transform.rotate}deg) scale(${this.currentItem.transform.scaleX}, ${this.currentItem.transform.scaleY})`;
        this.saveItems();
    }

    flipImage(direction) {
        if (!this.currentItem) return;
        
        const item = document.querySelector(`.item[data-id="${this.currentItem.id}"]`);
        const img = item.querySelector('img');
        
        if (direction === 'horizontal') {
            this.currentItem.transform.scaleX *= -1;
        } else {
            this.currentItem.transform.scaleY *= -1;
        }
        
        img.style.transform = `rotate(${this.currentItem.transform.rotate}deg) scale(${this.currentItem.transform.scaleX}, ${this.currentItem.transform.scaleY})`;
        this.saveItems();
    }

    resizeImage(item) {
        const img = item.querySelector('img');
        const currentWidth = img.width;
        const currentHeight = img.height;
        
        const newWidth = prompt('Enter new width (in pixels):', currentWidth);
        if (newWidth && !isNaN(newWidth)) {
            const newHeight = prompt('Enter new height (in pixels):', currentHeight);
            if (newHeight && !isNaN(newHeight)) {
                img.style.width = `${newWidth}px`;
                img.style.height = `${newHeight}px`;
                this.saveItems();
            }
        }
    }

    clearBoard() {
        this.items = [];
        this.saveItems();
        this.board.innerHTML = '';
        this.showToast('Board cleared');
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new ClipboardPinboard();
}); 