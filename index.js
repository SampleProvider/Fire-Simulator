const renderer = new Renderer(["main"], ["setup", "brush", "main"]);
await renderer.init(400, 400);

window.addEventListener("resize", function() {
    // renderer.resize(window.innerWidth, window.innerHeight);
});

var mouseX = 0;
var mouseY = 0;
var lastMouseX = 0;
var lastMouseY = 0;
var mouseDown = false;
document.onmousemove = function(event) {
    const rect = canvas.getBoundingClientRect();
    mouseX = (event.clientX - rect.left) / 400 * renderer.gridSize;
    mouseY = (event.clientY - rect.top) / 400 * renderer.gridSize;
};
document.onmousedown = function() {
    mouseDown = true;
};
document.onmouseup = function() {
    mouseDown = false;
}

var fps = [];

const loop = function() {
    if (mouseDown) {
        var b = [1, lastMouseX, lastMouseY, mouseX, mouseY, 5];
        renderer.device.queue.writeBuffer(renderer.brushBuffer, 0, new Uint32Array(b));
    }
    lastMouseX = mouseX;
    lastMouseY = mouseY;
    
    renderer.render();

    fps.push(performance.now());
    while (performance.now() - fps[0] > 1000) {
        fps.shift();
    }
    document.getElementById("fpsCounter").innerText = "FPS: " + fps.length;
    
    window.requestAnimationFrame(loop);
};
window.requestAnimationFrame(loop);
// setInterval(loop, 50);
// setInterval(loop, 50);
// setInterval(loop, 5);