@group(0) @binding(0) var<uniform> tick: u32;
@group(0) @binding(1) var<uniform> grid_size: vec2<u32>;
@group(0) @binding(2) var<storage, read_write> grid: array<f32>;
@group(0) @binding(3) var<storage, read_write> next_grid: array<atomic<i32>>;
@group(0) @binding(4) var<storage, read_write> chunks: array<u32>;
@group(0) @binding(5) var<storage, read_write> next_chunks: array<u32>;
@group(0) @binding(6) var<storage, read> brush: array<f32>;

const stride = 4;

const scale = 65536.0;

const gravity = 0.09;
// const multiplier = -2.55;
// const multiplier = -10.0;

fn random(input: u32) -> f32 {
    var state = input * 747796405 + 2891336453;
    var word = ((state >> ((state >> 28) + 4)) ^ state) * 277803737;
    return f32((word >> 22) ^ word) / 4294967296;
}

const nonsolid = array<u32, 11>(1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1);

@compute @workgroup_size(8, 8)
fn compute_main(@builtin(global_invocation_id) pos1: vec3<u32>) {
    // if (pos.x >= grid_size.x || pos.y >= grid_size.y) {
    //     return;
    // }
    var pos = pos1;
    if (tick % 2 == 0) {
        pos.x = grid_size.x - 1 - pos.x;
    }
    let index = (pos.x + pos.y * grid_size.x) * stride;
    var spd_x = grid[index];
    var spd_y = grid[index + 1];
    var temperature = grid[index + 2];
    var id = grid[index + 3];

    if (id == 1) {
        spd_x *= -1;
        spd_y *= -1;
        // grid[index] = 0;
        // grid[index + 1] = 0;
        // grid[index + 2] = 0;
    }
    else {
        if (pos.x == 0 && spd_x < 0) {
            spd_x *= -1;
        }
        if (pos.x == grid_size.x - 1 && spd_x > 0) {
            // spd_x = 0;
            spd_x *= -1;
        }
        if (pos.y == 0 && spd_y < 0) {
            // spd_y = 0;
            spd_y *= -1;
        }
        if (pos.y == grid_size.y - 1 && spd_y > 0) {
            // spd_y = 0;
            spd_y *= -1;
        }

        var average = temperature;
        var adjacent = 1;
        var air = 0;
        if (pos.x != 0) {
            average += grid[index - stride + 2];
            adjacent++;
            if (nonsolid[u32(grid[index - stride + 3])] == 1) {
                air++;
            }
        }
        if (pos.x != grid_size.x - 1) {
            average += grid[index + stride + 2];
            adjacent++;
            if (nonsolid[u32(grid[index + stride + 3])] == 1) {
                air++;
            }
        }
        if (pos.y != 0) {
            average += grid[index - grid_size.x * stride + 2];
            adjacent++;
            if (nonsolid[u32(grid[index - grid_size.x * stride + 3])] == 1) {
                air++;
            }
        }
        if (pos.y != grid_size.y - 1) {
            average += grid[index + grid_size.x * stride + 2];
            adjacent++;
            if (nonsolid[u32(grid[index + grid_size.x * stride + 3])] == 1) {
                air++;
            }
        }
        average /= f32(adjacent);
        var multiplier = -2.0;
        // var multiplier = -2.0 / sqrt(temperature);
        if (pos.x != 0) {
            spd_x += (grid[index - stride + 2] - temperature) * multiplier;
            // spd_x += (grid[index - stride + 2] * temperature) * multiplier;
            // spd_x += (1 / grid[index - stride + 2] - 1 / temperature) * multiplier;
        }
        if (pos.x != grid_size.x - 1) {
            spd_x -= (grid[index + stride + 2] - temperature) * multiplier;
            // spd_x -= (grid[index + stride + 2] * temperature) * multiplier;
            // spd_x -= (1 / grid[index + stride + 2] - 1 / temperature) * multiplier;
        }
        if (pos.y != 0) {
            spd_y += (grid[index - grid_size.x * stride + 2] - temperature) * multiplier;
            // spd_y += (grid[index - grid_size.x * stride + 2] * temperature) * multiplier;
            // spd_y += (1 / grid[index - grid_size.x * stride + 2] - 1 / temperature) * multiplier;
        }
        if (pos.y != grid_size.y - 1) {
            spd_y -= (grid[index + grid_size.x * stride + 2] - temperature) * multiplier;
            // spd_y -= (grid[index + grid_size.x * stride + 2] * temperature) * multiplier;
            // spd_y -= (1 / grid[index + grid_size.x * stride + 2] - 1 / temperature) * multiplier;
        }

        if (id == 2 && temperature > 0.1) {
            temperature += 0.5;
            if (random(tick * u32(scale) + index) < 0.01 * temperature) {
                grid[index + 3] = 0;
            }
        }
        if (id == 3 && temperature > 0.05) {
            temperature += 2.5;
            if (random(tick * u32(scale) + index) < 0.005) {
                grid[index + 3] = 0;
            }
        }
        if (id == 5) {
            temperature += 0.2;
        }
        if (id == 6) {
            temperature += 0.5;
        }
        if (id == 7) {
            spd_x -= 0.5;
        }
        if (id == 8) {
            spd_x += 0.5;
        }
        if (id == 9) {
            spd_y -= 0.5;
        }
        if (id == 10) {
            spd_y += 0.5;
        }

        // temperature = temperature * 0.8 + average * 0.2;
        // temperature = temperature * 0.5 + average * 0.5;
        // temperature = average;

        // temperature = max(temperature - 1.0 / 255, 0.0 / 255);
        temperature = max(temperature - 1.0 / 255, 0.0 / 255);
        // temperature = min(temperature, 1.0);
        if (id != 4) {
            //temperature *= 0.95;
        }

        // spd_y -= temperature * 10.0 * gravity;
        spd_y -= temperature * 1.5;
        spd_y += gravity;

        if (air == 0) {
            spd_x = 0;
            spd_y = 0;
            temperature = 0;
        }

        let x1 = u32(min(max(i32(pos.x) + i32(round(spd_x)), 0), i32(grid_size.x - 1)));
        let y1 = u32(min(max(i32(pos.y) + i32(round(spd_y)), 0), i32(grid_size.y - 1)));
        let index1 = (x1 + y1 * grid_size.x) * stride;
        let x2 = u32(min(max(i32(pos.x) + i32(round(spd_x / 2)), 0), i32(grid_size.x - 1)));
        let y2 = u32(min(max(i32(pos.y) + i32(round(spd_y / 2)), 0), i32(grid_size.y - 1)));
        let index2 = (x2 + y2 * grid_size.x) * stride;

        // next_grid[index] += spd_x / 3;
        // next_grid[index + 1] += spd_y / 3;
        // next_grid[index + 2] += temperature / 3;
        // next_grid[index1] += spd_x / 3;
        // next_grid[index1 + 1] += spd_y / 3;
        // next_grid[index1 + 2] += temperature / 3;
        // next_grid[index2] += spd_x / 3;
        // next_grid[index2 + 1] += spd_y / 3;
        // next_grid[index2 + 2] += temperature / 3;
        // next_grid[index1] += spd_x;
        // next_grid[index1 + 1] += spd_y;
        // next_grid[index1 + 2] += temperature;
        atomicAdd(&next_grid[index], i32(round(spd_x * scale / 3.0)));
        atomicAdd(&next_grid[index + 1], i32(round(spd_y * scale / 3.0)));
        atomicAdd(&next_grid[index + 2], i32(round(temperature * scale / 3.0)));
        atomicAdd(&next_grid[index1], i32(round(spd_x * scale / 3.0)));
        atomicAdd(&next_grid[index1 + 1], i32(round(spd_y * scale / 3.0)));
        atomicAdd(&next_grid[index1 + 2], i32(round(temperature * scale / 3.0)));
        atomicAdd(&next_grid[index2], i32(round(spd_x * scale / 3.0)));
        atomicAdd(&next_grid[index2 + 1], i32(round(spd_y * scale / 3.0)));
        atomicAdd(&next_grid[index2 + 2], i32(round(temperature * scale / 3.0)));
    }
    // next_grid[index] = spd_x;
    // next_grid[index + 1] = spd_y;
    // next_grid[index + 2] = temperature;
    storageBarrier();
    if (id == 100) {
        atomicStore(&next_grid[index], 0);
        atomicStore(&next_grid[index + 1], 0);
        atomicStore(&next_grid[index + 2], 0);
    }
    else {
        grid[index] = f32(atomicLoad(&next_grid[index])) / scale;
        grid[index + 1] = f32(atomicLoad(&next_grid[index + 1])) / scale;
        grid[index + 2] = max(f32(atomicLoad(&next_grid[index + 2])), 1) / scale;
        atomicStore(&next_grid[index], 0);
        atomicStore(&next_grid[index + 1], 0);
        atomicStore(&next_grid[index + 2], 0);
    }
    // next_grid[index] = 0;
    // next_grid[index + 1] = 0;
    // next_grid[index + 2] = 0;
}