import { gridWidth, gridHeight, chunkWidth, chunkHeight } from "./game.js";

const VERTICES = new Float32Array([
    -1, -1,
    1, -1,
    -1, 1,
    1, 1,
]);
const INDICES = new Uint32Array([
    0, 1, 2,
    1, 2, 3,
]);

const adapter = await navigator.gpu?.requestAdapter();
const device = await adapter?.requestDevice();
if (device == null) {
    alert("Your browser does not support WebGPU.");
}

const canvas = document.getElementById("canvas");
canvas.style.display = "none";
const ctx = canvas.getContext("webgpu");
const format = navigator.gpu.getPreferredCanvasFormat();
ctx.configure({
    device: device,
    format: format,
});

device.pushErrorScope("validation");

const vertexBuffer = device.createBuffer({
    size: 4 * 8,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
});
device.queue.writeBuffer(vertexBuffer, 0, VERTICES);
const indexBuffer = device.createBuffer({
    size: 4 * 6,
    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
});
device.queue.writeBuffer(indexBuffer, 0, INDICES);

let viewport = new Float32Array([window.innerWidth, window.innerHeight]);
const viewportBuffer = device.createBuffer({
    size: 4 * 2,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});
device.queue.writeBuffer(viewportBuffer, 0, viewport);

const cameraBuffer = device.createBuffer({
    size: 4 * 4,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});

const timeBuffer = device.createBuffer({
    size: 4 * 4,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});

const cameraBindGroupLayout = device.createBindGroupLayout({
    entries: [{
        binding: 0,
        visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
        buffer: {
            type: "uniform",
        },
    }, {
        binding: 1,
        visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
        buffer: {
            type: "uniform",
        },
    }, {
        binding: 2,
        visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
        buffer: {
            type: "uniform",
        },
    }],
});
const cameraBindGroup = device.createBindGroup({
    layout: cameraBindGroupLayout,
    entries: [{
        binding: 0,
        resource: {
            buffer: viewportBuffer,
        },
    }, {
        binding: 1,
        resource: {
            buffer: cameraBuffer,
        },
    }, {
        binding: 2,
        resource: {
            buffer: timeBuffer,
        },
    }],
});

const tickBuffer = device.createBuffer({
    size: 4 * 2,
    usage: GPUBufferUsage.FRAGMENT | GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});
device.queue.writeBuffer(tickBuffer, 0, new Uint32Array([0]));

const gridSizeBuffer = device.createBuffer({
    size: 4 * 2,
    usage: GPUBufferUsage.FRAGMENT | GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});

let gridBuffer = device.createBuffer({
    size: 4,
    usage: GPUBufferUsage.FRAGMENT | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
});
let nextGridBuffer = device.createBuffer({
    size: 4,
    usage: GPUBufferUsage.FRAGMENT | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
});
let chunksBuffer = device.createBuffer({
    size: 4,
    usage: GPUBufferUsage.FRAGMENT | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
});
let nextChunksBuffer = device.createBuffer({
    size: 4,
    usage: GPUBufferUsage.FRAGMENT | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
});
let brushBuffer = device.createBuffer({
    size: 4 * 120,
    usage: GPUBufferUsage.FRAGMENT | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
});

const renderGridBindGroupLayout = device.createBindGroupLayout({
    entries: [{
        binding: 0,
        visibility: GPUShaderStage.FRAGMENT,
        buffer: {
            type: "uniform",
        },
    }, {
        binding: 1,
        visibility: GPUShaderStage.FRAGMENT,
        buffer: {
            type: "uniform",
        },
    }, {
        binding: 2,
        visibility: GPUShaderStage.FRAGMENT,
        buffer: {
            type: "read-only-storage",
        },
    }, {
        binding: 3,
        visibility: GPUShaderStage.FRAGMENT,
        buffer: {
            type: "read-only-storage",
        },
    }],
});
let renderGridBindGroup;

let motionBlurTexture;
let motionBlurTextureView;
let motionBlurTextureSampler = device.createSampler();
let motionBlurTextureBindGroupLayout = device.createBindGroupLayout({
    entries: [{
        binding: 0,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        texture: {
            sampleType: "float",
            viewDimension: "2d",
            multisampled: false,
        },
    }, {
        binding: 1,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        sampler: {
            type: "non-filtering",
        },
    }, {
        binding: 2,
        visibility: GPUShaderStage.FRAGMENT,
        buffer: {
            type: "uniform",
        },
    }],
});
let motionBlurTextureBindGroup;

let computeBindGroupLayout = device.createBindGroupLayout({
    entries: [{
        binding: 0,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
            type: "uniform",
        },
    }, {
        binding: 1,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
            type: "uniform",
        },
    }, {
        binding: 2,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
            type: "storage",
        },
    }, {
        binding: 3,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
            type: "storage",
        },
    }, {
        binding: 4,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
            type: "storage",
        },
    }, {
        binding: 5,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
            type: "storage",
        },
    }, {
        binding: 6,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
            type: "storage",
        },
    }],
});
let computeBindGroup;

function createBindGroups() {
    renderGridBindGroup = device.createBindGroup({
        layout: renderGridBindGroupLayout,
        entries: [{
            binding: 0,
            resource: {
                buffer: tickBuffer,
            },
        }, {
            binding: 1,
            resource: {
                buffer: gridSizeBuffer,
            },
        }, {
            binding: 2,
            resource: {
                buffer: gridBuffer,
            },
        }, {
            binding: 3,
            resource: {
                buffer: brushBuffer,
            },
        }],
    });
    computeBindGroup = device.createBindGroup({
        layout: computeBindGroupLayout,
        entries: [{
            binding: 0,
            resource: {
                buffer: tickBuffer,
            },
        }, {
            binding: 1,
            resource: {
                buffer: gridSizeBuffer,
            },
        }, {
            binding: 2,
            resource: {
                buffer: gridBuffer,
            },
        }, {
            binding: 3,
            resource: {
                buffer: nextGridBuffer,
            },
        }, {
            binding: 4,
            resource: {
                buffer: chunksBuffer,
            },
        }, {
            binding: 5,
            resource: {
                buffer: nextChunksBuffer,
            },
        }, {
            binding: 6,
            resource: {
                buffer: brushBuffer,
            },
        }],
    });
};

class RenderPass {
    constructor(dir) {
        this.dir = dir;
    }
    async init() {
        this.shader = await(await fetch("./passes/" + this.dir + ".wgsl")).text();
        
        // this.shader = await (await fetch(this.dir + ".wgsl")).text();
        if (this.shader == null) {
            throw new Error("no shader found buh");
        }

        this.module = device.createShaderModule({
            label: this.dir,
            code: this.shader,
        });

        if (this.dir == "render/useless" || this.dir == "render/useless2") {
            this.layout = device.createPipelineLayout({
                bindGroupLayouts: [
                    cameraBindGroupLayout,
                    motionBlurTextureBindGroupLayout,
                ],
            });
    
            this.pipeline = device.createRenderPipeline({
                label: this.dir,
                layout: this.layout,
                vertex: {
                    module: this.module,
                    entryPoint: "vs_main",
                    buffers: [{
                        // vertex x y
                        // instance x y size color
                        attributes: [{
                            shaderLocation: 0, // @location(0)
                            offset: 0,
                            format: "float32x2",
                        }],
                        arrayStride: 4 * 2, // sizeof(float) * 3
                        stepMode: "vertex",
                    }],
                },
                fragment: {
                    module: this.module,
                    entryPoint: "fs_main",
                    // targets: [{
                    //     format: format,
                    //     blend: {
                    //         color: {
                    //             operation: "add",
                    //             srcFactor: "src-alpha",
                    //             dstFactor: "dst-alpha",
                    //         },
                    //         alpha: {
                    //             operation: "add",
                    //             srcFactor: "one",
                    //             dstFactor: "one",
                    //         },
                    //     },
                    // }, {
                    //     format: "r8unorm",
                    //     blend: {
                    //         color: {
                    //             operation: "add",
                    //             srcFactor: "src-alpha",
                    //             dstFactor: "dst-alpha",
                    //         },
                    //         alpha: {
                    //             operation: "add",
                    //             srcFactor: "one",
                    //             dstFactor: "one",
                    //         },
                    //     },
                    //     // writeMask: 0,
                    // }],
                    targets: [{
                        // format: "r8unorm",
                        format: format,
                        // blend: {
                        //     color: {
                        //         operation: "add",
                        //         srcFactor: "src-alpha",
                        //         dstFactor: "dst-alpha",
                        //     },
                        //     alpha: {
                        //         operation: "add",
                        //         srcFactor: "one",
                        //         dstFactor: "one",
                        //     },
                        // },
                        // writeMask: 0,
                    }],
                },
                primitive: {
                    topology: "triangle-list",
                },
            });
        }
        else {
            this.layout = device.createPipelineLayout({
                bindGroupLayouts: [
                    cameraBindGroupLayout,
                    renderGridBindGroupLayout,
                ],
            });

            this.pipeline = device.createRenderPipeline({
                label: this.dir,
                layout: this.layout,
                vertex: {
                    module: this.module,
                    entryPoint: "vs_main",
                    buffers: [{
                        // vertex x y
                        // instance x y size color
                        attributes: [{
                            shaderLocation: 0, // @location(0)
                            offset: 0,
                            format: "float32x2",
                        }],
                        arrayStride: 4 * 2, // sizeof(float) * 3
                        stepMode: "vertex",
                    }],
                },
                fragment: {
                    module: this.module,
                    entryPoint: "fs_main",
                    // targets: [{
                    //     format: format,
                    //     blend: {
                    //         color: {
                    //             operation: "add",
                    //             srcFactor: "src-alpha",
                    //             dstFactor: "dst-alpha",
                    //         },
                    //         alpha: {
                    //             operation: "add",
                    //             srcFactor: "one",
                    //             dstFactor: "one",
                    //         },
                    //     },
                    // }, {
                    //     format: "r8unorm",
                    //     blend: {
                    //         color: {
                    //             operation: "add",
                    //             srcFactor: "src-alpha",
                    //             dstFactor: "dst-alpha",
                    //         },
                    //         alpha: {
                    //             operation: "add",
                    //             srcFactor: "one",
                    //             dstFactor: "one",
                    //         },
                    //     },
                    //     // writeMask: 0,
                    // }],
                    targets: [{
                        // format: "r8unorm",
                        format: format,
                        blend: {
                            color: {
                                operation: "add",
                                srcFactor: "src-alpha",
                                dstFactor: "one-minus-src-alpha",
                            },
                            alpha: {
                                operation: "add",
                                srcFactor: "one",
                                dstFactor: "one",
                            },
                        },
                        // writeMask: 0,
                    }],
                },
                primitive: {
                    topology: "triangle-list",
                },
            });
        }
    }
    async render(encoder) {
        let pass;
        if (this.dir == "render/useless" || this.dir == "render/useless2") {
            pass = encoder.beginRenderPass({
                label: this.dir,
                // colorAttachments: [{
                //     view: ctx.getCurrentTexture().createView(),
                //     loadOp: "load",
                //     storeOp: "store",
                // }, {
                //     view: motionBlurTextureView,
                //     loadOp: "load",
                //     storeOp: "store",
                // }],
                colorAttachments: [{
                    view: ctx.getCurrentTexture().createView(),
                    // loadOp: "load",
                    loadOp: "clear",
                    clearValue: [0, 0, 0, 1],
                    // clearValue: [0, (performance.now() / 1000 % 10) / 10, 0, 1],
                    storeOp: "store",
                }],
            });
            pass.setPipeline(this.pipeline);
            pass.setVertexBuffer(0, vertexBuffer);
            // pass.setVertexBuffer(1, particleBuffer);
            pass.setIndexBuffer(indexBuffer, "uint32");
            pass.setBindGroup(0, cameraBindGroup);
            pass.setBindGroup(1, motionBlurTextureBindGroup);
            pass.drawIndexed(INDICES.length, 1);

            pass.end();
        }
        else {
            pass = encoder.beginRenderPass({
                label: this.dir,
                // colorAttachments: [{
                //     view: ctx.getCurrentTexture().createView(),
                //     loadOp: "load",
                //     storeOp: "store",
                // }, {
                //     view: motionBlurTextureView,
                //     loadOp: "load",
                //     storeOp: "store",
                // }],
                colorAttachments: [{
                    view: motionBlurTextureView,
                    loadOp: "load",
                    // loadOp: "clear",
                    clearValue: [0, 0, 0, 1],
                    // clearValue: [0, (performance.now() / 1000 % 10) / 10, 0, 1],
                    storeOp: "store",
                }],
            });
            pass.setPipeline(this.pipeline);
            pass.setVertexBuffer(0, vertexBuffer);
            // pass.setVertexBuffer(1, particleBuffer);
            pass.setIndexBuffer(indexBuffer, "uint32");
            pass.setBindGroup(0, cameraBindGroup);
            pass.setBindGroup(1, renderGridBindGroup);
            pass.drawIndexed(INDICES.length, 1);

            pass.end();
        }
    }
}
class ComputePass {
    constructor(dir) {
        this.dir = dir;
    }
    async init() {
        this.shader = await (await fetch("./passes/" + this.dir + ".wgsl")).text();

        if (this.shader == null) {
            throw new Error("no shader found buh");
        }

        this.module = device.createShaderModule({
            label: this.dir,
            code: this.shader,
        });

        this.layout = device.createPipelineLayout({
            bindGroupLayouts: [
                computeBindGroupLayout,
            ],
        });

        this.pipeline = device.createComputePipeline({
            label: this.dir,
            layout: this.layout,
            compute: {
                module: this.module,
                entryPoint: "compute_main",
            },
        });
    }
    async render(encoder) {
        // if (this.dir == "compute/setup" && tick > 10000) {
        //     // if (this.dir == "compute/setup" && tick > 1000) {
        //     // if (this.dir == "compute/setup" && tick > 200) {
        //     // if (this.dir == "compute/setup" && tick > 2) {
        //     return;
        // }
        const pass = encoder.beginComputePass({
            label: this.dir,
        });

        pass.setPipeline(this.pipeline);
        pass.setBindGroup(0, computeBindGroup);
        // pass.setBindGroup(2, randomSeedBindGroup);
        // pass.dispatchWorkgroups(particles);
        // pass.dispatchWorkgroups(gridSize / 16 * gridSize / 16 / 16);
        // pass.dispatchWorkgroups(gridSize / 16 / 4, gridSize / 16 / 4);
        // pass.dispatchWorkgroups(gridSize / chunkSize, gridSize / chunkSize);
        // pass.dispatchWorkgroups(gridWidth / chunkWidth / 8, gridHeight / chunkHeight / 8);
        // pass.dispatchWorkgroups(gridWidth / chunkWidth, gridHeight / chunkHeight);
        if (this.dir == "compute/brush") {
            pass.dispatchWorkgroups(1);
        }
        else {
            pass.dispatchWorkgroups(gridWidth / 8, gridHeight / 8);
            // pass.dispatchWorkgroups(gridWidth, gridHeight);
        }
        pass.end();
    }
}

let renderPasses = ["main", "useless"];
for (let i in renderPasses) {
    const pass = new RenderPass("render/" + renderPasses[i]);
    // const pass = new RenderPass(renderPasses[i]);
    await pass.init();
    renderPasses[i] = pass;
}
let computePasses = ["brush", "main"];
for (let i in computePasses) {
    const pass = new ComputePass("compute/" + computePasses[i]);
    await pass.init();
    computePasses[i] = pass;
}
device.popErrorScope().then((error) => {
    if (error) {
        alert("An error occured during initialization." + error.message);
    }
});
function resizeCanvas(width, height) {
    width = 512;
    height = 512;
    canvas.width = width;
    canvas.height = height;
    viewport[0] = width;
    viewport[1] = height;
    device.queue.writeBuffer(viewportBuffer, 0, viewport);
    motionBlurTexture = device.createTexture({
        label: "Motion Blur Texture",
        size: [width, height],
        // format: "r8unorm",
        format: format,
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    });
    motionBlurTextureView = motionBlurTexture.createView({
        // format: "r8unorm",
        format: format,
    });
    motionBlurTextureBindGroup = device.createBindGroup({
        layout: motionBlurTextureBindGroupLayout,
        entries: [{
            binding: 0,
            resource: motionBlurTextureView,
        }, {
            binding: 1,
            resource: motionBlurTextureSampler,
        }, {
            binding: 2,
            resource: {
                buffer: gridSizeBuffer,
            },
        }],
    });
};
function resizeGrid(gridWidth, gridHeight, gridStride, chunkWidth, chunkHeight, chunkXAmount, chunkYAmount, chunkStride) {
    let gridArray = [];
    for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
            if (y > 200 && y < 220) {
                gridArray.push(...[0, 0, 0, 1]);
            }
            else if (y > 300 && y < 320) {
                gridArray.push(...[0, 0, 0, 2]);
            }
            else if (Math.random() < 0.5) {
                gridArray.push(...[0, 0, 1, 0]);
            }
            else {
                gridArray.push(...[0, 0, 0, 0]);
            }
        }
    }
    let gridArray2 = [];
    for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
            gridArray2.push(...[0, 0, 0, 0]);
        }
    }

    let chunksArray = [];
    for (let y = 0; y < chunkYAmount; y++) {
        for (let x = 0; x < chunkXAmount; x++) {
            chunksArray.push(...[x * chunkWidth, Math.min(x * chunkWidth + chunkWidth - 1, gridWidth - 1), y * chunkHeight, Math.min(y * chunkHeight + chunkHeight - 1, gridHeight - 1)]);
        }
    }

    let grid = new Float32Array(gridArray);
    let chunks = new Int32Array(chunksArray);
    gridBuffer = device.createBuffer({
        size: 4 * gridStride * gridWidth * gridHeight,
        usage: GPUBufferUsage.FRAGMENT | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    nextGridBuffer = device.createBuffer({
        size: 4 * gridStride * gridWidth * gridHeight,
        usage: GPUBufferUsage.FRAGMENT | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    chunksBuffer = device.createBuffer({
        size: 4 * chunkStride * chunkXAmount * chunkYAmount,
        usage: GPUBufferUsage.FRAGMENT | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    nextChunksBuffer = device.createBuffer({
        size: 4 * chunkStride * chunkXAmount * chunkYAmount,
        usage: GPUBufferUsage.FRAGMENT | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(gridBuffer, 0, grid);
    // device.queue.writeBuffer(nextGridBuffer, 0, grid);
    device.queue.writeBuffer(nextGridBuffer, 0, new Int32Array(gridArray2));
    device.queue.writeBuffer(gridSizeBuffer, 0, new Uint32Array([gridWidth, gridHeight]));
    createBindGroups();
};
function render(compute, camera, tick, brush) {
    const encoder = device.createCommandEncoder();

    device.queue.writeBuffer(cameraBuffer, 0, camera);
    device.queue.writeBuffer(timeBuffer, 0, new Float32Array([performance.now()]));

    device.queue.writeBuffer(tickBuffer, 0, new Uint32Array([tick]));
    device.queue.writeBuffer(brushBuffer, 0, brush);

    if (compute) {
        for (let i in computePasses) {
            computePasses[i].render(encoder);
        }
    }

    for (let i in renderPasses) {
        renderPasses[i].render(encoder);
    }

    device.queue.submit([encoder.finish()]);
};

export { resizeCanvas, resizeGrid, render }