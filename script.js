let canvas = document.getElementById('preview');
let ctx = canvas.getContext('2d');
let currentImage = null;
let originalImage = null;
let isFirstCrop = true;
let cropShape = 'square';
let isDragging = false;
let isMovingSelection = false;
let isRotating = false;
let startX, startY, endX, endY;
let originalWidth, originalHeight;
let undoHistory = [];
let redoHistory = [];
let dragOffsetX, dragOffsetY;
let handleRadius = 15;
let rotationAngle = 0;
let rotationHandleX, rotationHandleY;
let selectedDimensionOption = 'original';
let selectedCropMode = 'remove';
function setDimensionOption(option) {
    selectedDimensionOption = option;
    document.querySelectorAll('[onclick^="setDimensionOption"]').forEach(btn => {
        btn.classList.toggle('active', btn.textContent.toLowerCase() === option);
    });
    if (option === 'original') {
        setCropMode('remove');
        document.getElementById('removeButton').disabled = false;
        document.getElementById('keepButton').disabled = false;
    } else if (option === 'cropped') {
        setCropMode('keep');
        document.getElementById('removeButton').disabled = true;
        document.getElementById('keepButton').disabled = false;
    }
}
function setCropMode(mode) {
    selectedCropMode = mode;
    document.querySelectorAll('[onclick^="setCropMode"]').forEach(btn => {
        btn.classList.toggle('active', btn.textContent.toLowerCase() === mode);
    });
}
function getScaleX() {
    return canvas.width / canvas.clientWidth;
}
function getScaleY() {
    return canvas.height / canvas.clientHeight;
}
function setShape(shape) {
    cropShape = shape;
    rotationAngle = 0;
    drawSelection();
}
function isInsideHandle(x, y, handleX, handleY) {
    const distance = Math.sqrt((x - handleX) ** 2 + (y - handleY) ** 2);
    return distance <= handleRadius;
}
function isInsideCenterHandle(x, y) {
    const centerX = (startX + endX) / 2;
    const centerY = (startY + endY) / 2;
    return isInsideHandle(x, y, centerX, centerY);
}
function isInsideRotationHandle(x, y) {
    return isInsideHandle(x, y, rotationHandleX, rotationHandleY);
}
function calculateRotationHandle() {
    const centerX = (startX + endX) / 2;
    const centerY = (startY + endY) / 2;
    const width = endX - startX;
    const height = endY - startY;
    const radius = Math.sqrt(width * width + height * height) / 2 * 0.6;
    rotationHandleX = centerX + Math.sin(rotationAngle) * radius;
    rotationHandleY = centerY - Math.cos(rotationAngle) * radius;
}
function rotatePoint(x, y, cx, cy, angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const nx = (cos * (x - cx)) + (sin * (y - cy)) + cx;
    const ny = (cos * (y - cy)) - (sin * (x - cx)) + cy;
    return { x: nx, y: ny };
}
const dropZone = document.querySelector('.drop-zone');
document.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('active');
});
document.addEventListener('dragleave', (e) => {
    if (e.relatedTarget === null) {
        dropZone.classList.remove('active');
    }
});
document.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('active');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        handleImageFile(file);
    }
});
function handleImageFile(file) {
    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            currentImage = img;
            originalImage = img;
            originalWidth = img.naturalWidth;
            originalHeight = img.naturalHeight;
            undoHistory = [canvas.toDataURL()];
            redoHistory = [];
            rotationAngle = 0;
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}
document.getElementById('imageInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) handleImageFile(file);
});
canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = getScaleX();
    const scaleY = getScaleY();
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;
    calculateRotationHandle();
    if (isInsideRotationHandle(mouseX, mouseY)) {
        isRotating = true;
        canvas.style.cursor = 'grab';
    } else if (isInsideCenterHandle(mouseX, mouseY)) {
        isMovingSelection = true;
        dragOffsetX = mouseX - ((startX + endX) / 2);
        dragOffsetY = mouseY - ((startY + endY) / 2);
        canvas.style.cursor = 'move';
    } else {
        isDragging = true;
        startX = mouseX;
        startY = mouseY;
        endX = mouseX;
        endY = mouseY;
        rotationAngle = 0;
    }
});
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = getScaleX();
    const scaleY = getScaleY();
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;
    if (isRotating) {
        const centerX = (startX + endX) / 2;
        const centerY = (startY + endY) / 2;
        rotationAngle = Math.atan2(mouseX - centerX, -(mouseY - centerY));
        drawSelection();
    } else if (isMovingSelection) {
        const centerX = mouseX - dragOffsetX;
        const centerY = mouseY - dragOffsetY;
        const width = endX - startX;
        const height = endY - startY;
        startX = centerX - width / 2;
        startY = centerY - height / 2;
        endX = centerX + width / 2;
        endY = centerY + height / 2;
        drawSelection();
    } else if (isDragging) {
        endX = mouseX;
        endY = mouseY;
        drawSelection();
    } else {
        calculateRotationHandle();
        if (isInsideRotationHandle(mouseX, mouseY)) {
            canvas.style.cursor = 'grab';
        } else if (isInsideCenterHandle(mouseX, mouseY)) {
            canvas.style.cursor = 'move';
        } else {
            canvas.style.cursor = 'crosshair';
        }
    }
});
canvas.addEventListener('mouseup', () => {
    isDragging = false;
    isMovingSelection = false;
    isRotating = false;
    canvas.style.cursor = 'crosshair';
});
function drawSelection() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(currentImage, 0, 0);
    const centerX = (startX + endX) / 2;
    const centerY = (startY + endY) / 2;
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(rotationAngle);
    ctx.translate(-centerX, -centerY);
    ctx.beginPath();
    if (cropShape === 'square') {
        ctx.rect(startX, startY, endX - startX, endY - startY);
    } else {
        const radius = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
        ctx.arc(startX, startY, radius, 0, Math.PI * 2);
    }
    ctx.strokeStyle = '#ff0000';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
    ctx.beginPath();
    ctx.arc(centerX, centerY, handleRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#ff0000';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    calculateRotationHandle();
    ctx.beginPath();
    ctx.arc(rotationHandleX, rotationHandleY, handleRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#00ff00';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(rotationHandleX, rotationHandleY);
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.stroke();
}
function cropImage() {
    if (!currentImage) return;
    undoHistory.push(canvas.toDataURL());
    redoHistory = [];
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    tempCtx.drawImage(currentImage, 0, 0);
    tempCtx.save();
    const centerX = (startX + endX) / 2;
    const centerY = (startY + endY) / 2;
    tempCtx.translate(centerX, centerY);
    tempCtx.rotate(rotationAngle);
    tempCtx.translate(-centerX, -centerY);
    tempCtx.beginPath();
    if (cropShape === 'square') {
        tempCtx.rect(startX, startY, endX - startX, endY - startY);
    } else {
        const radius = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
        tempCtx.arc(startX, startY, radius, 0, Math.PI * 2);
    }
    const cropMode = selectedCropMode;
    if (cropMode === 'keep') {
        tempCtx.clip();
        tempCtx.drawImage(currentImage, 0, 0);
    } else {
        tempCtx.fillStyle = '#fff';
        tempCtx.fill();
        tempCtx.globalCompositeOperation = 'destination-out';
        tempCtx.fill();
    }
    tempCtx.restore();
    if (selectedDimensionOption === 'cropped') {
        const width = Math.abs(endX - startX);
        const height = Math.abs(endY - startY);
        canvas.width = width;
        canvas.height = height;
        ctx.save();
        const offsetX = (width / 2) - centerX;
        const offsetY = (height / 2) - centerY;
        ctx.translate(width / 2, height / 2);
        ctx.rotate(rotationAngle);
        ctx.translate(-centerX, -centerY);
        ctx.drawImage(tempCanvas, 0, 0);
        ctx.restore();
    } else {
        canvas.width = originalWidth;
        canvas.height = originalHeight;
        ctx.drawImage(tempCanvas, 0, 0);
    }
    currentImage = new Image();
    currentImage.src = canvas.toDataURL();
    if (isFirstCrop) {
        setCropMode('remove');
        isFirstCrop = false;
    }
    rotationAngle = 0;
}
function downloadImage() {
    if (!currentImage) return;
    const link = document.createElement('a');
    link.download = 'cropped-image.png';
    link.href = canvas.toDataURL();
    link.click();
}
function undo() {
    if (undoHistory.length > 1) {
        const currentState = undoHistory.pop();
        redoHistory.push(currentState);
        restoreState(undoHistory[undoHistory.length - 1]);
    }
}
function redo() {
    if (redoHistory.length > 0) {
        const nextState = redoHistory.pop();
        undoHistory.push(nextState);
        restoreState(nextState);
    }
}
function restoreState(dataURL) {
    const img = new Image();
    img.onload = function() {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        ctx.drawImage(img, 0, 0);
        currentImage = img;
        rotationAngle = 0;
    };
    img.src = dataURL;
}