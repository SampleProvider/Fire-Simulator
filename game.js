import { resizeCanvas, resizeGrid, render } from "./renderer.js";


window.onerror = function(message, source, lineno, colno, error) {
    modal("ERROR BUG BUG BUG!!!", source + "<br>" + message + " " + source + " " + lineno + " " + colno, "error");
};
const overlayCanvas = document.getElementById("overlayCanvas");
const overlayCtx = overlayCanvas.getContext("2d");

let WIDTH = window.innerWidth * devicePixelRatio;
let HEIGHT = window.innerHeight * devicePixelRatio;

window.onresize = () => {
    WIDTH = window.innerWidth * devicePixelRatio;
    HEIGHT = window.innerHeight * devicePixelRatio;
    overlayCanvas.width = WIDTH;
    overlayCanvas.height = HEIGHT;
    overlayCtx.imageSmoothingEnabled = false;
    overlayCtx.webkitImageSmoothingEnabled = false;
    overlayCtx.mozImageSmoothingEnabled = false;
    resizeCanvas(WIDTH, HEIGHT);
    document.body.style.setProperty("--border-size", Number(getComputedStyle(document.getElementById("controlSettings")).getPropertyValue("border-right-width").replaceAll("px", "")) / 2 + "px");
};
window.onresize();

const SPD_X = 0;
const SPD_Y = 1;
const TEMPERATURE = 2;
const UPDATED = 3;

let grid = new Float32Array();
let gridWidth = 128;
let gridHeight = 128;
gridWidth *= 2;
gridHeight *= 2;
gridWidth *= 2;
gridHeight *= 2;
// gridWidth = gridHeight = 2048;
// gridWidth *= 2;
// gridHeight *= 2;
let gridStride = 4;
let chunks = new Int32Array();
let nextChunks = new Int32Array();
let drawChunks = new Int32Array();
let chunkWidth = 16;
let chunkHeight = 16;
// chunkWidth *= 2;
// chunkHeight *= 2;
let chunkXAmount = Math.ceil(gridWidth / chunkWidth);
let chunkYAmount = Math.ceil(gridHeight / chunkHeight);
let chunkStride = 4;

let tick = 1;
let frame = 0;

const modalContainer = document.getElementById("modalContainer");
const modalTitle = document.getElementById("modalTitle");
const modalContent = document.getElementById("modalContent");
const modalYes = document.getElementById("modalYes");
const modalNo = document.getElementById("modalNo");
const modalOk = document.getElementById("modalOk");

function modal(title, content, type) {
    modalContainer.showModal();
    modalTitle.innerHTML = title;
    modalContent.innerHTML = content;
    if (type == "confirm") {
        modalYes.style.display = "revert-layer";
        modalNo.style.display = "revert-layer";
        modalOk.style.display = "none";
    }
    else if (type == "info" || type == "error") {
        modalYes.style.display = "none";
        modalNo.style.display = "none";
        modalOk.style.display = "revert-layer";
    }

    if (type == "error") {
        modalTitle.innerHTML = "An error has occured";
        modalContent.innerHTML = title + "<br><br>" + content + "<br><br>Please report this to the developers";
    }
    runState = PAUSED;
    playButton.classList.remove("pauseButton");
    simulateButton.classList.remove("pauseButton");
    slowmodeButton.classList.remove("pauseButton");
    return new Promise((resolve, reject) => {
        modalContainer.onclose = () => {
            console.log(modalContainer.returnValue)
            resolve(modalContainer.returnValue == "true");
            modalContainer.returnValue = null;
        };
        // document.addEventListener("keydown", function cancel(e) {
        //     if (e.key == "Escape") {
        //         hide();
        //         resolve(false);
        //         document.removeEventListener("keydown", cancel);
        //     }
        // });
    });
};
modalYes.onclick = () => {
    modalContainer.close("true");
};
modalNo.onclick = () => {
    modalContainer.close("false");
};
modalOk.onclick = () => {
    modalContainer.close("true");
};

const PAUSED = 0;
const PLAYING = 1;
const SIMULATING = 2;
const SLOWMODE = 3;
let runState = PAUSED;
let simulateSpeed = 10;

const playButton = document.getElementById("playButton");
const stepButton = document.getElementById("stepButton");
const simulateButton = document.getElementById("simulateButton");
const slowmodeButton = document.getElementById("slowmodeButton");

playButton.onclick = () => {
    if (runState != PLAYING) {
        runState = PLAYING;
        playButton.classList.add("pauseButton");
        simulateButton.classList.remove("pauseButton");
        slowmodeButton.classList.remove("pauseButton");
    }
    else {
        runState = PAUSED;
        playButton.classList.remove("pauseButton");
    }
};
stepButton.onclick = () => {
    if (runState == PAUSED) {
        updateGrid();
    }
};
simulateButton.onclick = () => {
    if (runState != SIMULATING) {
        runState = SIMULATING;
        playButton.classList.remove("pauseButton");
        simulateButton.classList.add("pauseButton");
        slowmodeButton.classList.remove("pauseButton");
    }
    else {
        runState = PAUSED;
        simulateButton.classList.remove("pauseButton");
    }
};
slowmodeButton.onclick = () => {
    if (runState != SLOWMODE) {
        runState = SLOWMODE;
        playButton.classList.remove("pauseButton");
        simulateButton.classList.remove("pauseButton");
        slowmodeButton.classList.add("pauseButton");
    }
    else {
        runState = PAUSED;
        slowmodeButton.classList.remove("pauseButton");
    }
};

// controls

let controls = {
    Control: false,
    Alt: false,
    Meta: false,
};
let keybinds = {};
keybinds["Main Action"] = [{ key: "LMB" }];
keybinds["Secondary Action"] = [{ key: "RMB" }];
keybinds["Move Left"] = [{ key: "a", ctrl: false, alt: false, meta: false }];
keybinds["Move Right"] = [{ key: "d", ctrl: false, alt: false, meta: false }];
keybinds["Move Up"] = [{ key: "w", ctrl: false, alt: false, meta: false }];
keybinds["Move Down"] = [{ key: "s", ctrl: false, alt: false, meta: false }];
keybinds["Zoom In"] = [{ key: "e", ctrl: false, alt: false, meta: false }, { key: "]", ctrl: false, alt: false, meta: false }];
keybinds["Zoom Out"] = [{ key: "q", ctrl: false, alt: false, meta: false }, { key: "[", ctrl: false, alt: false, meta: false }];
keybinds["Increment Brush Size"] = [{ key: "ArrowUp", ctrl: false, alt: false, meta: false }];
keybinds["Decrement Brush Size"] = [{ key: "ArrowDown", ctrl: false, alt: false, meta: false }];
keybinds["Play"] = [{ key: "p", ctrl: false, alt: false, meta: false }, { key: "Space", ctrl: false, alt: false, meta: false }];
keybinds["Step"] = [{ key: "Enter", ctrl: false, alt: false, meta: false }];
keybinds["Draw Updating Chunks"] = [{ key: "b", ctrl: false, alt: false, meta: false }];

for (let i in keybinds) {
    for (let j in keybinds[i]) {
        controls[keybinds[i][j].key] = false;
    }
}

function isKeybindPressed(keybind) {
    for (let i in keybinds[keybind]) {
        if (controls[keybinds[keybind][i].key] == false) {
            continue;
        }
        if (keybinds[keybind][i].key != "LMB" && keybinds[keybind][i].key != "RMB") {
            if (keybinds[keybind][i].ctrl != null && ((controls["Control"] != false) && (controls["Control"] <= controls[keybinds[keybind][i].key])) != keybinds[keybind][i].ctrl) {
                continue;
            }
            if (keybinds[keybind][i].alt != null && ((controls["Alt"] != false) && (controls["Alt"] <= controls[keybinds[keybind][i].key])) != keybinds[keybind][i].alt) {
                continue;
            }
            if (keybinds[keybind][i].meta != null && ((controls["Meta"] != false) && (controls["Meta"] <= controls[keybinds[keybind][i].key])) != keybinds[keybind][i].meta) {
                continue;
            }
        }
        return true;
    }
    return false;
};
function isKeybindJustPressed(keybind) {
    // spaghetti but it seems to work
    for (let i in keybinds[keybind]) {
        if (controls[keybinds[keybind][i].key] == false || controls[keybinds[keybind][i].key] < lastFrame) {
            continue;
        }
        if (keybinds[keybind][i].key != "LMB" && keybinds[keybind][i].key != "RMB") {
            if (((controls["Control"] != false) && (controls["Control"] <= controls[keybinds[keybind][i].key])) != keybinds[keybind][i].ctrl) {
                continue;
            }
            if (((controls["Alt"] != false) && (controls["Alt"] <= controls[keybinds[keybind][i].key])) != keybinds[keybind][i].alt) {
                continue;
            }
            if (((controls["Meta"] != false) && (controls["Meta"] <= controls[keybinds[keybind][i].key])) != keybinds[keybind][i].meta) {
                continue;
            }
        }
        return true;
    }
    return false;
};

let mouseX = 0;
let mouseY = 0;
let mouseRawX = 0;
let mouseRawY = 0;

let brushSize = 1 + 4;
let brushPixel = 1;
let lastBrushX = 0;
let lastBrushY = 0;

function setBrushPixel(pixel) {
    brushPixel = pixel;
};

const BRUSH = 0;
const SELECTING = 1;
const SELECTED = 2;
const PASTING = 3;

let selectionState = BRUSH;
let selectionX = 0;
let selectionY = 0;
let selectionWidth = 0;
let selectionHeight = 0;
let selectionGrid = null;
let selectionGridWidth = 0;
let selectionGridHeight = 0;

function drawMouse(ctx) {
    let brushX = Math.floor(cameraX + mouseX / cameraScale);
    let brushY = Math.floor(cameraY + mouseY / cameraScale);
    ctx.translate(-Math.round(cameraX * cameraScale), -Math.round(cameraY * cameraScale));
    ctx.strokeStyle = "rgba(255, 255, 255)";
    ctx.lineWidth = cameraScale / 10;
    ctx.setLineDash([]);
    ctx.lineJoin = "miter";
    ctx.strokeRect(brushX * cameraScale - (brushSize - 1) * cameraScale, brushY * cameraScale - (brushSize - 1) * cameraScale, (brushSize * 2 - 1) * cameraScale, (brushSize * 2 - 1) * cameraScale);
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.fillRect(brushX * cameraScale - (brushSize - 1) * cameraScale, brushY * cameraScale - (brushSize - 1) * cameraScale, (brushSize * 2 - 1) * cameraScale, (brushSize * 2 - 1) * cameraScale);
    ctx.setLineDash([]);
    ctx.resetTransform();
};
function updateMouse() {
    let brushX = Math.floor(cameraX + mouseX / cameraScale);
    let brushY = Math.floor(cameraY + mouseY / cameraScale);
    // this is a lot of spaghetti
    if (isKeybindJustPressed("End Selection") || isKeybindJustPressed("Secondary Action")) {
        if (selectionState == SELECTING || selectionState == SELECTED || selectionState == PASTING) {
            selectionState = BRUSH;
            controls["RMB"] = false;
        }
    }
    else if (isKeybindPressed("Begin Selection") && isKeybindJustPressed("Main Action")) {
        if (selectionState == BRUSH) {
            selectionState = SELECTING;
            selectionX = brushX;
            selectionY = brushY;
        }
    }
    else {
        if (isKeybindJustPressed("Paste Selection")) {
            if (selectionGrid != null) {
                selectionState = PASTING;
                selectionWidth = selectionGridWidth;
                selectionHeight = selectionGridHeight;
            }
        }
        if (selectionState == SELECTING && !isKeybindPressed("Main Action")) {
            selectionState = SELECTED;
            let minX = Math.min(selectionX, brushX);
            let maxX = Math.max(selectionX, brushX);
            let minY = Math.min(selectionY, brushY);
            let maxY = Math.max(selectionY, brushY);

            selectionX = minX;
            selectionY = minY;
            selectionWidth = maxX - minX + 1;
            selectionHeight = maxY - minY + 1;
        }
    }
    if (selectionState == BRUSH) {
        function raytrace(x1, y1, x2, y2, size, action) {
            let slope = (y2 - y1) / (x2 - x1);
            if (slope == 0) {
                if (y1 <= -size || y1 >= gridHeight + size) {
                    return;
                }
                let minX = Math.min(x1, x2);
                let maxX = Math.max(x1, x2);
                let start = Math.max(1 - size, minX);
                let end = Math.min(gridWidth - 2 + size, maxX);
                for (let x = start; x <= end; x++) {
                    if (!action(Math.max(x - size + 1, 0), Math.max(y1 - size + 1, 0), Math.min(x + size - 1, gridWidth - 1), Math.min(y1 + size - 1, gridHeight - 1))) {
                        return;
                    }
                }
            }
            else if (!isFinite(slope)) {
                if (x1 <= -size || x1 >= gridWidth + size) {
                    return;
                }
                let minY = Math.min(y1, y2);
                let maxY = Math.max(y1, y2);
                let start = Math.max(1 - size, minY);
                let end = Math.min(gridHeight - 2 + size, maxY);
                for (let y = start; y <= end; y++) {
                    if (!action(Math.max(x1 - size + 1, 0), Math.max(y - size + 1, 0), Math.min(x1 + size - 1, gridWidth - 1), Math.min(y + size - 1, gridHeight - 1))) {
                        return;
                    }
                }
            }
            else if (Math.abs(slope) < 1) {
                let startY = x2 < x1 ? y2 : y1;
                let endY = x2 < x1 ? y1 : y2;
                let minX = Math.min(x1, x2);
                let maxX = Math.max(x1, x2);
                let start = Math.max(1 - size, minX);
                if (slope < 0) {
                    start = Math.max(start, Math.ceil((gridWidth - 2 + size + 0.5 - startY) / slope) + minX);
                }
                else {
                    start = Math.max(start, Math.ceil((1 - size - 0.5 - startY) / slope) + minX);
                }
                let end = Math.min(gridWidth - 2 + size, maxX);
                if (slope < 0) {
                    end = Math.min(end, maxX - Math.ceil((endY - (1 - size - 0.5)) / slope));
                }
                else {
                    end = Math.min(end, maxX - Math.ceil((endY - (gridWidth - 2 + size) - 0.5) / slope));
                }
                let lastY = 0;
                for (let x = start; x <= end; x++) {
                    let y = Math.round(slope * (x - minX)) + startY;
                    if (x == start) {
                        if (!action(Math.max(x - size + 1, 0), Math.max(y - size + 1, 0), Math.min(x + size - 1, gridWidth - 1), Math.min(y + size - 1, gridHeight - 1))) {
                            return;
                        }
                    }
                    else {
                        if (!action(Math.max(x + size - 1, 0), Math.max(y - size + 1, 0), Math.min(x + size - 1, gridWidth - 1), Math.min(y + size - 1, gridHeight - 1))) {
                            return;
                        }
                        if (y != lastY) {
                            if (!action(Math.max(x - size + 1, 0), Math.min(Math.max(y + (size - 1) * (y - lastY), 0), gridHeight - 1), Math.min(x + size - 1, gridWidth - 1), Math.min(Math.max(y + (size - 1) * (y - lastY), 0), gridHeight - 1))) {
                                return;
                            }
                        }
                    }
                    lastY = y;
                }
            }
            else {
                slope = (x2 - x1) / (y2 - y1);
                let startX = y2 < y1 ? x2 : x1;
                let endX = y2 < y1 ? x1 : x2;
                let minY = Math.min(y1, y2);
                let maxY = Math.max(y1, y2);
                let start = Math.max(1 - size, minY);
                if (slope < 0) {
                    start = Math.max(start, Math.ceil((gridHeight - 2 + size + 0.5 - startX) / slope) + minY);
                }
                else {
                    start = Math.max(start, Math.ceil((1 - size - 0.5 - startX) / slope) + minY);
                }
                let end = Math.min(gridHeight - 2 + size, maxY);
                if (slope < 0) {
                    end = Math.min(end, maxY - Math.ceil((endX - (1 - size - 0.5)) / slope));
                }
                else {
                    end = Math.min(end, maxY - Math.ceil((endX - (gridHeight - 2 + size) - 0.5) / slope));
                }
                let lastX = 0;
                for (let y = start; y <= end; y++) {
                    let x = Math.round(slope * (y - minY)) + startX;
                    if (y == start) {
                        if (!action(Math.max(x - size + 1, 0), Math.max(y - size + 1, 0), Math.min(x + size - 1, gridWidth - 1), Math.min(y + size - 1, gridHeight - 1))) {
                            return;
                        }
                    }
                    else {
                        if (!action(Math.max(x - size + 1, 0), Math.max(y + size - 1, 0), Math.min(x + size - 1, gridWidth - 1), Math.min(y + size - 1, gridHeight - 1))) {
                            return;
                        }
                        if (x != lastX) {
                            if (!action(Math.min(Math.max(x + (size - 1) * (x - lastX), 0), gridWidth - 1), Math.max(y - size + 1, 0), Math.min(Math.max(x + (size - 1) * (x - lastX), 0), gridWidth - 1), Math.min(y + size - 1, gridHeight - 1))) {
                                return;
                            }
                        }
                    }
                    lastX = x;
                }
            }
        }
        if (currentPuzzle == null) {
            if (isKeybindPressed("Secondary Action")) {
                if (pixels[brushPixel].id == "fire") {
                    raytrace(lastBrushX, lastBrushY, brushX, brushY, brushSize, (x1, y1, x2, y2) => {
                        for (let y = y1; y <= y2; y++) {
                            for (let x = x1; x <= x2; x++) {
                                addFire(x, y, 0);
                                // addUpdatedChunk2(x, y);
                            }
                        }
                        return true;
                    });
                }
                else if (pixels[brushPixel].id == "placement_restriction") {
                    raytrace(lastBrushX, lastBrushY, brushX, brushY, brushSize, (x1, y1, x2, y2) => {
                        for (let y = y1; y <= y2; y++) {
                            for (let x = x1; x <= x2; x++) {
                                grid[(x + y * gridWidth) * gridStride + PUZZLE_DATA] -= grid[(x + y * gridWidth) * gridStride + PUZZLE_DATA] & 1;
                            }
                        }
                        return true;
                    });
                }
                else {
                    raytrace(lastBrushX, lastBrushY, brushX, brushY, brushSize, (x1, y1, x2, y2) => {
                        for (let y = y1; y <= y2; y++) {
                            for (let x = x1; x <= x2; x++) {
                                addPixel(x, y, 0);
                                // addUpdatedChunk2(x, y);
                            }
                        }
                        return true;
                    });
                }
            }
            else if (isKeybindPressed("Main Action")) {
                if (pixels[brushPixel].id == "fire") {
                    raytrace(lastBrushX, lastBrushY, brushX, brushY, brushSize, (x1, y1, x2, y2) => {
                        for (let y = y1; y <= y2; y++) {
                            for (let x = x1; x <= x2; x++) {
                                addFire(x, y, 1);
                                // addUpdatedChunk2(x, y);
                            }
                        }
                        return true;
                    });
                }
                else if (pixels[brushPixel].id == "placement_restriction") {
                    raytrace(lastBrushX, lastBrushY, brushX, brushY, brushSize, (x1, y1, x2, y2) => {
                        for (let y = y1; y <= y2; y++) {
                            for (let x = x1; x <= x2; x++) {
                                grid[(x + y * gridWidth) * gridStride + PUZZLE_DATA] += 1 - grid[(x + y * gridWidth) * gridStride + PUZZLE_DATA] & 1;
                            }
                        }
                        return true;
                    });
                }
                else {
                    raytrace(lastBrushX, lastBrushY, brushX, brushY, brushSize, (x1, y1, x2, y2) => {
                        for (let y = y1; y <= y2; y++) {
                            for (let x = x1; x <= x2; x++) {
                                addPixel(x, y, brushPixel);
                                // addUpdatedChunk2(x, y);
                                grid[(x + y * gridWidth) * gridStride + UPDATED] = 0;
                            }
                        }
                        return true;
                    });
                }
            }
        }
        else {
            if (isKeybindPressed("Secondary Action")) {
                if (pixels[brushPixel].id == "fire") {
                    raytrace(lastBrushX, lastBrushY, brushX, brushY, brushSize, (x1, y1, x2, y2) => {
                        for (let y = y1; y <= y2; y++) {
                            for (let x = x1; x <= x2; x++) {
                                if (grid[(x + y * gridWidth) * gridStride + ON_FIRE] == 1) {
                                    pixelInventory[brushPixel] += 1;
                                }
                                addFire(x, y, 0);
                                // addUpdatedChunk2(x, y);
                            }
                        }
                        return true;
                    });
                    pixelInventoryUpdates[brushPixel] = true;
                    updatePixelInventory();
                }
                else if (pixels[brushPixel].id == "placement_restriction") {
                    raytrace(lastBrushX, lastBrushY, brushX, brushY, brushSize, (x1, y1, x2, y2) => {
                        for (let y = y1; y <= y2; y++) {
                            for (let x = x1; x <= x2; x++) {
                                grid[(x + y * gridWidth) * gridStride + PUZZLE_DATA] -= grid[(x + y * gridWidth) * gridStride + PUZZLE_DATA] & 1;
                            }
                        }
                        return true;
                    });
                }
                else {
                    raytrace(lastBrushX, lastBrushY, brushX, brushY, brushSize, (x1, y1, x2, y2) => {
                        for (let y = y1; y <= y2; y++) {
                            for (let x = x1; x <= x2; x++) {
                                let index = (x + y * gridWidth) * gridStride;
                                if (grid[index + ID] != 0) {
                                    pixelInventory[grid[index + ID]] += 1;
                                    pixelInventoryUpdates[grid[index + ID]] = true;
                                }
                                addPixel(x, y, 0);
                                // addUpdatedChunk2(x, y);
                                grid[index + UPDATED] = 0;
                            }
                        }
                        return true;
                    });
                    updatePixelInventory();
                }
            }
            else if (isKeybindPressed("Main Action")) {
                if (pixels[brushPixel].id == "fire") {
                    raytrace(lastBrushX, lastBrushY, brushX, brushY, brushSize, (x1, y1, x2, y2) => {
                        for (let y = y1; y <= y2; y++) {
                            for (let x = x1; x <= x2; x++) {
                                if (pixelInventory[brushPixel] == 0) {
                                    return false;
                                }
                                if (grid[(x + y * gridWidth) * gridStride + ON_FIRE] == 0) {
                                    pixelInventory[brushPixel] -= 1;
                                }
                                addFire(x, y, 1);
                                // addUpdatedChunk2(x, y);
                            }
                        }
                        return true;
                    });
                    pixelInventoryUpdates[brushPixel] = true;
                    updatePixelInventory();
                }
                else if (pixels[brushPixel].id == "placement_restriction") {
                    raytrace(lastBrushX, lastBrushY, brushX, brushY, brushSize, (x1, y1, x2, y2) => {
                        for (let y = y1; y <= y2; y++) {
                            for (let x = x1; x <= x2; x++) {
                                grid[(x + y * gridWidth) * gridStride + PUZZLE_DATA] += 1 - grid[(x + y * gridWidth) * gridStride + PUZZLE_DATA] & 1;
                            }
                        }
                        return true;
                    });
                }
                else {
                    raytrace(lastBrushX, lastBrushY, brushX, brushY, brushSize, (x1, y1, x2, y2) => {
                        for (let y = y1; y <= y2; y++) {
                            for (let x = x1; x <= x2; x++) {
                                if (pixelInventory[brushPixel] == 0) {
                                    return false;
                                }
                                let index = (x + y * gridWidth) * gridStride;
                                if (grid[index + ID] != 0) {
                                    pixelInventory[grid[index + ID]] += 1;
                                    pixelInventoryUpdates[grid[index + ID]] = true;
                                }
                                addPixel(x, y, brushPixel);
                                // addUpdatedChunk2(x, y);
                                grid[index + UPDATED] = 0;
                                pixelInventory[brushPixel] -= 1;
                            }
                        }
                        return true;
                    });
                    pixelInventoryUpdates[brushPixel] = true;
                    updatePixelInventory();
                }
            }
        }
    }
    else if (selectionState == SELECTING) {
    }
    else if (selectionState == SELECTED) {
        if (isKeybindJustPressed("Copy Selection")) {
            let array = [];
            for (let y = Math.max(selectionY, 0); y < Math.min(selectionY + selectionHeight, gridHeight); y++) {
                for (let x = Math.max(selectionX, 0); x < Math.min(selectionX + selectionWidth, gridWidth); x++) {
                    for (let i = 0; i < gridStride; i++) {
                        if (i == PUZZLE_DATA) {
                            array.push(0);
                        }
                        else {
                            array.push(grid[(x + y * gridWidth) * gridStride + i]);
                        }
                    }
                }
            }
            selectionGrid = new Float32Array(array);
            selectionGridWidth = Math.min(selectionX + selectionWidth, gridWidth) - Math.max(selectionX, 0);
            selectionGridHeight = Math.min(selectionY + selectionHeight, gridHeight) - Math.max(selectionY, 0);
        }
        else if (isKeybindJustPressed("Cut Selection")) {
            let array = [];
            for (let y = Math.max(selectionY, 0); y < Math.min(selectionY + selectionHeight, gridHeight); y++) {
                for (let x = Math.max(selectionX, 0); x < Math.min(selectionX + selectionWidth, gridWidth); x++) {
                    for (let i = 0; i < gridStride; i++) {
                        if (i == PUZZLE_DATA) {
                            array.push(0);
                        }
                        else {
                            array.push(grid[(x + y * gridWidth) * gridStride + i]);
                        }
                    }
                    addPixel(x, y, 0);
                    addFire(x, y, 0);
                    // addUpdatedChunk2(x, y);
                }
            }
            selectionGrid = new Float32Array(array);
            selectionGridWidth = Math.min(selectionX + selectionWidth, gridWidth) - Math.max(selectionX, 0);
            selectionGridHeight = Math.min(selectionY + selectionHeight, gridHeight) - Math.max(selectionY, 0);

            selectionState = PASTING;
            selectionWidth = selectionGridWidth;
            selectionHeight = selectionGridHeight;
        }
    }
    else if (selectionState == PASTING) {
        let startX = Math.floor(cameraX + mouseX / cameraScale - (selectionWidth - 1) / 2);
        let startY = Math.floor(cameraY + mouseY / cameraScale - (selectionHeight - 1) / 2);
        if (isKeybindPressed("Main Action")) {
            // pasting settings
            for (let y = Math.max(startY, 0); y < Math.min(startY + selectionHeight, gridHeight); y++) {
                for (let x = Math.max(startX, 0); x < Math.min(startX + selectionWidth, gridWidth); x++) {
                    for (let i = 0; i < gridStride; i++) {
                        if (i != PUZZLE_DATA) {
                            grid[(x + y * gridWidth) * gridStride + i] = selectionGrid[(x - startX + (y - startY) * selectionWidth) * gridStride + i];
                        }
                    }
                    addUpdatedChunk(x, y);
                    // addUpdatedChunk2(x, y);
                }
            }
        }
        if (isKeybindJustPressed("Rotate Selection")) {
            let array = [];
            for (let x = 0; x < selectionGridWidth; x++) {
                for (let y = selectionGridHeight - 1; y >= 0; y--) {
                    for (let i = 0; i < gridStride; i++) {
                        let data = selectionGrid[(x + y * selectionGridWidth) * gridStride + i];
                        if (i == ID && pixels[data].rotatable) {
                            let pixel = pixels[data];
                            data = pixel.rotations[(pixel.rotation + 1) % pixel.rotations.length];
                        }
                        array.push(data);
                    }
                }
            }
            selectionGrid = new Float32Array(array);
            let width = selectionGridWidth;
            selectionGridWidth = selectionGridHeight;
            selectionGridHeight = width;

            selectionWidth = selectionGridWidth;
            selectionHeight = selectionGridHeight;
        }
        if (isKeybindJustPressed("Flip Selection Horizontally")) {
            let array = [];
            for (let y = 0; y < selectionGridHeight; y++) {
                for (let x = selectionGridWidth - 1; x >= 0; x--) {
                    for (let i = 0; i < gridStride; i++) {
                        let data = selectionGrid[(x + y * selectionGridWidth) * gridStride + i];
                        if (i == ID && pixels[data].rotatable) {
                            let pixel = pixels[data];
                            switch (pixel.rotations.length) {
                                case 4:
                                    if (pixel.rotation % 2 == 0) {
                                        data = pixel.rotations[(pixel.rotation + 2) % 4];
                                    }
                                    break;
                                case 2:
                                    if (data == MIRROR_1 || data == MIRROR_2) {
                                        data = pixel.rotations[(pixel.rotation + 1) % 2];
                                    }
                                    break;
                            }
                        }
                        array.push(data);
                    }
                }
            }
            selectionGrid = new Float32Array(array);
        }
        if (isKeybindJustPressed("Flip Selection Vertically")) {
            let array = [];
            for (let y = selectionGridHeight - 1; y >= 0; y--) {
                for (let x = 0; x < selectionGridWidth; x++) {
                    for (let i = 0; i < gridStride; i++) {
                        let data = selectionGrid[(x + y * selectionGridWidth) * gridStride + i];
                        if (i == ID && pixels[data].rotatable) {
                            let pixel = pixels[data];
                            switch (pixel.rotations.length) {
                                case 4:
                                    if (pixel.rotation % 2 == 1) {
                                        data = pixel.rotations[(pixel.rotation + 2) % 4];
                                    }
                                    break;
                                case 2:
                                    if (data == MIRROR_1 || data == MIRROR_2) {
                                        data = pixel.rotations[(pixel.rotation + 1) % 2];
                                    }
                                    break;
                            }
                        }
                        array.push(data);
                    }
                }
            }
            selectionGrid = new Float32Array(array);
        }
    }
    lastBrushX = brushX;
    lastBrushY = brushY;
};

let cameraX = 0;
let cameraY = 0;
let cameraSpeedX = 0;
let cameraSpeedY = 0;
let cameraAcceleration = 6;
let cameraFriction = 0.75;
let cameraScaleX = 0;
let cameraScaleY = 0;
let cameraScale = 3;
let cameraScaleTarget = 3;
let cameraLerpSpeed = 0.25;

function updateCamera() {
    // cameraSpeedX *= 0;
    // cameraSpeedY *= 0;
    if (isKeybindPressed("Move Left")) {
        cameraSpeedX -= cameraAcceleration / cameraScale;
    }
    if (isKeybindPressed("Move Right")) {
        cameraSpeedX += cameraAcceleration / cameraScale;
    }
    if (isKeybindPressed("Move Up")) {
        cameraSpeedY -= cameraAcceleration / cameraScale;
    }
    if (isKeybindPressed("Move Down")) {
        cameraSpeedY += cameraAcceleration / cameraScale;
    }
    cameraSpeedX *= cameraFriction;
    cameraSpeedY *= cameraFriction;

    if (isKeybindPressed("Zoom In")) {
        cameraScaleTarget /= 1.01 ** (-10);
        cameraScaleX = mouseX;
        cameraScaleY = mouseY;
    }
    if (isKeybindPressed("Zoom Out")) {
        cameraScaleTarget /= 1.01 ** (10);
        cameraScaleX = mouseX;
        cameraScaleY = mouseY;
    }

    let t = (performance.now() - lastFrame) / 1000 * 60;
    t = 1;
    let oldCameraScale = cameraScale;
    cameraScale += (cameraScaleTarget - cameraScale) * (1 - (1 - cameraLerpSpeed) ** t);
    // cameraScale += (cameraScaleTarget - cameraScale) * (1 - (1 - cameraLerpSpeed));
    // if (cameraScaleTarget / cameraScale > 1 && cameraScaleTarget / cameraScale < 1.01) {
    //     cameraScale = cameraScaleTarget;
    // }
    // if (1 / (cameraScaleTarget / cameraScale) > 1 && 1 / (cameraScaleTarget / cameraScale) < 1.01) {
    //     cameraScale = cameraScaleTarget;
    // }
    cameraX = ((cameraX + cameraScaleX / oldCameraScale) - cameraScaleX / cameraScale);
    cameraY = ((cameraY + cameraScaleY / oldCameraScale) - cameraScaleY / cameraScale);
    cameraX += cameraSpeedX * t;
    cameraY += cameraSpeedY * t;
};

document.onmousemove = (e) => {
    var rect = canvas.getBoundingClientRect();
    mouseRawX = e.clientX;
    mouseRawY = e.clientY;
    mouseX = e.clientX * devicePixelRatio;
    mouseY = e.clientY * devicePixelRatio;
};
overlayCanvas.onmousedown = (e) => {
    if (e.button == 0) {
        controls["LMB"] = performance.now();
    }
    else if (e.button == 2) {
        controls["RMB"] = performance.now();
    }
};
document.onmouseup = (e) => {
    if (e.button == 0) {
        controls["LMB"] = false;
    }
    else if (e.button == 2) {
        controls["RMB"] = false;
    }
};
document.oncontextmenu = (e) => {
    e.preventDefault();
};

document.onkeydown = (e) => {
    var key = e.key;
    if (key == " ") {
        key = "Space";
    }
    if (controls[key] == false) {
        controls[key] = performance.now();
    }
    if (selectionState == BRUSH) {
        for (let i in keybinds["Increment Brush Size"]) {
            if (key == keybinds["Increment Brush Size"][i].key) {
                if (isKeybindPressed("Increment Brush Size")) {
                    brushSize = Math.min(brushSize + 1, Math.ceil((Math.max(gridWidth, gridHeight) + 1) / 2));
                }
            }
        }
        for (let i in keybinds["Decrement Brush Size"]) {
            if (key == keybinds["Decrement Brush Size"][i].key) {
                if (isKeybindPressed("Decrement Brush Size")) {
                    brushSize = Math.max(brushSize - 1, 1);
                }
            }
        }
    }
    for (let i in keybinds["Play"]) {
        if (key == keybinds["Play"][i].key) {
            if (isKeybindPressed("Play")) {
                switch (runState) {
                    case PAUSED:
                    case PLAYING:
                        playButton.click();
                        break;
                    case SIMULATING:
                        simulateButton.click();
                        break;
                    case SLOWMODE:
                        slowmodeButton.click();
                        break;
                }
                break;
            }
        }
    }
    if (runState == PAUSED) {
        for (let i in keybinds["Step"]) {
            if (key == keybinds["Step"][i].key) {
                if (isKeybindPressed("Step")) {
                    updateGrid();
                }
            }
        }
    }
    for (let i in keybinds["Draw Updating Chunks"]) {
        if (key == keybinds["Draw Updating Chunks"][i].key) {
            if (isKeybindJustPressed("Draw Updating Chunks")) {
                drawUpdatingChunks = !drawUpdatingChunks;
            }
        }
    }
};
document.onkeyup = (e) => {
    var key = e.key;
    if (key == " ") {
        key = "Space";
    }
    controls[key] = false;
};

// document.onvisibilitychange = () => {
window.onblur = () => {
    for (let i in controls) {
        controls[i] = false;
    }
};
let buttons = document.getElementsByClassName("button");
for (let i = 0; i < buttons.length; i++) {
    // buttons[i].onfocus = () => {
    //     buttons[i].blur();
    // };
}

overlayCanvas.addEventListener("wheel", (e) => {
    if (e.ctrlKey) {
        cameraScaleTarget /= 1.01 ** (e.deltaY);
        cameraScaleX = mouseX;
        cameraScaleY = mouseY;
    }
    else if (e.altKey) {
        brushSize = Math.max(Math.min(brushSize - Math.sign(e.deltaY) * 5, Math.ceil((Math.max(gridWidth, gridHeight) + 1) / 2)), 1);
    }
    else {
        brushSize = Math.max(Math.min(brushSize - Math.sign(e.deltaY), Math.ceil((Math.max(gridWidth, gridHeight) + 1) / 2)), 1);
    }
    // if (e.deltaY > 0) {
    // }
    // else if (e.deltaY < 0) {
    //     cameraScaleTarget *= 1.5;
    //     cameraScaleX = mouseX;
    //     cameraScaleY = mouseY;
    // }
    e.preventDefault();
    // }
});

function createGrid() {
    let gridArray = [];
    for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
            // if (Math.random() < 0.5 && x > gridWidth * 4 / 5) {
            // if (Math.random() < 0.25 && x > gridWidth * 4 / 5) {
            // gridArray.push(...[4, 0, 0, 1, 0.85 + Math.random() * 0.05, 0.5, 1, 0, 0]);
            // }
            // // else if (Math.random() < 0.25) {
            // if (Math.random() < 10.5 && x > gridWidth * 4 / 5) {
            //     // else if (Math.random() < 0.5 && y > gridHeight * 3 / 4) {
            //     gridArray.push(...[2, 0, 0, 0.1, 0.3, 0.85 + Math.random() * 0.05, 1, 0, 0]);
            // }
            // // if (x == 0 && y == 0) {
            // //     gridArray.push(...[2, 0, 0, 0.1, 0.3, 0.85 + Math.random() * 0.05, 1, 0, 0]);
            // // }
            // else {
            //     // gridArray.push(...[0, 0, 0, 1, 1, 1, 1, 0, 0]);
            //     gridArray.push(...[6, 0, 0, 1, 1, 1, 1, 0, 0]);
            // }
            // gridArray.push(...[0, 0, 0, 1, 1, 1, 1, 0, 0]);
            // gridArray.push(...[0, 0, 0, 1, 1, 1, 0.5, 0, 0]);
            gridArray.push(...[0, 0, 0, 0]);
        }
    }

    chunkXAmount = Math.ceil(gridWidth / chunkWidth);
    chunkYAmount = Math.ceil(gridHeight / chunkHeight);

    let chunksArray = [];
    // for (let y = 0; y < chunkYAmount; y++) {
    //     for (let x = 0; x < chunkXAmount; x++) {
    //         chunksArray.push(...[x * chunkWidth + chunkWidth + 1, x * chunkWidth - 2, y * chunkHeight + chunkHeight + 1, y * chunkHeight - 2]);
    //     }
    // }
    for (let y = 0; y < chunkYAmount; y++) {
        for (let x = 0; x < chunkXAmount; x++) {
            chunksArray.push(...[x * chunkWidth, Math.min(x * chunkWidth + chunkWidth - 1, gridWidth - 1), y * chunkHeight, Math.min(y * chunkHeight + chunkHeight - 1, gridHeight - 1)]);
        }
    }

    grid = new Float32Array(gridArray);
    chunks = new Int32Array(chunksArray);
    nextChunks = new Int32Array(chunksArray);
    drawChunks = new Int32Array(chunksArray);
    resizeGrid(gridWidth, gridHeight, gridStride, chunkWidth, chunkHeight, chunkXAmount, chunkYAmount, chunkStride);

    cameraScale = Math.min(WIDTH / gridWidth, HEIGHT / gridHeight);
    cameraScaleTarget = cameraScale;
    cameraX = -WIDTH / cameraScale / 2 + gridWidth / 2;
    cameraY = -HEIGHT / cameraScale / 2 + gridHeight / 2;
    cameraSpeedX = 0;
    cameraSpeedY = 0;
};
createGrid();

function drawGrid(ctx) {
    // for (let chunkY = 0; chunkY < chunkYAmount; chunkY++) {
    //     for (let chunkX = 0; chunkX < chunkXAmount; chunkX++) {
    //         if (chunks[(chunkX + chunkY * chunkXAmount) * chunkStride] == chunkX * chunkWidth + chunkWidth + 1) {
    //             continue;
    //         }
    //         let minX = Math.max(chunks[(chunkX + chunkY * chunkXAmount) * chunkStride] - 1, chunkX * chunkWidth);
    //         let maxX = Math.min(chunks[(chunkX + chunkY * chunkXAmount) * chunkStride + 1] + 1, chunkX * chunkWidth + chunkWidth - 1);
    //         let minY = Math.max(chunks[(chunkX + chunkY * chunkXAmount) * chunkStride + 2] - 1, chunkY * chunkHeight);
    //         let maxY = Math.min(chunks[(chunkX + chunkY * chunkXAmount) * chunkStride + 3] + 1, chunkY * chunkHeight + chunkHeight - 1);
    //         ctx.fillStyle = "#ffffff";
    //         ctx.fillRect(minX * cameraScale, minY * cameraScale, (maxX - minX + 1) * cameraScale, (maxY - minY + 1) * cameraScale);
    //         for (let y = minY; y <= maxY; y++) {
    //             for (let x = minX; x <= maxX; x++) {
    //                 let index = (x + y * gridWidth) * gridStride;

    //                 if (grid[index + ID] == 0) {
    //                     continue;
    //                 }

    //                 ctx.fillStyle = "rgba(" + grid[index + COLOR_R] * 255 + ", " + grid[index + COLOR_G] * 255 + ", " + grid[index + COLOR_B] * 255 + ", " + grid[index + COLOR_A] + ")";
    //                 ctx.fillRect(x * cameraScale, y * cameraScale, cameraScale, cameraScale);
    //             }
    //         }
    //     }
    // }
    // for (let y = 0; y < gridHeight; y++) {
    //     for (let x = 0; x < gridWidth; x++) {
    //         let index = (x + y * gridWidth) * gridStride;

    //         ctx.fillStyle = "rgba(" + grid[index + COLOR_R] * 255 + ", " + grid[index + COLOR_G] * 255 + ", " + grid[index + COLOR_B] * 255 + ", " + grid[index + COLOR_A] + ")";
    //         ctx.fillRect(x * cameraScale, y * cameraScale, cameraScale, cameraScale);
    //     }
    // }
    ctx.translate(-Math.round(cameraX * cameraScale), -Math.round(cameraY * cameraScale));
    // ctx.scale(Math.round(cameraScale * 4) / 4, Math.round(cameraScale * 4) / 4);
    for (let chunkY = 0; chunkY < chunkYAmount; chunkY++) {
        for (let chunkX = 0; chunkX < chunkXAmount; chunkX++) {
            if (drawChunks[(chunkX + chunkY * chunkXAmount) * chunkStride] == chunkX * chunkWidth + chunkWidth) {
                continue;
            }
            let minX = drawChunks[(chunkX + chunkY * chunkXAmount) * chunkStride];
            let maxX = drawChunks[(chunkX + chunkY * chunkXAmount) * chunkStride + 1];
            let minY = drawChunks[(chunkX + chunkY * chunkXAmount) * chunkStride + 2];
            let maxY = drawChunks[(chunkX + chunkY * chunkXAmount) * chunkStride + 3];
            // ctx.fillStyle = "#ffffff";
            // ctx.fillRect(minX * cameraScale, minY * cameraScale, (maxX - minX + 1) * cameraScale, (maxY - minY + 1) * cameraScale);
            for (let y = minY; y <= maxY; y++) {
                for (let x = minX; x <= maxX; x++) {
                    let index = (x + y * gridWidth) * gridStride;

                    if (!pixels[grid[index + ID]].draw) {
                        continue;
                    }

                    pixels[grid[index + ID]].draw(ctx, cameraScale, x, y);
                }
            }
        }
    }
    if (debug && drawUpdatingChunks) {
        ctx.strokeStyle = "rgba(0, 0, 0)";
        ctx.lineWidth = cameraScale / 10;
        ctx.setLineDash([cameraScale, 3 * cameraScale]);
        ctx.lineJoin = "miter";
        for (let chunkY = 0; chunkY < chunkYAmount; chunkY++) {
            for (let chunkX = 0; chunkX < chunkXAmount; chunkX++) {
                ctx.strokeRect(chunkX * chunkWidth * cameraScale, chunkY * chunkHeight * cameraScale, chunkWidth * cameraScale, chunkHeight * cameraScale);
            }
        }
        ctx.fillStyle = "rgba(0, 255, 0, 0.2)";
        ctx.strokeStyle = "rgba(0, 255, 0)";
        ctx.lineWidth = cameraScale / 5;
        ctx.setLineDash([]);
        for (let chunkY = 0; chunkY < chunkYAmount; chunkY++) {
            for (let chunkX = 0; chunkX < chunkXAmount; chunkX++) {
                if (nextChunks[(chunkX + chunkY * chunkXAmount) * chunkStride] == chunkX * chunkWidth + chunkWidth) {
                    continue;
                }
                let minX = Math.max(nextChunks[(chunkX + chunkY * chunkXAmount) * chunkStride], chunkX * chunkWidth);
                let maxX = Math.min(nextChunks[(chunkX + chunkY * chunkXAmount) * chunkStride + 1], chunkX * chunkWidth + chunkWidth - 1);
                let minY = Math.max(nextChunks[(chunkX + chunkY * chunkXAmount) * chunkStride + 2], chunkY * chunkHeight);
                let maxY = Math.min(nextChunks[(chunkX + chunkY * chunkXAmount) * chunkStride + 3], chunkY * chunkHeight + chunkHeight - 1);
                // for (let y = minY; y <= maxY; y++) {
                //     for (let x = minX; x <= maxX; x++) {
                //         let index = (x + y * gridWidth) * gridStride;

                //         ctx.fillStyle = "rgba(" + grid[index + COLOR_R] * 255 + ", " + 200 + ", " + grid[index + COLOR_B] * 255 + ", " + grid[index + COLOR_A] + ")";
                //         ctx.fillRect(x * 1, y * 1, 1, 1);
                //     }
                // }
                // ctx.fillStyle = "rgba(125, " + chunkY * 255 + ", " + chunkX * 255 + ", 0.2)";
                ctx.fillRect(minX * cameraScale, minY * cameraScale, (maxX - minX + 1) * cameraScale, (maxY - minY + 1) * cameraScale)
                ctx.strokeRect(minX * cameraScale, minY * cameraScale, (maxX - minX + 1) * cameraScale, (maxY - minY + 1) * cameraScale);
            }
        }
    }
    ctx.resetTransform();
};

let debug = true;
let drawUpdatingChunks = false;

let fpsTimes = [];
let fpsHistory = [];
// let tpsTimes = [];
// let tpsHistory = [];
let lastFrame = performance.now();
let frameHistory = [];
let historyLength = 100;

let graphX = 5;
let graphY = 34 + 5;
let graphWidth = 300;
let graphHeight = 100;

const timingGradient = overlayCtx.createLinearGradient(0, graphY + 1, 0, graphY + graphHeight - 1);
timingGradient.addColorStop(0, "#ff00ff");
timingGradient.addColorStop(0.1, "#ff0000");
timingGradient.addColorStop(0.25, "#ff0000");
timingGradient.addColorStop(0.4, "#ffff00");
timingGradient.addColorStop(0.7, "#00ff00");
timingGradient.addColorStop(1, "#00ff00");

function updateTimes(history, time) {
    history.push(time);
    while (history.length > historyLength) {
        history.shift();
    }
    let minTime = history[0];
    let maxTime = history[0];
    let averageTime = history[0];
    for (let i = 1; i < history.length; i++) {
        if (minTime > history[i]) {
            minTime = history[i];
        }
        if (maxTime < history[i]) {
            maxTime = history[i];
        }
        averageTime += history[i];
    }
    averageTime /= history.length;
    return [history, time, minTime, maxTime, averageTime];
};

function update() {
    updateCamera();
    // if (runState == PLAYING) {
    overlayCtx.fillStyle = "rgb(0, 0, 0)";
    overlayCtx.fillRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    let brushX = Math.floor(cameraX + mouseX / cameraScale);
    let brushY = Math.floor(cameraY + mouseY / cameraScale);
    if (runState == PLAYING) {
        tick += 1;
        render(true, new Float32Array([0, 0, 1, 1]), tick, new Float32Array([brushX, brushY, brushSize, controls["LMB"] ? 1 : 0]));
    }
    overlayCtx.strokeStyle = "rgb(255, 255, 255)";
    overlayCtx.lineWidth = cameraScale;
    overlayCtx.setLineDash([]);
    overlayCtx.lineJoin = "miter";
    overlayCtx.strokeRect(-cameraX * cameraScale, -cameraY * cameraScale, canvas.width * cameraScale, canvas.height * cameraScale);
    overlayCtx.drawImage(canvas, -cameraX * cameraScale, -cameraY * cameraScale, canvas.width * cameraScale, canvas.height * cameraScale);

    // updateMouse();
    // drawGrid(overlayCtx);
    drawMouse(overlayCtx);
    // }

    fpsTimes.push(performance.now());
    while (performance.now() - fpsTimes[0] > 1000) {
        fpsTimes.shift();
    }

    let fps, minFps, maxFps, averageFps;
    let frameTime, minFrameTime, maxFrameTime, averageFrameTime;
    [frameHistory, frameTime, minFrameTime, maxFrameTime, averageFrameTime] = updateTimes(frameHistory, performance.now() - lastFrame);
    [fpsHistory, fps, minFps, maxFps, averageFps] = updateTimes(fpsHistory, fpsTimes.length);

    lastFrame = performance.now();
    frame += 1;

    if (debug) {
        let fpsText = "FPS: " + fps + "; Min: " + minFps + "; Max: " + maxFps + "; Avg: " + averageFps.toFixed(2) + ";";
        let frameText = "Frame: " + frameTime.toFixed(2) + "ms; Min: " + minFrameTime.toFixed(2) + "ms; Max: " + maxFrameTime.toFixed(2) + "ms; Avg: " + averageFrameTime.toFixed(2) + "ms;";

        overlayCtx.fillStyle = "#00000055";
        overlayCtx.fillRect(1, 0, overlayCtx.measureText(fpsText).width + 4, 16);
        overlayCtx.fillRect(1, 17, overlayCtx.measureText(frameText).width + 4, 16);

        overlayCtx.font = "16px Source Code Pro";
        overlayCtx.font = "16px Noto Sans";
        overlayCtx.textBaseline = "top";
        overlayCtx.textAlign = "left";
        overlayCtx.fillStyle = "#ffffff";
        overlayCtx.fillText(fpsText, 3, 1);
        overlayCtx.fillText(frameText, 3, 18);

        overlayCtx.fillStyle = "#00000055";
        overlayCtx.fillRect(graphX, graphY, graphWidth, graphHeight);

        overlayCtx.strokeStyle = "#555555";
        overlayCtx.lineWidth = 2;
        overlayCtx.setLineDash([6, 6]);
        overlayCtx.beginPath();
        overlayCtx.moveTo(graphX + 3, graphY + graphHeight - 1 - 1000 / 60 * 2);
        overlayCtx.lineTo(graphX + graphWidth - 3, graphY + graphHeight - 1 - 1000 / 60 * 2);
        overlayCtx.moveTo(graphX + 3, graphY + graphHeight - 1 - 1000 / 30 * 2);
        overlayCtx.lineTo(graphX + graphWidth - 3, graphY + graphHeight - 1 - 1000 / 30 * 2);
        overlayCtx.stroke();

        overlayCtx.strokeStyle = timingGradient;
        overlayCtx.lineJoin = "bevel";
        overlayCtx.lineCap = "butt";
        overlayCtx.lineWidth = 3;
        overlayCtx.setLineDash([]);
        overlayCtx.beginPath();
        overlayCtx.moveTo(graphX, Math.max(graphY + 1, graphY + graphHeight - 1 - frameHistory[0] * 2));
        for (let i = 1; i < frameHistory.length; i++) {
            overlayCtx.lineTo(graphX + i / historyLength * graphWidth, Math.max(graphY + 1, graphY + graphHeight - 1 - frameHistory[i] * 2));
        }
        overlayCtx.stroke();

        overlayCtx.fillStyle = "#ffffff";
        overlayCtx.fillText("60 FPS", graphX + 3, graphY + graphHeight - 1 - 1000 / 60 * 2 - 21);
        overlayCtx.fillText("30 FPS", graphX + 3, graphY + graphHeight - 1 - 1000 / 30 * 2 - 21);
        overlayCtx.setLineDash([]);
    }
    window.requestAnimationFrame(update);
};
window.requestAnimationFrame(update);

// setInterval(update, 100);

export { grid, gridWidth, gridHeight, gridStride, chunks, nextChunks, chunkWidth, chunkHeight, chunkXAmount, chunkYAmount, chunkStride, tick, modal };