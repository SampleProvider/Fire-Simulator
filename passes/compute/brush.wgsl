@group(0) @binding(0) var<uniform> tick: u32;
@group(0) @binding(1) var<uniform> grid_size: vec2<u32>;
@group(0) @binding(2) var<storage, read_write> grid: array<f32>;
@group(0) @binding(3) var<storage, read_write> next_grid: array<f32>;
@group(0) @binding(4) var<storage, read_write> chunks: array<u32>;
@group(0) @binding(5) var<storage, read_write> next_chunks: array<u32>;
@group(0) @binding(6) var<storage, read_write> brush: array<f32>;

const stride = 4;

@compute @workgroup_size(1, 1)
fn compute_main(@builtin(global_invocation_id) pos: vec3<u32>) {
    // for (var i = u32(0); i < grid_size.x; i++) {
    //     for (var j = u32(0); j < grid_size.y; j++) {
    //         let index = (i + j * grid_size.x) * stride;
    //         grid[index] = 0;
    //         grid[index + 1] = 0;
    //         grid[index + 2] = 0;
    //         // grid[index] = next_grid[index];
    //         // grid[index + 1] = next_grid[index + 1];
    //         // grid[index + 2] = next_grid[index + 2];
    //         // next_grid[index] = 0;
    //         // next_grid[index + 1] = 0;
    //         // next_grid[index + 2] = 0;
    //     }
    // }
    // for (var i = u32(0); i < grid_size.x; i++) {
    //     for (var j = u32(0); j < grid_size.y; j++) {
    //         let index = (i + j * grid_size.x) * stride;
    //         let spd_x = next_grid[index];
    //         let spd_y = next_grid[index + 1];
    //         let temperature = next_grid[index + 2];
    //         let x1 = u32(min(max(i32(i) + i32(round(spd_x)), 0), i32(grid_size.x - 1)));
    //         let y1 = u32(min(max(i32(j) + i32(round(spd_y)), 0), i32(grid_size.y - 1)));
    //         let index1 = (x1 + y1 * grid_size.x) * stride;
    //         let x2 = u32(min(max(i32(i) + i32(round(spd_x / 2)), 0), i32(grid_size.x - 1)));
    //         let y2 = u32(min(max(i32(j) + i32(round(spd_y / 2)), 0), i32(grid_size.y - 1)));
    //         let index2 = (x2 + y2 * grid_size.x) * stride;
    //         // grid[index] = next_grid[index];
    //         // grid[index + 1] = next_grid[index + 1];
    //         // grid[index + 2] = next_grid[index + 2];
    //         next_grid[index] = 0;
    //         next_grid[index + 1] = 0;
    //         next_grid[index + 2] = 0;
    //         grid[index] += spd_x / 3;
    //         grid[index + 1] += spd_y / 3;
    //         grid[index + 2] += temperature / 3;
    //         grid[index1] += spd_x / 3;
    //         grid[index1 + 1] += spd_y / 3;
    //         grid[index1 + 2] += temperature / 3;
    //         grid[index2] += spd_x / 3;
    //         grid[index2 + 1] += spd_y / 3;
    //         grid[index2 + 2] += temperature / 3;
    //     }
    // }
    for (var i = u32(0); i < grid_size.x; i++) {
        // next_grid[(i + (grid_size.y - 1) * grid_size.x) * stride + 2] += 20.0 / 255.0;
        // grid[(i + (grid_size.y - 1) * grid_size.x) * stride + 2] += 200.0 / 255.0;
        // next_grid[(i + (grid_size.y / 2 - 1) * grid_size.x) * stride + 2] += 2000.0 / 255.0;
        // grid[(i + (grid_size.y - 1) * grid_size.x) * stride + 0] += 200.0 / 255.0;
        // grid[(i + (grid_size.y - 10) * grid_size.x) * stride + 0] += 2000.0 / 255.0;
        // grid[(i + (grid_size.y / 2 - 1) * grid_size.x) * stride + 2] += 200.0 / 255.0;
    }
    for (var i = u32(200 - 10); i <= 200 + 10; i++) {
        for (var j = u32(200 - 10); j <= 200 + 10; j++) {
            if ((i - 200) * (i - 200) + (j - 200) * (j - 200) < 100) {
                let index = (i + j * grid_size.x) * stride;
                grid[index + 2] += 20.0 / 255.0;
            }
        }
    }
    if (brush[3] == 1.0) {
        for (var y = u32(max(brush[1] - brush[2] + 1, 0)); y <= u32(min(brush[1] + brush[2] - 1, f32(grid_size.y) - 1)); y++) {
            for (var x = u32(max(brush[0] - brush[2] + 1, 0)); x <= u32(min(brush[0] + brush[2] - 1, f32(grid_size.x) - 1)); x++) {
                grid[(x + y * grid_size.x) * stride + 2] += 255.0 / 255.0;
            }
        }
    }
}